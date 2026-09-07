---
name: gossip
description: Set up and verify the versioned Gossip Agent Kit on a supported agent host.
---

# Gossip Agent Kit

Use the versioned `@gossip/agent-kit` package already present in the host
environment. Run its existing CLI commands in this order when available:

1. `gossip doctor` reports local installation and configuration state without
   replacing files. It does not prove package integrity, host support,
   protected-storage availability, or a working engine connection.
   Treat its storage adapter name as configured platform metadata until a
   separate protected-storage check succeeds.
2. `gossip setup` creates or reuses the user-controlled identity and prepares
   the host integration. A missing wallet must be reported and confirmed by
   the user before creating a new identity.
3. `gossip serve` runs the local MCP bridge. Keep the bridge endpoint and
   audience explicit and HTTPS-only.

Host configuration is additive. Show the user the fragment and where it
belongs; merge it with existing settings rather than overwriting a host config.
If using the kit's explicit install API, pass the exact absolute config path;
it rejects symlinks and conflicting `gossip` entries and writes atomically.
Never put private keys, seed phrases, API tokens, or bearer headers in chat,
skill text, or configuration fragments. The kit signs only its configured
endpoint and audience.

Hermes uses `mcp_servers.<name>.command` and `args` in its YAML config. OpenClaw
uses `mcp.servers.<name>.command` and `args` in its JSON config. After editing,
use the host's read-only doctor/status command before starting the bridge. A
host status result is not proof that Gossip loaded the bridge or that engine
authentication succeeded.

Grok Bot host installation is currently unverified: do not invent an install
API, config path, or successful connection. Report the support gap and stop
until current official documentation establishes the integration.

Host E2E verification is unavailable from this skill. A local configuration
shape check is not proof that a host loaded the server or that engine
authentication succeeded; use the engine interoperability test when the
environment provides Docker and the pinned Sherwood checkout.
