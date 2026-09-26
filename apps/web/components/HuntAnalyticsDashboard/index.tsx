"use client";

/**
 * HuntAnalyticsDashboard
 *
 * Full analytics dashboard satisfying all 6 acceptance criteria:
 *  1. Total views, starts, completions, and completion rate
 *  2. Average completion time
 *  3. Clue-by-clue drop-off analysis
 *  4. Player demographics (device breakdown)
 *  5. Time-series charts for daily activity
 *  6. Export analytics data as CSV
 */

import { useCallback, useEffect, useState } from "react";
import { Download, RefreshCw } from "lucide-react";
import { Button } from "@hunty/ui";
import { cn } from "@/lib/utils";
import type { HuntAnalyticsResponse } from "@/lib/huntAnalytics";
import { AvgTimePerClueChart } from "./AvgTimePerClueChart";
import { ClueDropOffChart } from "./ClueDropOffChart";
import { DailyActivityChart } from "./DailyActivityChart";
import { DemographicsChart } from "./DemographicsChart";
import { DashboardSkeleton, NoData } from "./states";
import { StatsGrid } from "./StatsGrid";
import { DATE_RANGE_OPTIONS, type DateRange, filterByDays } from "./utils";

export interface HuntAnalyticsDashboardProps {
  huntId: number;
  huntTitle?: string;
}

export function HuntAnalyticsDashboard({ huntId, huntTitle }: HuntAnalyticsDashboardProps) {
  const [analytics, setAnalytics] = useState<HuntAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>("30d");
  const [exporting, setExporting] = useState(false);

  // ── Fetch ────────────────────────────────────────────────────────────────

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/analytics/${huntId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as HuntAnalyticsResponse;
      setAnalytics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, [huntId]);

  useEffect(() => {
    void fetchAnalytics();
  }, [fetchAnalytics]);

  // ── CSV export ───────────────────────────────────────────────────────────

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch(`/api/analytics/${huntId}?format=csv`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `hunt-${huntId}-analytics.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  // ── Derived data ─────────────────────────────────────────────────────────

  const rangeDays = DATE_RANGE_OPTIONS.find((o) => o.value === dateRange)?.days ?? 30;
  const filteredSeries = analytics ? filterByDays(analytics.timeSeries, rangeDays) : [];

  const hasData = analytics
    ? analytics.views + analytics.starts + analytics.completions > 0
    : false;

  // ── Render ───────────────────────────────────────────────────────────────

  if (loading) return <DashboardSkeleton />;

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 p-6 text-center">
        <p className="text-sm text-red-700 dark:text-red-400 font-medium">
          Failed to load analytics: {error}
        </p>
        <Button variant="outline" size="sm" className="mt-3" onClick={() => void fetchAnalytics()}>
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {huntTitle ? `Analytics — ${huntTitle}` : "Hunt Analytics"}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Track views, engagement, completion funnel, and player demographics.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Date range filter */}
          <div className="flex rounded-lg border border-slate-200 dark:border-white/10 overflow-hidden">
            {DATE_RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setDateRange(opt.value)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium transition-colors",
                  dateRange === opt.value
                    ? "bg-[#3737A4] text-white"
                    : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                )}
                aria-pressed={dateRange === opt.value}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Refresh */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => void fetchAnalytics()}
            aria-label="Refresh analytics"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>

          {/* CSV export — AC 6 */}
          <Button
            size="sm"
            onClick={() => void handleExport()}
            disabled={exporting || !hasData}
            className="bg-[#3737A4] hover:bg-[#2a2a7a] text-white"
            aria-label="Export analytics as CSV"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            {exporting ? "Exporting…" : "Export CSV"}
          </Button>
        </div>
      </div>

      {!hasData && !loading ? (
        <NoData />
      ) : (
        <>
          <StatsGrid analytics={analytics} />
          <DailyActivityChart data={filteredSeries} />
          <div className="grid lg:grid-cols-2 gap-6">
            <ClueDropOffChart clueDropOff={analytics?.clueDropOff ?? []} />
            <DemographicsChart demographics={analytics?.demographics ?? []} />
          </div>
          <AvgTimePerClueChart clueDropOff={analytics?.clueDropOff ?? []} />

          {/* ── Updated at footer ─────────────────────────────────────────── */}
          {analytics?.updatedAt && (
            <p className="text-xs text-center text-slate-400 dark:text-slate-500">
              Last updated:{" "}
              {new Date(analytics.updatedAt).toLocaleString(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </p>
          )}
        </>
      )}
    </div>
  );
}
