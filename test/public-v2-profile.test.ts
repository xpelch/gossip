import test from "node:test";
import assert from "node:assert/strict";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { GossipV2Kit } from "../src/kit-v2.js";
import { createV2Bridge } from "../src/bridge.js";
import { Wallet } from "ethers";
import { WalletVault } from "../src/wallet.js";
import { createCredentialStore } from "../src/credential-store.js";
import { prepareConnection } from "../src/setup-connection.js";
import { loadConfiguration } from "../src/configuration.js";

const address = "0x7E5F4552091A69125d5DfCb7b8C2659029395Bdf";

test("setup accepts the installable v2 profile for an existing EOA file", async () => {
  const root = await mkdtemp(join(tmpdir(), "gossip-v2-setup-"));
  const source = join(root, "owner.key");
  const wallet = Wallet.createRandom();
  await writeFile(source, wallet.privateKey, { mode: 0o600 });
  const directory = join(root, "state");
  try {
    const vault = new WalletVault(directory, createCredentialStore(directory));
    await vault.attachFile(wallet.address, {
      keyFile: source,
      format: "raw-hex",
    });
    await prepareConnection(directory, [
      "--endpoint",
      "https://gossip.test/mcp",
      "--audience",
      "https://gossip.test/",
      "--profile",
      "gossip-eip191-v2",
    ]);
    assert.equal(
      (await loadConfiguration(directory)).profile,
      "gossip-eip191-v2",
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("the v2 bridge exposes exactly the six v2 tools and never forwards feedback", async () => {
  const directory = await mkdtemp(join(tmpdir(), "gossip-v2-bridge-"));
  let calls = 0;
  const kit = new GossipV2Kit(
    directory,
    address,
    {
      call: async () => {
        calls++;
        return {};
      },
    },
    { endpoint: "https://gossip.test/mcp", audience: "https://gossip.test/" },
  );
  const server = createV2Bridge(kit);
  const client = new Client({ name: "test", version: "1" });
  const [left, right] = InMemoryTransport.createLinkedPair();
  try {
    await server.connect(left);
    await client.connect(right);
    assert.deepEqual(
      (await client.listTools()).tools.map((tool) => tool.name).sort(),
      [
        "gossip_capabilities",
        "gossip_consult_v2",
        "gossip_feedback",
        "gossip_operation",
        "gossip_receipt_v2",
        "gossip_submit_v2",
      ],
    );
    const result = await client.callTool({
      name: "gossip_feedback",
      arguments: { request: {} },
    });
    assert.equal(result.isError, true);
    assert.equal(calls, 0);
  } finally {
    await client.close();
    await server.close();
    kit.close();
    await rm(directory, { recursive: true, force: true });
  }
});
