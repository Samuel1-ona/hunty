import { MONITORING } from "./config"
import type { ApiMetric } from "./types"
import { logger } from "@/lib/logger"

const metrics: ApiMetric[] = []
const MAX_METRICS = 1000

export function recordMetric(metric: ApiMetric): void {
  metrics.push(metric)
  if (metrics.length > MAX_METRICS) {
    metrics.shift()
  }

  if (metric.durationMs > MONITORING.apis.slowRequestThresholdMs) {
    logger.warn(`[Monitoring] Slow request: ${metric.method} ${metric.route} took ${metric.durationMs}ms`)
  }

  if (metric.statusCode >= 500 && Math.random() < MONITORING.apis.errorSampleRate) {
    logger.error(`[Monitoring] Server error: ${metric.method} ${metric.route} returned ${metric.statusCode}`, metric.error)
  }
}

export function getMetrics(): ApiMetric[] {
  return [...metrics]
}

export function getAggregatedMetrics() {
  const routeStats = new Map<string, { count: number; errors: number; totalDuration: number; maxDuration: number }>()

  for (const m of metrics) {
    const existing = routeStats.get(m.route) ?? { count: 0, errors: 0, totalDuration: 0, maxDuration: 0 }
    existing.count++
    if (m.statusCode >= 500) existing.errors++
    existing.totalDuration += m.durationMs
    existing.maxDuration = Math.max(existing.maxDuration, m.durationMs)
    routeStats.set(m.route, existing)
  }

  return Array.from(routeStats.entries()).map(([route, stats]) => ({
    route,
    requestCount: stats.count,
    errorCount: stats.errors,
    errorRate: stats.count > 0 ? stats.errors / stats.count : 0,
    avgDurationMs: stats.count > 0 ? Math.round(stats.totalDuration / stats.count) : 0,
    maxDurationMs: stats.maxDuration,
  }))
}

export function getErrorRate(): number {
  if (metrics.length === 0) return 0
  const errors = metrics.filter((m) => m.statusCode >= 500).length
  return errors / metrics.length
}

export function getP95ResponseTime(): number {
  if (metrics.length === 0) return 0
  const sorted = [...metrics].sort((a, b) => a.durationMs - b.durationMs)
  const index = Math.ceil(sorted.length * 0.95) - 1
  return sorted[index]!.durationMs
}

export function wrapApiRoute<T>(
  handler: () => Promise<T>,
  route: string,
  method: string,
): Promise<T> {
  if (!MONITORING.enabled) return handler()

  const start = Date.now()
  return handler()
    .then((result) => {
      const durationMs = Date.now() - start
      recordMetric({
        route,
        method,
        statusCode: 200,
        durationMs,
        timestamp: new Date().toISOString(),
      })
      return result
    })
    .catch((error: Error) => {
      const durationMs = Date.now() - start
      recordMetric({
        route,
        method,
        statusCode: 500,
        durationMs,
        timestamp: new Date().toISOString(),
        error: error.message,
      })
      throw error
    })
}

export function clearMetrics(): void {
  metrics.length = 0
}
