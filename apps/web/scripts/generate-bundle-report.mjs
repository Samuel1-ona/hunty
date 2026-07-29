#!/usr/bin/env node

import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const projectRoot = process.cwd();
const manifestPath = join(projectRoot, ".next", "build-manifest.json");

/**
 * Generates a markdown bundle-size report for PR comments.
 * Writes the result to bundle-report.md in the project root.
 */

function bytesToKb(bytes) {
  return Number((bytes / 1024).toFixed(2));
}

function getBuildManifest() {
  if (!existsSync(manifestPath)) {
    console.error("build-manifest.json not found. Run `npm run build` first.");
    process.exit(1);
  }
  return JSON.parse(readFileSync(manifestPath, "utf8"));
}

function analyzePageBundles(manifest) {
  const pages = manifest.pages ?? {};
  const results = [];

  for (const [page, chunks] of Object.entries(pages)) {
    let totalSize = 0;
    for (const chunk of chunks) {
      const chunkPath = join(projectRoot, ".next", chunk);
      if (existsSync(chunkPath)) {
        totalSize += statSync(chunkPath).size;
      }
    }
    results.push({
      page: page === "/" ? "/ (home)" : page,
      sizeKb: bytesToKb(totalSize),
      chunks: chunks.length,
    });
  }

  return results;
}

function analyzeInitialJs(manifest) {
  const pages = manifest.pages ?? {};
  const rootFiles = [
    ...new Set([
      ...(pages["/"] ?? []),
      ...(pages["/_app"] ?? []),
      ...(manifest.rootMainFiles ?? []),
    ]),
  ].filter((f) => f.endsWith(".js"));

  let totalBytes = 0;
  for (const file of rootFiles) {
    const abs = join(projectRoot, ".next", file);
    if (existsSync(abs)) totalBytes += statSync(abs).size;
  }

  return bytesToKb(totalBytes);
}

function formatBadge(value, good, poor) {
  if (value <= good) return "🟢";
  if (value <= poor) return "🟡";
  return "🔴";
}

function main() {
  const manifest = getBuildManifest();
  const pages = analyzePageBundles(manifest);
  const initialJsKb = analyzeInitialJs(manifest);

  const maxJs = Math.max(...pages.map((p) => p.sizeKb), 0);

  const BUDGETS = {
    totalJsKb: { good: 150, poor: 300 },
    totalCssKb: { good: 50, poor: 100 },
    jsChunks: { good: 10, poor: 20 },
  };

  const lines = [];
  lines.push("## Bundle Size Report");
  lines.push("");
  lines.push("| Metric | Value | Budget (good / poor) | Status |");
  lines.push("|--------|-------|---------------------|--------|");
  lines.push(`| Metric | Value | Budget (good / poor) | Status |`);
  lines.push(`|--------|-------|---------------------|--------|`);
  lines.push(
    `| Initial JS (root) | ${initialJsKb} KB | ${BUDGETS.totalJsKb.good} KB / ${BUDGETS.totalJsKb.poor} KB | ${formatBadge(initialJsKb, BUDGETS.totalJsKb.good, BUDGETS.totalJsKb.poor)} |`
  );
  lines.push(
    `| Max page JS | ${maxJs} KB | ${BUDGETS.totalJsKb.good} KB / ${BUDGETS.totalJsKb.poor} KB | ${formatBadge(maxJs, BUDGETS.totalJsKb.good, BUDGETS.totalJsKb.poor)} |`
  );
  lines.push("");
  lines.push("### Page Details");
  lines.push("");
  lines.push("| Page | JS Size (KB) | Chunks | Status |");
  lines.push("|------|-------------|--------|--------|");

  for (const { page, sizeKb, chunks } of pages) {
    const jsStatus = formatBadge(sizeKb, BUDGETS.totalJsKb.good, BUDGETS.totalJsKb.poor);
    const chunkStatus = formatBadge(chunks, BUDGETS.jsChunks.good, BUDGETS.jsChunks.poor);
    lines.push(`| ${page} | ${sizeKb} | ${chunks} | JS: ${jsStatus} Chunks: ${chunkStatus} |`);
  }

  const report = lines.join("\n");
  const outPath = join(projectRoot, "bundle-report.md");
  writeFileSync(outPath, report, "utf8");
  console.log(report);
  console.log(`\nReport written to ${outPath}`);
}

main();
