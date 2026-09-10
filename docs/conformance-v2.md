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
   identity-session, privacy, and manifest verifiers from the installed package;
6. scans public evidence summaries;
7. writes `acceptance-manifest.json` and its referenced evidence files.

The first manifest is expected to decide `blocked`. It proves packaging and
portable contracts; it does not exercise Sherwood, MCP/HTTP parity, durable
database behavior, process faults, private storage, or a second clean replay.

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

## Remaining process harness

The next slice launches one pinned Sherwood artifact with disposable PostgreSQL
and controlled chain fixtures. Installed MCP and signed HTTP requests must hit
that same application. It will run the 100-request exactly-once case, conflict,
zero-cost reconciliation, restart, frozen persistence faults, evidence/reorg,
owner isolation, and privacy canary scenarios.

Session authorization, encrypted private-evidence operations, production
receipt trust, and high-trust independent reproduction remain blocked until
their respective engine contracts exist. Real Grok Bot, Hermes, OpenClaw, and
public endpoint claims belong to issue #18.
