#!/usr/bin/env python3
"""Verify the public-submission contract without importing the TypeScript code."""

import copy
import hashlib
import json
import re
from urllib.parse import urlsplit
from pathlib import Path
from typing import Any


PROTOCOL = "gossip/2-draft.1"
EVIDENCE_SCHEMA_REVISION = "2026-09-09"
PUBLIC_SUBMISSION_SCHEMA_REVISION = "2026-09-11"
DIGEST_PREFIX = "sha256:"
ADDRESS_PATTERN = re.compile(r"^0x[0-9a-f]{40}$")
OPERATION_PATTERN = re.compile(r"^[A-Za-z0-9_-]{1,64}$")


def canonical_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"), sort_keys=True)


def digest(domain: str, value: Any) -> str:
    message = f"{PROTOCOL}\n{domain}\n{canonical_json(value)}".encode("utf-8")
    return DIGEST_PREFIX + hashlib.sha256(message).hexdigest()


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def verify_submission(submission: dict[str, Any]) -> str:
    required = {
        "protocol",
        "schema_revision",
        "schema",
        "auth_profile",
        "operation_kind",
        "operation_id",
        "actor",
        "endpoint",
        "audience",
        "max_cost",
        "result",
        "evidence",
    }
    require(set(submission) == required, "submission fields are not exact")
    require(submission["protocol"] == PROTOCOL, "protocol mismatch")
    require(
        submission["schema_revision"] == PUBLIC_SUBMISSION_SCHEMA_REVISION,
        "revision mismatch",
    )
    require(submission["schema"] == "gossip.public-submission.v1", "schema mismatch")
    require(submission["auth_profile"] == "gossip-eip191-v2", "auth profile mismatch")
    require(submission["operation_kind"] == "public_submission", "kind mismatch")

    actor = submission["actor"]
    require(
        set(actor) == {"chain_id", "address"}
        and actor["chain_id"] == "4663"
        and isinstance(actor["address"], str)
        and ADDRESS_PATTERN.fullmatch(actor["address"]) is not None,
        "actor is invalid",
    )
    require(
        isinstance(submission["operation_id"], str)
        and OPERATION_PATTERN.fullmatch(submission["operation_id"]) is not None,
        "operation ID is invalid",
    )
    endpoint = urlsplit(submission["endpoint"])
    audience = urlsplit(submission["audience"])
    require(
        isinstance(submission["endpoint"], str)
        and endpoint.scheme == "https"
        and endpoint.netloc != ""
        and endpoint.username is None
        and endpoint.password is None
        and "#" not in submission["endpoint"]
        and not re.search(r"[\s\x00-\x1f\x7f-\x9f]", submission["endpoint"]),
        "endpoint is invalid",
    )
    require(
        isinstance(submission["audience"], str)
        and audience.scheme == "https"
        and audience.netloc != ""
        and audience.username is None
        and audience.password is None
        and "#" not in submission["audience"]
        and not re.search(r"[\s\x00-\x1f\x7f-\x9f]", submission["audience"]),
        "audience is invalid",
    )
    require(
        submission["max_cost"] == {"unit": "earned_credit", "amount": "0"},
        "cost is not exactly zero earned_credit",
    )

    result = submission["result"]
    graph = submission["evidence"]
    require(
        result["protocol"] == PROTOCOL
        and result["schema_revision"] == EVIDENCE_SCHEMA_REVISION
        and result["schema"] == "gossip.result.v2",
        "result manifest is invalid",
    )
    require(set(graph) == {"roots", "bundles"}, "graph fields are not exact")
    require(result["evidence_digests"] == graph["roots"], "root mismatch")

    bundles = {bundle["digest"]: bundle for bundle in graph["bundles"]}
    require(len(bundles) == len(graph["bundles"]), "duplicate graph digest")
    require(
        all(root in bundles for root in graph["roots"]), "graph root is unavailable"
    )
    reachable: set[str] = set()

    def visit(reference: str) -> None:
        require(reference in bundles, "graph reference is unavailable")
        if reference in reachable:
            return
        reachable.add(reference)
        evidence = bundles[reference]["evidence"]
        for parent in evidence["derived_from"] + evidence["conflicts_with"]:
            visit(parent)
        if evidence["supersedes"] is not None:
            visit(evidence["supersedes"])

    for root in graph["roots"]:
        visit(root)
    require(reachable == set(bundles), "graph contains unreachable evidence")

    for bundle in graph["bundles"]:
        evidence = bundle["evidence"]
        require(
            bundle["digest"] == digest("evidence", evidence), "evidence digest mismatch"
        )
        require(
            evidence["access"] == {"visibility": "public"},
            "private evidence is present",
        )
        for source in evidence["sources"]:
            require(
                source["location"]["visibility"] == "public",
                "private source is present",
            )
        for reference in evidence["derived_from"] + evidence["conflicts_with"]:
            require(reference in bundles, "graph reference is unavailable")
        for reference in evidence["conflicts_with"]:
            require(
                bundles[reference]["evidence"]["subject"] == evidence["subject"],
                "conflicting evidence has a different subject",
            )
        if evidence["supersedes"] is not None:
            require(
                evidence["supersedes"] in bundles, "superseded evidence is unavailable"
            )
        require(
            evidence["subject"] == result["subject"],
            "result and evidence subjects differ",
        )

    return digest("request", submission)


def submission_with_public_parent(
    submission: dict[str, Any],
    relation: str,
    parent_address: str | None = None,
) -> dict[str, Any]:
    linked = copy.deepcopy(submission)
    root = linked["evidence"]["bundles"][0]
    parent_evidence = copy.deepcopy(root["evidence"])
    if parent_address is not None:
        parent_evidence["subject"]["address"] = parent_address
    parent_digest = digest("evidence", parent_evidence)

    root["evidence"][relation] = [parent_digest]
    root["digest"] = digest("evidence", root["evidence"])
    linked["evidence"]["bundles"].append(
        {"digest": parent_digest, "evidence": parent_evidence}
    )
    linked["evidence"]["roots"] = [root["digest"]]
    linked["result"]["evidence_digests"] = [root["digest"]]
    return linked


def main() -> None:
    fixture_path = (
        Path(__file__).parents[1] / "test" / "fixtures" / "v2-public-submission.json"
    )
    fixture = json.loads(fixture_path.read_text(encoding="utf-8"))
    submission = fixture["valid"]
    require(
        canonical_json(submission) == fixture["canonical"], "canonical vector mismatch"
    )
    require(
        verify_submission(submission) == fixture["digest"], "request digest mismatch"
    )

    private_node = copy.deepcopy(submission)
    private_node["evidence"]["bundles"][0]["evidence"]["access"] = {
        "visibility": "owner",
        "owner": submission["actor"],
        "policy_revision": "synthetic",
    }
    private_node["evidence"]["bundles"][0]["digest"] = digest(
        "evidence", private_node["evidence"]["bundles"][0]["evidence"]
    )
    private_node["evidence"]["roots"] = [
        private_node["evidence"]["bundles"][0]["digest"]
    ]
    private_node["result"]["evidence_digests"] = private_node["evidence"]["roots"]
    try:
        verify_submission(private_node)
    except AssertionError:
        pass
    else:
        raise AssertionError("private node was accepted")

    root_mismatch = copy.deepcopy(submission)
    root_mismatch["result"]["evidence_digests"] = ["sha256:" + "a" * 64]
    try:
        verify_submission(root_mismatch)
    except AssertionError:
        pass
    else:
        raise AssertionError("root mismatch was accepted")

    public_lineage = submission_with_public_parent(submission, "derived_from")
    verify_submission(public_lineage)

    cross_subject_conflict = submission_with_public_parent(
        submission,
        "conflicts_with",
        "0x3333333333333333333333333333333333333333",
    )
    try:
        verify_submission(cross_subject_conflict)
    except AssertionError:
        pass
    else:
        raise AssertionError("cross-subject conflict was accepted")

    require(
        fixture["canonical"] != fixture["canonical"] + " ",
        "canonical tampering vector is not distinct",
    )
    print("v2 public-submission contract, public closure, and request digest verified")


if __name__ == "__main__":
    main()
