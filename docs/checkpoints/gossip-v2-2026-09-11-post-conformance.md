# Gossip v2 post-conformance checkpoint — 2026-09-11

This checkpoint records the reviewable state after the local Gossip v2
conformance milestone. The active objective remains
[issue #3](https://github.com/xpelch/gossip/issues/3). Public evidence
submission is tracked in
[issue #29](https://github.com/xpelch/gossip/issues/29).

## Product boundary

Gossip exchanges, verifies, enriches, and propagates market intelligence.
It does not prepare, sign, submit, or execute trades or blockchain
transactions.

Public evidence submission costs zero earned credit. `private_submission`,
`gossip_feedback`, payments, generic signing, and trading remain blocked.

## Published implementation

The coordinated pull requests use branch `codex/gossip-v2-conformance-final`:

- [Gossip #28](https://github.com/xpelch/gossip/pull/28), public commit
  `15a09683a2b0d90ca2bbd9adf148e222213b73b3`;
- [Sherwood #464](https://github.com/xpelch/sherwood/pull/464), engine commit
  `0752939896b2f7b97d51767d4b6206329d76e14e`.

The public package freezes canonical v2 consultation, evidence, receipt,
identity-session, and public-submission contracts. Its conformance runner now
pins Sherwood `0752939896b2f7b97d51767d4b6206329d76e14e` and thirteen
real-process tests. Sherwood implements the
durable operations, signed receipts, public evidence graph, root and scoped
session authorization, and equivalent HTTP and MCP surfaces.

The latest Sherwood commit extends the real-process matrix with public conflict
lineage, missing retained-source refusal, retained-source dependency outage,
idempotent post-publication reorg quarantine, and rollback at every terminal
persistence cut point. It emits a canonical, digest-only process capture for
requests, responses, evidence, receipts, database state, diagnostics, and
disabled telemetry. The refreshed runner validates that capture under suite
revision `.12`; a new evidence bundle still needs to be published.

## Verification

The public package passed:

- 190 tests, with two expected platform-specific skips and zero failures;
- `npm run build`;
- `npm run typecheck`;
- all nine independent Python verifiers.

The latest Sherwood Gossip v2 suite passed 338 of 338 tests. The application
facade and exact public-submission process slice passed 17 of 17 tests after the
final capability and diagnostics review. The Sherwood build completed with no
warnings or errors.

Two independent clean-source executions of conformance suite
`gossip-v2-conformance-2026-09-11.11` passed. Each run cloned, built, packed,
and installed the public kit, cloned the pinned Sherwood commit, built a Release
assembly, and ran the eleven real-process scenarios against disposable
PostgreSQL and Kestrel instances.

The stable replay comparison matched:

- run A: `sha256:9e1eb22ee851b0d8a6bd791bf49afdc896ccc0613381a6aed342f074bf3312f9`;
- run B: `sha256:6b7dc925c0653fa693a8eadab448bdbdb95adb43b08f1f946e5e62cc9d04d74f`;
- comparison projection:
  `sha256:11b1f5efe02b1b8c313ab43e6c05357bb9e7a9678746f3c354ef6fde56fb616d`;
- replay attestation:
  `sha256:3b5e4d9531ca797d87954e5ea923f6d4ef14e95def8db8bf089bc00ea83d48a3`.

The redacted, independently verifiable evidence is published under
[`docs/acceptance/evidence/gossip-v2-2026-09-11`](../acceptance/evidence/gossip-v2-2026-09-11/README.md).

## Current decision

The local protocol milestone and public-submission exit gate are proven. The
`public_submission_transport` scenario is verified with 18 assertions, and the
`public_submission` capability is installed. The overall release decision
remains `blocked`, which is the truthful result for the current environment.

The following release claims still need external evidence:

1. a public HTTPS endpoint with production TLS and audience;
2. a production package or image with release provenance;
3. version-pinned runs on real Grok Bot, Hermes, and OpenClaw hosts;
4. the applicable protected-storage acceptance on real Linux hosts;
5. approved numeric latency and reconciliation SLOs;
6. production receipt-key trust and rotation policy;
7. controlled evidence for the remaining release fault matrix and every claim
   designated high trust;
8. approved retention, hold, access-audit, key-rotation, and backup-erasure
   policy before any private submission can be enabled.

These gates must remain visible rather than being inferred from installed code.
They do not weaken the locally proven public protocol and do not authorize
private data handling or transaction execution.

## Resume sequence

1. Run the complete public checks and two clean-source conformance executions,
   compare their stable projections, and publish the refreshed evidence.
2. Review and merge Gossip #28 and Sherwood #464 together so their pinned
   contracts remain aligned.
3. Provision the public endpoint and release artifact, then record their exact
   identities and provenance.
4. Run the published conformance command on each advertised host.
5. Approve the numeric SLOs and production trust policies.
6. Publish a new final WS7 manifest and release decision, then close epic #3.
