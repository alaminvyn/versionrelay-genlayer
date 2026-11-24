# v0.3.0
# { "Depends": "py-genlayer:babwp9t37jw9g4j2bccgn14g6x7x9s1f7dsmh7emvz735pz4zxa0" }

import genlayer as gl
from genlayer.types import Address, u64
import json
import re

ZERO = "0x0000000000000000000000000000000000000000"

class ActivationRegistry(gl.contract.Contract):
    owner: Address
    evaluator: Address
    sequence: u64
    active_id: str
    active_release: str
    activations: gl.storage.TreeMap[str, str]

    def __init__(self):
        self.owner = gl.message.sender_address
        self.evaluator = Address(ZERO)
        self.sequence = u64(0)
        self.active_id = ""
        self.active_release = ""

    @gl.public.write
    def bind_evaluator(self, evaluator_address: str) -> None:
        if gl.message.sender_address != self.owner or self.evaluator != Address(ZERO):
            raise ValueError("Evaluator binding is unavailable")
        evaluator = Address(evaluator_address)
        if evaluator == Address(ZERO) or evaluator == self.owner:
            raise ValueError("Invalid evaluator")
        configuration = json.loads(gl.contract.get_at(evaluator).view().configuration())
        if Address(configuration["registry"]) != gl.message.contract_address or Address(configuration["owner"]) != self.owner:
            raise ValueError("Evaluator configuration does not match")
        self.evaluator = evaluator

    @gl.public.write
    def activate(self, submission_id: str, release: str, sequence: u64) -> None:
        if self.evaluator == Address(ZERO) or gl.message.sender_address != self.evaluator:
            raise ValueError("Only the evaluator can activate")
        if not re.fullmatch(r"[a-f0-9]{64}", submission_id) or not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._-]{0,31}", release):
            raise ValueError("Invalid activation")
        if submission_id in self.activations or sequence <= self.sequence:
            raise ValueError("Replay or stale activation")
        self.sequence = sequence
        self.active_id = submission_id
        self.active_release = release
        self.activations[submission_id] = json.dumps({"id": submission_id, "release": release, "sequence": int(sequence)})

    @gl.public.view
    def active(self) -> str:
        return json.dumps({"id": self.active_id, "release": self.active_release, "sequence": int(self.sequence), "evaluator": self.evaluator.as_hex})

    @gl.public.view
    def activation(self, submission_id: str) -> str:
        return self.activations[submission_id] if submission_id in self.activations else ""
