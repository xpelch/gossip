import { isAbsolute, resolve } from "node:path";

const COMMIT = /^[0-9a-f]{40}$/u;
const HTTPS_ORIGIN = /^https:\/\/github\.com\/xpelch\/sherwood(?:\.git)?$/u;
const SSH_ORIGIN =
  /^(?:git@github\.com:xpelch\/sherwood|ssh:\/\/git@github\.com\/xpelch\/sherwood)(?:\.git)?$/u;

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

export function usage() {
  return "Usage: node scripts/run-v2-conformance.mjs --output /absolute/new/directory [--sherwood-repository /absolute/clean/checkout --sherwood-commit 40lowerhex]";
}
