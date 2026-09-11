# Gossip v2 conformance harness

Issue [#17](https://github.com/xpelch/gossip/issues/17) requires one disposable,
version-pinned run across the installed Gossip process and Sherwood. The current
harness implements the public manifest and the offline installed-artifact slice.

## Run the offline slice

Use a clean checkout with Node 24, npm, and Python. Choose a new absolute output
directory:

```powershell
npm ci --ignore-scripts
npm run conformance:v2:offline -- --output C:\temp\gossip-v2-acceptance
```

The runner:

1. rejects a dirty source checkout;
2. builds and packs the exact commit;
3. hashes the tarball and installs it through `scripts/install.mjs` with package
   lifecycle scripts disabled;
4. invokes the installed CLI in a disposable empty state directory;
5. runs the independent canonical, evidence, receipt-authentication,
   identity-session, privacy, public-submission, public-submission-receipt,
   public-evidence-document, and manifest verifiers from the installed package;
6. scans public evidence summaries;
7. writes `acceptance-manifest.json` and its referenced evidence files.

The first manifest is expected to decide `blocked`. It proves packaging and
portable contracts; it does not exercise Sherwood, MCP/HTTP parity, durable
database behavior, process faults, private storage, or a second clean replay.
The current offline fixture suite is conformance revision `.9` and includes the
exact-digest public evidence document vector.

## Optional Sherwood process evidence

The runner can execute the process-faithful Sherwood slice when the caller
supplies an absolute, clean local checkout and an exact commit:

```powershell
node scripts/run-v2-conformance.mjs --output C:\temp\gossip-v2-acceptance --sherwood-repository C:\src\sherwood --sherwood-commit 478e7053ad4a9328939d6f656f51ca64f7f8b379
```

The commit value must be 40 lowercase hexadecimal characters. The local
checkout must have the canonical `xpelch/sherwood` HTTPS or SSH origin, no
working-tree changes, and no reparse-point root. The runner clones it without
hardlinks, detaches the requested commit, restores and builds the Sherwood
test project in Release mode with continuous-integration determinism enabled
and the temporary source root mapped to `/_/`. It then runs all ten exact
process test FQNs in one bounded TRX result. The stable source mapping keeps the
assembly digest independent of the temporary clone path. The supplied checkout
is executable source code and therefore an explicit caller trust boundary; the
commit must be the full 40-character value resolved from that clean checkout.

The public evidence summary records only hashes, sizes, counters, revisions,
runtime versions and boolean assertions. Raw child output and TRX data remain
in disposable restricted storage and are scanned before summary derivation;
paths, remotes, requests, receipts, signatures, keys, connection strings and
canaries are never published. Passing all ten tests promotes
`mcp_http_parity`, `privacy_canary_scan`, `operation_exactly_once`,
`operation_conflict`, `authentication_fail_closed`,
`session_scope_escape`, `zero_cost_reconciliation`, and
`persistence_fault_recovery`, and `owner_isolation` to `verified`.
The owner-isolation gate covers operations, receipts, encrypted private
payloads, export, correction, deletion, access audit, cross-owner failures, and
privacy fault recovery under the synthetic policy. `private_submission` remains
blocked until the production retention, hold, key-rotation, backup-erasure, and
approval gates pass. The fault tests prove
zero-cost reconciliation after a killed process and transactional rollback at
a frozen persistence cut point. No capability is promoted to `verified`, and
the overall decision remains `blocked` because the run produces an assembly
but no production image, controlled reorg/correction evidence, or independent
clean replay.
The process uses loopback HTTP while authenticating against logical HTTPS
endpoint and audience values. The server session registry and bounded
transports are exercised, so `session_keys` becomes `installed`; protected
client storage, real host integration, TLS, images, the remaining fault matrix,
and clean replay remain unverified. A timed `execFile` kill can leave
descendant processes on some platforms; the Sherwood test has deterministic
cleanup, and this residual is reported rather than hidden.

## Interpret the result

The manifest uses the same readiness vocabulary as capability discovery:

- `verified`: cited process evidence passed;
- `installed`: code exists but its live seam was not proven;
- `blocked`: a required dependency or scenario is missing;
- `not_applicable`: outside the pinned profile, with a next action for any
  future adoption.

An artifact digest is evidence of bytes, not behavior. A content address proves
that the statement was not modified after generation; it does not authenticate
who ran it or authorize a capability.

## Compare a clean replay

Run the conformance command again from a clean checkout and compare the two
published manifests:

```powershell
python scripts/verify-v2-conformance-manifest.py `
  --manifest C:\temp\gossip-v2-acceptance\acceptance-manifest.json `
  --replay-manifest C:\temp\gossip-v2-acceptance-replay\acceptance-manifest.json `
  --write-replay-attestation C:\temp\gossip-v2-replay-attestation.json
```

The verifier independently checks both manifests, their referenced file
digests, and their content addresses. It then compares the pinned source,
artifact, runtime, revision and fixture inputs together with every scenario
status, verified assertion count, capability state, and the overall decision.
Generated timestamps and dynamic process-evidence bytes are allowed to differ
between runs.

After both inputs pass, the optional output is a content-addressed
`gossip.replay-attestation-envelope.v1`. It binds both source manifest content
addresses to the digest of the stable comparison projection and records
`result: matched`. The verifier creates this file only after the comparison and
refuses to replace an existing file. Each source manifest keeps
`clean_checkout_reproduction` blocked because one run cannot prove its own
independent replay; the separate attestation is the aggregate proof.

## Remaining process harness

The controlled-source slice now proves stale, wrong-chain, wrong block/hash and
source-reorged refusals through both transports. The next slice must cover
missing-source injection, post-publication reorg quarantine, correction, and
supersession without weakening the ten existing process gates.

Protected session-key storage, production privacy operations, production receipt
trust, and high-trust independent reproduction remain blocked until their
respective gates pass. Real Grok Bot, Hermes, OpenClaw, and public endpoint
claims belong to issue #18.
