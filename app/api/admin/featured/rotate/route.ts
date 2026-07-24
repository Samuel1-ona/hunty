import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import { SEED_HUNTS } from "@/lib/huntStore"

const FILE_PATH = path.join(process.cwd(), "lib", "featuredHuntServer.json")

function readFeaturedId(): number | null {
  try {
    if (!fs.existsSync(FILE_PATH)) {
      return null
    }
    const raw = fs.readFileSync(FILE_PATH, "utf8")
    const parsed = JSON.parse(raw) as { featuredHuntId: number | null }
    return parsed.featuredHuntId ?? null
  } catch {
    return null
  }
}

function writeFeaturedId(id: number | null): void {
  try {
    const dir = path.dirname(FILE_PATH)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(FILE_PATH, JSON.stringify({ featuredHuntId: id }, null, 2), "utf8")
  } catch {
    // ignore
  }
}

export async function POST() {
  try {
    // Only rotate amongst active seeded hunts
    const activeSeedHunts = SEED_HUNTS.filter((h) => h.status === "Active")
    if (activeSeedHunts.length === 0) {
      return NextResponse.json({ error: "No active seeded hunts available to rotate" }, { status: 404 })
    }

    const currentId = readFeaturedId()
    let nextIndex = 0

    if (currentId !== null) {
      const currentIndex = activeSeedHunts.findIndex((h) => h.id === currentId)
      if (currentIndex !== -1) {
        nextIndex = (currentIndex + 1) % activeSeedHunts.length
      }
    }

    const nextHunt = activeSeedHunts[nextIndex]
    writeFeaturedId(nextHunt.id)

    return NextResponse.json({
      success: true,
      rotatedTo: nextHunt.id,
      hunt: nextHunt
    })
  } catch {
    return NextResponse.json({ error: "Failed to rotate featured hunt" }, { status: 500 })
  }
}
