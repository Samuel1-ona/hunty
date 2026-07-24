import { NextRequest, NextResponse } from "next/server"
import { logger } from "@/lib/logger"
import fs from "fs"
import path from "path"

const FILE_PATH = path.join(process.cwd(), "lib", "featuredHuntServer.json")

function readFeaturedId(): number | null {
  try {
    if (!fs.existsSync(FILE_PATH)) {
      return null
    }
    const raw = fs.readFileSync(FILE_PATH, "utf8")
    const parsed = JSON.parse(raw) as { featuredHuntId: number | null }
    return parsed.featuredHuntId ?? null
  } catch (error) {
    logger.error("Error reading featured hunt server file:", error)
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
  } catch (error) {
    logger.error("Error writing featured hunt server file:", error)
  }
}

export async function GET() {
  const featuredHuntId = readFeaturedId()
  return NextResponse.json({ featuredHuntId })
}

export async function POST(req: NextRequest) {
  try {
    const { huntId } = await req.json() as { huntId: number | null }
    writeFeaturedId(huntId)
    return NextResponse.json({ success: true, featuredHuntId: huntId })
  } catch {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 })
  }
}
