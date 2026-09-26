import { existsSync, readdirSync, readFileSync, writeFileSync } from "fs"
import { dirname, join } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, "..")
const BUDGETS_FILE = join(root, "bundle-budgets.json")

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

  const results = {}

  for (const [page, chunks] of Object.entries(pages)) {
    if (page.startsWith("/api")) continue;

    let totalSize = 0
    for (const chunk of chunks) {
      const chunkPath = join(root, ".next", chunk)
      if (existsSync(chunkPath)) {
        totalSize += readFileSync(chunkPath).length
      }
    }

    // Add a 10% buffer to the current size for the budget
    const currentKb = totalSize / 1024
    results[page] = {
      jsKb: Math.ceil(currentKb * 1.1)
    }
  }

  return results
}

function main() {
  console.log("\n📝 Updating Performance Budgets\n")
  const newBudgets = analyzeBundles()
  
  writeFileSync(BUDGETS_FILE, JSON.stringify(newBudgets, null, 2), "utf8")
  console.log(`✅ Budgets updated successfully in ${BUDGETS_FILE}`)
}

main()
