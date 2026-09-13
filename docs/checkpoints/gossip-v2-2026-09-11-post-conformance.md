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

- [Gossip #28](https://github.com/xpelch/gossip/pull/28), tested package commit
  `88779d3dbf4e5dc46c16bbf2abcbcda9b5394268`;
- [Sherwood #464](https://github.com/xpelch/sherwood/pull/464), branch head
  `bfcd2200a1cca4c8a4f78ec9f3c7357973bb7533` and tested engine commit
  `bfcd2200a1cca4c8a4f78ec9f3c7357973bb7533`.

The public package freezes canonical v2 consultation, evidence, receipt,
identity-session, and public-submission contracts. Its installable
`gossip-eip191-v2` profile connects the signed v2 transport and exposes the six
v2 agent tools. Its conformance runner now
pins Sherwood `bfcd2200a1cca4c8a4f78ec9f3c7357973bb7533` and thirteen
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

- 195 tests, with two expected platform-specific skips and zero failures;
- `npm run build`;
- `npm run typecheck`;
- all nine independent Python verifiers.

The latest Sherwood Gossip v2 and wallet-authentication suite passed 361 of 361 tests. The application
facade and exact public-submission process slice passed 17 of 17 tests after the
final capability and diagnostics review. The Sherwood build completed with no
warnings or errors.

Two independent clean-source executions of conformance suite
`gossip-v2-conformance-2026-09-11.12` passed. Each run cloned, built, packed,
and installed the public kit, cloned the pinned Sherwood commit, built a Release
assembly, and ran the thirteen real-process scenarios against disposable
PostgreSQL and Kestrel instances.

The stable replay comparison matched:

- run A: `sha256:94eb14d2dd600c7b15fb5c6cc4d63f45b1b88c8ef6da347f5ec876d63b62e0ed`;
- run B: `sha256:29acd5dd2672fe4a3053d84eefb8f1a96cd42e30db168556ac295aada77e923f`;
- comparison projection:
  `sha256:46a4c270b241e95377edc691ec5bbb1cf446b31ade4d6361fd9aed8923696c86`;
- replay attestation:
  `sha256:f6fc8c93096eb8c271c2296443ce8ddae38ae010e4f7935012117a41dbe02df4`.

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

## External deployment audit

The current known Sherwood production state is commit
`d71207e96c21a28c1487436eff665ed14dc0a64b`. The deployment is healthy: its
`/health` route returns HTTP 200 and unauthenticated `POST /mcp` returns HTTP
401. The anonymous `GET /v2/gossip/capabilities` route also returns HTTP 401,
which confirms the route is protected rather than absent.

The deployed Sherwood commit is not a signed, production-accepted Gossip v2
release. Signed production acceptance, version-pinned Grok Bot/Hermes/OpenClaw
host acceptance, and a published package or GitHub release remain blocked.
The healthy deployment therefore cannot be promoted to Gossip v2 acceptance
from these probes alone. The artifact-only provenance workflow records package
bytes for review but does not publish or authorize a release.

## Resume sequence

Follow the exact [production rollout runbook](../runbooks/gossip-v2-production-rollout.md)
for configuration, acceptance, promotion, and rollback.

1. Review and merge the two stacks from their `main` bases upward so their
   pinned contracts remain aligned. Gossip order: #5, #7, #10, #13, #19,
   #20, #21, #22, #23, #24, #25, #26, #27, #28. Sherwood order: #449,
   #450, #451, #452, #453, #454, #455, #457, #458, #460, #463, #464.
   Every listed PR is currently open and the GitHub mergeability audit found
   no known conflict; recheck each head immediately before merging.
2. Provision the public endpoint and release artifact, then record their exact
   identities and provenance.
3. Run the published conformance command on each advertised host.
4. Approve the numeric SLOs and production trust policies.
5. Publish a new final WS7 manifest and release decision, then close epic #3.
