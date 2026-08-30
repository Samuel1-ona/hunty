#!/usr/bin/env node
/**
 * Asserts every path in package.json's "exports" map resolves to a real file,
 * and smoke-tests each config by actually loading it the way a consumer would:
 * ESLint configs are run through the real ESLint CLI against a throwaway
 * fixture (dynamic `import()` alone doesn't catch FlatCompat/plugin
 * resolution failures, which only surface once ESLint itself loads them),
 * tsconfig files are parsed with TypeScript's own config loader, and the
 * Tailwind preset is imported.
 */
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import ts from 'typescript';

const pkgDir = fileURLToPath(new URL('..', import.meta.url));
const pkg = JSON.parse(readFileSync(path.join(pkgDir, 'package.json'), 'utf8'));
const require = createRequire(path.join(pkgDir, 'package.json'));

let hasErrors = false;
const fail = (message) => {
  hasErrors = true;
  console.error(`✗ ${message}`);
};
const ok = (message) => console.log(`✓ ${message}`);

const exportsMap = pkg.exports ?? {};
const resolved = [];

for (const [specifier, target] of Object.entries(exportsMap)) {
  const relativePath = typeof target === 'string' ? target : target.default;
  const absolutePath = path.join(pkgDir, relativePath);
  if (!existsSync(absolutePath)) {
    fail(`exports["${specifier}"] -> "${relativePath}" does not resolve to a file`);
    continue;
  }
  ok(`exports["${specifier}"] resolves to ${relativePath}`);
  resolved.push({ specifier, relativePath, absolutePath });
}

// ESLint flat configs: load them for real through the ESLint CLI, since a
// bare `import()` doesn't exercise FlatCompat's plugin resolution and can
// pass even when a real consumer's lint run would crash.
const eslintConfigs = resolved.filter(
  (f) => f.relativePath.startsWith('./eslint/') && f.relativePath.endsWith('.mjs')
);

if (eslintConfigs.length > 0) {
  let eslintBin;
  try {
    const eslintPkgPath = require.resolve('eslint/package.json');
    eslintBin = path.join(path.dirname(eslintPkgPath), 'bin', 'eslint.js');
  } catch (err) {
    fail(`could not resolve the "eslint" package to smoke-test configs: ${err.message}`);
  }

  if (eslintBin) {
    for (const { specifier, absolutePath } of eslintConfigs) {
      // The fixture must live inside this package so ESLint doesn't ignore
      // it as "outside the base path" and skip loading the config entirely.
      const fixtureDir = mkdtempSync(path.join(pkgDir, '.validate-fixture-'));
      const fixture = path.join(fixtureDir, 'fixture.js');
      writeFileSync(fixture, 'export const fixture = true;\n');
      try {
        const result = spawnSync(process.execPath, [eslintBin, '--config', absolutePath, fixture], {
          encoding: 'utf8',
        });
        if (result.error || result.status === 2) {
          fail(
            `exports["${specifier}"] failed to load in ESLint:\n${(result.stdout ?? '') + (result.stderr ?? '')}`
          );
        } else {
          ok(`exports["${specifier}"] loads successfully in ESLint`);
        }
      } finally {
        rmSync(fixtureDir, { recursive: true, force: true });
      }
    }
  }
}

// tsconfig files: parse and resolve them the way tsc itself would. tsconfig
// files are JSONC (comments allowed), so plain JSON.parse isn't representative.
for (const { specifier, absolutePath } of resolved.filter((f) =>
  f.relativePath.endsWith('.json')
)) {
  const { config, error } = ts.readConfigFile(absolutePath, ts.sys.readFile);
  if (error) {
    fail(
      `exports["${specifier}"] failed to parse: ${ts.flattenDiagnosticMessageText(error.messageText, '\n')}`
    );
    continue;
  }
  const parsed = ts.parseJsonConfigFileContent(config, ts.sys, path.dirname(absolutePath));
  // TS18003 ("no inputs were found") is expected: these are base configs
  // meant to be extended, not compiled standalone in this directory.
  const errors = parsed.errors.filter((e) => e.code !== 18003);
  if (errors.length > 0) {
    fail(
      `exports["${specifier}"] has invalid compiler options:\n${errors
        .map((e) => ts.flattenDiagnosticMessageText(e.messageText, '\n'))
        .join('\n')}`
    );
  } else {
    ok(`exports["${specifier}"] parses as a valid tsconfig`);
  }
}

// Tailwind preset: import it and check it looks like a config object.
const tailwindExport = resolved.find((f) => f.specifier === './tailwind');
if (tailwindExport) {
  try {
    const config = (await import(tailwindExport.absolutePath)).default;
    if (!config || typeof config !== 'object') {
      fail(`exports["./tailwind"] did not export a config object`);
    } else {
      ok(`exports["./tailwind"] loads successfully`);
    }
  } catch (err) {
    fail(`exports["./tailwind"] failed to load: ${err.message}`);
  }
}

if (hasErrors) {
  console.error('\nConfig export validation failed.');
  process.exit(1);
}

console.log(
  `\nAll ${Object.keys(exportsMap).length} @hunty/config exports validated successfully.`
);
