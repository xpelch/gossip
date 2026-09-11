# Gossip v2 conformance gap audit

Scope: [Gossip #17](https://github.com/xpelch/gossip/issues/17), audited against
the public runner, manifest parser, independent Python verifiers, and the
optional Sherwood process gate.

The public harness has two evidence levels. The offline run proves the
packaged kit and portable contracts. The optional process run clones a pinned,
clean Sherwood checkout and consumes one exact TRX result containing the seven
process test methods. A capability remains `installed` or `blocked` unless the
manifest has the required process evidence; installation never promotes it to
`verified`.

| Issue #17 acceptance                                                                                 | Current harness state | Evidence or remaining work                                                                                                                                                                                                                                                                  |
| ---------------------------------------------------------------------------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Install the packaged artifact and run the real CLI process                                           | Proven offline        | Clean source clone, `npm ci`, build, pack, installer, isolated CLI help and empty-state status are exercised.                                                                                                                                                                               |
| Send signed MCP and HTTP requests to one application                                                 | Conditional           | The pinned Sherwood process gate runs both transports and maps `mcp_http_parity`; the offline run has no server.                                                                                                                                                                            |
| Synthetic identities, controlled chain and non-production funds                                      | Partial               | Synthetic identities and local process fixtures are required by the Sherwood test contract; controlled-chain and funds evidence remain outside the public runner.                                                                                                                           |
| Capture canonical requests, responses, evidence, receipts, diagnostics, database state and telemetry | Partial               | The runner hashes a redacted process summary and copied fixtures. Raw captures and database state are not published or independently consumed.                                                                                                                                              |
| Tamper, replay, wrong destination, expiry, downgrade and malformed input                             | Conditional           | The process test contract covers authentication and session fail-closed paths; the offline kit verifies portable vectors only.                                                                                                                                                              |
| Fault injection, crash/restart, persistence failure and timeout reconciliation                       | Conditional           | The process gate requires the pause/kill and persistence cut-point tests; no process evidence exists in the default offline manifest.                                                                                                                                                       |
| At least 100 repeated requests with one durable operation and one effect                             | Conditional           | The Sherwood process test is the required boundary; the public runner currently accepts its exact pass result and keeps the scenario blocked otherwise.                                                                                                                                     |
| Operation conflict for reused ID and changed content                                                 | Conditional           | Covered by the pinned process test contract; blocked without that process run.                                                                                                                                                                                                              |
| Zero-cost accounting through retry, crash and timeout                                                | Conditional           | Covered by the process fault test contract; not proven by the offline run.                                                                                                                                                                                                                  |
| Evidence finality, reorg, stale, wrong-chain, missing-source and correction cases                    | Missing               | These scenarios are explicitly blocked in generated manifests and need controlled evidence fixtures through both transports.                                                                                                                                                                |
| Owner isolation for operations, receipts, private evidence, export, deletion and audit               | Partial               | The process gate now proves operation, receipt and private-export isolation, including identical HTTP/MCP export bytes and non-enumerating foreign-owner failures. Deletion, correction and complete access-audit transport coverage remain blocked.                                        |
| MCP structured content and HTTP JSON semantic equivalence                                            | Conditional           | Process parity is available through the pinned Sherwood gate; no standalone public transport client is exercised offline.                                                                                                                                                                   |
| Privacy canary scan over captured output                                                             | Conditional           | The runner scans child output and summaries when a process run is supplied; offline output contains no server capture.                                                                                                                                                                      |
| Independent vector verification                                                                      | Proven offline        | Canonical, evidence, receipt, HTTP auth, identity-session, privacy and manifest verifiers run from the installed artifact.                                                                                                                                                                  |
| Clean-checkout replay reproduces the decision                                                        | Added in this slice   | `verify-v2-conformance-manifest.py --manifest FIRST --replay-manifest SECOND` independently validates both files and compares deterministic source, artifact, runtime, fixture, scenario, capability and decision fields. Dynamic timestamps and evidence bytes are intentionally excluded. |
| Capability states remain honest                                                                      | Proven                | Manifest schema rejects unsupported `verified` states and requires evidence for every verified capability.                                                                                                                                                                                  |

The replay comparison is deliberately narrower than byte-for-byte manifest
equality. A clean replay can legitimately have a different timestamp or
process-output digest while still reproducing the acceptance decision and the
pinned inputs that determine it. Runtime versions must remain identical because
they are part of the reproducible execution boundary. Evidence files are verified
independently by each manifest invocation before the deterministic projection
is compared.

## Replay check

After two runs from clean checkouts, compare their manifests with:

```powershell
python scripts/verify-v2-conformance-manifest.py `
  --manifest C:\temp\gossip-v2-acceptance\acceptance-manifest.json `
  --replay-manifest C:\temp\gossip-v2-acceptance-replay\acceptance-manifest.json
```

The command exits non-zero when either manifest is invalid or when the replay
changes a deterministic scenario, capability, artifact, fixture, revision,
source, or overall decision.
