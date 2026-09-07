export type SupportedHost = "hermes" | "openclaw" | "grok-bot";

export interface HostConfiguration {
  format: "json" | "yaml" | "instructions";
  configuration: unknown;
  instructions: string;
  verified: boolean;
}

export function hostConfiguration(
  host: SupportedHost,
  command: string,
  args: string[],
): HostConfiguration {
  assertHost(host);
  if (typeof command !== "string" || command.trim() === "") {
    throw new Error("A non-empty host command is required.");
  }
  if (!Array.isArray(args) || args.some((arg) => typeof arg !== "string")) {
    throw new Error("Host command args must be strings.");
  }

  if (host === "hermes") {
    return {
      format: "yaml",
      configuration: { mcp_servers: { gossip: { command, args: [...args] } } },
      instructions:
        "Add this mcp_servers fragment to Hermes configuration without replacing existing servers, then run `hermes mcp status` or reload MCP.",
      verified: false,
    };
  }

  if (host === "openclaw") {
    return {
      format: "json",
      configuration: {
        mcp: { servers: { gossip: { command, args: [...args] } } },
      },
      instructions:
        "Merge this mcp.servers fragment into OpenClaw configuration without replacing existing servers, then run `openclaw mcp doctor` and `openclaw mcp status`.",
      verified: false,
    };
  }

  return {
    format: "instructions",
    configuration: null,
    instructions:
      "Grok Bot MCP installation/configuration is unverified because no current official host configuration or install API is documented. Do not claim setup succeeded; use the documented Gossip release and host guidance when an official integration becomes available.",
    verified: false,
  };
}

function assertHost(host: string): asserts host is SupportedHost {
  if (host !== "hermes" && host !== "openclaw" && host !== "grok-bot") {
    throw new Error(`Unsupported host: ${host}`);
  }
}
