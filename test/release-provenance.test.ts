import assert from "node:assert/strict";
import test from "node:test";
import { validateManifest } from "../scripts/release-provenance.mjs";

const actual = {
  repository: "https://github.com/xpelch/gossip.git",
  commit: "a".repeat(40),
  package: {
    name: "@gossip/agent-kit",
    version: "0.1.0-dev.1",
  },
  lockfile: {
    sha256: `sha256:${"b".repeat(64)}`,
    bytes: 123,
  },
  artifact: {
    name: "gossip-agent-kit-0.1.0-dev.1.tgz",
    sha256: `sha256:${"c".repeat(64)}`,
    bytes: 456,
  },
  runtime: {
    node: "v24.0.0",
    npm: "11.0.0",
  },
};

function manifest() {
  return {
    schema: "gossip.release-provenance.v1",
    result: "passed",
    source: {
      repository: actual.repository,
      commit: actual.commit,
    },
    package: actual.package,
    lockfile: actual.lockfile,
    artifact: actual.artifact,
    runtime: actual.runtime,
    checks: [
      { name: "install", status: "passed" },
      { name: "typecheck", status: "passed" },
      { name: "test", status: "passed" },
      { name: "build", status: "passed" },
      { name: "pack", status: "passed" },
    ],
  };
}

test("accepts a manifest whose source, lockfile, artifact, and runtime match", () => {
  assert.doesNotThrow(() => validateManifest(manifest(), actual));
});

test("rejects a changed lockfile or package artifact digest", () => {
  const lockfileMismatch = manifest();
  lockfileMismatch.lockfile = {
    ...lockfileMismatch.lockfile,
    sha256: `sha256:${"d".repeat(64)}`,
  };
  assert.throws(
    () => validateManifest(lockfileMismatch, actual),
    /source or package identity does not match/u,
  );

  const artifactMismatch = manifest();
  artifactMismatch.artifact = {
    ...artifactMismatch.artifact,
    bytes: 457,
  };
  assert.throws(
    () => validateManifest(artifactMismatch, actual),
    /artifact digest or identity does not match/u,
  );
});

test("rejects a manifest with a failed build or test check", () => {
  const failed = manifest();
  failed.checks = failed.checks.map((check) =>
    check.name === "build" ? { ...check, status: "failed" } : check,
  );
  assert.throws(
    () => validateManifest(failed, actual),
    /checks did not all pass/u,
  );
});
