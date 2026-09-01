import { onCLS, onFCP, onINP, onLCP, onTTFB } from "web-vitals"

import { logger } from "@/lib/logger"
import { getRating } from "@/lib/performance-budgets"
import type { PerformanceMetric,WebVitalMetric } from "@/lib/types"

type ReportCallback = (metric: PerformanceMetric) => void

const METRIC_NAMES: Record<string, WebVitalMetric> = {
  CLS: "CLS",
  FCP: "FCP",
  INP: "INP",
  LCP: "LCP",
  TTFB: "TTFB",
}

export function observeWebVitals(onReport: ReportCallback): () => void {
  const handleMetric = (metric: { name: string; value: number }) => {
    const name = METRIC_NAMES[metric.name]
    if (!name) return

    const report: PerformanceMetric = {
      name,
      value: name === "CLS" ? metric.value : Math.round(metric.value),
      rating: getRating(name, metric.value),
      timestamp: Date.now(),
      url: window.location.href,
    }

    onReport(report)
  }

  onCLS(handleMetric)
  onFCP(handleMetric)
  onINP(handleMetric)
  onLCP(handleMetric)
  onTTFB(handleMetric)

  return () => {}
}

export async function reportPerformanceMetric(
  metric: PerformanceMetric
): Promise<void> {
  try {
    const response = await fetch("/api/analytics/performance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(metric),
    })
    if (!response.ok) {
      logger.warn("Failed to report performance metric", response.status)
    }
  } catch (error) {
    logger.warn("Failed to report performance metric", error)
  }
}


