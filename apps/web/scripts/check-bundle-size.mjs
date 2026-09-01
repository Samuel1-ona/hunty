import { existsSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"

const MAX_INITIAL_JS_KB = 200
const projectRoot = process.cwd()
const manifestPath = join(projectRoot, ".next", "build-manifest.json")

if (!existsSync(manifestPath)) {
  console.error("build-manifest.json was not found. Run `npm run build` before bundle:check.")
  process.exit(1)
}

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"))
const pages = manifest.pages ?? {}

const rootFiles = [...new Set([...(pages["/"] ?? []), ...(pages["/_app"] ?? []), ...(manifest.rootMainFiles ?? [])])]
  .filter((file) => file.endsWith(".js"))

if (!rootFiles.length) {
  console.error("No JS files were found for root page in build manifest.")
  process.exit(1)
}

let totalBytes = 0
for (const relativeFile of rootFiles) {
  const absoluteFile = join(projectRoot, ".next", relativeFile)
  if (!existsSync(absoluteFile)) continue
  totalBytes += statSync(absoluteFile).size
}

const totalKb = Number((totalBytes / 1024).toFixed(2))
console.log(`Initial JS bundle (root): ${totalKb} KB`)

if (totalKb > MAX_INITIAL_JS_KB) {
  console.error(`Bundle size regression: ${totalKb} KB exceeds ${MAX_INITIAL_JS_KB} KB limit.`)
  process.exit(1)
}

console.log("Bundle size check passed.")
