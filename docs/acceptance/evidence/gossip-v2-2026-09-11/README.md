# Gossip v2 integrated conformance evidence — 2026-09-11

This directory contains two independent clean-source executions of conformance
suite `gossip-v2-conformance-2026-09-11.12` and their replay attestation.

Both executions pinned:

- Gossip commit `e715ce044bd72484b3218da36e2f749a51e9a704`;
- Sherwood commit `0752939896b2f7b97d51767d4b6206329d76e14e`;
- protocol `gossip/2-draft.1`;
- the exact thirteen-test Sherwood process contract.

Each run cloned the public source without hardlinks, built and packed the kit,
installed the artifact without lifecycle scripts, cloned the exact clean
Sherwood commit, built the same deterministic Release assembly
`sha256:2fdb591a994d92824bc51f63bce5d3433740938d86b04dea0d32a2c2ff7446fe`,
and ran the thirteen
real-process tests against disposable PostgreSQL and Kestrel instances.

The process gate now verifies 15 scenarios. In addition to the previous
transport, authentication, exactly-once, zero-cost, session, privacy, and owner
isolation coverage, it proves missing-source refusal, retained-source outage
reconciliation, post-publication reorg quarantine, public conflict lineage,
correction, and supersession. Each run publishes a canonical digest-and-count
capture for the actual request, HTTP/MCP responses, evidence graph, receipt
chain, result, database state, diagnostics, and disabled telemetry.

The `public_submission` capability remains `installed`, pending production
endpoint, TLS, and host acceptance. The overall decision remains `blocked`
because this evidence does not claim those production gates.

Content addresses:

- run A: `sha256:b6b5f15c1371112034b202c5effad4ad8b75057440298910633045d5119ef44c`;
- run B: `sha256:9bc5f5573b29d8021b4239ba495bb9ba0ce7538a635a91dca1f8bffbb90f6dfc`;
- stable comparison projection:
  `sha256:6552324c39654dd68c551495076366e4c4f0a07b75f0d45e47a98ae23d6a7989`;
- replay attestation:
  `sha256:a5517f4d26f9af8043cc9f5391c1402dbdab3b0ff83bf123a4868d5aa29dff45`.

Verify the published copies from the repository root:

```powershell
python scripts/verify-v2-conformance-manifest.py `
  --manifest docs/acceptance/evidence/gossip-v2-2026-09-11/run-a/acceptance-manifest.json `
  --replay-manifest docs/acceptance/evidence/gossip-v2-2026-09-11/run-b/acceptance-manifest.json
```

The runner validates and scans the published capture before writing it. The
capture contains hashes and byte counts rather than raw runtime requests,
signatures, keys, connection strings, canaries, source paths, or process
output. The copied fixtures retain their frozen public synthetic signatures so
independent verifiers can reproduce them.
