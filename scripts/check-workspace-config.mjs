#!/usr/bin/env node
/**
 * Verifies that every workspace which uses the shared `@hunty/config` package
 * can actually resolve it, the same way `tsc` and ESLint will.
 *
 * For each workspace (root, apps/*, packages/*) that references
 * `@hunty/config/...` from a tsconfig `extends` or an ESLint flat config:
 *
 *   1. `@hunty/config` is declared in its package.json with `workspace:*`
 *      (under pnpm's isolated node_modules an undeclared package is not linked).
 *   2. `node_modules/@hunty/config` is linked to packages/config.
 *   3. Every referenced subpath resolves through the package `exports` map.
 *   4. Every referenced ESLint config can be imported, including its own
 *      dependencies (e.g. `@typescript-eslint/parser`).
 *   5. `tsc --showConfig` succeeds for every tsconfig that extends it
 *      (this is where TS6053 shows up).
 *
 * Run with `pnpm check:workspace-config`. Exits 1 on the first broken
 * workspace set so CI fails before lint/typecheck report confusing errors.
 * See DEVELOPMENT.md ("Workspace packages and shared config").
 */
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, realpathSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const CONFIG_PKG = "@hunty/config";
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const configDir = path.join(repoRoot, "packages", "config");
const inCI = Boolean(process.env.GITHUB_ACTIONS);

const failures = [];
let checks = 0;

function rel(p) {
  return path.relative(repoRoot, p) || ".";
}

function pass(msg) {
  checks += 1;
  console.log(`  ok    ${msg}`);
}

function fail(workspace, msg, hint) {
  checks += 1;
  failures.push({ workspace, msg });
  console.log(`  FAIL  ${msg}`);
  if (hint) console.log(`        -> ${hint}`);
  if (inCI) console.log(`::error title=Shared config resolution (${workspace})::${msg}`);
}

/** Workspace directories from pnpm-workspace.yaml (simple `dir/*` globs). */
function listWorkspaces() {
  const yaml = readFileSync(path.join(repoRoot, "pnpm-workspace.yaml"), "utf8");
  const block = yaml.match(/^packages:\s*\n((?:\s+-\s+.*\n?)+)/m);
  const patterns = block
    ? [...block[1].matchAll(/-\s+["']?([^"'\n]+?)["']?\s*$/gm)].map((m) => m[1])
    : [];
  const dirs = [repoRoot];
  for (const pattern of patterns) {
    if (pattern.endsWith("/*")) {
      const parent = path.join(repoRoot, pattern.slice(0, -2));
      if (!existsSync(parent)) continue;
      for (const entry of readdirSync(parent, { withFileTypes: true })) {
        const dir = path.join(parent, entry.name);
        if (entry.isDirectory() && existsSync(path.join(dir, "package.json"))) dirs.push(dir);
      }
    } else if (existsSync(path.join(repoRoot, pattern, "package.json"))) {
      dirs.push(path.join(repoRoot, pattern));
    }
  }
  return dirs.filter((dir) => path.resolve(dir) !== configDir);
}

/** `@hunty/config/...` references made by a workspace's tsconfig and ESLint files. */
function findReferences(dir) {
  const tsconfigs = [];
  const eslint = [];
  for (const name of readdirSync(dir)) {
    const file = path.join(dir, name);
    if (/^tsconfig.*\.json$/.test(name)) {
      const text = readFileSync(file, "utf8");
      const match = text.match(/"extends"\s*:\s*("[^"]*"|\[[^\]]*\])/);
      if (!match) continue;
      const specs = [...match[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
      for (const spec of specs) {
        if (spec.startsWith(`${CONFIG_PKG}/`)) tsconfigs.push({ file, spec });
      }
    } else if (/^eslint\.config\.(m|c)?(j|t)s$/.test(name)) {
      const text = readFileSync(file, "utf8");
      const re = new RegExp(
        `(?:from\\s+|import\\s*\\(\\s*)["'](${CONFIG_PKG.replace("/", "\\/")}\\/[^"']+)["']`,
        "g"
      );
      for (const m of text.matchAll(re)) eslint.push({ file, spec: m[1] });
    }
  }
  return { tsconfigs, eslint };
}

function findTsc(dir) {
  for (const base of [dir, repoRoot]) {
    try {
      return createRequire(path.join(base, "package.json")).resolve("typescript/bin/tsc");
    } catch {
      // try the next location
    }
  }
  return null;
}

const INSTALL_HINT =
  "run `pnpm install` from the repository root (npm and yarn cannot install `workspace:*` dependencies)";

async function checkWorkspace(dir) {
  const { tsconfigs, eslint } = findReferences(dir);
  if (tsconfigs.length === 0 && eslint.length === 0) return;

  const manifest = JSON.parse(readFileSync(path.join(dir, "package.json"), "utf8"));
  const name = manifest.name ?? rel(dir);
  console.log(`\n${name} (${rel(dir)})`);

  // 1. Declared as a workspace dependency.
  const declared =
    manifest.dependencies?.[CONFIG_PKG] ??
    manifest.devDependencies?.[CONFIG_PKG] ??
    manifest.peerDependencies?.[CONFIG_PKG];
  if (declared && declared.startsWith("workspace:")) {
    pass(`${CONFIG_PKG} declared as ${declared}`);
  } else {
    fail(
      name,
      `${rel(dir)}/package.json does not declare "${CONFIG_PKG}": "workspace:*"`,
      `add it to devDependencies, then run \`pnpm install\``
    );
  }

  // 2. Linked into the workspace's node_modules.
  const link = path.join(dir, "node_modules", ...CONFIG_PKG.split("/"));
  let linked = false;
  if (existsSync(link) && realpathSync(link) === realpathSync(configDir)) {
    linked = true;
    pass(`${rel(link)} -> packages/config`);
  } else {
    fail(name, `${rel(link)} is missing or does not point at packages/config`, INSTALL_HINT);
  }

  // 3. + 4. Each referenced subpath resolves (and ESLint configs load).
  const require = createRequire(path.join(dir, "package.json"));
  const resolved = new Map();
  for (const { file, spec } of [...tsconfigs, ...eslint]) {
    if (resolved.has(spec)) continue;
    try {
      resolved.set(spec, require.resolve(spec));
      pass(`resolves ${spec} (${rel(file)})`);
    } catch (error) {
      resolved.set(spec, null);
      fail(
        name,
        `cannot resolve ${spec} from ${rel(file)}: ${error.code ?? error.message}`,
        linked
          ? `make sure packages/config/package.json "exports" lists "./${spec.slice(CONFIG_PKG.length + 1)}"`
          : INSTALL_HINT
      );
    }
  }

  for (const { spec } of eslint) {
    const target = resolved.get(spec);
    if (!target) continue;
    try {
      await import(pathToFileURL(target).href);
      pass(`loads ${spec}`);
    } catch (error) {
      fail(
        name,
        `cannot load ${spec}: ${error.code ? `${error.code} ` : ""}${error.message.split("\n")[0]}`,
        "declare the missing package in packages/config/package.json, then run `pnpm install`"
      );
    }
  }

  // 5. tsc can load the full config chain.
  if (tsconfigs.length > 0) {
    const tsc = findTsc(dir);
    if (!tsc) {
      fail(name, "typescript is not installed", INSTALL_HINT);
      return;
    }
    for (const { file } of tsconfigs) {
      const result = spawnSync(process.execPath, [tsc, "--showConfig", "-p", file], {
        cwd: dir,
        encoding: "utf8",
      });
      if (result.status === 0) {
        pass(`tsc --showConfig -p ${rel(file)}`);
      } else {
        const output = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
        fail(
          name,
          `tsc --showConfig -p ${rel(file)} failed: ${output.split("\n")[0]}`,
          linked ? undefined : INSTALL_HINT
        );
      }
    }
  }
}

if (!existsSync(path.join(configDir, "package.json"))) {
  console.error(`packages/config/package.json not found under ${repoRoot}`);
  process.exit(1);
}

console.log(`Checking that workspaces can resolve ${CONFIG_PKG}...`);
for (const dir of listWorkspaces()) {
  await checkWorkspace(dir);
}

if (failures.length > 0) {
  console.log(
    `\n${failures.length} of ${checks} checks failed. See DEVELOPMENT.md > "Workspace packages and shared config".`
  );
  process.exit(1);
}
console.log(`\nAll ${checks} checks passed.`);
