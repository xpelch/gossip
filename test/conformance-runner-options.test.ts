import assert from "node:assert/strict";
import test from "node:test";
import { resolve } from "node:path";
import {
  isCanonicalSherwoodOrigin,
  parseConformanceArguments,
  parseTrxResults,
  parseTrxResult,
  sherwoodDeterministicBuildProperties,
  SHERWOOD_PROCESS_TEST_FQNS,
} from "../scripts/conformance-runner-options.mjs";

const commit = "6f5739c5".repeat(5);
const output = resolve("gossip-v2-acceptance");
const sherwoodRepository = resolve("sherwood");

test("maps clean Sherwood builds to one deterministic source root", () => {
  assert.deepEqual(sherwoodDeterministicBuildProperties(sherwoodRepository), [
    "-p:ContinuousIntegrationBuild=true",
    `-p:PathMap=${sherwoodRepository}=/_/`,
  ]);
});

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
    <UnitTestResult testName="${fqn}" outcome="Passed" />
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

test("requires all exact Sherwood process test outcomes in one TRX", () => {
  const [first, second, third, fourth, fifth, sixth, seventh] =
    SHERWOOD_PROCESS_TEST_FQNS;
  const trx = `
    <TestMethod className="Sherwood.Tests.GossipV2ProcessConformanceTests" name="A_real_process_serves_signed_http_and_mcp_and_replays_after_restart" />
    <TestMethod className="Sherwood.Tests.GossipV2ProcessConformanceTests" name="A_real_process_enforces_concurrency_conflicts_authentication_and_owner_isolation" />
    <TestMethod className="Sherwood.Tests.GossipV2ProcessConformanceTests" name="A_real_process_serves_registered_identity_session_over_http_and_mcp_and_preserves_root_ownership_after_restart" />
    <TestMethod className="Sherwood.Tests.GossipV2ProcessConformanceTests" name="A_real_process_enforces_identity_session_replay_revocation_rate_and_malformed_downgrade_fail_closed" />
    <TestMethod className="Sherwood.Tests.GossipV2ProcessConformanceTests" name="A_paused_process_kill_restarts_into_reconciliation_without_reexecution" />
    <TestMethod className="Sherwood.Tests.GossipV2ProcessConformanceTests" name="A_throwing_persistence_cut_point_rolls_back_and_requires_reconciliation" />
    <TestMethod className="Sherwood.Tests.GossipV2ProcessConformanceTests" name="A_real_process_keeps_private_export_owner_scoped_and_matches_http_with_mcp" />
    <UnitTestResult testName="${first}" outcome="Passed" />
    <UnitTestResult testName="${second}" outcome="Passed" />
    <UnitTestResult testName="${third}" outcome="Passed" />
    <UnitTestResult testName="${fourth}" outcome="Passed" />
    <UnitTestResult testName="${fifth}" outcome="Passed" />
    <UnitTestResult testName="${sixth}" outcome="Passed" />
    <UnitTestResult testName="${seventh}" outcome="Passed" />
    <Counters total="7" executed="7" passed="7" failed="0" error="0" notExecuted="0" skipped="0" />`;

  assert.deepEqual(parseTrxResults(trx, SHERWOOD_PROCESS_TEST_FQNS), {
    total: 7,
    executed: 7,
    passed: 7,
    failed: 0,
    error: 0,
    notExecuted: 0,
    skipped: 0,
    tests: SHERWOOD_PROCESS_TEST_FQNS,
  });
  assert.throws(() => parseTrxResults(trx, [first]), /exact pass contract/i);

  const failed = trx.replace(
    `testName="${second}" outcome="Passed"`,
    `testName="${second}" outcome="Failed"`,
  );
  assert.throws(
    () => parseTrxResults(failed, SHERWOOD_PROCESS_TEST_FQNS),
    /exact pass contract/i,
  );

  const duplicate = trx.replace(
    `<UnitTestResult testName="${second}" outcome="Passed" />`,
    `<UnitTestResult testName="${first}" outcome="Passed" />`,
  );
  assert.throws(
    () => parseTrxResults(duplicate, SHERWOOD_PROCESS_TEST_FQNS),
    /exact pass contract/i,
  );
});
