#!/usr/bin/env node

/**
 * Performance Budget Check
 *
 * Analyzes the Next.js build output (`.next/`) and compares JavaScript bundle
 * sizes and other static metrics against defined budgets. Fails with a
 * non-zero exit code when budgets are exceeded.
 *
 * Usage:
 *   node scripts/check-performance-budgets.mjs
 *
 * Run after `npm run build`.
 */

import { readFileSync, existsSync, readdirSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, "..")

const BUDGETS = {
  // Maximum total JS bundle size per page (3G slow, gzip estimated)
  totalJsKb: {
    good: 150,
    poor: 300,
  },
  // Maximum CSS bundle size per page
  totalCssKb: {
    good: 50,
    poor: 100,
  },
  // Maximum number of JS chunks loaded per page
  jsChunks: {
    good: 10,
    poor: 20,
  },
  // Maximum number of HTTP requests for critical resources
  criticalRequests: {
    good: 15,
    poor: 25,
  },
}

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`
}

function getBuildManifest() {
  const manifestPath = join(root, ".next", "build-manifest.json")
  if (!existsSync(manifestPath)) {
    console.error("❌ Build manifest not found. Run `npm run build` first.")
    process.exit(1)
  }
  return JSON.parse(readFileSync(manifestPath, "utf8"))
}

function analyzeBundles() {
  const manifest = getBuildManifest()
  const pages = manifest.pages ?? {}

  const results = []

  for (const [page, chunks] of Object.entries(pages)) {
    let totalSize = 0
    for (const chunk of chunks) {
      const chunkPath = join(root, ".next", chunk)
      if (existsSync(chunkPath)) {
        totalSize += readFileSync(chunkPath).length
      }
    }

    results.push({
      page,
      size: totalSize,
      chunks: chunks.length,
    })
  }

  return results
}

function analyzeCssBundles() {
  const cssDir = join(root, ".next", "static", "css")
  if (!existsSync(cssDir)) return { files: 0, size: 0 }

  const files = readdirSync(cssDir).filter((f) => f.endsWith(".css"))
  let totalSize = 0

  for (const file of files) {
    totalSize += readFileSync(join(cssDir, file)).length
  }

  return { files: files.length, size: totalSize }
}

function main() {
  console.log("\n📊 Performance Budget Check\n")

  const pageResults = analyzeBundles()

  let passed = true
  let maxJsKb = 0

  for (const { page, size, chunks } of pageResults) {
    const jsKb = size / 1024
    maxJsKb = Math.max(maxJsKb, jsKb)

    const jsStatus = jsKb <= BUDGETS.totalJsKb.good
      ? "✅"
      : jsKb <= BUDGETS.totalJsKb.poor
        ? "⚠️"
        : "❌"
    const chunkStatus = chunks <= BUDGETS.jsChunks.good
      ? "✅"
      : chunks <= BUDGETS.jsChunks.poor
        ? "⚠️"
        : "❌"

    if (jsStatus === "❌" || chunkStatus === "❌") passed = false

    console.log(
      `  ${page === "/" ? "/ (home)" : page}`
    )
    console.log(
      `    JS:  ${jsStatus} ${formatBytes(size)} (budget: ${BUDGETS.totalJsKb.good}KB good / ${BUDGETS.totalJsKb.poor}KB poor)`
    )
    console.log(
      `    Chunks: ${chunkStatus} ${chunks} (budget: ${BUDGETS.jsChunks.good} good / ${BUDGETS.jsChunks.poor} poor)`
    )
  }

  const cssResult = analyzeCssBundles()

  if (cssResult.files > 0) {
    const cssKb = cssResult.size / 1024
    const cssStatus = cssKb <= BUDGETS.totalCssKb.good
      ? "✅"
      : cssKb <= BUDGETS.totalCssKb.poor
        ? "⚠️"
        : "❌"
    if (cssStatus === "❌") passed = false
    console.log(
      `  CSS: ${cssStatus} ${formatBytes(cssResult.size)} total across ${cssResult.files} files (budget: ${BUDGETS.totalCssKb.good}KB good / ${BUDGETS.totalCssKb.poor}KB poor)`
    )
  }

  console.log("\n")

  if (passed) {
    console.log("✅ All performance budgets passed.")
    process.exit(0)
  } else {
    console.log("❌ Performance budgets exceeded. Review the results above.")
    process.exit(1)
  }
}

main()
