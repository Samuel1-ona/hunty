"use client"

/**
 * ClueAnalyticsTable
 *
 * Displays per-clue analytics for a hunt creator:
 *   • Solve rate (%) per clue
 *   • Average attempts per player per clue
 *   • Total hint reveals per clue
 *   • Visual highlight for clues below the abandonment threshold
 *
 * Props:
 *   huntId            — the hunt to load analytics for.
 *   abandonmentThreshold — 0–100 percentage below which a clue is flagged.
 *                          Defaults to 40.
 */

import { useCallback, useEffect, useState } from "react"
import { AlertTriangle, HelpCircle, RefreshCw, RotateCcw, Target, TrendingDown } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { ClueAnalyticsResult, ClueAnalyticsRow } from "@/lib/clueAnalytics"

// ─── Sub-components ───────────────────────────────────────────────────────────

function SolveRateBadge({ rate, abandoned }: { rate: number; abandoned: boolean }) {
  return (
    <span
      className={cn(
        "inline-block rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
        abandoned
          ? "bg-red-100 text-red-700"
          : rate >= 75
            ? "bg-green-100 text-green-700"
            : "bg-amber-100 text-amber-700",
      )}
    >
      {rate.toFixed(1)}%
    </span>
  )
}

function ThresholdControl({
  value,
  onChange,
}: {
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center gap-2 text-sm text-slate-600">
      <span className="font-medium whitespace-nowrap">Abandonment threshold:</span>
      <input
        type="number"
        min={0}
        max={100}
        value={value}
        onChange={(e) => {
          const n = parseInt(e.target.value, 10)
          if (!isNaN(n) && n >= 0 && n <= 100) onChange(n)
        }}
        className="w-20 rounded-md border border-slate-300 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#3737A4]"
        aria-label="Abandonment threshold percentage"
      />
      <span>%</span>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface ClueAnalyticsTableProps {
  huntId: number
  /** Solve-rate % below which a clue is highlighted as an abandonment point (0–100). */
  abandonmentThreshold?: number
}

type LoadState = "idle" | "loading" | "error" | "ready"

export function ClueAnalyticsTable({
  huntId,
  abandonmentThreshold: initialThreshold = 40,
}: ClueAnalyticsTableProps) {
  const [threshold, setThreshold] = useState(initialThreshold)
  const [result, setResult] = useState<ClueAnalyticsResult | null>(null)
  const [state, setState] = useState<LoadState>("idle")
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const fetchAnalytics = useCallback(
    async (t: number) => {
      setState("loading")
      setErrorMsg(null)
      try {
        const res = await fetch(
          `/api/v1/hunts/${huntId}/analytics/clues?threshold=${t}`,
        )
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string }
          throw new Error(body.error ?? `Request failed (${res.status})`)
        }
        const json = (await res.json()) as { data: ClueAnalyticsResult }
        setResult(json.data)
        setState("ready")
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : "Unknown error")
        setState("error")
      }
    },
    [huntId],
  )

  // Initial load
  useEffect(() => {
    void fetchAnalytics(threshold)
    // We intentionally only run on mount; threshold changes are handled
    // by the Reload button or auto-fetch below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [huntId])

  // Re-fetch whenever the threshold is changed by the user
  const handleThresholdChange = (newThreshold: number) => {
    setThreshold(newThreshold)
    void fetchAnalytics(newThreshold)
  }

  const handleRefresh = () => void fetchAnalytics(threshold)

  // ── Render states ──────────────────────────────────────────────────────────

  if (state === "idle" || state === "loading") {
    return (
      <Card
        className="rounded-2xl border border-slate-200 bg-white shadow-sm"
        aria-busy="true"
        aria-label="Loading clue analytics"
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Target className="h-5 w-5 text-[#3737A4]" />
            Clue Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-10 text-slate-400">
            <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
            Loading clue data…
          </div>
        </CardContent>
      </Card>
    )
  }

  if (state === "error") {
    return (
      <Card className="rounded-2xl border border-red-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Target className="h-5 w-5 text-[#3737A4]" />
            Clue Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-3 py-8 text-slate-600">
            <AlertTriangle className="h-8 w-8 text-red-500" />
            <p className="text-sm">{errorMsg ?? "Failed to load clue analytics."}</p>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RotateCcw className="mr-1.5 h-4 w-4" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const clues: ClueAnalyticsRow[] = result?.clues ?? []
  const abandonedCount = clues.filter((c) => c.abandoned).length

  if (clues.length === 0) {
    return (
      <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Target className="h-5 w-5 text-[#3737A4]" />
            Clue Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-8 text-center text-sm text-slate-500">
            No submission data yet — analytics will appear once players start attempting clues.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-[#3737A4]" />
          <CardTitle className="text-lg">Clue Analytics</CardTitle>
          {abandonedCount > 0 && (
            <span
              className="flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700"
              aria-label={`${abandonedCount} clue${abandonedCount === 1 ? "" : "s"} below threshold`}
            >
              <TrendingDown className="h-3 w-3" />
              {abandonedCount} flagged
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <ThresholdControl value={threshold} onChange={handleThresholdChange} />
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            aria-label="Refresh clue analytics"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 border-b border-slate-100 px-6 py-3 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-red-100 ring-1 ring-red-300" />
            Below abandonment threshold
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-amber-50 ring-1 ring-amber-200" />
            Solve rate 40–75%
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-green-50 ring-1 ring-green-200" />
            Solve rate ≥ 75%
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto" role="region" aria-label="Clue analytics table">
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-6 py-3">#</th>
                <th className="px-4 py-3">Clue</th>
                <th className="px-4 py-3 text-right">Players</th>
                <th className="px-4 py-3 text-right">Solvers</th>
                <th className="px-4 py-3 text-right">Solve rate</th>
                <th className="px-4 py-3 text-right">Avg attempts</th>
                <th className="px-4 py-3 text-right">
                  <span className="flex items-center justify-end gap-1">
                    Hints used
                    <HelpCircle className="h-3.5 w-3.5 text-slate-400" title="Total hint reveals across all players" />
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {clues.map((clue) => (
                <tr
                  key={clue.clueId}
                  className={cn(
                    "transition-colors",
                    clue.abandoned
                      ? "bg-red-50 hover:bg-red-100"
                      : clue.solveRate >= 75
                        ? "bg-green-50/40 hover:bg-green-50"
                        : "hover:bg-slate-50",
                  )}
                  aria-label={
                    clue.abandoned
                      ? `${clue.label} — flagged as abandonment point`
                      : undefined
                  }
                >
                  {/* Position */}
                  <td className="px-6 py-3 font-mono text-xs text-slate-400">
                    {clue.position}
                  </td>

                  {/* Label + optional warning icon */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {clue.abandoned && (
                        <AlertTriangle
                          className="h-4 w-4 flex-shrink-0 text-red-500"
                          aria-hidden="true"
                        />
                      )}
                      <span className={cn("font-medium", clue.abandoned && "text-red-700")}>
                        {clue.label}
                      </span>
                    </div>
                  </td>

                  {/* Unique players */}
                  <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                    {clue.uniquePlayers.toLocaleString()}
                  </td>

                  {/* Solvers */}
                  <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                    {clue.solvers.toLocaleString()}
                  </td>

                  {/* Solve rate badge */}
                  <td className="px-4 py-3 text-right">
                    <SolveRateBadge rate={clue.solveRate} abandoned={clue.abandoned} />
                  </td>

                  {/* Average attempts */}
                  <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                    {clue.avgAttempts.toFixed(1)}
                  </td>

                  {/* Hints used */}
                  <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                    {clue.hintsUsed.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer summary */}
        <div className="border-t border-slate-100 px-6 py-3 text-xs text-slate-500">
          {clues.length} clue{clues.length !== 1 ? "s" : ""} ·{" "}
          {abandonedCount > 0 ? (
            <span className="text-red-600 font-medium">
              {abandonedCount} below {threshold}% threshold
            </span>
          ) : (
            <span className="text-green-600 font-medium">all above threshold</span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
