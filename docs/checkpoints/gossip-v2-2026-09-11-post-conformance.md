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
  `e715ce044bd72484b3218da36e2f749a51e9a704`;
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
revision `.12`; the resulting evidence bundle is published below.

## Verification

The public package passed:

- 193 tests, with two expected platform-specific skips and zero failures;
- `npm run build`;
- `npm run typecheck`;
- all nine independent Python verifiers.

The latest Sherwood Gossip v2 suite passed 338 of 338 tests. The application
facade and exact public-submission process slice passed 17 of 17 tests after the
final capability and diagnostics review. The Sherwood build completed with no
warnings or errors.

Two independent clean-source executions of conformance suite
`gossip-v2-conformance-2026-09-11.12` passed. Each run cloned, built, packed,
and installed the public kit, cloned the pinned Sherwood commit, built a Release
assembly, and ran the thirteen real-process scenarios against disposable
PostgreSQL and Kestrel instances.

The stable replay comparison matched:

- run A: `sha256:b6b5f15c1371112034b202c5effad4ad8b75057440298910633045d5119ef44c`;
- run B: `sha256:9bc5f5573b29d8021b4239ba495bb9ba0ce7538a635a91dca1f8bffbb90f6dfc`;
- comparison projection:
  `sha256:6552324c39654dd68c551495076366e4c4f0a07b75f0d45e47a98ae23d6a7989`;
- replay attestation:
  `sha256:a5517f4d26f9af8043cc9f5391c1402dbdab3b0ff83bf123a4868d5aa29dff45`.

The redacted, independently verifiable evidence is published under
[`docs/acceptance/evidence/gossip-v2-2026-09-11`](../acceptance/evidence/gossip-v2-2026-09-11/README.md).

## Current decision

The local protocol milestone and public-submission exit gate are proven. The
thirteen-test process gate verifies 15 scenarios, including the complete local
evidence/finality/reorg and correction/supersession slices. The
`public_submission` capability is installed. The overall release decision
remains `blocked`, which is the truthful result for the current environment.

The following release claims still need external evidence:

1. a public HTTPS endpoint with production TLS and audience;
2. a production package or image with release provenance;
3. version-pinned runs on real Grok Bot, Hermes, and OpenClaw hosts;
4. the applicable protected-storage acceptance on real Linux hosts;
5. approved numeric latency and reconciliation SLOs;
6. production receipt-key trust and rotation policy;
7. production reproduction for every claim designated high trust;
8. approved retention, hold, access-audit, key-rotation, and backup-erasure
   policy before any private submission can be enabled.

These gates must remain visible rather than being inferred from installed code.
They do not weaken the locally proven public protocol and do not authorize
private data handling or transaction execution.

## Resume sequence

1. Review and merge Gossip #28 and Sherwood #464 together so their pinned
   contracts remain aligned.
2. Provision the public endpoint and release artifact, then record their exact
   identities and provenance.
3. Run the published conformance command on each advertised host.
4. Approve the numeric SLOs and production trust policies.
5. Publish a new final WS7 manifest and release decision, then close epic #3.
