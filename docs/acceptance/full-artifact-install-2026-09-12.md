# Full artifact installation acceptance — 2026-09-12

Scope: the checksum-verifying `scripts/install.mjs` path required by
[issue #1](https://github.com/xpelch/gossip/issues/1) and WS0 of
[epic #3](https://github.com/xpelch/gossip/issues/3).

## Immutable inputs

| Field            | Value                                                                                   |
| ---------------- | --------------------------------------------------------------------------------------- |
| Repository       | `xpelch/gossip`                                                                         |
| Source commit    | `95fcf79d9b31557e75b5ab472f4486548561a65a`                                              |
| Package          | `@gossip/agent-kit@0.1.0-dev.1`                                                         |
| Artifact bytes   | `15,097,786`                                                                            |
| Artifact SHA-256 | `66a958af73a354ffea46f1588733f3eddc124a29e62bbbe4764d9794eb795c2c`                      |
| Provenance run   | [GitHub Actions 34726756316](https://github.com/xpelch/gossip/actions/runs/34726756316) |

The downloaded tarball passed `gh attestation verify --repo xpelch/gossip`
before this installation run. The provenance manifest reports passed install,
typecheck, test, build, and pack checks with Node `v24.20.0` and npm `11.19.0`.

## Independent Windows installation

The full artifact was installed into a new temporary directory on Microsoft
Windows `10.0.26200` with Node `v24.13.1` and npm `11.8.0`:

```powershell
node scripts/install.mjs `
  --artifact <absolute-path-to-attested-tarball> `
  --sha256 66a958af73a354ffea46f1588733f3eddc124a29e62bbbe4764d9794eb795c2c `
  --destination <absolute-new-temporary-directory>
```

The installer exited `0` after `72,897 ms`, below its current ten-minute
deadline. It wrote `.gossip-install.json` with the expected digest, package name,
and package version. A rerun against the same destination exited `0` after
`81 ms` and reported that the artifact was already installed.

The installed `dist/cli.js --help` process exited `0`. With a new empty state
directory, installed `status` and `doctor` both exited `0` and reported:

- `kitAvailable: true`;
- runtime `24.13.1` and supported;
- `configured: false`, `connected: false`, and `connectionChecked: false`;
- no identity;
- Windows DPAPI selected but not claimed as verified by `status`; and
- one actionable setup command as the next step.

This resolves the earlier 120-second wrapper-timeout finding for the current
attested Windows artifact. It does not establish a cold-cache timing bound on
other operating systems or a real host integration.

## Remaining boundary

Installation is still separate from protected identity creation, host
configuration, signed connection, and verified consultation. This run created no
wallet, accessed no endpoint, signed no request, and used no production secret.
Real version-pinned Grok Bot, Hermes, and OpenClaw acceptance remains required.
