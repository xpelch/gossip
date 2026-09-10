"""Independently verify the frozen Gossip identity-session vectors."""

import hashlib
import io
import json
import runpy
from contextlib import redirect_stdout
from pathlib import Path


ROOT = Path(__file__).parent.parent
PROTOCOL = "gossip/2-draft.1"
PROFILE = "gossip-eip191-identity-session-v1"


def load_canonicalizer():
    verifier_path = Path(__file__).parent / "verify-v2-vectors.py"
    namespace = runpy.run_path(str(verifier_path))
    return namespace["canonical_json"]


def identity_digest(value: object) -> str:
    payload = f"{PROTOCOL}\nidentity\n{canonical_json(value)}".encode("utf-8")
    return "sha256:" + hashlib.sha256(payload).hexdigest()


def grant_message(digest: str) -> str:
    return "\n".join(["Gossip identity session v1", PROTOCOL, PROFILE, digest])


def revocation_message(digest: str) -> str:
    return "\n".join(
        ["Gossip identity session revocation v1", PROTOCOL, PROFILE, digest]
    )


def load_eip191_verifier():
    verifier_path = Path(__file__).parent / "verify-v2-http-auth.py"
    with redirect_stdout(io.StringIO()):
        namespace = runpy.run_path(str(verifier_path))
    return namespace["verify_signature"], namespace["expect_failure"]


fixture = json.loads(
    (ROOT / "test" / "fixtures" / "v2-identity-session.json").read_text(
        encoding="utf-8"
    )
)
canonical_json = load_canonicalizer()
verify_signature, expect_failure = load_eip191_verifier()

first = fixture["first_grant"]
rotated = fixture["rotated_grant"]
revocation = fixture["revocation"]

for signed_grant, expected_message in (
    (first, fixture["first_message"]),
    (rotated, fixture["rotated_message"]),
):
    digest = identity_digest(signed_grant["grant"])
    message = grant_message(digest)
    assert digest == signed_grant["grant_digest"]
    assert message == expected_message
    verify_signature(
        signed_grant["root_public_key"],
        signed_grant["grant"]["root"]["address"],
        message.encode("utf-8"),
        signed_grant["signature"],
    )

assert first["grant"]["previous"] is None
assert rotated["grant"]["previous"] == {
    "key_id": first["grant"]["session"]["key_id"],
    "grant_digest": first["grant_digest"],
}
assert rotated["grant"]["tools"] == ["gossip_operation"]

revocation_digest = identity_digest(revocation["revocation"])
revocation_preimage = revocation_message(revocation_digest)
assert revocation_digest == revocation["revocation_digest"]
assert revocation_preimage == fixture["revocation_message"]
assert revocation["revocation"]["grant_digest"] == rotated["grant_digest"]
verify_signature(
    revocation["root_public_key"],
    revocation["revocation"]["root"]["address"],
    revocation_preimage.encode("utf-8"),
    revocation["signature"],
)

request_vector = fixture["session_request"]
request = request_vector["request"]
payload = request["payload"]
assert request["tool"] == "gossip_consult_v2"
assert payload["protocol"] == PROTOCOL
assert payload["schema_revision"] == "2026-09-09"
assert payload["auth_profile"] == "gossip-eip191-v2"
assert payload["actor"] == request["root"]
assert payload["endpoint"] == request_vector["endpoint"]
assert payload["audience"] == request_vector["audience"]
assert payload["max_cost"] == request["cost"]
assert payload["subject"]["kind"] == "wallet"
assert payload["capability"] == "wallet_overview"
assert canonical_json(request) == request_vector["body"]
body_digest = (
    "sha256:" + hashlib.sha256(request_vector["body"].encode("utf-8")).hexdigest()
)
assert body_digest == request_vector["body_digest"]
request_message = "\n".join(
    [
        "Gossip request v2",
        PROTOCOL,
        "gossip-eip191-v2",
        request_vector["audience"],
        request_vector["endpoint"],
        request_vector["method"],
        request_vector["target"],
        body_digest,
        request_vector["nonce"],
        request_vector["expires"],
    ]
)
assert request_message == request_vector["message"]
verify_signature(
    request_vector["public_key"],
    request_vector["address"],
    request_message.encode("utf-8"),
    request_vector["signature"],
)

altered_request = dict(request_vector["request"])
altered_request["tool"] = "gossip_operation"
altered_digest = (
    "sha256:"
    + hashlib.sha256(canonical_json(altered_request).encode("utf-8")).hexdigest()
)
altered_message = request_message.replace(body_digest, altered_digest)
expect_failure(
    lambda: verify_signature(
        request_vector["public_key"],
        request_vector["address"],
        altered_message.encode("utf-8"),
        request_vector["signature"],
    )
)

print(
    "v2 identity-session grants, signed requests, rotation, revocation, and signatures verified"
)
