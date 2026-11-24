# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
import hashlib
import html
import json
import re

RULE = "github-rate-limit/v1"
VERSION = "2026-03-10"
SOURCE = "https://docs.github.com/en/rest/about-the-rest-api/breaking-changes?apiVersion=2026-03-10"
PATH = "evidence/rate-limit.json"
POLICY = "remove deprecated rate property from rate limit endpoint"
GUIDANCE = "read rate limit information from resources.core instead of rate"

def digest(data):
    return hashlib.sha256(data).hexdigest()

def valid_sha(value):
    return re.fullmatch(r"[a-f0-9]{40}", value) is not None

def unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("duplicate key")
        result[key] = value
    return result

def classify(document, evidence):
    if len(document) > 2_000_000:
        return ("UNRESOLVED", "SOURCE_TOO_LARGE", "", digest(evidence))
    clean = re.sub(r"<(script|style)\b[^>]*>.*?</\1\s*>", " ", document.decode("utf-8", "replace"), flags=re.I | re.S)
    clean = html.unescape(re.sub(r"<[^>]*>", " ", clean))
    clean = " ".join(clean.lower().split())
    sections = re.findall(r"version\s+2026-03-10\s+(.*?)(?=version\s+20\d\d-\d\d-\d\d|$)", clean)
    fingerprint = digest((RULE + "|" + VERSION + "|" + POLICY + "|" + GUIDANCE).encode())
    evidence_hash = digest(evidence)
    if not any(POLICY in section and GUIDANCE in section for section in sections):
        return ("UNRESOLVED", "SOURCE_RULE_UNCONFIRMED", "", evidence_hash)
    if len(evidence) > 2048:
        return ("UNRESOLVED", "EVIDENCE_TOO_LARGE", fingerprint, evidence_hash)
    try:
        adapter = json.loads(evidence, object_pairs_hook=unique_object)
    except (ValueError, UnicodeError, RecursionError):
        adapter = None
    if not isinstance(adapter, dict) or set(adapter) - {"request", "responsePath"}:
        return ("UNRESOLVED", "INVALID_ADAPTER", fingerprint, evidence_hash)
    request = adapter.get("request")
    if request != {"method": "GET", "path": "/rate_limit", "headers": {"X-GitHub-Api-Version": VERSION}}:
        return ("UNRESOLVED", "REQUEST_UNCONFIRMED", fingerprint, evidence_hash)
    if adapter.get("responsePath") == ["resources", "core"]:
        return ("APPROVED", "USES_RESOURCES_CORE", fingerprint, evidence_hash)
    if adapter.get("responsePath") == ["rate"]:
        return ("BLOCKED", "USES_REMOVED_RATE", fingerprint, evidence_hash)
    return ("UNRESOLVED", "RESPONSE_PATH_UNCONFIRMED", fingerprint, evidence_hash)

class MigrationEvaluator(gl.Contract):
    owner: Address
    registry: Address
    repository: str
    sequence: u64
    records: TreeMap[str, str]
    index: TreeMap[u64, str]

    def __init__(self, registry: str, repository: str):
        if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9-]{0,38}/versionrelay-genlayer", repository):
            raise ValueError("Unsupported evidence repository")
        if Address(registry) == Address("0x0000000000000000000000000000000000000000"):
            raise ValueError("Registry is required")
        self.owner = gl.message.sender_address
        self.registry = Address(registry)
        self.repository = repository
        self.sequence = u64(0)

    @gl.public.write
    def evaluate(self, commit: str, release: str) -> None:
        if gl.message.sender_address != self.owner:
            raise ValueError("Unauthorized submitter")
        if not valid_sha(commit) or not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._-]{0,31}", release):
            raise ValueError("Invalid commit or release")
        submission = digest((RULE + "|" + self.repository + "|" + commit + "|" + release).encode())
        if submission in self.records:
            raise ValueError("Duplicate submission")
        url = "https://raw.githubusercontent.com/" + self.repository + "/" + commit + "/" + PATH

        def verify():
            documentation = gl.nondet.web.get(SOURCE)
            evidence = gl.nondet.web.get(url)
            if documentation.status_code != 200 or evidence.status_code != 200:
                raise ValueError("Evidence sources unavailable")
            fields = classify(documentation.body, evidence.body)
            return json.dumps(fields, separators=(",", ":"))

        verdict, reason, source_digest, evidence_digest = json.loads(gl.eq_principle.strict_eq(verify))
        sequence = u64(self.sequence + 1)
        self.sequence = sequence
        self.index[sequence] = submission
        self.records[submission] = json.dumps({
            "id": submission, "sequence": int(sequence), "rule": RULE, "targetApi": VERSION,
            "submitter": self.owner.as_hex, "repository": self.repository, "commit": commit,
            "release": release, "verdict": verdict, "reason": reason, "source": SOURCE,
            "sourceDigest": source_digest, "evidenceDigest": evidence_digest, "evidence": url,
        }, sort_keys=True)
        if verdict == "APPROVED":
            gl.get_contract_at(self.registry).emit(on="finalized").activate(submission, release, sequence)

    @gl.public.view
    def configuration(self) -> str:
        return json.dumps({"owner": self.owner.as_hex, "registry": self.registry.as_hex, "repository": self.repository})

    @gl.public.view
    def submission(self, submission_id: str) -> str:
        return self.records[submission_id] if submission_id in self.records else ""

    @gl.public.view
    def recent(self) -> list[str]:
        end = int(self.sequence)
        return [self.records[self.index[u64(i)]] for i in range(end, max(0, end - 12), -1)]
