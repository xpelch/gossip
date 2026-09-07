import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Wallet, verifyMessage } from "ethers";
import { WalletVault } from "../src/wallet.js";

const unavailableStore = {
  read: async () => {
    throw new Error("keyring absent");
  },
  write: async () => {
    throw new Error("keyring absent");
  },
  remove: async () => {
    throw new Error("keyring absent");
  },
};

test("attach reuses an existing file wallet without keyring access or source mutation", async () => {
  const root = await mkdtemp(join(tmpdir(), "gossip-attach-"));
  const source = join(root, "owner-wallet.json");
  const wallet = Wallet.createRandom();
  const content = JSON.stringify({ privateKey: wallet.privateKey });
  await writeFile(source, content, { mode: 0o600 });
  const directory = join(root, "gossip");
  const vault = new WalletVault(directory, unavailableStore);
  try {
    await vault.attachFile(wallet.address, {
      keyFile: source,
      format: "json-privateKey",
    });
    assert.equal((await vault.create()).address, wallet.address);
    const reopened = new WalletVault(directory, unavailableStore);
    const signer = await reopened.signer();
    const message = "Gossip signer verification v1\nsynthetic";
    assert.equal(
      verifyMessage(message, await signer.signMessage(message)),
      wallet.address,
    );
    const profile = await readFile(join(directory, "wallet.json"), "utf8");
    assert.ok(!profile.includes(wallet.privateKey));
    await vault.remove();
    assert.equal(await readFile(source, "utf8"), content);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a missing source cannot be replaced by wallet creation", async () => {
  const root = await mkdtemp(join(tmpdir(), "gossip-source-"));
  const source = join(root, "key");
  const wallet = Wallet.createRandom();
  await writeFile(source, wallet.privateKey, { mode: 0o600 });
  const directory = join(root, "gossip");
  const vault = new WalletVault(directory, unavailableStore);
  try {
    await vault.attachFile(wallet.address, {
      keyFile: source,
      format: "raw-hex",
    });
    await rm(source);
    await assert.rejects(vault.create(), /signing failed/);
    assert.equal((await vault.identity()).address, wallet.address);
    await assert.rejects(vault.backup("unused"), /owner tools/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

import { execFile } from "node:child_process";
import { promisify } from "node:util";
const run = promisify(execFile);
test("CLI attaches without a keyring and refuses unsupported profile activation", async () => {
  const root = await mkdtemp(join(tmpdir(), "gossip-cli-attach-"));
  const source = join(root, "key");
  const wallet = Wallet.createRandom();
  await writeFile(source, wallet.privateKey, { mode: 0o600 });
  const directory = join(root, "state");
  const cli = [
    join(process.cwd(), "node_modules/tsx/dist/cli.mjs"),
    join(process.cwd(), "src/cli.ts"),
  ];
  const env = { ...process.env, PATH: "", DBUS_SESSION_BUS_ADDRESS: "" };
  try {
    const attached = await run(
      process.execPath,
      [
        ...cli,
        "wallet",
        "attach-file",
        "--file",
        source,
        "--format",
        "raw-hex",
        "--address",
        wallet.address,
        "--directory",
        directory,
      ],
      { env },
    );
    assert.equal(JSON.parse(attached.stdout).address, wallet.address);
    await assert.rejects(
      run(
        process.execPath,
        [
          ...cli,
          "setup",
          "--endpoint",
          "https://gossip.test/mcp",
          "--audience",
          "https://gossip.test",
          "--profile",
          "erc8128",
          "--directory",
          directory,
        ],
        { env },
      ),
    );
    await assert.rejects(readFile(join(directory, "config.yaml")));
    await run(
      process.execPath,
      [
        ...cli,
        "setup",
        "--endpoint",
        "https://gossip.test/mcp",
        "--audience",
        "https://gossip.test",
        "--directory",
        directory,
      ],
      { env },
    );
    const status = await run(
      process.execPath,
      [...cli, "status", "--directory", directory],
      { env },
    );
    assert.equal(
      JSON.parse(status.stdout).configuredStorageAdapter,
      "existing-key-file",
    );
    assert.equal(JSON.parse(status.stdout).connected, false);
    assert.equal(await readFile(source, "utf8"), wallet.privateKey);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
