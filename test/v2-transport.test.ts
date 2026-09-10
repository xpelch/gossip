import assert from "node:assert/strict";
import test from "node:test";
import { Wallet } from "ethers";
import {
  GOSSIP_V2_HEADERS,
  verifyGossipV2HttpRequest,
} from "../src/http-auth-v2.js";
import { createV2SignedFetch } from "../src/transport.js";

const wallet = new Wallet(`0x${"00".repeat(31)}01`);
const endpoint = "https://gossip.example/mcp";
const audience = "https://gossip.example/";

test("v2 transport signs the exact MCP request with the frozen profile", async () => {
  let captured: Request | undefined;
  const signed = createV2SignedFetch(
    wallet,
    { endpoint, audience },
    async (input, init) => {
      captured = new Request(input, init);
      return new Response("{}", {
        headers: { "content-type": "application/json" },
      });
    },
  );
  const body = '{"jsonrpc":"2.0","id":1,"method":"tools/list"}';

  await signed(endpoint, { method: "POST", body });

  assert.ok(captured);
  const bodyBytes = new Uint8Array(await captured.clone().arrayBuffer());
  const verified = verifyGossipV2HttpRequest(
    {
      audience,
      endpoint,
      method: captured.method,
      target: "/mcp",
      body: bodyBytes,
      headers: Object.fromEntries(captured.headers.entries()),
    },
    Math.floor(Date.now() / 1000),
    { audience, endpoint },
  );
  assert.equal(verified.address, wallet.address.toLowerCase());
  assert.equal(
    captured.headers.get(GOSSIP_V2_HEADERS.profile),
    "gossip-eip191-v2",
  );
  assert.equal(captured.redirect, "error");
});

test("v2 transport refuses destination drift and caller-supplied auth", async () => {
  let sent = false;
  const signed = createV2SignedFetch(
    wallet,
    { endpoint, audience },
    async () => {
      sent = true;
      return new Response("{}");
    },
  );

  await assert.rejects(
    signed("https://evil.example/mcp", { method: "POST", body: "{}" }),
    /destination/i,
  );
  await assert.rejects(
    signed(endpoint, {
      method: "POST",
      headers: { "X-Gossip-Signature": "caller-controlled" },
      body: "{}",
    }),
    /authentication header/i,
  );
  await assert.rejects(
    signed(endpoint, {
      method: "POST",
      headers: { "X-Sherwood-Signature": "legacy" },
      body: "{}",
    }),
    /authentication header/i,
  );
  await assert.rejects(
    signed(endpoint, {
      method: "POST",
      headers: { Authorization: "Bearer caller-controlled" },
      body: "{}",
    }),
    /authentication header/i,
  );
  assert.equal(sent, false);
});

test("v2 transport validates its endpoint and signer identity", async () => {
  assert.throws(
    () =>
      createV2SignedFetch(wallet, {
        endpoint: "http://localhost/mcp",
        audience,
      }),
    /HTTPS/i,
  );

  const wrongIdentity = {
    address: "0x0000000000000000000000000000000000000002",
    signMessage: (message: string | Uint8Array) => wallet.signMessage(message),
  };
  const signed = createV2SignedFetch(
    wrongIdentity,
    { endpoint, audience },
    async () => new Response("{}"),
  );
  await assert.rejects(
    signed(endpoint, { method: "POST", body: "{}" }),
    /different identity/i,
  );
});
