#!/usr/bin/env node
/**
 * Report TypeScript/TSX source files that fail to parse.
 *
 * A file that cannot be parsed cannot be type-checked, linted, or bundled, so
 * syntax errors are surfaced separately from type errors and are meant to be
 * fixed first. Exits with code 1 when any file fails to parse.
 *
 * Usage:
 *   node scripts/check-ts-parse.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const IGNORED_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  "dist",
  "build",
  "coverage",
  ".turbo",
]);
const SOURCE_RE = /\.(ts|tsx|mts|cts)$/;

function collectSourceFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(entry.name)) continue;
      results.push(...collectSourceFiles(path.join(dir, entry.name)));
    } else if (entry.isFile() && SOURCE_RE.test(entry.name)) {
      results.push(path.join(dir, entry.name));
    }
  }
  return results;
}

function scriptKind(file) {
  return file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
}

const files = collectSourceFiles(ROOT);
let failing = 0;

for (const file of files) {
  const text = fs.readFileSync(file, "utf8");
  const sourceFile = ts.createSourceFile(
    file,
    text,
    ts.ScriptTarget.Latest,
    true,
    scriptKind(file)
  );
  const diagnostics = sourceFile.parseDiagnostics ?? [];
  if (diagnostics.length === 0) continue;

  failing += 1;
  for (const diagnostic of diagnostics) {
    const { line, character } = sourceFile.getLineAndCharacterOfPosition(diagnostic.start);
    const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, " ");
    console.error(`${path.relative(ROOT, file)}:${line + 1}:${character + 1} ${message}`);
  }
}

if (failing > 0) {
  console.error(`\n${failing} of ${files.length} file(s) failed to parse.`);
  process.exit(1);
}

console.log(`${files.length} file(s) parsed successfully.`);
