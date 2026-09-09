# Gossip Agent Kit

Open-source agent tools for onchain intelligence and private contributions, powered by Sherwood.

## Developer preview

This repository contains a Node.js 24 CLI, a local MCP bridge, protected identity storage, encrypted-keystore import/backup, and Ethereum verification adapters. It is **not yet the public one-prompt release**. Spec [#1](https://github.com/xpelch/gossip/issues/1) remains open; see [remaining acceptance work](docs/acceptance.md).

## Run from source

```sh
npm ci --ignore-scripts
npm run build
node dist/cli.js --help
node dist/cli.js status
```

The explicit `--ignore-scripts` also avoids the upstream Anvil package's Unix-style postinstall on Windows. Its platform binary is supplied as an optional development dependency.

For a development engine, provide its exact HTTPS MCP endpoint and configured audience:

```sh
node dist/cli.js setup --endpoint https://localhost/mcp --audience https://localhost
node dist/cli.js connect
node dist/cli.js standards
```

Use a locally trusted development certificate. Setup does not disable TLS checks. Only a successful signed `agent_access` response enables the bridge. `status` reports stored state without claiming a live connection. `doctor` currently provides setup guidance, not full release-integrity or host verification.

Default state lives in `~/.gossip`; every command accepts `--directory ABSOLUTE_PATH`. Windows uses current-user DPAPI. Linux Secret Service is implemented but has not been exercised on a real Linux host. Other platforms fail closed.

## Existing identity and backup

```sh
node dist/cli.js wallet import --file /absolute/keystore.json --address 0xYourExpectedAddress
node dist/cli.js wallet backup --file /absolute/new-backup.json
```

Passwords are entered through a hidden local terminal, never a CLI argument or agent chat. Import copies a tested ethers JSON keystore into protected storage, checks the expected address, preserves the source, and refuses to replace a different destination identity. It neither moves funds nor migrates registry ownership or private history to a different address. Run setup and connect afterward. External signer providers, recovery phrases and contract-wallet onboarding remain unimplemented.

## Agent integration

The bridge exposes exactly `agent_access`, `agent_consult`, `gossip_submit`, and `gossip_receipt`. Generate a fragment with `host-config --host hermes` or `--host openclaw`. Explicit host installation requires an absolute user-selected config path:

```sh
node dist/cli.js host-install --host hermes --config /absolute/hermes-config.yaml
node dist/cli.js serve
```

Configuration tests do not establish compatibility with a running host. Grok Bot integration is blocked pending a documented and tested path. See [host evidence](docs/hosts.md) and the [setup skill](skills/gossip/SKILL.md).

Submissions and earned-credit use are denied by default. `policy --daily-credit-budget 3 --allow-kind token_discovery` displays the proposed policy and requires local confirmation. A budget reserves one unit per logical consultation, including uncertain outcomes and standard responses. Reservations persist across restarts and concurrent processes sharing the same state directory. Separate installations do not share a budget.

The legacy engine chooses enriched analysis automatically. Without an authorized budget, consultations fail closed until the engine supports atomic standard-only requests. Retry uncertain operations with their original logical ID and content.

`disconnect` disables the bridge but preserves identity and history. Use `host-uninstall` with the same explicit host/config to remove its unchanged entry. Wallet deletion is a separate explicit `wallet delete --confirm-address ...` action. It does not revoke other copies of the key.

## Build and validation

```sh
npm run typecheck
npm test
npm run build
npm pack --ignore-scripts
```

Tests use synthetic identities only. [Engine interoperability](docs/engine-testing.md) uses a pinned private engine checkout and Docker PostgreSQL. [Standards evidence](docs/standards.md) distinguishes local implementation, contract fixtures, and server dependencies. [Artifact installation](docs/install.md) verifies a local tarball digest; no npm package or public endpoint has been published.

New code is Apache-2.0 licensed. Dependency licenses remain with their packages. Read `AGENTS.md`, `CONTEXT.md`, and relevant ADRs before contributing.

For Linux agents missing Node 24, start with the [public prerequisite bootstrap](docs/bootstrap.md). It installs a dedicated runtime without replacing the host's Node version. A standalone `node dist/cli.js wallet create` creates or reuses a protected identity without an endpoint; it still requires Node 24 and working protected storage.

An existing local EOA file can now be attached without copying its key or using Secret Service. See [existing-wallet attachment](docs/existing-wallet.md). This is an explicit existing-wallet option; fresh wallets continue to require supported protected storage. Generic remote signer providers and contract-wallet onboarding remain separate work.

## Setup entry point and Robinhood Chain preview

Use the [setup-gossip skill and command](docs/setup-gossip.md) for wallet-first onboarding, additive host/skill installation, optional signed Gossip connection and default RPC configuration. All options can be orchestrated by the agent from that one skill. Encrypted-keystore migration continues through the existing local `wallet import` command, followed by `setup-gossip --wallet reuse`.

The `network` commands validate chain 4663 and provide read-only balances, token decimals, allowances, receipts and fee data. RPC URLs are saved locally with owner-only file mode where supported; provider paths/query strings are omitted from diagnostic output. Keep provider credentials out of prompts and public configuration.

The trading preview supports a single-pool Uniswap V3 exact-input ERC-20 swap using the officially documented SwapRouter02 and QuoterV2 deployments. `trade quote` returns unsigned intent. `trade authorize` requires local interactive confirmation for one exact account/trade and bounded gas; `trade execute` uses that permission. No standing autonomous trading policy is delivered yet. Use a separate state directory if the trading account differs from the Gossip Identity Wallet; the quoted account must match the wallet explicitly configured in that directory.

Transactions are simulated before signing. Exact-amount approval is supported from zero allowance; nonzero insufficient allowances require owner handling. The local journal is persisted before broadcast; retries resend identical signed bytes and reconcile receipts. Revocation stops new signing and rebroadcast, but cannot revoke already broadcast transactions or token allowances. Processes using the same state directory are serialized; independent installations must not concurrently trade through the same account. After a crashed process, a stale `trade.lock` requires confirming that the process is gone before removing that lock.

Spec #2 remains open: real host runs, the public engine and inherited standards dependencies are not supplied by this preview. Automatic fee replacement, externally consumed nonce recovery, complete reorg acceptance, contract-wallet execution, release provenance and real Uniswap fork acceptance remain pending. Tests use synthetic accounts/contracts, never production funds. Onboarding reports each standard separately instead of claiming universal wallet compliance.

Authoritative deployment inventory: https://developers.uniswap.org/docs/protocols/v3/deployments/v3-robinhood-chain-deployments.md (chain 4663; SwapRouter02 uses standard ERC-20 approval, not Permit2).

## Product direction

[Gossip Protocol v2](docs/proposals/gossip-protocol-v2.md) proposes the next
protocol layer: typed evidence with provenance and freshness, durable receipts,
server-side reconciliation, scoped identities, optional trust adapters, and an
eventual bounded settlement plane. It is a design proposal, not implemented or
accepted compatibility.
