import { MONITORING } from "./config"
import type { WebVitalMetric } from "./types"
import { logger } from "@/lib/logger"

type VitalCallback = (metric: WebVitalMetric) => void

const listeners: VitalCallback[] = []

export function onWebVital(callback: VitalCallback): void {
  listeners.push(callback)
}

export function reportWebVital(metric: WebVitalMetric): void {
  listeners.forEach((cb) => cb(metric))

  if (metric.rating === "poor") {
    logger.warn(`[WebVitals] Poor ${metric.name}: ${metric.value} (${metric.rating})`)
  }

  if (!MONITORING.webVitals.endpoint) return
  if (Math.random() > MONITORING.webVitals.sampleRate) return

  sendToAnalytics(metric).catch(() => {})
}

async function sendToAnalytics(metric: WebVitalMetric): Promise<void> {
  try {
    await fetch(MONITORING.webVitals.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: "web-vital",
        ...metric,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
      }),
    })
  } catch {
    logger.debug("[WebVitals] Failed to send metric")
  }
}

function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return `vital-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function createMetricInit(name: string, value: number, id: string): WebVitalMetric {
  let rating: WebVitalMetric["rating"] = "good"
  const thresholds: Record<string, [number, number]> = {
    LCP: [2500, 4000],
    FID: [100, 300],
    CLS: [0.1, 0.25],
    INP: [200, 500],
    TTFB: [800, 1800],
    FCP: [1800, 3000],
  }

  const [good, poor] = thresholds[name] ?? [Infinity, Infinity]
  if (value > poor) rating = "poor"
  else if (value > good) rating = "needs-improvement"

  return { name, value, rating, delta: 0, id, url: window.location.href }
}

export function initWebVitals(): void {
  if (typeof window === "undefined") return

  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      const metric = createMetricInit(
        entry.name || entry.entryType,
        entry.startTime,
        entry.name || generateId(),
      )
      reportWebVital(metric)
    }
  })

  try {
    observer.observe({ type: "largest-contentful-paint", buffered: true })
  } catch { /* not available */ }

  try {
    observer.observe({ type: "first-input", buffered: true })
  } catch { /* not available */ }

  try {
    observer.observe({ type: "layout-shift", buffered: true })
  } catch { /* not available */ }

  try {
    observer.observe({ type: "first-contentful-paint", buffered: true })
  } catch { /* not available */ }

  if (performance.getEntriesByType?.("navigation").length) {
    const navEntry = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined
    if (navEntry) {
      const ttfb = navEntry.responseStart - navEntry.requestStart
      reportWebVital(createMetricInit("TTFB", ttfb, "ttfb"))
    }
  }
}
