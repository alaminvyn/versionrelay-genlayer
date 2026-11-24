"""Local contract logic tests. GenLayer VM and network execution are not simulated here."""
import importlib
import json
import os
from pathlib import Path
import sys
from types import ModuleType, SimpleNamespace
import unittest

sdk = ModuleType("genlayer")
class Address(str):
    @property
    def as_hex(self):
        return str(self)

sdk_types = ModuleType("genlayer.types")
sdk_types.Address = Address
sdk_types.u64 = int
sdk.contract = SimpleNamespace(Contract=object)
sdk.storage = SimpleNamespace(TreeMap=dict)
sdk.public = SimpleNamespace(write=lambda f: f, view=lambda f: f)
sdk.message = SimpleNamespace(sender_address=Address("owner"), contract_address="registry")
sys.modules["genlayer"] = sdk
sys.modules["genlayer.types"] = sdk_types
evaluator = importlib.import_module("contracts.evaluator")
registry = importlib.import_module("contracts.registry")
ROOT = Path(__file__).resolve().parents[1]
DOC = b"<h2>Version 2026-03-10</h2><strong>Remove deprecated <code>rate</code> property from rate limit endpoint</strong> Update your integration to read rate limit information from <code>resources.core</code> instead of <code>rate</code>."

def fixture(name):
    return (ROOT / "evidence" / (name + ".json")).read_bytes()

class EvaluationTests(unittest.TestCase):
    def test_approved(self):
        self.assertEqual(evaluator.classify(DOC, fixture("approved"))[:2], ("APPROVED", "USES_RESOURCES_CORE"))

    def test_blocked(self):
        self.assertEqual(evaluator.classify(DOC, fixture("blocked"))[:2], ("BLOCKED", "USES_REMOVED_RATE"))

    def test_incomplete(self):
        self.assertEqual(evaluator.classify(DOC, fixture("unresolved"))[:2], ("UNRESOLVED", "RESPONSE_PATH_UNCONFIRMED"))

    def test_invalid_commit(self):
        for sha in ("main", "a" * 39, "A" * 40, "../" + "a" * 40):
            self.assertFalse(evaluator.valid_sha(sha))

    def test_misleading_comments_strings_and_duplicate_keys(self):
        for data in (b'// responsePath resources.core', b'"resources.core"', b'{"request":{},"request":{}}'):
            self.assertEqual(evaluator.classify(DOC, data)[0], "UNRESOLVED")

    def test_source_drift_and_scripts(self):
        for body in (b"<script>" + DOC + b"</script>", DOC.replace(b"2026-03-10", b"2022-11-28")):
            self.assertEqual(evaluator.classify(body, fixture("approved"))[1], "SOURCE_RULE_UNCONFIRMED")

    def test_invalid_configuration(self):
        with self.assertRaisesRegex(ValueError, "Unsupported evidence"):
            evaluator.MigrationEvaluator("registry", "user/other")

    def test_dispatches_only_approved_and_rejects_duplicates(self):
        obj = evaluator.MigrationEvaluator("registry", "owner/versionrelay-genlayer")
        sdk.message.sender_address = Address("owner")
        obj.records = {}
        obj.index = {}
        sent = []
        sdk.eq_principle = SimpleNamespace(strict_eq=lambda fn: fn())
        def send(**options):
            self.assertEqual(options, {"on": "finalized"})
            return SimpleNamespace(activate=lambda *args: sent.append(args))
        sdk.contract.get_at = lambda value: SimpleNamespace(emit=send)
        for index, name in enumerate(("approved", "blocked", "unresolved")):
            sha = str(index) * 40
            sdk.nondet = SimpleNamespace(web=SimpleNamespace(get=lambda url: SimpleNamespace(status=200, body=DOC if url == evaluator.SOURCE else fixture(name))))
            obj.evaluate(sha, "release-" + str(index))
        self.assertEqual(len(sent), 1)
        self.assertEqual(sent[0][1:], ("release-0", 1))
        with self.assertRaisesRegex(ValueError, "Duplicate"):
            obj.evaluate("0" * 40, "release-0")

    @unittest.skipUnless(os.environ.get("VERSIONRELAY_DOC_HTML"), "live HTML fixture is optional")
    def test_current_github_html(self):
        html = Path(os.environ["VERSIONRELAY_DOC_HTML"]).read_bytes()
        self.assertEqual(evaluator.classify(html, fixture("approved"))[0], "APPROVED")

class RegistryTests(unittest.TestCase):
    def setUp(self):
        sdk.message.sender_address = Address("owner")
        self.registry = registry.ActivationRegistry()
        self.registry.activations = {}
        sdk.contract.get_at = lambda _: SimpleNamespace(view=lambda: SimpleNamespace(configuration=lambda: '{"owner":"owner","registry":"registry"}'))

    def test_cannot_activate_directly(self):
        with self.assertRaisesRegex(ValueError, "Only the evaluator"):
            self.registry.activate("a" * 64, "release-1", 1)

    def test_binding_is_authorized_and_one_time(self):
        sdk.message.sender_address = "visitor"
        with self.assertRaises(ValueError):
            self.registry.bind_evaluator("evaluator")
        sdk.message.sender_address = Address("owner")
        self.registry.bind_evaluator("evaluator")
        with self.assertRaises(ValueError):
            self.registry.bind_evaluator("another")

    def test_replay_and_stale_updates(self):
        self.registry.bind_evaluator("evaluator")
        sdk.message.sender_address = "evaluator"
        self.registry.activate("a" * 64, "release-2", 2)
        for args in (("a" * 64, "release-3", 3), ("b" * 64, "release-1", 1)):
            with self.assertRaisesRegex(ValueError, "Replay or stale"):
                self.registry.activate(*args)
        self.assertEqual(json.loads(self.registry.active())["release"], "release-2")

if __name__ == "__main__":
    unittest.main()
