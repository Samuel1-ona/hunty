import type { HuntAnalyticsResponse } from "@/lib/huntAnalytics";

export function formatSeconds(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return "N/A";
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const rem = s % 60;
  if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}m`;
  if (m > 0) return `${m}m ${rem.toString().padStart(2, "0")}s`;
  return `${rem}s`;
}

export function filterByDays(timeSeries: HuntAnalyticsResponse["timeSeries"], days: number | null) {
  if (days === null) return timeSeries;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  return timeSeries.filter((p) => p.date >= cutoffStr);
}

export type DateRange = "7d" | "30d" | "90d" | "all";

export const DATE_RANGE_OPTIONS: { value: DateRange; label: string; days: number | null }[] = [
  { value: "7d", label: "7d", days: 7 },
  { value: "30d", label: "30d", days: 30 },
  { value: "90d", label: "90d", days: 90 },
  { value: "all", label: "All", days: null },
];
