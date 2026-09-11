import { isAbsolute, resolve } from "node:path";

const COMMIT = /^[0-9a-f]{40}$/u;
const HTTPS_ORIGIN = /^https:\/\/github\.com\/xpelch\/sherwood(?:\.git)?$/u;
const SSH_ORIGIN =
  /^(?:git@github\.com:xpelch\/sherwood|ssh:\/\/git@github\.com\/xpelch\/sherwood)(?:\.git)?$/u;

export const SHERWOOD_PROCESS_TEST_FQNS = Object.freeze([
  "Sherwood.Tests.GossipV2ProcessConformanceTests.A_real_process_serves_signed_http_and_mcp_and_replays_after_restart",
  "Sherwood.Tests.GossipV2ProcessConformanceTests.A_real_process_enforces_concurrency_conflicts_authentication_and_owner_isolation",
  "Sherwood.Tests.GossipV2ProcessConformanceTests.A_real_process_serves_registered_identity_session_over_http_and_mcp_and_preserves_root_ownership_after_restart",
  "Sherwood.Tests.GossipV2ProcessConformanceTests.A_real_process_enforces_identity_session_replay_revocation_rate_and_malformed_downgrade_fail_closed",
  "Sherwood.Tests.GossipV2ProcessConformanceTests.A_paused_process_kill_restarts_into_reconciliation_without_reexecution",
  "Sherwood.Tests.GossipV2ProcessConformanceTests.A_throwing_persistence_cut_point_rolls_back_and_requires_reconciliation",
  "Sherwood.Tests.GossipV2ProcessConformanceTests.A_real_process_keeps_private_export_owner_scoped_and_matches_http_with_mcp",
]);

export function parseConformanceArguments(args) {
  let output;
  let sherwoodRepository;
  let sherwoodCommit;

  for (let index = 0; index < args.length; index++) {
    const option = args[index];
    const value = args[index + 1];
    if (!option || value === undefined || value.startsWith("--")) {
      throw new Error(usage());
    }

    if (option === "--output") {
      if (output !== undefined || !isAbsolute(value)) {
        throw new Error(usage());
      }
      output = resolve(value);
    } else if (option === "--sherwood-repository") {
      if (sherwoodRepository !== undefined || !isAbsolute(value)) {
        throw new Error("--sherwood-repository must be an absolute path");
      }
      sherwoodRepository = resolve(value);
    } else if (option === "--sherwood-commit") {
      if (sherwoodCommit !== undefined || !COMMIT.test(value)) {
        throw new Error(
          "--sherwood-commit must be 40 lowercase hexadecimal characters",
        );
      }
      sherwoodCommit = value;
    } else {
      throw new Error(usage());
    }

    index++;
  }

  if (!output) {
    throw new Error(usage());
  }
  if ((sherwoodRepository === undefined) !== (sherwoodCommit === undefined)) {
    throw new Error(
      "--sherwood-repository and --sherwood-commit must be supplied together",
    );
  }

  const result = { output };
  if (sherwoodRepository !== undefined && sherwoodCommit !== undefined) {
    result.sherwoodRepository = sherwoodRepository;
    result.sherwoodCommit = sherwoodCommit;
  }
  return result;
}

export function isCanonicalSherwoodOrigin(origin) {
  return HTTPS_ORIGIN.test(origin) || SSH_ORIGIN.test(origin);
}

export function parseTrxResult(trx, expectedTestFqn) {
  const parsed = parseTrxResults(trx, [expectedTestFqn]);
  const { tests: _tests, ...counters } = parsed;
  return counters;
}

export function parseTrxResults(trx, expectedTestFqns) {
  const countersTag = trx.match(/<Counters\b[^>]*>/u)?.[0];
  const testMethods = [
    ...trx.matchAll(
      /<TestMethod\b(?=[^>]*\bclassName="([^"]+)")(?=[^>]*\bname="([^"]+)")[^>]*>/gu,
    ),
  ];
  const unitTestResults = [...trx.matchAll(/<UnitTestResult\b[^>]*>/gu)].map(
    (match) => ({
      name: xmlAttribute(match[0], "testName"),
      outcome: xmlAttribute(match[0], "outcome"),
    }),
  );
  const requiredNames = [
    "total",
    "executed",
    "passed",
    "failed",
    "error",
    "notExecuted",
  ];
  const counters = countersTag
    ? Object.fromEntries(
        requiredNames.map((name) => [
          name,
          integerAttribute(countersTag, name),
        ]),
      )
    : null;
  const skipped = countersTag
    ? optionalIntegerAttribute(countersTag, "skipped")
    : null;
  const testNames = testMethods.map(
    (testMethod) => `${testMethod[1]}.${testMethod[2]}`,
  );
  const expectedNames = [...expectedTestFqns].sort();
  const actualNames = [...testNames].sort();
  const resultNames = unitTestResults
    .map((result) => result.name)
    .filter((name) => name !== undefined)
    .sort();
  if (
    !counters ||
    Object.values(counters).some((value) => value === null) ||
    counters.total !== expectedTestFqns.length ||
    counters.executed !== expectedTestFqns.length ||
    counters.passed !== expectedTestFqns.length ||
    counters.failed !== 0 ||
    counters.error !== 0 ||
    counters.notExecuted !== 0 ||
    skipped === null ||
    skipped !== 0 ||
    testNames.length !== expectedTestFqns.length ||
    JSON.stringify(actualNames) !== JSON.stringify(expectedNames) ||
    unitTestResults.length !== expectedTestFqns.length ||
    unitTestResults.some((result) => result.outcome !== "Passed") ||
    JSON.stringify(resultNames) !== JSON.stringify(expectedNames)
  ) {
    throw new Error(
      "The Sherwood process test result did not meet the exact pass contract.",
    );
  }
  return { ...counters, skipped, tests: [...expectedTestFqns] };
}

function integerAttribute(tag, name) {
  const value = xmlAttribute(tag, name);
  if (value === undefined || !/^(?:0|[1-9][0-9]*)$/u.test(value)) {
    return null;
  }
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function optionalIntegerAttribute(tag, name) {
  const value = xmlAttribute(tag, name);
  return value === undefined ? 0 : integerAttribute(tag, name);
}

function xmlAttribute(tag, name) {
  return tag.match(new RegExp(`\\b${name}="([^"]*)"`, "u"))?.[1];
}

export function usage() {
  return "Usage: node scripts/run-v2-conformance.mjs --output /absolute/new/directory [--sherwood-repository /absolute/clean/checkout --sherwood-commit 40lowerhex]";
}
