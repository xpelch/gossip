# Host onboarding

`hostConfiguration(host, command, args)` returns a configuration fragment and
instructions. Its `verified` value is false for every host: documented schema
support is not a live host or engine verification.

`installHost` and `uninstallHost` are the explicit file mutation APIs. They
require an absolute caller-provided path, reject symlinks, preserve existing
YAML comments and servers, make idempotent exact installs, reject conflicting
`gossip` entries, and remove only an exact installed command/args pair.
Writes use a same-directory temporary file and a unique backup for an existing
file. Grok Bot fails closed because no documented configuration API exists.

Hermes receives a YAML-shaped fragment under `mcp_servers`:

```yaml
mcp_servers:
  gossip:
    command: gossip
    args: [serve]
```

OpenClaw receives a JSON-shaped fragment under `mcp.servers`:

```json
{
  "mcp": {
    "servers": {
      "gossip": { "command": "gossip", "args": ["serve"] }
    }
  }
}
```

The caller must merge either fragment into the existing host configuration.
The function's `verified` flag describes the documented configuration shape;
it does not claim that a particular host installation or engine connection was
tested. Host end-to-end verification remains unavailable in this package.

Grok Bot returns an instructions result with `verified: false` and no invented
configuration because current official documentation does not establish an
MCP installation or configuration API for the host.

The shapes are based on the official Hermes MCP documentation and OpenClaw MCP
reference:

- [Hermes MCP servers](https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/features/mcp.md)
- [OpenClaw MCP CLI](https://docs.openclaw.ai/cli/mcp)
- [OpenClaw configuration reference](https://github.com/openclaw/openclaw/blob/main/docs/gateway/configuration-reference.md)
