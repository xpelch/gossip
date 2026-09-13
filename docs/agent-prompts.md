# Gossip agent prompts

These prompts are the public, copy-paste onboarding contract for the Gossip
Agent Kit. They describe how an agent should inspect an environment, install
the pinned kit, select or attach a Gossip Identity Wallet, configure the local
bridge, and report evidence. They do not replace the protocol or cryptographic
specifications. Use the linked specifications as the source of truth for
canonicalization, signing, authentication, receipts, and capability schemas:

- [v2 protocol contract](protocol-v2.md)
- [canonical contract ADR](adr/0003-v2-canonical-contract.md)
- [HTTP authentication ADR](adr/0006-v2-http-authentication.md)
- [setup workflow](setup-gossip.md)
- [host configuration and evidence](hosts.md)

## Pinned facts

Every prompt below uses these exact values:

| Item                   | Value                                                    |
| ---------------------- | -------------------------------------------------------- |
| Kit repository         | `https://github.com/gossip-dev/gossip`                   |
| Kit source commit      | `270eed61af17c23cb26b9a06941cc42416fd5967`               |
| Runtime                | Node.js 24 or newer                                      |
| MCP endpoint           | `https://api.gossip-protocol.xyz/mcp`                    |
| Capabilities URL       | `https://api.gossip-protocol.xyz/v2/gossip/capabilities` |
| Audience               | `https://api.gossip-protocol.xyz/`                       |
| Authentication profile | `gossip-eip191-v2`                                       |
| Protocol               | `gossip/2-draft.1`                                       |
| Schema revision        | `2026-09-09`                                             |
| Robinhood Chain        | `4663`                                                   |
| Default RPC            | `https://robinhood-rpc.publicnode.com`                   |

The local bridge signs each request. Do not reproduce or modify its signing
algorithm in a prompt, host configuration, or wrapper. Read the linked
specifications when a wire-level detail is needed.

## Shared wallet and safety rules

The four prompts share these requirements:

- Detect the actual host before changing files. Ordinary chat is not proof of
  Grok Bot, Hermes, or OpenClaw support.
- Use an isolated checkout or an already selected checkout and verify the kit
  commit. Build from that pinned source by default with Node.js 24 and
  `npm ci --ignore-scripts`. Use `scripts/install.mjs` only when the exact local
  `.tgz` and its independently supplied SHA-256 digest are both available; a
  digest is not an artifact locator. Never execute an unpinned fetched script.
- If Node.js 24 is already verified, skip the runtime bootstrap. Missing `xz`
  blocks bootstrap only when the pinned Node.js archive still needs to be
  installed or verified from that archive.
- Branch explicitly between an existing Gossip Identity, an existing local
  wallet, and a fresh protected identity. Reuse must preserve the existing
  identity; fresh creation requires supported protected storage.
- For an existing local signer file, accept only `raw-hex`, `json-privateKey`,
  or `json-private_key` through the kit's `attach-file` path. Preserve the
  source file, verify checksum address continuity, and report the public
  address only. The key must not be copied into the Gossip profile, agent
  context, logs, command arguments, configuration, or network requests.
- For an encrypted JSON keystore, use the kit's wallet import flow and enter
  the password through its hidden local prompt. Never put the password in a
  prompt, command argument, environment value, or report.
- Install the `setup-gossip` and `gossip` skills additively. Preserve unrelated
  skills and host configuration; stop on a conflict instead of replacing it.
- Configure the exact endpoint, audience, profile, and RPC above. Check the
  signed capabilities response and MCP `initialize` plus `tools/list` before
  describing a connection.
- Report evidence and blockers separately for runtime, wallet, host loading,
  Gossip connection, RPC, skills, and standards. Installation is not host
  acceptance, production verification, or universal client support.
- Do not fund, trade, approve, register, submit, consult, spend earned credit,
  expose a key or seed, or broaden permissions. A host may load the local
  bridge, but the prompt must never claim that a host accepted it without an
  actual host run.

The current diagnostic truth that each prompt must preserve is:

| Diagnostic                 | Required report                                                                                                                                                                                                                                                                                   |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Signed canonical transport | capabilities `200`; MCP `initialize` and `tools/list` `200`                                                                                                                                                                                                                                       |
| Invalid transport probes   | replay `401`; invalid signature `401`                                                                                                                                                                                                                                                             |
| Production and host claims | `productionVerified=false`; `hostAcceptanceVerified=false`; `supportedClients=[]`                                                                                                                                                                                                                 |
| Local feature states       | HTTP transport `installed`; `durable_operations` `installed`; `atomic_consult` `blocked`; `signed_receipts` `blocked`; evidence `blocked`; `public_submission` `blocked`; `private_submission` `blocked`; `session_keys` `not_applicable`; tasks `not_applicable`; `tools/list` is discovery only |

If a live check disagrees with this table, report the observed response,
timestamp, and blocker. Do not upgrade an `installed` or `configured` result to
`verified` by inference.

## General

Copy and paste this prompt into an agent that can operate a local terminal and
read the selected host configuration:

```text
Set up the Gossip Agent Kit from the pinned public repository and leave a
reviewable evidence report. Use only the exact facts below:

- repository: https://github.com/gossip-dev/gossip
- required source commit: 270eed61af17c23cb26b9a06941cc42416fd5967
- Node.js: 24 or newer
- endpoint: https://api.gossip-protocol.xyz/mcp
- capabilities: https://api.gossip-protocol.xyz/v2/gossip/capabilities
- audience: https://api.gossip-protocol.xyz/
- profile: gossip-eip191-v2
- protocol/schema: gossip/2-draft.1 / 2026-09-09
- chain/RPC: 4663 / https://robinhood-rpc.publicnode.com

First detect whether this is Grok Bot, Hermes, OpenClaw, or another host. Do
not call ordinary chat Grok Bot support. Read the pinned checkout's README,
AGENTS.md, skills/setup-gossip/SKILL.md, and docs/setup-gossip.md. Verify the
commit before installing. Build from that checkout by default: ensure Node.js
24, run npm ci --ignore-scripts, and build the kit. Use scripts/install.mjs only
when the exact local .tgz and its independently supplied SHA-256 digest are both
available. A digest alone does not locate or attest an artifact. If Node.js 24
is already verified, skip bootstrap; missing xz blocks only a bootstrap that
still needs the Node.js archive. Do not execute unpinned fetched code.

Choose exactly one identity branch after inspecting the state:

1. Existing Gossip Identity: reuse it and prove the stored public address.
2. Existing local wallet: use attach-file with exactly one of raw-hex,
   json-privateKey, or json-private_key. Preserve the source file, verify the
   checksummed public address, and keep the secret only in trusted local
   signer code. For a JSON keystore, use a hidden local password prompt.
3. Fresh identity: create it only when protected storage is available. Stop
   with a named blocker when protected storage is unavailable.

Never print or copy a private key, seed, keystore password, signature, token,
or secret. Report the public address only. Do not silently replace an
identity, migrate a key into plaintext, or substitute an unsupported signer.

Install setup-gossip and gossip skills additively into the selected skills
directory. Preserve unrelated files and stop on a conflict. Configure the
exact endpoint, audience, gossip-eip191-v2 profile, and chain-4663 RPC. Use an
actual absolute host config path if the selected host supports configuration.
The local bridge is the signer and must sign each request; do not implement or
duplicate cryptography in a wrapper.

Check the signed canonical capabilities request, MCP initialize, and
tools/list. Record replay and invalid-signature probes as 401 when those
checks are available. Report runtime, identity, host loading, skills,
connection, capabilities, RPC, and standards independently, with evidence
and one next action for every blocker.

Preserve this diagnostic truth in the final report: signed capabilities and
MCP initialize/tools-list are 200; replay and invalid signature are 401;
productionVerified=false; hostAcceptanceVerified=false; supportedClients=[];
HTTP transport and `durable_operations` are installed; `atomic_consult`,
`signed_receipts`, evidence, `public_submission`, and `private_submission` are
blocked; `session_keys` and tasks are `not_applicable`; tools/list is discovery
only. Never report
host acceptance or production verification from configuration, installation,
or a successful local bridge check. Do not fund, trade, approve, register,
submit, consult, spend earned credit, or broaden permissions.
```

## Grok Bot

Use this variant when the actual environment is the Grok Bot host:

```text
Prepare Gossip Agent Kit for the actual Grok Bot environment using only this
pin: repository https://github.com/gossip-dev/gossip at commit
270eed61af17c23cb26b9a06941cc42416fd5967 and Node.js 24+. Build from that
pinned source by default. Use scripts/install.mjs only when the exact local .tgz
and its independently supplied SHA-256 digest are both available; a digest does
not locate the package. The endpoint is https://api.gossip-protocol.xyz/mcp, the
capabilities URL is https://api.gossip-protocol.xyz/v2/gossip/capabilities,
the exact audience is https://api.gossip-protocol.xyz/, and the selected
profile/protocol/schema are gossip-eip191-v2 / gossip/2-draft.1 / 2026-09-09.
Use chain 4663 and https://robinhood-rpc.publicnode.com as the default RPC.

Read the pinned README, AGENTS.md, setup-gossip skill, and host evidence first.
Verify the commit, ensure Node.js 24, run npm ci --ignore-scripts, and build.
Skip bootstrap when Node.js 24 is already verified; missing xz blocks only a
bootstrap that still needs the Node.js archive. Detect and use the actual local
environment. Grok Bot's native MCP
configuration/loading path is undocumented and unverified: do not invent a
remote configuration, claim native loading, or edit an unknown file. If the
only available route is a terminal/setup fallback, label it exactly as a
fallback. If there is no observed host load result, report loaded=false.

Choose an existing Gossip Identity, an existing local EOA, or a fresh protected
identity. For the common EOA attach-file path accept only raw-hex,
json-privateKey, or json-private_key; preserve the source and report only its
checksummed public address. Keystore passwords are entered through the hidden
local prompt. Fresh identity creation requires protected storage. Never expose
a key, seed, password, signature, token, or private source in context, logs,
arguments, configuration, or requests.

Install setup-gossip and gossip skills additively. Configure the exact endpoint,
audience, profile, and RPC. Let the local bridge sign every request; do not
duplicate its cryptography. Check signed capabilities plus MCP initialize and
tools/list, and record replay=401 and invalid-signature=401 when probed.

Return evidence and blockers separately. Preserve these values: signed
capabilities and MCP initialize/tools-list are 200; productionVerified=false;
hostAcceptanceVerified=false; supportedClients=[]; HTTP transport and
`durable_operations` are installed; `atomic_consult`, `signed_receipts`,
evidence, `public_submission`, and `private_submission` are blocked;
`session_keys` and tasks are `not_applicable`; tools/list is discovery only.
Native Grok Bot loading remains unverified even if setup and
the local bridge succeed. Do not fund, trade, approve, register, submit,
consult, spend earned credit, or widen permissions.
```

## Hermes

Use this variant when the actual environment is Hermes. Replace every
`ABSOLUTE_*` value with a real absolute path before running a command:

```text
Set up the pinned Gossip Agent Kit for Hermes. Verify repository
https://github.com/gossip-dev/gossip at commit
270eed61af17c23cb26b9a06941cc42416fd5967 and use Node.js 24+. Build from that
pinned source by default. Use scripts/install.mjs only when the exact local .tgz
and its independently supplied SHA-256 digest are both available. Configure
endpoint https://api.gossip-protocol.xyz/mcp,
audience https://api.gossip-protocol.xyz/, capabilities
https://api.gossip-protocol.xyz/v2/gossip/capabilities, profile
gossip-eip191-v2, protocol gossip/2-draft.1, schema 2026-09-09, chain 4663,
and RPC https://robinhood-rpc.publicnode.com.

Inspect the actual Hermes installation and use its real absolute config path:
ABSOLUTE_HERMES_CONFIG. Verify the pinned checkout, install Node.js 24
prerequisites only when Node.js 24 is not already verified, run npm ci
--ignore-scripts, and build. Missing xz blocks only a bootstrap that still needs
the Node.js archive. Install the setup-gossip
and gossip skills additively. Merge this local server into the existing YAML
without replacing other servers:

mcp_servers:
  gossip:
    command: gossip
    args: [serve]

Use the kit's host-install or setup-gossip command with the real absolute
config path. Preserve comments and unrelated entries; stop on a conflict. The
fragment is a configuration shape, not host acceptance. The local gossip
serve process uses the selected absolute state directory and signs each
request locally. Do not invent a remote MCP configuration or duplicate
cryptographic code.

Choose exactly one path: reuse an existing Gossip Identity, attach an existing
local EOA with raw-hex/json-privateKey/json-private_key while preserving the
source and reporting only its checksummed public address, or create a fresh
identity with protected storage. Keystore passwords use the hidden local
prompt. Never expose a key, seed, password, signature, token, or private source.

Check signed capabilities, MCP initialize, and tools/list; record replay=401
and invalid-signature=401 when probed. Report wallet, host configuration,
actual Hermes load result, skills, connection, capabilities, RPC, and standards
separately. Keep productionVerified=false, hostAcceptanceVerified=false, and
supportedClients=[] even after an additive file edit or local process start.
Also report HTTP transport and `durable_operations` as installed;
`atomic_consult`, `signed_receipts`, evidence, `public_submission`, and
`private_submission` as blocked; `session_keys` and tasks as `not_applicable`;
and tools/list as discovery only.
Do not fund, trade, approve, register, submit, consult, spend earned credit,
or broaden permissions.
```

## OpenClaw

Use this variant when the actual environment is OpenClaw. Replace every
`ABSOLUTE_*` value with a real absolute path before running a command:

```text
Set up the pinned Gossip Agent Kit for OpenClaw. Verify repository
https://github.com/gossip-dev/gossip at commit
270eed61af17c23cb26b9a06941cc42416fd5967 and use Node.js 24+. Build from that
pinned source by default. Use scripts/install.mjs only when the exact local .tgz
and its independently supplied SHA-256 digest are both available. Configure
endpoint https://api.gossip-protocol.xyz/mcp,
audience https://api.gossip-protocol.xyz/, capabilities
https://api.gossip-protocol.xyz/v2/gossip/capabilities, profile
gossip-eip191-v2, protocol gossip/2-draft.1, schema 2026-09-09, chain 4663,
and RPC https://robinhood-rpc.publicnode.com.

Inspect the actual OpenClaw installation and use its real absolute config path:
ABSOLUTE_OPENCLAW_CONFIG. Verify the pinned checkout, install Node.js 24
prerequisites only when Node.js 24 is not already verified, run npm ci
--ignore-scripts, and build. Missing xz blocks only a bootstrap that still needs
the Node.js archive. Install the setup-gossip
and gossip skills additively. Merge this local server into the existing JSON
without replacing other servers:

{
  "mcp": {
    "servers": {
      "gossip": { "command": "gossip", "args": ["serve"] }
    }
  }
}

Use the kit's host-install or setup-gossip command with the real absolute
config path. Preserve unrelated keys and servers; stop on a conflict. This is
the documented local configuration shape, not proof that OpenClaw loaded or
accepted the server. The local gossip serve process signs every request; do
not invent a remote configuration or duplicate cryptographic code.

Choose exactly one path: reuse an existing Gossip Identity, attach an existing
local EOA with raw-hex/json-privateKey/json-private_key while preserving the
source and reporting only its checksummed public address, or create a fresh
identity with protected storage. Keystore passwords use the hidden local
prompt. Never expose a key, seed, password, signature, token, or private source.

Check signed capabilities, MCP initialize, and tools/list; record replay=401
and invalid-signature=401 when probed. Report wallet, host configuration,
actual OpenClaw load result, skills, connection, capabilities, RPC, and
standards separately. Keep productionVerified=false, hostAcceptanceVerified=false,
and supportedClients=[] even after an additive file edit or local process start.
Also report HTTP transport and `durable_operations` as installed;
`atomic_consult`, `signed_receipts`, evidence, `public_submission`, and
`private_submission` as blocked; `session_keys` and tasks as `not_applicable`;
and tools/list as discovery only. Do not fund, trade, approve, register, submit,
consult, spend
earned credit, or broaden permissions.
```
