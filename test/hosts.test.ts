import test from "node:test";
import assert from "node:assert/strict";
import { hostConfiguration } from "../src/hosts.js";

test("Hermes returns an additive mcp_servers YAML fragment", () => {
  const result = hostConfiguration("hermes", "gossip", ["serve"]);
  assert.equal(result.format, "yaml");
  assert.equal(result.verified, false);
  assert.deepEqual(result.configuration, {
    mcp_servers: { gossip: { command: "gossip", args: ["serve"] } },
  });
  assert.match(result.instructions, /mcp_servers/);
  assert.match(result.instructions, /merge|add/i);
});

test("OpenClaw uses its documented mcp.servers shape", () => {
  const result = hostConfiguration("openclaw", "gossip", ["serve"]);
  assert.equal(result.format, "json");
  assert.equal(result.verified, false);
  assert.deepEqual(result.configuration, {
    mcp: { servers: { gossip: { command: "gossip", args: ["serve"] } } },
  });
});

test("Grok Bot reports the documented support gap without inventing config", () => {
  const result = hostConfiguration("grok-bot", "gossip", ["serve"]);
  assert.equal(result.format, "instructions");
  assert.equal(result.verified, false);
  assert.equal(result.configuration, null);
  assert.match(result.instructions, /documented|unsupported|unverified/i);
  assert.doesNotMatch(result.instructions, /mcp_servers|mcp\.servers/);
});

test("invalid hosts and commands are rejected", () => {
  assert.throws(
    () => hostConfiguration("unknown" as never, "gossip", []),
    /host/i,
  );
  assert.throws(() => hostConfiguration("hermes", "", []), /command/i);
  assert.throws(
    () => hostConfiguration("hermes", "gossip", ["--bad", 1 as never]),
    /args/i,
  );
});
