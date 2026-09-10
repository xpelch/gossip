import assert from "node:assert/strict";
import test from "node:test";
import { resolve } from "node:path";
import {
  isCanonicalSherwoodOrigin,
  parseConformanceArguments,
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
