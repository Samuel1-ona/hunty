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
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Eye,
  Play,
  Trophy,
  Clock,
  Download,
  RefreshCw,
  TrendingUp,
  Users,
  BarChart3,
  Smartphone,
  Monitor,
  Tablet,
  HelpCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useWallet } from "@/lib/context/WalletContext";
import type { HuntAnalyticsResponse } from "@/lib/huntAnalytics";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatSeconds(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return "N/A";
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const rem = s % 60;
  if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}m`;
  if (m > 0) return `${m}m ${rem.toString().padStart(2, "0")}s`;
  return `${rem}s`;
}

function filterByDays(timeSeries: HuntAnalyticsResponse["timeSeries"], days: number | null) {
  if (days === null) return timeSeries;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  return timeSeries.filter((p) => p.date >= cutoffStr);
}

const DEVICE_ICONS: Record<string, React.ReactNode> = {
  mobile: <Smartphone className="w-4 h-4" />,
  desktop: <Monitor className="w-4 h-4" />,
  tablet: <Tablet className="w-4 h-4" />,
  unknown: <HelpCircle className="w-4 h-4" />,
};

const PIE_COLORS = ["#3737A4", "#39A437", "#E3225C", "#F59E0B", "#8B5CF6"];

type DateRange = "7d" | "30d" | "90d" | "all";

const DATE_RANGE_OPTIONS: { value: DateRange; label: string; days: number | null }[] = [
  { value: "7d", label: "7d", days: 7 },
  { value: "30d", label: "30d", days: 30 },
  { value: "90d", label: "90d", days: 90 },
  { value: "all", label: "All", days: null },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

interface StatCardProps {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string | number;
  sub?: string;
}

function StatCard({ icon, iconBg, label, value, sub }: StatCardProps) {
  return (
    <Card className="border-slate-200 dark:border-white/10">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className={cn("p-2.5 rounded-xl flex-shrink-0", iconBg)}>{icon}</div>
          <div className="min-w-0">
            <p className="text-2xl font-bold text-slate-900 dark:text-white truncate">{value}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{label}</p>
            {sub && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{sub}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-slate-200 dark:bg-slate-700" />
        ))}
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="h-72 rounded-xl bg-slate-200 dark:bg-slate-700" />
        <div className="h-72 rounded-xl bg-slate-200 dark:bg-slate-700" />
      </div>
      <div className="h-64 rounded-xl bg-slate-200 dark:bg-slate-700" />
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function NoData() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-500">
      <BarChart3 className="w-12 h-12 mb-3 opacity-30" />
      <p className="text-sm font-medium">No analytics data yet</p>
      <p className="text-xs mt-1">
        Data will appear once players start viewing and playing this hunt.
      </p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export interface HuntAnalyticsDashboardProps {
  huntId: number;
  huntTitle?: string;
}

export function HuntAnalyticsDashboard({ huntId, huntTitle }: HuntAnalyticsDashboardProps) {
  const { publicKey } = useWallet();
  const [analytics, setAnalytics] = useState<HuntAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>("30d");
  const [exporting, setExporting] = useState(false);

  // ── Fetch ────────────────────────────────────────────────────────────────
  // /api/analytics/[huntId] requires an x-wallet-address header (see
  // issue #865) — this dashboard is the creator's own analytics view, so
  // the connected wallet is the caller's identity.

  const fetchAnalytics = useCallback(async () => {
    if (!publicKey) {
      setLoading(false);
      setError("Connect your wallet to view analytics");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/analytics/${huntId}`, {
        headers: { "x-wallet-address": publicKey },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as HuntAnalyticsResponse;
      setAnalytics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, [huntId, publicKey]);

  useEffect(() => {
    void fetchAnalytics();
  }, [fetchAnalytics]);

  // ── CSV export ───────────────────────────────────────────────────────────

  const handleExport = async () => {
    if (!publicKey) return;
    setExporting(true);
    try {
      const res = await fetch(`/api/analytics/${huntId}?format=csv`, {
        headers: { "x-wallet-address": publicKey },
      });
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
          {/* ── AC 1 + AC 2: Stat cards ──────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
            <StatCard
              icon={<Eye className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
              iconBg="bg-blue-50 dark:bg-blue-900/20"
              label="Total Views"
              value={analytics?.views ?? 0}
            />
            <StatCard
              icon={<Play className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />}
              iconBg="bg-indigo-50 dark:bg-indigo-900/20"
              label="Starts"
              value={analytics?.starts ?? 0}
            />
            <StatCard
              icon={<Trophy className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
              iconBg="bg-emerald-50 dark:bg-emerald-900/20"
              label="Completions"
              value={analytics?.completions ?? 0}
            />
            <StatCard
              icon={<TrendingUp className="w-5 h-5 text-violet-600 dark:text-violet-400" />}
              iconBg="bg-violet-50 dark:bg-violet-900/20"
              label="Completion Rate"
              value={`${analytics?.completionRate ?? 0}%`}
              sub={
                (analytics?.starts ?? 0) > 0
                  ? `${analytics!.completions} / ${analytics!.starts} starters`
                  : undefined
              }
            />
            {/* AC 2 */}
            <StatCard
              icon={<Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />}
              iconBg="bg-amber-50 dark:bg-amber-900/20"
              label="Avg Completion"
              value={formatSeconds(analytics?.avgCompletionTimeSeconds ?? null)}
              sub={
                (analytics?.completions ?? 0) > 0
                  ? `over ${analytics!.completions} completions`
                  : undefined
              }
            />
            <StatCard
              icon={<Users className="w-5 h-5 text-rose-600 dark:text-rose-400" />}
              iconBg="bg-rose-50 dark:bg-rose-900/20"
              label="Unique Devices"
              value={analytics?.demographics?.reduce((s, d) => s + d.count, 0) ?? 0}
            />
          </div>

          {/* ── AC 5: Time-series chart ───────────────────────────────────── */}
          <Card className="border-slate-200 dark:border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-slate-900 dark:text-white">
                Daily Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredSeries.length === 0 ? (
                <div className="h-[260px] flex items-center justify-center text-slate-400 text-sm">
                  No activity in this date range
                </div>
              ) : (
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={filteredSeries}>
                      <defs>
                        <linearGradient id="gViews" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3737A4" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#3737A4" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gStarts" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366F1" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gCompletions" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#39A437" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#39A437" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11, fill: "#94a3b8" }}
                        interval="preserveStartEnd"
                      />
                      <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1e293b",
                          border: "none",
                          borderRadius: "8px",
                          color: "#f1f5f9",
                          fontSize: "12px",
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: "12px" }} />
                      <Area
                        type="monotone"
                        dataKey="views"
                        stroke="#3737A4"
                        strokeWidth={2}
                        fill="url(#gViews)"
                        name="Views"
                        dot={false}
                      />
                      <Area
                        type="monotone"
                        dataKey="starts"
                        stroke="#6366F1"
                        strokeWidth={2}
                        fill="url(#gStarts)"
                        name="Starts"
                        dot={false}
                      />
                      <Area
                        type="monotone"
                        dataKey="completions"
                        stroke="#39A437"
                        strokeWidth={2}
                        fill="url(#gCompletions)"
                        name="Completions"
                        dot={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── AC 3 + AC 4: Drop-off + Demographics ─────────────────────── */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* AC 3: Clue drop-off */}
            <Card className="border-slate-200 dark:border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-slate-900 dark:text-white">
                  Clue Drop-off Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!analytics?.clueDropOff?.length ? (
                  <div className="h-[260px] flex items-center justify-center text-slate-400 text-sm">
                    No clue data yet
                  </div>
                ) : (
                  <>
                    <div className="h-[220px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analytics.clueDropOff} barGap={4}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                          <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} allowDecimals={false} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#1e293b",
                              border: "none",
                              borderRadius: "8px",
                              color: "#f1f5f9",
                              fontSize: "12px",
                            }}
                          />
                          <Legend wrapperStyle={{ fontSize: "12px" }} />
                          <Bar
                            dataKey="attempts"
                            fill="#6366F1"
                            name="Attempts"
                            radius={[4, 4, 0, 0]}
                          />
                          <Bar
                            dataKey="completions"
                            fill="#39A437"
                            name="Completions"
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    {/* Funnel bars below the chart */}
                    <div className="mt-4 space-y-2">
                      {analytics.clueDropOff.map((clue) => {
                        const rate =
                          clue.attempts > 0
                            ? Math.round((clue.completions / clue.attempts) * 100)
                            : 0;
                        return (
                          <div key={clue.clueIndex} className="flex items-center gap-3">
                            <span className="w-20 text-xs text-slate-500 truncate">
                              {clue.label}
                            </span>
                            <div className="flex-1 h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-[#3737A4] to-[#6366F1] transition-all duration-700"
                                style={{ width: `${rate}%` }}
                              />
                            </div>
                            <span className="w-10 text-xs font-medium text-slate-700 dark:text-slate-300 text-right">
                              {rate}%
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* AC 4: Player demographics */}
            <Card className="border-slate-200 dark:border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-slate-900 dark:text-white">
                  Player Demographics
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!analytics?.demographics?.length ? (
                  <div className="h-[260px] flex items-center justify-center text-slate-400 text-sm">
                    No demographic data yet
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    <div className="flex-shrink-0 h-[180px] w-[180px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={analytics.demographics}
                            dataKey="count"
                            nameKey="deviceType"
                            cx="50%"
                            cy="50%"
                            outerRadius={75}
                            innerRadius={40}
                            paddingAngle={3}
                          >
                            {analytics.demographics.map((entry, index) => (
                              <Cell
                                key={entry.deviceType}
                                fill={PIE_COLORS[index % PIE_COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#1e293b",
                              border: "none",
                              borderRadius: "8px",
                              color: "#f1f5f9",
                              fontSize: "12px",
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="flex-1 space-y-2 min-w-0">
                      {analytics.demographics.map((d, index) => {
                        const total = analytics.demographics.reduce((s, x) => s + x.count, 0);
                        const pct = total > 0 ? Math.round((d.count / total) * 100) : 0;
                        return (
                          <div key={d.deviceType} className="flex items-center gap-3">
                            <span
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{
                                backgroundColor: PIE_COLORS[index % PIE_COLORS.length],
                              }}
                            />
                            <span className="flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-300 flex-shrink-0 capitalize">
                              {DEVICE_ICONS[d.deviceType] ?? null}
                              {d.deviceType}
                            </span>
                            <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-700"
                                style={{
                                  width: `${pct}%`,
                                  backgroundColor: PIE_COLORS[index % PIE_COLORS.length],
                                }}
                              />
                            </div>
                            <span className="text-xs font-medium text-slate-700 dark:text-slate-300 w-12 text-right flex-shrink-0">
                              {d.count} ({pct}%)
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── Average time per clue ─────────────────────────────────────── */}
          {(analytics?.clueDropOff?.length ?? 0) > 0 && (
            <Card className="border-slate-200 dark:border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-slate-900 dark:text-white">
                  Average Time per Clue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={analytics!.clueDropOff.map((c) => ({
                        label: c.label,
                        avgSecs:
                          c.completions > 0 ? Math.round(c.totalTimeSeconds / c.completions) : 0,
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                      <YAxis
                        tick={{ fontSize: 11, fill: "#94a3b8" }}
                        label={{
                          value: "Seconds",
                          angle: -90,
                          position: "insideLeft",
                          style: { fontSize: 11, fill: "#94a3b8" },
                        }}
                      />
                      <Tooltip
                        formatter={(value) => [formatSeconds(Number(value ?? 0)), "Avg time"]}
                        contentStyle={{
                          backgroundColor: "#1e293b",
                          border: "none",
                          borderRadius: "8px",
                          color: "#f1f5f9",
                          fontSize: "12px",
                        }}
                      />
                      <Bar
                        dataKey="avgSecs"
                        fill="#F59E0B"
                        name="Avg Time (s)"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

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
 