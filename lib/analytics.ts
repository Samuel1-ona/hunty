import { promises as fs } from "fs"
import crypto from "crypto"
import path from "path"
import { logger } from "@/lib/logger"

export type HuntViewStats = {
  huntId: number
  views: number
}

const ANALYTICS_STORE_PATH = path.join(process.cwd(), "data", "hunt-views.json")

async function ensureStoreFile(): Promise<void> {
  const dir = path.dirname(ANALYTICS_STORE_PATH)
  await fs.mkdir(dir, { recursive: true })
  try {
    await fs.access(ANALYTICS_STORE_PATH)
  } catch {
    await fs.writeFile(ANALYTICS_STORE_PATH, JSON.stringify({}, null, 2), "utf8")
  }
}

async function readAnalyticsStore(): Promise<Record<string, { views: number }>> {
  await ensureStoreFile()
  const raw = await fs.readFile(ANALYTICS_STORE_PATH, "utf8")
  try {
    const data = JSON.parse(raw)
    if (typeof data !== "object" || data === null) {
      return {}
    }
    return data as Record<string, { views: number }>
  } catch {
    return {}
  }
}

async function writeAnalyticsStore(data: Record<string, { views: number }>): Promise<void> {
  await ensureStoreFile()
  await fs.writeFile(ANALYTICS_STORE_PATH, JSON.stringify(data, null, 2), "utf8")
}

export function hashHuntId(huntId: number): string {
  const secret = process.env.HUNT_VIEW_ANALYTICS_SECRET || "hunty-analytics-secret"
  return crypto.createHmac("sha256", secret).update(String(huntId)).digest("hex")
}

export async function recordHuntView(huntId: number): Promise<HuntViewStats> {
  const counts = await readAnalyticsStore()
  const key = String(huntId)
  const views = (counts[key]?.views ?? 0) + 1
  counts[key] = { views }
  await writeAnalyticsStore(counts)

  if (process.env.HUNT_VIEW_ANALYTICS_ENDPOINT) {
    const endpoint = process.env.HUNT_VIEW_ANALYTICS_ENDPOINT
    const payload = {
      event: "hunt_view",
      huntIdHash: hashHuntId(huntId),
      source: "hunt_detail_page",
      timestamp: new Date().toISOString(),
    }

    try {
      await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(process.env.HUNT_VIEW_ANALYTICS_KEY
            ? { Authorization: `Bearer ${process.env.HUNT_VIEW_ANALYTICS_KEY}` }
            : {}),
        },
        body: JSON.stringify(payload),
      })
    } catch (error) {
      // Privacy-preserving analytics should not break page rendering.
      logger.warn("Failed to forward hunt view analytics", error)
    }
  }

  return { huntId, views }
}

export async function getHuntViewCount(huntId: number): Promise<number> {
  const counts = await readAnalyticsStore()
  return counts[String(huntId)]?.views ?? 0
}

export async function getAllHuntViewCounts(): Promise<HuntViewStats[]> {
  const counts = await readAnalyticsStore()
  return Object.entries(counts).map(([huntId, entry]) => ({
    huntId: Number(huntId),
    views: entry.views,
  }))
}
