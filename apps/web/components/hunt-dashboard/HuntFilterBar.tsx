import { Button } from "@hunty/ui";
import { Trash2, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { Checkbox } from "@/components/ui/checkbox";
import {
  HUNT_HISTORY_STATUS_FILTERS,
  type HuntHistorySortOption,
  type HuntHistoryStatusFilter,
} from "@/lib/huntHistory";

import { STATUS_LABELS } from "./HuntStatusBadge";

const SORT_LABELS: Record<HuntHistorySortOption, string> = {
  newest: "Newest",
  oldest: "Oldest",
  "most-players": "Most Players",
  "highest-reward": "Highest Reward",
};

interface HuntFilterBarProps {
  totalHunts: number;
  filteredCount: number;
  currentPage: number;
  totalPages: number;
  startItem: number;
  endItem: number;
  statusFilter: HuntHistoryStatusFilter;
  sortOption: HuntHistorySortOption;
  allVisibleSelected: boolean;
  selectedCount: number;
  onStatusFilterChange: (status: HuntHistoryStatusFilter) => void;
  onSortChange: (sort: HuntHistorySortOption) => void;
  onToggleSelectAll: () => void;
  onBatchArchive: () => void;
  onBatchDelete: () => void;
  onClearSelection: () => void;
}

export function HuntFilterBar({
  totalHunts,
  filteredCount,
  currentPage,
  totalPages,
  startItem,
  endItem,
  statusFilter,
  sortOption,
  allVisibleSelected,
  selectedCount,
  onStatusFilterChange,
  onSortChange,
  onToggleSelectAll,
  onBatchArchive,
  onBatchDelete,
  onClearSelection,
}: HuntFilterBarProps) {
  const a11y = useTranslations("a11y");

  const resultsLabel =
    filteredCount === totalHunts
      ? `${totalHunts} total hunts`
      : `${filteredCount} of ${totalHunts} hunts`;

  return (
    <div className="mb-6 rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-950/60">
      <div className="flex flex-col gap-5 border-b border-slate-200 pb-5 dark:border-white/10 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Hunt history</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
              {resultsLabel}
            </h2>
            <span className="text-sm text-slate-500 dark:text-slate-400">
              Page {currentPage} of {totalPages}
            </span>
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {startItem === 0 ? "No hunts match this view" : `Showing ${startItem}-${endItem}`}
            </span>
          </div>
        </div>

        <label className="flex flex-col gap-1 text-sm font-medium text-slate-600 dark:text-slate-300">
          Sort by
          <select
            value={sortOption}
            onChange={(event) => onSortChange(event.target.value as HuntHistorySortOption)}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-[#3737A4] dark:border-white/10 dark:bg-slate-900 dark:text-slate-100"
          >
            {Object.entries(SORT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {HUNT_HISTORY_STATUS_FILTERS.map((filter) => {
          const isActiveFilter = filter === statusFilter;
          return (
            <Button
              key={filter}
              type="button"
              size="sm"
              variant={isActiveFilter ? "default" : "outline"}
              onClick={() => onStatusFilterChange(filter)}
              className={
                isActiveFilter
                  ? "rounded-full bg-[#3737A4] text-white hover:bg-[#2d2d8d]"
                  : "rounded-full border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:border-white/10 dark:text-slate-300 dark:hover:text-white"
              }
            >
              {STATUS_LABELS[filter]}
            </Button>
          );
        })}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Checkbox
            id="select-all"
            checked={allVisibleSelected}
            onCheckedChange={onToggleSelectAll}
          />
          <label
            htmlFor="select-all"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 dark:text-slate-300"
          >
            Select Page
          </label>
        </div>

        {selectedCount > 0 && (
          <div className="flex animate-in items-center gap-3 fade-in slide-in-from-top-2">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
              {selectedCount} selected
            </span>
            <div className="h-4 w-[1px] bg-slate-200 dark:bg-white/10" />
            <Button
              size="sm"
              variant="outline"
              onClick={onBatchArchive}
              className="h-8 border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
            >
              Archive
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onBatchDelete}
              className="h-8 border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
            >
              <Trash2 className="mr-1 h-3 w-3" />
              Delete
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onClearSelection}
              className="h-8 px-2 text-slate-500"
              aria-label={a11y("clearSelection")}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
