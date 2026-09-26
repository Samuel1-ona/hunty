#!/usr/bin/env node
/**
 * Asserts the Next.js ESLint packages stay pinned to the same version as `next`.
 *
 * `eslint-config-next` and `@next/eslint-plugin-next` are published in lockstep
 * with `next`. A config built for a different Next version can enable rules the
 * installed Next runtime does not implement (or miss rules that it does), so the
 * three versions must never drift apart.
 *
 * Renovate keeps them in a single group (see renovate.json -> "next.js packages")
 * so they are bumped in one PR. This script is the guard rail for everything
 * else — a manual bump, a dropped group rule, a new workspace that forgets one
 * of the three packages, or an ESLint package quietly switched back to a range.
 *
 * It reads the workspace manifests directly, so it needs no `pnpm install` and
 * can run as its own tiny CI job:
 *
 *   node packages/config/scripts/check-next-eslint-pins.mjs
 *
 * Exits 1 when the packages do not resolve to one version, when one of them is
 * missing, or when an ESLint package is no longer an exact pin.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

/** Workspace manifests that may declare a Next.js dependency. */
const MANIFESTS = [
  "package.json",
  "apps/web/package.json",
  "apps/mobile/package.json",
  "packages/config/package.json",
  "packages/ui/package.json",
  "packages/types/package.json",
];

const NEXT = "next";
const ESLINT_PACKAGES = ["eslint-config-next", "@next/eslint-plugin-next"];
const TRACKED = [NEXT, ...ESLINT_PACKAGES];

/** Strips range operators so `^15.5.24` and `15.5.24` compare as the same version. */
const normalize = (specifier) => specifier.replace(/^[\s^~>=<v]+/, "").trim();

/** An exact pin, e.g. `15.5.24` — not `^15.5.24`, `~15.5.24`, `>=15.5.24` or `latest`. */
const isExactPin = (specifier) => /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(specifier);

const declared = [];
for (const manifest of MANIFESTS) {
  const absolute = path.join(repoRoot, manifest);
  if (!existsSync(absolute)) continue;
  const pkg = JSON.parse(readFileSync(absolute, "utf8"));
  for (const field of ["dependencies", "devDependencies"]) {
    const deps = pkg[field] ?? {};
    for (const name of TRACKED) {
      if (deps[name] !== undefined) {
        declared.push({ name, manifest, field, specifier: String(deps[name]).trim() });
      }
    }
  }
}

let failed = false;
const fail = (message) => {
  failed = true;
  console.error(`x ${message}`);
};

const describe = (d) => `  ${d.manifest} -> ${d.field}["${d.name}"] = ${d.specifier}`;

if (declared.length === 0) {
  fail(`none of ${TRACKED.join(", ")} is declared in any workspace manifest`);
} else {
  if (!declared.some((d) => d.name === NEXT)) {
    fail(`\`${NEXT}\` is not declared in any workspace manifest`);
  }
  for (const name of ESLINT_PACKAGES) {
    if (!declared.some((d) => d.name === name)) {
      fail(`\`${name}\` is not declared in any workspace manifest`);
    }
  }

  const versions = [...new Set(declared.map((d) => normalize(d.specifier)))];
  if (versions.length > 1) {
    fail(
      `${TRACKED.join(", ")} must all be pinned to the same version, found ${versions.join(", ")}:\n` +
        declared.map(describe).join("\n")
    );
  }

  for (const d of declared.filter((x) => ESLINT_PACKAGES.includes(x.name))) {
    if (!isExactPin(d.specifier)) {
      fail(
        `\`${d.name}\` must be an exact pin (got "${d.specifier}"); ` +
          `remove the range operator in ${d.manifest}:\n${describe(d)}`
      );
    }
  }

  if (!failed) {
    console.log(`ok ${TRACKED.join(", ")} are all aligned at ${versions[0]}`);
    for (const d of declared) console.log(describe(d));
  }
}

if (failed) {
  console.error(
    "\nBump next, eslint-config-next and @next/eslint-plugin-next together in one change " +
      "(see docs/development/NEXT_ESLINT_PINNING.md)."
  );
  process.exit(1);
}
