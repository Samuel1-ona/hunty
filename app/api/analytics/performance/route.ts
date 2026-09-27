import { NextRequest, NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"

const PERFORMANCE_STORE_PATH = path.join(
  process.cwd(),
  "data",
  "performance-metrics.json"
)

type StoredMetric = {
  name: string
  value: number
  rating: string
  timestamp: number
  url: string
}

type StoreData = {
  metrics: StoredMetric[]
}

async function ensureStoreFile(): Promise<void> {
  const dir = path.dirname(PERFORMANCE_STORE_PATH)
  await fs.mkdir(dir, { recursive: true })
  try {
    await fs.access(PERFORMANCE_STORE_PATH)
  } catch {
    await fs.writeFile(
      PERFORMANCE_STORE_PATH,
      JSON.stringify({ metrics: [] }, null, 2),
      "utf8"
    )
  }
}

async function readStore(): Promise<StoreData> {
  await ensureStoreFile()
  try {
    const raw = await fs.readFile(PERFORMANCE_STORE_PATH, "utf8")
    return JSON.parse(raw) as StoreData
  } catch {
    return { metrics: [] }
  }
}

async function writeStore(data: StoreData): Promise<void> {
  await ensureStoreFile()
  await fs.writeFile(
    PERFORMANCE_STORE_PATH,
    JSON.stringify(data, null, 2),
    "utf8"
  )
}

function summarizeMetrics(metrics: StoredMetric[]) {
  const byMetric = metrics.reduce<
    Record<string, { values: number[]; ratings: Record<string, number> }>
  >((acc, m) => {
    if (!acc[m.name]) acc[m.name] = { values: [], ratings: {} }
    acc[m.name].values.push(m.value)
    acc[m.name].ratings[m.rating] = (acc[m.name].ratings[m.rating] ?? 0) + 1
    return acc
  }, {})

  return Object.entries(byMetric).map(([name, data]) => {
    const values = data.values
    const sorted = [...values].sort((a, b) => a - b)
    const total = values.length
    return {
      name,
      count: total,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      median: sorted[Math.floor(total / 2)],
      p75: sorted[Math.floor(total * 0.75)],
      p95: sorted[Math.floor(total * 0.95)],
      good: data.ratings.good ?? 0,
      "needs-improvement": data.ratings["needs-improvement"] ?? 0,
      poor: data.ratings.poor ?? 0,
    }
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      name?: string
      value?: number
      rating?: string
      timestamp?: number
      url?: string
    }
    const { name, value, rating, timestamp, url } = body

    if (!name || typeof value !== "number") {
      return NextResponse.json(
        { error: "Invalid metric payload" },
        { status: 400 }
      )
    }

    const store = await readStore()
    store.metrics.push({
      name,
      value,
      rating: rating ?? "needs-improvement",
      timestamp: timestamp ?? Date.now(),
      url: url ?? "unknown",
    })

    if (store.metrics.length > 10000) {
      store.metrics = store.metrics.slice(-10000)
    }

    await writeStore(store)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { error: "Failed to record metric" },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const metricName = url.searchParams.get("metric")
  const limit = Math.min(Number(url.searchParams.get("limit")) || 100, 1000)

  const store = await readStore()

  let metrics = store.metrics
  if (metricName) {
    metrics = metrics.filter((m) => m.name === metricName)
  }

  const recent = metrics.slice(-limit)
  const summary = summarizeMetrics(store.metrics)

  return NextResponse.json({ metrics: recent, summary })
}
