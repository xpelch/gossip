#!/usr/bin/env node

import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { arch, platform, tmpdir } from "node:os";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";

const execute = promisify(execFile);
const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repository = resolve(scriptDirectory, "..");
const MAX_OUTPUT_BYTES = 1_048_576;

function usage() {
  return "Usage: node scripts/run-v2-conformance.mjs --output /absolute/new/directory";
}

function outputArgument(argv) {
  if (argv.length !== 2 || argv[0] !== "--output" || !argv[1]) {
    throw new Error(usage());
  }
  if (!isAbsolute(argv[1])) {
    throw new Error("output must be an absolute path");
  }
  return resolve(argv[1]);
}

async function command(executable, args, options = {}) {
  return execute(executable, args, {
    cwd: repository,
    timeout: 600_000,
    windowsHide: true,
    maxBuffer: MAX_OUTPUT_BYTES,
    ...options,
  });
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

async function main() {
  const output = outputArgument(process.argv.slice(2));
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
      suite_revision: "gossip-v2-conformance-2026-09-10",
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
          commit: null,
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
          "No packaged Sherwood process was exercised.",
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
          "No engine process output was captured.",
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
          "Contract code is installed without packaged engine evidence.",
          "Pass operation, economics and fault scenarios.",
        ),
        unavailableCapability(
          "durable_operations",
          "installed",
          "Contract code is installed without packaged database evidence.",
          "Pass restart, conflict and exactly-once scenarios.",
        ),
        unavailableCapability(
          "signed_receipts",
          "installed",
          "The verifier is installed without a production trust path.",
          "Verify packaged receipt issuance and the pinned trust anchor.",
        ),
        unavailableCapability(
          "evidence",
          "installed",
          "Evidence contracts are installed without end-to-end reproduction.",
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
          "The inactive adapter has no packaged-process acceptance.",
          "Pass MCP and HTTP semantic parity against one process.",
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
  console.error(
    `Conformance run failed: ${error instanceof Error ? error.message : "unknown error"}`,
  );
  process.exitCode = 1;
}
