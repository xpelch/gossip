# Gossip v2 integrated conformance evidence — 2026-09-11

This directory contains two independent clean-source executions of conformance
suite `gossip-v2-conformance-2026-09-11.12` and their replay attestation.

Both executions pinned:

- Gossip commit `88779d3dbf4e5dc46c16bbf2abcbcda9b5394268`;
- Sherwood commit `bfcd2200a1cca4c8a4f78ec9f3c7357973bb7533`;
- protocol `gossip/2-draft.1`;
- the exact thirteen-test Sherwood process contract.

Each run cloned the public source without hardlinks, built and packed the kit,
installed the artifact without lifecycle scripts, cloned the exact clean
Sherwood commit, built the same deterministic Release assembly
`sha256:06a31ce5b7d8f85ed5b92a64037992411b1049dd6784bd7fbc5024657c88271d`,
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

- run A: `sha256:94eb14d2dd600c7b15fb5c6cc4d63f45b1b88c8ef6da347f5ec876d63b62e0ed`;
- run B: `sha256:29acd5dd2672fe4a3053d84eefb8f1a96cd42e30db168556ac295aada77e923f`;
- stable comparison projection:
  `sha256:46a4c270b241e95377edc691ec5bbb1cf446b31ade4d6361fd9aed8923696c86`;
- replay attestation:
  `sha256:f6fc8c93096eb8c271c2296443ce8ddae38ae010e4f7935012117a41dbe02df4`.

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
