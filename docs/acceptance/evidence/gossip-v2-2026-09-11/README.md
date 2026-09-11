# Gossip v2 integrated conformance evidence — 2026-09-11

This directory contains two independent clean-source executions of conformance
suite `gossip-v2-conformance-2026-09-11.12` and their replay attestation.

Both executions pinned:

- Gossip commit `30c30676fcc2f601db63181fbcd1326bf17e5926`;
- Sherwood commit `017e592401b5a79edfbf9b2b7c8df01bd2cd555b`;
- protocol `gossip/2-draft.1`;
- the exact thirteen-test Sherwood process contract.

Each run cloned the public source without hardlinks, built and packed the kit,
installed the artifact without lifecycle scripts, cloned the exact clean
Sherwood commit, built the same deterministic Release assembly
`sha256:16ee8ebd41c1ecdaee46a322eba74d5db13b2015f895dd7d1549212b78378974`,
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

- run A: `sha256:263bdb8b21f6525994e178254c7a11e3da327ace02ea05b2f9c256958a4515f0`;
- run B: `sha256:0f57921e75237ca498a070eff4ff5256f11d31b300cad7a10d299ce706aaf5b1`;
- stable comparison projection:
  `sha256:a8e22baa45c4e921376fdee2a50378faf624ba8f8a57c5bcead6afc4bcc2b8ef`;
- replay attestation:
  `sha256:045bb4b0bd46c61d270e189cdb20a5300b6ed793bb030c31600c3f459e3ead47`.

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
