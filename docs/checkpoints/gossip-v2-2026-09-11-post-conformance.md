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

- [Gossip #28](https://github.com/xpelch/gossip/pull/28), published-evidence commit
  `25124f6d684d57afaee1c5d84a9c83e07c1c72d0`;
- [Sherwood #464](https://github.com/xpelch/sherwood/pull/464), branch head
  `3432ed1421854954dd6f1db74335bc24cf42a720` and tested engine commit
  `017e592401b5a79edfbf9b2b7c8df01bd2cd555b`.

The public package freezes canonical v2 consultation, evidence, receipt,
identity-session, and public-submission contracts. Its conformance runner now
pins Sherwood `017e592401b5a79edfbf9b2b7c8df01bd2cd555b` and thirteen
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

- run A: `sha256:263bdb8b21f6525994e178254c7a11e3da327ace02ea05b2f9c256958a4515f0`;
- run B: `sha256:0f57921e75237ca498a070eff4ff5256f11d31b300cad7a10d299ce706aaf5b1`;
- comparison projection:
  `sha256:a8e22baa45c4e921376fdee2a50378faf624ba8f8a57c5bcead6afc4bcc2b8ef`;
- replay attestation:
  `sha256:045bb4b0bd46c61d270e189cdb20a5300b6ed793bb030c31600c3f459e3ead47`.

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

The GitHub deployment record for Sherwood production reports deployment
`6400689362` as successful at commit
`33ed9bf96106087e46fcad25dc62a1191f278ee0`. A direct, read-only Railway query
confirms the `engine` service is running from that commit and image digest
`sha256:9e1c8f58fd2374ad7c1f01aea10c273c1fe1f00c365880b25384e48dc554bc4e`
at `https://engine-production-c4d8.up.railway.app`. Its `/health` route returns
HTTP 200 and unauthenticated `POST /mcp` returns HTTP 401, while
`GET /v2/gossip/capabilities` returns HTTP 404.

The deployed commit does not contain the tested Gossip v2 branch commit
`017e592401b5a79edfbf9b2b7c8df01bd2cd555b`. No Gossip v2 endpoint or audience
is therefore active on the public service. GitHub records no Gossip repository
deployment and neither repository has a GitHub release. This proves that the
existing Sherwood deployment is healthy but cannot be promoted to Gossip v2
acceptance.

## Resume sequence

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
