# Gossip v2 integrated conformance evidence — 2026-09-11

This directory contains two independent clean-source executions of conformance
suite `gossip-v2-conformance-2026-09-11.11` and their replay attestation.

Both executions pinned:

- Gossip commit `40c87fe7b2434ee3a2e24740ec33a58a92984e29`;
- Sherwood commit `b0a083b23998f978ef837d655ce59f753436807a`;
- protocol `gossip/2-draft.1`;
- the exact eleven-test Sherwood process contract.

Each run cloned the public source without hardlinks, built and packed the kit,
installed the artifact without lifecycle scripts, cloned the exact clean
Sherwood commit, built a deterministic Release assembly, and ran the eleven
real-process tests against disposable PostgreSQL and Kestrel instances.

The `public_submission_transport` scenario is `verified` with 18 assertions.
The `public_submission` capability is `installed`, pending production endpoint,
TLS, and host acceptance. The overall decision remains `blocked` because this
evidence does not claim those production gates.

Content addresses:

- run A: `sha256:9e1eb22ee851b0d8a6bd791bf49afdc896ccc0613381a6aed342f074bf3312f9`;
- run B: `sha256:6b7dc925c0653fa693a8eadab448bdbdb95adb43b08f1f946e5e62cc9d04d74f`;
- stable comparison projection:
  `sha256:11b1f5efe02b1b8c313ab43e6c05357bb9e7a9678746f3c354ef6fde56fb616d`;
- replay attestation:
  `sha256:3b5e4d9531ca797d87954e5ea923f6d4ef14e95def8db8bf089bc00ea83d48a3`.

Verify the published copies from the repository root:

```powershell
python scripts/verify-v2-conformance-manifest.py `
  --manifest docs/acceptance/evidence/gossip-v2-2026-09-11/run-a/acceptance-manifest.json `
  --replay-manifest docs/acceptance/evidence/gossip-v2-2026-09-11/run-b/acceptance-manifest.json
```

The runner scans the published material before writing it. It excludes raw
runtime requests and signatures, keys, connection strings, canaries, source
paths, and unredacted process output. The copied fixtures retain their frozen
public synthetic signatures so independent verifiers can reproduce them.
