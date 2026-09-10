#!/usr/bin/env node

import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import {
  copyFile,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { arch, platform, tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";
import {
  isCanonicalSherwoodOrigin,
  parseConformanceArguments,
} from "./conformance-runner-options.mjs";

const execute = promisify(execFile);
const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repository = resolve(scriptDirectory, "..");
const MAX_OUTPUT_BYTES = 1_048_576;
const SHERWOOD_TEST_FQN =
  "Sherwood.Tests.GossipV2ProcessConformanceTests.A_real_process_serves_signed_http_and_mcp_and_replays_after_restart";
const SHERWOOD_CANARY_PREFIX = "PROCESS-CONFORMANCE-CANARY";
const SHERWOOD_HANG_TIMEOUT = "5m";

async function command(executable, args, options = {}) {
  try {
    return await execute(executable, args, {
      cwd: repository,
      timeout: 600_000,
      windowsHide: true,
      maxBuffer: MAX_OUTPUT_BYTES,
      ...options,
    });
  } catch (error) {
    if (error?.code === "ETIMEDOUT") {
      throw new Error("A conformance subprocess timed out.");
    }
    if (error?.code === "ERR_CHILD_PROCESS_STDIO_MAXBUFFER") {
      throw new Error("A conformance subprocess exceeded its output limit.");
    }
    throw new Error("A conformance subprocess failed.");
  }
}

function npmCommand(args) {
  if (process.platform !== "win32") {
    return { executable: "npm", args };
  }
  return {
    executable: process.execPath,
    args: [
      join(
        dirname(process.execPath),
        "node_modules",
        "npm",
        "bin",
        "npm-cli.js",
      ),
      ...args,
    ],
  };
}

async function runNpm(args, options) {
  const invocation = npmCommand(args);
  return command(invocation.executable, invocation.args, options);
}

async function fileEvidence(root, path) {
  const absolutePath = join(root, ...path.split("/"));
  const bytes = await readFile(absolutePath);
  return {
    path,
    sha256: `sha256:${createHash("sha256").update(bytes).digest("hex")}`,
    bytes: bytes.byteLength,
  };
}

async function writeEvidence(root, filename, value, scanConformanceText) {
  const path = `evidence/${filename}`;
  const text = `${JSON.stringify(value, null, 2)}\n`;
  scanConformanceText(text, []);
  await writeFile(join(root, ...path.split("/")), text, {
    encoding: "utf8",
    flag: "wx",
    mode: 0o600,
  });
  return fileEvidence(root, path);
}

function blocked(id, reason, nextAction) {
  return { id, status: "blocked", reason, next_action: nextAction };
}

function unavailableCapability(name, state, reason, nextAction) {
  return { name, state, reason, next_action: nextAction };
}

async function runSherwoodConformance(
  temporary,
  sourceRepository,
  commit,
  scanConformanceText,
) {
  await validateSherwoodSource(sourceRepository, commit);

  const checkout = join(temporary, "sherwood-source");
  await command("git", [
    "clone",
    "--no-hardlinks",
    "--no-recurse-submodules",
    "--quiet",
    sourceRepository,
    checkout,
  ]);
  await command("git", ["checkout", "--detach", "--quiet", commit], {
    cwd: checkout,
  });
  await requireCleanDetachedCheckout(checkout, commit);

  const testSourcePath = join(
    checkout,
    "tests",
    "Sherwood.Tests",
    "GossipV2ProcessConformanceTests.cs",
  );
  const runbookSourcePath = join(
    checkout,
    "docs",
    "runbooks",
    "gossip-v2-process-conformance.md",
  );
  const postgresFixtureSourcePath = join(
    checkout,
    "tests",
    "Sherwood.Tests",
    "Infrastructure",
    "PostgreSqlFixture.cs",
  );
  const testSource = await readFile(testSourcePath, "utf8");
  const postgresFixtureSource = await readFile(
    postgresFixtureSourcePath,
    "utf8",
  );
  if (
    !testSource.includes("class GossipV2ProcessConformanceTests") ||
    !testSource.includes(
      "A_real_process_serves_signed_http_and_mcp_and_replays_after_restart",
    ) ||
    !/ServerRevision\s*=\s*"synthetic-v1"/su.test(testSource) ||
    !postgresFixtureSource.includes('new PostgreSqlBuilder("postgres:17")')
  ) {
    throw new Error(
      "The pinned Sherwood process test contract is unavailable.",
    );
  }

  const [testSourceDigest, runbookSourceDigest, migrationTree] =
    await Promise.all([
      hashFile(testSourcePath),
      hashFile(runbookSourcePath),
      gitOutput(checkout, ["rev-parse", `${commit}:src/Sherwood/Migrations`]),
    ]);
  if (!/^git-tree-[0-9a-f]{40}$/u.test(`git-tree-${migrationTree}`)) {
    throw new Error("The pinned Sherwood migration revision is unavailable.");
  }

  await command(
    "dotnet",
    ["restore", "tests/Sherwood.Tests/Sherwood.Tests.csproj"],
    { cwd: checkout },
  );
  await command(
    "dotnet",
    [
      "build",
      "tests/Sherwood.Tests/Sherwood.Tests.csproj",
      "--configuration",
      "Release",
      "--no-restore",
    ],
    { cwd: checkout },
  );

  const assemblyPath = join(
    checkout,
    "src",
    "Sherwood",
    "bin",
    "Release",
    "net10.0",
    "Sherwood.dll",
  );
  const assembly = await hashFile(assemblyPath);
  const resultsDirectory = join(temporary, "sherwood-test-results");
  await mkdir(resultsDirectory, { recursive: true, mode: 0o700 });
  const testResult = await command(
    "dotnet",
    [
      "test",
      "tests/Sherwood.Tests/Sherwood.Tests.csproj",
      "--configuration",
      "Release",
      "--no-build",
      "--no-restore",
      "--filter",
      `FullyQualifiedName=${SHERWOOD_TEST_FQN}`,
      "--blame-hang-timeout",
      SHERWOOD_HANG_TIMEOUT,
      "--logger",
      "trx;LogFileName=process-conformance.trx",
      "--results-directory",
      resultsDirectory,
    ],
    { cwd: checkout },
  );
  scanConformanceText(testResult.stdout, [SHERWOOD_CANARY_PREFIX]);
  scanConformanceText(testResult.stderr, [SHERWOOD_CANARY_PREFIX]);

  const resultFiles = (await readdir(resultsDirectory)).filter((name) =>
    name.endsWith(".trx"),
  );
  if (resultFiles.length !== 1) {
    throw new Error(
      "The Sherwood process test did not produce one result file.",
    );
  }
  const trxPath = join(resultsDirectory, resultFiles[0]);
  const trxStats = await stat(trxPath);
  if (!trxStats.isFile() || trxStats.size > MAX_OUTPUT_BYTES) {
    throw new Error(
      "The Sherwood process test result exceeded its output limit.",
    );
  }
  const trx = await readFile(trxPath, "utf8");
  scanConformanceText(trx, [SHERWOOD_CANARY_PREFIX]);
  const counters = parseTrxResult(trx);
  const runtime = await measureRuntime();

  return {
    commit,
    assembly,
    runtime,
    revisions: {
      engine: "synthetic-v1",
      database_migrations: `git-tree-${migrationTree}`,
    },
    summary: {
      result: "passed",
      repository: "https://github.com/xpelch/sherwood",
      commit,
      assembly,
      runtime,
      revisions: {
        engine: "synthetic-v1",
        database_migrations: `git-tree-${migrationTree}`,
      },
      test_fqn: SHERWOOD_TEST_FQN,
      counters,
      scenario_assertions: {
        mcp_http_parity: 6,
        privacy_canary_scan: 4,
      },
      transport: "loopback-http",
      logical_endpoint_scheme: "https",
      signed_http_complete_zero_cost: true,
      signed_mcp_complete_zero_cost: true,
      canonical_transport_parity: true,
      durable_operation_singleton: true,
      receipt_chain_verified: true,
      restart_replay_exact: true,
      diagnostics_clean: true,
      test_source_sha256: testSourceDigest.sha256,
      test_source_bytes: testSourceDigest.bytes,
      runbook_source_sha256: runbookSourceDigest.sha256,
      runbook_source_bytes: runbookSourceDigest.bytes,
      stdout_sha256: `sha256:${createHash("sha256")
        .update(testResult.stdout)
        .digest("hex")}`,
      stdout_bytes: Buffer.byteLength(testResult.stdout, "utf8"),
      stderr_sha256: `sha256:${createHash("sha256")
        .update(testResult.stderr)
        .digest("hex")}`,
      stderr_bytes: Buffer.byteLength(testResult.stderr, "utf8"),
      trx_sha256: `sha256:${createHash("sha256").update(trx).digest("hex")}`,
      trx_bytes: Buffer.byteLength(trx, "utf8"),
    },
  };
}

async function validateSherwoodSource(sourceRepository, commit) {
  let sourceStat;
  try {
    sourceStat = await lstat(sourceRepository);
  } catch {
    throw new Error("The Sherwood repository is not a usable directory.");
  }
  if (!sourceStat.isDirectory() || sourceStat.isSymbolicLink()) {
    throw new Error("The Sherwood repository must be a non-reparse directory.");
  }

  const topLevel = await gitOutput(sourceRepository, [
    "rev-parse",
    "--show-toplevel",
  ]);
  if (resolve(topLevel) !== resolve(sourceRepository)) {
    throw new Error("The Sherwood repository must be a worktree root.");
  }
  const origin = await gitOutput(sourceRepository, [
    "remote",
    "get-url",
    "origin",
  ]);
  if (!isCanonicalSherwoodOrigin(origin)) {
    throw new Error(
      "The Sherwood repository origin is not the canonical repository.",
    );
  }
  const status = await gitOutput(sourceRepository, [
    "status",
    "--porcelain",
    "--untracked-files=all",
  ]);
  if (status !== "") {
    throw new Error("The Sherwood repository must be clean.");
  }
  await command("git", ["cat-file", "-e", `${commit}^{commit}`], {
    cwd: sourceRepository,
  });
}

async function requireCleanDetachedCheckout(checkout, commit) {
  const head = await gitOutput(checkout, ["rev-parse", "HEAD"]);
  const branch = await gitOutput(checkout, [
    "rev-parse",
    "--abbrev-ref",
    "HEAD",
  ]);
  const status = await gitOutput(checkout, [
    "status",
    "--porcelain",
    "--untracked-files=all",
  ]);
  if (head !== commit || branch !== "HEAD" || status !== "") {
    throw new Error(
      "The Sherwood clone is not the requested clean detached commit.",
    );
  }
}

async function gitOutput(cwd, args) {
  return (await command("git", args, { cwd })).stdout.trim();
}

async function hashFile(path) {
  const bytes = await readFile(path);
  return {
    sha256: `sha256:${createHash("sha256").update(bytes).digest("hex")}`,
    bytes: bytes.byteLength,
  };
}

async function measureRuntime() {
  const dotnet = versionValue((await command("dotnet", ["--version"])).stdout);
  const docker = versionValue(
    (await command("docker", ["version", "--format", "{{.Server.Version}}"]))
      .stdout,
  );
  return {
    dotnet,
    docker,
    postgresql: "17",
  };
}

function versionValue(value) {
  const version = value.trim().split(/\r?\n/u)[0];
  if (!version || !/^[A-Za-z0-9][A-Za-z0-9.+_-]{0,63}$/u.test(version)) {
    throw new Error("A runtime version could not be measured safely.");
  }
  return version;
}

function parseTrxResult(trx) {
  const countersTag = trx.match(/<Counters\b[^>]*>/u)?.[0];
  const testMethods = [
    ...trx.matchAll(
      /<TestMethod\b(?=[^>]*\bclassName="([^"]+)")(?=[^>]*\bname="([^"]+)")[^>]*>/gu,
    ),
  ];
  const counters = countersTag
    ? Object.fromEntries(
        [
          "total",
          "executed",
          "passed",
          "failed",
          "error",
          "skipped",
          "notExecuted",
        ].map((name) => {
          const value = Number(xmlAttribute(countersTag, name));
          return [name, Number.isInteger(value) && value >= 0 ? value : null];
        }),
      )
    : null;
  if (
    !counters ||
    Object.values(counters).some((value) => value === null) ||
    counters.total !== 1 ||
    counters.executed !== 1 ||
    counters.passed !== 1 ||
    counters.failed !== 0 ||
    counters.error !== 0 ||
    counters.skipped !== 0 ||
    counters.notExecuted !== 0 ||
    testMethods.length !== 1 ||
    `${testMethods[0][1]}.${testMethods[0][2]}` !== SHERWOOD_TEST_FQN
  ) {
    throw new Error(
      "The Sherwood process test result did not meet the exact pass contract.",
    );
  }
  return counters;
}

function xmlAttribute(tag, name) {
  return tag.match(new RegExp(`\\b${name}="([^"]*)"`, "u"))?.[1];
}

async function main() {
  const argumentsValue = parseConformanceArguments(process.argv.slice(2));
  const output = argumentsValue.output;
  const sherwoodRequested = argumentsValue.sherwoodRepository !== undefined;
  try {
    await stat(output);
    throw new Error("output directory must not already exist");
  } catch (error) {
    if (!(error && typeof error === "object" && error.code === "ENOENT")) {
      throw error;
    }
  }

  const { stdout: dirtyOutput } = await command("git", [
    "status",
    "--porcelain",
  ]);
  if (dirtyOutput !== "") {
    throw new Error("conformance runs require a clean checkout");
  }
  const { stdout: commitOutput } = await command("git", ["rev-parse", "HEAD"]);
  const commit = commitOutput.trim();
  if (!/^[0-9a-f]{40}$/.test(commit)) {
    throw new Error("could not resolve the source commit");
  }

  const temporary = await mkdtemp(join(tmpdir(), "gossip-v2-conformance-"));
  try {
    const sourceCheckout = join(temporary, "source");
    await command("git", [
      "clone",
      "--no-hardlinks",
      "--quiet",
      repository,
      sourceCheckout,
    ]);
    await command("git", ["checkout", "--detach", "--quiet", commit], {
      cwd: sourceCheckout,
    });

    await runNpm(["ci", "--ignore-scripts"], { cwd: sourceCheckout });
    await runNpm(["run", "build"], { cwd: sourceCheckout });
    const pack = await runNpm(
      ["pack", "--ignore-scripts", "--silent", "--pack-destination", temporary],
      { cwd: sourceCheckout },
    );
    const packedFilenames = pack.stdout
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter(Boolean);
    if (
      packedFilenames.length !== 1 ||
      packedFilenames[0] !== basename(packedFilenames[0]) ||
      !packedFilenames[0].endsWith(".tgz")
    ) {
      throw new Error("npm pack returned an unsafe artifact filename");
    }
    const artifact = join(temporary, packedFilenames[0]);
    const artifactBytes = await readFile(artifact);
    const artifactDigest = createHash("sha256")
      .update(artifactBytes)
      .digest("hex");
    const installDirectory = join(temporary, "installed");
    const { installArtifact } = await import(
      pathToFileURL(join(sourceCheckout, "scripts", "install.mjs")).href
    );
    await installArtifact({
      artifact,
      sha256: artifactDigest,
      destination: installDirectory,
    });

    const packageRoot = join(
      installDirectory,
      "node_modules",
      "@gossip",
      "agent-kit",
    );
    const packageManifest = JSON.parse(
      await readFile(join(packageRoot, "package.json"), "utf8"),
    );
    const cli = join(packageRoot, "dist", "cli.js");
    const help = await command(process.execPath, [cli, "--help"], {
      cwd: packageRoot,
    });
    if (!help.stdout.includes("gossip status")) {
      throw new Error("installed CLI help did not identify Gossip");
    }
    const stateDirectory = join(temporary, "state");
    const statusResult = await command(
      process.execPath,
      [cli, "status", "--directory", stateDirectory],
      { cwd: packageRoot },
    );
    const status = JSON.parse(statusResult.stdout);
    if (
      status.kitAvailable !== true ||
      status.identity !== null ||
      status.storageVerified !== false
    ) {
      throw new Error(
        "installed CLI status did not preserve empty-state safety",
      );
    }

    const verifierNames = [
      "verify-v2-vectors.py",
      "verify-v2-evidence-receipts.py",
      "verify-v2-http-auth.py",
      "verify-v2-identity-session.py",
      "verify-v2-privacy.py",
      "verify-v2-conformance-manifest.py",
    ];
    for (const verifier of verifierNames) {
      await command("python", [join("scripts", verifier)], {
        cwd: packageRoot,
      });
    }

    const { createConformanceEnvelope, scanConformanceText } = await import(
      pathToFileURL(join(packageRoot, "dist", "conformance-v2.js")).href
    );
    const sherwoodEvidence = sherwoodRequested
      ? await runSherwoodConformance(
          temporary,
          argumentsValue.sherwoodRepository,
          argumentsValue.sherwoodCommit,
          scanConformanceText,
        )
      : null;
    await mkdir(join(output, "evidence"), { recursive: true, mode: 0o700 });
    await mkdir(join(output, "fixtures"), { mode: 0o700 });

    const artifactEvidence = await writeEvidence(
      output,
      "artifact-install.json",
      {
        artifact_sha256: `sha256:${artifactDigest}`,
        artifact_bytes: artifactBytes.byteLength,
        package: packageManifest.name,
        version: packageManifest.version,
        installer: "scripts/install.mjs",
        lifecycle_scripts: "disabled",
      },
      scanConformanceText,
    );
    const cliEvidence = await writeEvidence(
      output,
      "installed-cli.json",
      {
        help: "passed",
        status: "passed",
        empty_identity: true,
        protected_storage_claimed: false,
      },
      scanConformanceText,
    );
    const vectorEvidence = await writeEvidence(
      output,
      "independent-vectors.json",
      {
        result: "passed",
        verifiers: verifierNames,
      },
      scanConformanceText,
    );
    const processEvidence = sherwoodEvidence
      ? await writeEvidence(
          output,
          "sherwood-process.json",
          sherwoodEvidence.summary,
          scanConformanceText,
        )
      : null;

    const fixtureNames = [
      "v2-canonical.json",
      "v2-evidence-receipts.json",
      "v2-receipt-auth.json",
      "v2-http-auth.json",
      "v2-identity-session.json",
      "v2-privacy.json",
      "v2-conformance.json",
    ];
    const fixtures = [];
    for (const filename of fixtureNames) {
      const outputPath = `fixtures/${filename}`;
      await copyFile(
        join(packageRoot, "test", "fixtures", filename),
        join(output, "fixtures", filename),
      );
      fixtures.push({
        name: filename.slice(0, -".json".length),
        ...(await fileEvidence(output, outputPath)),
      });
    }
    const npmVersion = (await runNpm(["--version"])).stdout.trim();
    const pythonVersion = (
      await command("python", ["--version"])
    ).stdout.trim();
    const statement = {
      schema: "gossip.acceptance-statement.v1",
      suite_revision: "gossip-v2-conformance-2026-09-10.1",
      protocol: "gossip/2-draft.1",
      generated_at: Math.floor(Date.now() / 1000),
      source: {
        repository: "https://github.com/xpelch/gossip",
        commit,
        dirty: false,
      },
      artifacts: {
        gossip: {
          package: packageManifest.name,
          version: packageManifest.version,
          sha256: `sha256:${artifactDigest}`,
          bytes: artifactBytes.byteLength,
        },
        sherwood: {
          repository: "https://github.com/xpelch/sherwood",
          commit: sherwoodEvidence?.commit ?? null,
          assembly: sherwoodEvidence?.assembly ?? null,
          image_digest: null,
        },
      },
      runtime: {
        os: platform(),
        architecture: arch(),
        node: process.versions.node,
        npm: npmVersion,
        python: pythonVersion.replace(/^Python\s+/u, ""),
        dotnet: null,
        docker: null,
        postgresql: null,
      },
      revisions: {
        schema: "2026-09-09",
        auth: "gossip-eip191-v2",
        mcp: "2025-11-25",
        engine: null,
        database_migrations: null,
        fixture_suite: "gossip-v2-fixtures-1",
      },
      fixtures,
      scenarios: [
        {
          id: "artifact_install",
          status: "verified",
          assertions: 6,
          evidence: [artifactEvidence],
        },
        {
          id: "installed_cli_process",
          status: "verified",
          assertions: 4,
          evidence: [cliEvidence],
        },
        blocked(
          "mcp_http_parity",
          sherwoodEvidence
            ? "The packaged process evidence did not establish this scenario."
            : "No packaged Sherwood process was exercised.",
          "Run both transports against one pinned Sherwood artifact.",
        ),
        blocked(
          "authentication_fail_closed",
          "Authentication faults were not exercised end to end.",
          "Run the signed tamper, replay, expiry and downgrade matrix.",
        ),
        blocked(
          "session_scope_escape",
          "Sherwood has no session registry.",
          "Implement and test durable session authorization.",
        ),
        blocked(
          "operation_exactly_once",
          "The 100-request process scenario was not run.",
          "Run 100 identical signed requests through the packaged process.",
        ),
        blocked(
          "operation_conflict",
          "The packaged process conflict path was not run.",
          "Reuse one operation ID with different canonical content.",
        ),
        blocked(
          "zero_cost_reconciliation",
          "Crash and timeout reconciliation was not run.",
          "Inject restart and timeout around standard zero-cost work.",
        ),
        blocked(
          "persistence_fault_recovery",
          "No test-only persistence fault controls exist.",
          "Exercise frozen test-only persistence cut points.",
        ),
        blocked(
          "evidence_finality_reorg",
          "Controlled evidence faults were not run through both transports.",
          "Run stale, wrong-chain, missing-source and reorg fixtures.",
        ),
        blocked(
          "correction_supersession",
          "Correction lineage was not run through the packaged process.",
          "Run conflict, correction and supersession fixtures.",
        ),
        blocked(
          "owner_isolation",
          "Private owner operations are not implemented by Sherwood.",
          "Exercise operation, receipt, evidence, export, deletion and audit isolation.",
        ),
        blocked(
          "privacy_canary_scan",
          sherwoodEvidence
            ? "The packaged process evidence did not establish this scenario."
            : "No engine process output was captured.",
          "Scan isolated captures with prohibited synthetic canaries.",
        ),
        {
          id: "independent_vectors",
          status: "verified",
          assertions: verifierNames.length,
          evidence: [vectorEvidence],
        },
        blocked(
          "clean_checkout_reproduction",
          "A second clean-checkout replay has not been compared.",
          "Replay pinned sources and compare scenario and capability decisions.",
        ),
      ],
      capabilities: [
        unavailableCapability(
          "atomic_consult",
          "installed",
          sherwoodEvidence
            ? "One complete zero-cost process path passed; the economic and fault matrix remains unverified."
            : "Contract code is installed without packaged engine evidence.",
          "Pass operation, economics and fault scenarios.",
        ),
        unavailableCapability(
          "durable_operations",
          "installed",
          sherwoodEvidence
            ? "One restart replay passed; concurrency, conflict and fault recovery remain unverified."
            : "Contract code is installed without packaged database evidence.",
          "Pass restart, conflict and exactly-once scenarios.",
        ),
        unavailableCapability(
          "signed_receipts",
          "installed",
          sherwoodEvidence
            ? "The tested assembly issued a valid receipt chain without a production key trust path."
            : "The verifier is installed without a production trust path.",
          "Verify packaged receipt issuance and the pinned trust anchor.",
        ),
        unavailableCapability(
          "evidence",
          "installed",
          sherwoodEvidence
            ? "One retained evidence result passed without controlled reorg or correction reproduction."
            : "Evidence contracts are installed without end-to-end reproduction.",
          "Pass controlled evidence and independent reproduction scenarios.",
        ),
        unavailableCapability(
          "session_keys",
          "blocked",
          "Sherwood has no durable session registry.",
          "Implement server session enrollment, nonce and revocation state.",
        ),
        unavailableCapability(
          "private_submission",
          "blocked",
          "Encrypted owner-scoped storage is not proven.",
          "Pass the approved private lifecycle and privacy scan.",
        ),
        unavailableCapability(
          "http",
          "installed",
          sherwoodEvidence
            ? "Process parity passed for the tested assembly without deployment acceptance."
            : "The inactive adapter has no packaged-process acceptance.",
          sherwoodEvidence
            ? "Pass the pinned production image, TLS and host acceptance gates."
            : "Pass MCP and HTTP semantic parity against one process.",
        ),
        unavailableCapability(
          "tasks",
          "not_applicable",
          "MCP Tasks are outside the current core profile.",
          "Negotiate a separately pinned Tasks profile before use.",
        ),
      ],
      decision: "blocked",
    };

    if (sherwoodEvidence) {
      statement.runtime.dotnet = sherwoodEvidence.runtime.dotnet;
      statement.runtime.docker = sherwoodEvidence.runtime.docker;
      statement.runtime.postgresql = sherwoodEvidence.runtime.postgresql;
      statement.revisions.engine = sherwoodEvidence.revisions.engine;
      statement.revisions.database_migrations =
        sherwoodEvidence.revisions.database_migrations;
      statement.scenarios = statement.scenarios.map((scenario) =>
        scenario.id === "mcp_http_parity" ||
        scenario.id === "privacy_canary_scan"
          ? {
              id: scenario.id,
              status: "verified",
              assertions:
                scenario.id === "mcp_http_parity"
                  ? sherwoodEvidence.summary.scenario_assertions.mcp_http_parity
                  : sherwoodEvidence.summary.scenario_assertions
                      .privacy_canary_scan,
              evidence: [processEvidence],
            }
          : scenario,
      );
    }
    const envelope = createConformanceEnvelope(statement);
    const manifest = `${JSON.stringify(envelope, null, 2)}\n`;
    scanConformanceText(manifest, []);
    await writeFile(join(output, "acceptance-manifest.json"), manifest, {
      encoding: "utf8",
      flag: "wx",
      mode: 0o600,
    });
    await command(
      "python",
      [
        join("scripts", "verify-v2-conformance-manifest.py"),
        "--manifest",
        join(output, "acceptance-manifest.json"),
      ],
      { cwd: packageRoot },
    );
    console.log(join(output, "acceptance-manifest.json"));
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

try {
  await main();
} catch (error) {
  console.error(safeFailure(error));
  process.exitCode = 1;
}

function safeFailure(error) {
  const message = error instanceof Error ? error.message : "";
  if (
    message.startsWith("Usage:") ||
    message === "output directory must not already exist" ||
    message.startsWith("output must be an absolute path") ||
    message.startsWith("--sherwood-") ||
    message.startsWith("The Sherwood ") ||
    message.startsWith("The pinned Sherwood ") ||
    message.startsWith("The Sherwood clone ") ||
    message.startsWith("The PostgreSQL runtime ") ||
    message.startsWith("A runtime version ") ||
    message.startsWith("A conformance subprocess ")
  ) {
    return `Conformance run failed: ${message}`;
  }
  return "Conformance run failed.";
}
