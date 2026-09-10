import assert from "node:assert/strict";
import test from "node:test";
import { resolve } from "node:path";
import {
  isCanonicalSherwoodOrigin,
  parseConformanceArguments,
  parseTrxResult,
} from "../scripts/conformance-runner-options.mjs";

const commit = "6f5739c5".repeat(5);
const output = resolve("gossip-v2-acceptance");
const sherwoodRepository = resolve("sherwood");

test("parses an exact local Sherwood source and commit in either option order", () => {
  assert.deepEqual(
    parseConformanceArguments([
      "--sherwood-commit",
      commit,
      "--output",
      output,
      "--sherwood-repository",
      sherwoodRepository,
    ]),
    {
      output,
      sherwoodRepository,
      sherwoodCommit: commit,
    },
  );
});

test("rejects incomplete or ambiguous Sherwood options", () => {
  assert.throws(
    () =>
      parseConformanceArguments([
        "--output",
        output,
        "--sherwood-commit",
        commit,
      ]),
    /repository/i,
  );
  assert.throws(
    () =>
      parseConformanceArguments([
        "--output",
        output,
        "--sherwood-repository",
        sherwoodRepository,
      ]),
    /commit/i,
  );
  assert.throws(
    () =>
      parseConformanceArguments([
        "--output",
        output,
        "--sherwood-commit",
        commit.toUpperCase(),
        "--sherwood-repository",
        sherwoodRepository,
      ]),
    /commit/i,
  );
  assert.throws(
    () => parseConformanceArguments(["--output", output, "--unknown", "value"]),
    /usage/i,
  );
  assert.throws(
    () =>
      parseConformanceArguments([
        "--output",
        output,
        "--sherwood-repository",
        "relative/sherwood",
        "--sherwood-commit",
        commit,
      ]),
    /absolute/i,
  );
  assert.throws(
    () => parseConformanceArguments(["--output", output, "--output", output]),
    /usage/i,
  );
  assert.throws(
    () =>
      parseConformanceArguments([
        "--output",
        output,
        "--sherwood-repository",
        sherwoodRepository,
        "--sherwood-repository",
        sherwoodRepository,
        "--sherwood-commit",
        commit,
      ]),
    /absolute/i,
  );
  assert.throws(
    () =>
      parseConformanceArguments([
        "--output",
        output,
        "--sherwood-repository",
        sherwoodRepository,
        "--sherwood-commit",
        commit,
        "--sherwood-commit",
        commit,
      ]),
    /commit/i,
  );
});

test("accepts only canonical Sherwood HTTPS and SSH origins", () => {
  for (const origin of [
    "https://github.com/xpelch/sherwood",
    "https://github.com/xpelch/sherwood.git",
    "git@github.com:xpelch/sherwood.git",
    "ssh://git@github.com/xpelch/sherwood.git",
  ]) {
    assert.equal(isCanonicalSherwoodOrigin(origin), true, origin);
  }
  for (const origin of [
    "https://user:password@github.com/xpelch/sherwood",
    "https://github.com/xpelch/other",
    "file:///tmp/sherwood",
  ]) {
    assert.equal(isCanonicalSherwoodOrigin(origin), false, origin);
  }
});

test("accepts the xUnit TRX counter shape without an optional skipped attribute", () => {
  const fqn =
    "Sherwood.Tests.GossipV2ProcessConformanceTests.A_real_process_serves_signed_http_and_mcp_and_replays_after_restart";
  const trx = `
    <TestMethod className="Sherwood.Tests.GossipV2ProcessConformanceTests" name="A_real_process_serves_signed_http_and_mcp_and_replays_after_restart" />
    <Counters total="1" executed="1" passed="1" failed="0" error="0" notExecuted="0" />`;

  assert.deepEqual(parseTrxResult(trx, fqn), {
    total: 1,
    executed: 1,
    passed: 1,
    failed: 0,
    error: 0,
    notExecuted: 0,
    skipped: 0,
  });
  assert.throws(
    () => parseTrxResult(trx.replace('passed="1"', 'passed="0"'), fqn),
    /pass contract/i,
  );
});
