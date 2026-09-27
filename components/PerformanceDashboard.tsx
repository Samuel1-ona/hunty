"use client"

import { useQuery } from "@tanstack/react-query"
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

import { PERFORMANCE_BUDGETS } from "@/lib/performance-budgets"

type MetricSummary = {
  name: string
  count: number
  min: number
  max: number
  median: number
  p75: number
  p95: number
  good: number
  "needs-improvement": number
  poor: number
}

type MetricEntry = {
  name: string
  value: number
  rating: string
  timestamp: number
  url: string
}

type ApiResponse = {
  metrics: MetricEntry[]
  summary: MetricSummary[]
}

const METRIC_LABELS: Record<string, string> = {
  LCP: "Largest Contentful Paint",
  FID: "First Input Delay",
  CLS: "Cumulative Layout Shift",
  TTFB: "Time to First Byte",
  INP: "Interaction to Next Paint",
  FCP: "First Contentful Paint",
}

function formatValue(name: string, value: number): string {
  if (name === "CLS") return value.toFixed(3)
  return `${Math.round(value)} ms`
}

function RatingBadge({
  rating,
}: {
  rating: "good" | "needs-improvement" | "poor" | string
}) {
  const config = {
    good: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
    "needs-improvement":
      "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800",
    poor: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800",
  }
  const style = config[rating as keyof typeof config] ?? config["needs-improvement"]
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${style}`}
    >
      {rating === "good" && <CheckCircle2 className="mr-1 h-3 w-3" />}
      {rating === "poor" && <AlertTriangle className="mr-1 h-3 w-3" />}
      {rating}
    </span>
  )
}

function TrendIndicator({ value, threshold }: { value: number; threshold: number }) {
  if (value <= threshold) {
    return <TrendingUp className="h-4 w-4 text-emerald-500" />
  }
  return <TrendingDown className="h-4 w-4 text-red-500" />
}

function MetricCard({
  summary,
}: {
  summary: MetricSummary
}) {
  const budget = PERFORMANCE_BUDGETS.find(
    (b) => b.name === summary.name
  )
  const total = summary.count
  const goodPct = total > 0 ? Math.round((summary.good / total) * 100) : 0
  const poorPct = total > 0 ? Math.round((summary.poor / total) * 100) : 0

  return (
    <Card className="rounded-2xl border border-slate-200 dark:border-slate-800">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold text-slate-800 dark:text-white">
            {summary.name}
          </CardTitle>
          <RatingBadge
            rating={summary.poor > 0 ? "poor" : goodPct >= 80 ? "good" : "needs-improvement"}
          />
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {METRIC_LABELS[summary.name] ?? summary.name}
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {formatValue(summary.name, summary.median)}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              median of {summary.count} samples
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 p-2">
              <div className="font-semibold text-slate-800 dark:text-white">
                {formatValue(summary.name, summary.p75)}
              </div>
              <div className="text-slate-500 dark:text-slate-400">p75</div>
            </div>
            <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 p-2">
              <div className="font-semibold text-slate-800 dark:text-white">
                {formatValue(summary.name, summary.p95)}
              </div>
              <div className="text-slate-500 dark:text-slate-400">p95</div>
            </div>
            <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 p-2">
              <div className="font-semibold text-slate-800 dark:text-white">
                {formatValue(summary.name, summary.max)}
              </div>
              <div className="text-slate-500 dark:text-slate-400">max</div>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
              <div
                className="bg-emerald-500 transition-all"
                style={{ width: `${goodPct}%` }}
              />
              <div
                className="bg-amber-500 transition-all"
                style={{
                  width: `${Math.max(0, 100 - goodPct - poorPct)}%`,
                }}
              />
              <div
                className="bg-red-500 transition-all"
                style={{ width: `${poorPct}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400">
              <span>{summary.good} good</span>
              <span>{summary["needs-improvement"]} needs work</span>
              <span>{summary.poor} poor</span>
            </div>
          </div>

          {budget && (
            <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
              <TrendIndicator
                value={summary.median}
                threshold={budget.good}
              />
              <span>
                Budget: {formatValue(summary.name, budget.good)} target
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function RecentMetricsList({ metrics }: { metrics: MetricEntry[] }) {
  if (metrics.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-8 text-center">
        <Activity className="mx-auto h-8 w-8 text-slate-400 mb-2" />
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No metrics recorded yet. Metrics appear as users browse the site.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {metrics
        .slice()
        .reverse()
        .slice(0, 20)
        .map((entry, i) => (
          <div
            key={`${entry.timestamp}-${i}`}
            className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm"
          >
            <div className="flex items-center gap-3">
              <span className="font-bold text-slate-800 dark:text-white min-w-[3rem]">
                {entry.name}
              </span>
              <RatingBadge rating={entry.rating} />
              <span className="text-slate-500 dark:text-slate-400">
                {formatValue(entry.name, entry.value)}
              </span>
            </div>
            <span className="text-xs text-slate-400 dark:text-slate-500">
              {new Date(entry.timestamp).toLocaleString()}
            </span>
          </div>
        ))}
    </div>
  )
}

export function PerformanceDashboard() {
  const { data, isLoading, error } = useQuery<ApiResponse>({
    queryKey: ["performance-metrics"],
    queryFn: async () => {
      const res = await fetch("/api/analytics/performance?limit=500")
      if (!res.ok) throw new Error("Failed to fetch performance metrics")
      return res.json() as Promise<ApiResponse>
    },
    refetchInterval: 30_000,
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="rounded-2xl">
              <CardHeader>
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-3 w-32 mt-1" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-24 mb-4" />
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <Card className="rounded-2xl border-red-200 dark:border-red-900/50">
        <CardContent className="p-8 text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-red-500 mb-2" />
          <p className="text-sm text-red-600 dark:text-red-400">
            Failed to load performance data.
          </p>
        </CardContent>
      </Card>
    )
  }

  const { metrics, summary } = data
  const regressions = summary.filter((s) => s.poor > 0)

  return (
    <div className="space-y-8">
      {regressions.length > 0 && (
        <Card className="rounded-2xl border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/10">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
              Performance regressions detected in{" "}
              {regressions.map((r) => r.name).join(", ")}.
              {regressions.some((r) => r.poor > r.count * 0.1) &&
                " More than 10% of samples are failing budgets."}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {summary.map((s) => (
          <MetricCard key={s.name} summary={s} />
        ))}
      </div>

      <section>
        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">
          Recent Events
        </h3>
        <RecentMetricsList metrics={metrics} />
      </section>
    </div>
  )
}
