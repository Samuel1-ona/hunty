import type { PerformanceBudget, WebVitalMetric } from "@/lib/types"

export const PERFORMANCE_BUDGETS: PerformanceBudget[] = [
  { name: "LCP", good: 2500, poor: 4000 },
  { name: "FID", good: 100, poor: 300 },
  { name: "CLS", good: 0.1, poor: 0.25 },
  { name: "TTFB", good: 800, poor: 1800 },
  { name: "INP", good: 200, poor: 500 },
  { name: "FCP", good: 1800, poor: 3000 },
]

export function getRating(
  metric: WebVitalMetric,
  value: number
): "good" | "needs-improvement" | "poor" {
  const budget = PERFORMANCE_BUDGETS.find((b) => b.name === metric)
  if (!budget) return "needs-improvement"
  if (value <= budget.good) return "good"
  if (value <= budget.poor) return "needs-improvement"
  return "poor"
}

export function isWithinBudget(metric: WebVitalMetric, value: number): boolean {
  return getRating(metric, value) !== "poor"
}

export function checkBudgets(
  metrics: { name: WebVitalMetric; value: number }[]
): {
  passed: boolean
  results: { name: WebVitalMetric; value: number; rating: string; budget: number }[]
} {
  const results = metrics.map((m) => {
    const budget = PERFORMANCE_BUDGETS.find((b) => b.name === m.name)
    const threshold = budget?.poor ?? Infinity
    const rating = getRating(m.name, m.value)
    return { name: m.name, value: m.value, rating, budget: threshold }
  })
  return {
    passed: results.every((r) => r.rating !== "poor"),
    results,
  }
}
