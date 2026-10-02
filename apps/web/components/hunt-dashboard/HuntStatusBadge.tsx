import type { HuntHistoryStatusFilter } from "@/lib/huntHistory";
import type { StoredHunt } from "@/lib/types";
import { cn } from "@/lib/utils";

export const STATUS_LABELS: Record<HuntHistoryStatusFilter, string> = {
  all: "All",
  active: "Active",
  completed: "Completed",
  draft: "Draft",
  cancelled: "Cancelled",
};

export function StatusBadge({ status }: { status: StoredHunt["status"] }) {
  const styles =
    status === "Active"
      ? "border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-800/50 dark:bg-emerald-900/30 dark:text-emerald-400"
      : status === "PendingReview"
        ? "border-violet-200 bg-violet-100 text-violet-800 dark:border-violet-800/50 dark:bg-violet-900/30 dark:text-violet-300"
        : status === "Completed"
          ? "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          : status === "Cancelled"
            ? "border-rose-200 bg-rose-100 text-rose-700 dark:border-rose-800/50 dark:bg-rose-900/30 dark:text-rose-300"
            : "border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-800/50 dark:bg-amber-900/30 dark:text-amber-400";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        styles
      )}
    >
      {status}
    </span>
  );
}
