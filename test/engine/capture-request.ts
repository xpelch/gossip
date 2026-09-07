import { writeFile } from "node:fs/promises";
import { Wallet } from "ethers";
import { createSignedFetch } from "../../src/transport.ts";

const outputPath = process.argv[2];
if (!outputPath) throw new Error("Usage: capture-request.ts <output.json>");

const endpoint = "https://localhost/mcp";
const audience = "https://localhost";
const wallet = Wallet.createRandom();
const body = JSON.stringify({
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "gossip-engine-interop", version: "0.1.0" },
  },
});

const capture = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const request = new Request(input, init);
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => { headers[key] = value; });
  await writeFile(outputPath, JSON.stringify({
    endpoint,
    audience,
    method: request.method,
    path: new URL(request.url).pathname,
    body: await request.text(),
    headers,
    walletAddress: wallet.address,
  }, null, 2) + "\n", "utf8");
  return new Response("{}", { status: 200 });
};

const signedFetch = createSignedFetch(wallet, { endpoint, audience }, capture);
await signedFetch(endpoint, {
  method: "POST",
  headers: {
    "accept": "application/json, text/event-stream",
    "content-type": "application/json",
  },
  body,
});
