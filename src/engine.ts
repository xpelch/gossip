import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Wallet } from "ethers";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import type { Connection } from "./transport.js";
import { createSignedFetch } from "./transport.js";
import type { Engine } from "./kit.js";

const allowedTools = new Set([
  "agent_access",
  "agent_consult",
  "gossip_submit",
  "gossip_receipt",
]);
export async function connectEngine(
  wallet: Wallet,
  connection: Connection,
): Promise<Engine & { close(): Promise<void> }> {
  const client = new Client({
    name: "gossip-agent-kit",
    version: "0.1.0-dev.1",
  });
  const signedFetch = createSignedFetch(wallet, connection);
  const boundedFetch: typeof fetch = (input, init) =>
    signedFetch(input, {
      ...init,
      signal: init?.signal
        ? AbortSignal.any([init.signal, AbortSignal.timeout(20_000)])
        : AbortSignal.timeout(20_000),
    });
  const transport = new StreamableHTTPClientTransport(
    new URL(connection.endpoint),
    { fetch: boundedFetch },
  );
  try {
    // SDK declares sessionId as required-but-undefined on this transport and optional on Transport.
    await client.connect(transport as Transport, { timeout: 20_000 });
    const discovery = await client.listTools();
    for (const required of allowedTools) {
      if (!discovery.tools.some((tool) => tool.name === required))
        throw new Error("Engine lacks a required Gossip tool.");
    }
  } catch {
    await client.close().catch(() => undefined);
    throw new Error(
      "Engine connection failed. Verify endpoint, HTTPS trust and signing-profile support.",
    );
  }
  return {
    async call(tool, arguments_) {
      if (!allowedTools.has(tool))
        throw new Error("Unsupported Gossip operation.");
      const response = await client.callTool(
        { name: tool, arguments: arguments_ },
        undefined,
        { timeout: 20_000 },
      );
      if (response.isError)
        throw new Error(
          "Engine rejected the operation. Check access; retry with the same logical operation ID.",
        );
      if (response.structuredContent) return response.structuredContent;
      if (Array.isArray(response.content)) {
        const text = response.content.find((block) => block.type === "text");
        if (text && typeof text.text === "string") {
          try {
            return JSON.parse(text.text) as unknown;
          } catch {
            /* malformed engine response */
          }
        }
      }
      throw new Error("Invalid engine response.");
    },
    close: () => client.close(),
  };
}
