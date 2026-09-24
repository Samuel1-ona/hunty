import { Button } from "@hunty/ui";
import { Card, CardDescription, CardTitle } from "@hunty/ui";
import { Copy, Eye, Plus, Trophy } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { MouseEvent as ReactMouseEvent } from "react";

import { HuntInviteControls } from "@/components/HuntInviteControls";
import { StarRating } from "@/components/StarRating";
import { Checkbox } from "@/components/ui/checkbox";
import type { StoredHunt } from "@/lib/types";
import { cn } from "@/lib/utils";

import { StatusBadge } from "./HuntStatusBadge";

interface HuntCardGridProps {
  hunts: StoredHunt[];
  selectedIds: Set<number>;
  onToggleSelect: (id: number) => void;
  onCopyId: (event: ReactMouseEvent<HTMLElement>, id: number) => void;
  onDuplicate: (event: ReactMouseEvent<HTMLElement>, hunt: StoredHunt) => void;
  onOpenClueModal: (hunt: StoredHunt) => void;
  onActivateClick: (hunt: StoredHunt) => void;
  onRefresh: () => void;
}

export function HuntCardGrid({
  hunts,
  selectedIds,
  onToggleSelect,
  onCopyId,
  onDuplicate,
  onOpenClueModal,
  onActivateClick,
  onRefresh,
}: HuntCardGridProps) {
  const a11y = useTranslations("a11y");

  if (hunts.length === 0) {
    return (
      <div className="col-span-full rounded-3xl border border-dashed border-slate-300 bg-white/70 px-6 py-14 text-center shadow-sm dark:border-white/10 dark:bg-slate-950/50">
        <p className="text-lg font-semibold text-slate-900 dark:text-white">
          No hunts found for this filter
        </p>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Try another status or sort option to explore your hunt history.
        </p>
      </div>
    );
  }

  return (
    <>
      {hunts.map((hunt) => {
        const isDraft = hunt.status === "Draft";
        const isActive = hunt.status === "Active";
        const isCompleted = hunt.status === "Completed";
        const isPendingReview = hunt.status === "PendingReview";
        const hasClues = hunt.cluesCount > 0;
        const canActivate = isDraft && hasClues && !isPendingReview;

        return (
          <Card
            key={hunt.id}
            className={cn(
              "group relative overflow-hidden rounded-2xl border transition-all",
              selectedIds.has(hunt.id)
                ? "border-blue-400 dark:border-blue-500 bg-blue-50/30 dark:bg-blue-900/10 ring-1 ring-blue-400 dark:ring-blue-500"
                : "border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-white/20 shadow-sm"
            )}
          >
            <div className="absolute right-3 top-3 z-10">
              <Checkbox
                checked={selectedIds.has(hunt.id)}
                onCheckedChange={() => onToggleSelect(hunt.id)}
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
                className="h-5 w-5 rounded-md border-slate-300 dark:border-white/20"
                aria-label={a11y("selectHunt", { title: hunt.title })}
              />
            </div>
            <Link href={`/hunt/${hunt.id}`}>
              <div className="p-5">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CardTitle className="line-clamp-2 text-lg dark:text-white">
                      {hunt.title}
                    </CardTitle>
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded-md text-xs text-slate-500 dark:text-slate-400 font-mono">
                      #{hunt.id}
                      <button
                        onClick={(e) => onCopyId(e, hunt.id)}
                        aria-label={a11y("copyHuntId", { id: hunt.id })}
                        className="hover:text-slate-800 dark:hover:text-white transition-colors"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <StatusBadge status={hunt.status} />
                </div>
                <CardDescription className="mb-4 line-clamp-3 text-sm text-slate-600 dark:text-slate-400">
                  {hunt.description}
                </CardDescription>
                <StarRating rating={hunt.averageRating} count={hunt.reviewCount} className="mb-3" />
                <div className="mb-4 flex flex-wrap gap-2">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-white/5 dark:text-slate-300">
                    {hunt.playerCount ?? 0} players
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-white/5 dark:text-slate-300">
                    {hunt.rewardPool ?? 0} XLM reward pool
                  </span>
                  {hunt.is_private && (
                    <span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-medium text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                      Private
                    </span>
                  )}
                </div>
                <HuntInviteControls hunt={hunt} onRefresh={onRefresh} />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {hunt.cluesCount} {hunt.cluesCount === 1 ? "clue" : "clues"}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => onDuplicate(e, hunt)}
                      className="border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-white/20 dark:text-slate-300 dark:hover:bg-white/5"
                    >
                      <Copy className="mr-1 h-3 w-3" />
                      Duplicate
                    </Button>
                    {isDraft && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onOpenClueModal(hunt)}
                          className="border-[#3737A4] text-[#3737A4] hover:bg-[#3737A4] hover:text-white"
                        >
                          <Plus className="mr-1 h-3 w-3" />
                          Add Clues
                        </Button>
                        {hasClues && (
                          <Button
                            size="sm"
                            variant="outline"
                            asChild
                            className="border-amber-400 text-amber-700 hover:bg-amber-50 dark:border-amber-600 dark:text-amber-400 dark:hover:bg-amber-900/20"
                            onClick={(e: React.MouseEvent) => e.stopPropagation()}
                          >
                            <Link href={`/hunt/${hunt.id}/preview`}>
                              <Eye className="mr-1 h-3 w-3" />
                              Preview
                            </Link>
                          </Button>
                        )}
                      </>
                    )}
                    {(isActive || isCompleted) && (
                      <Button
                        size="sm"
                        variant="outline"
                        asChild
                        className="flex items-center gap-1.5 border-[#3737A4] text-[#3737A4] hover:bg-[#3737A4] hover:text-white"
                      >
                        <Link href={`/dashboard/hunts/${hunt.id}/leaderboard`}>
                          <Trophy className="h-4 w-4" />
                          Leaderboard
                        </Link>
                      </Button>
                    )}
                    {isPendingReview && (
                      <span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-800 dark:bg-violet-900/30 dark:text-violet-300">
                        Awaiting moderation
                      </span>
                    )}
                    {isDraft && (
                      <Button
                        size="sm"
                        onClick={() => onActivateClick(hunt)}
                        disabled={!canActivate}
                        className="bg-gradient-to-b from-[#39A437] to-[#194F0C] hover:bg-green-700 disabled:pointer-events-none disabled:opacity-50"
                      >
                        Submit for review
                      </Button>
                    )}
                  </div>
                </div>
                {isDraft && !hasClues && (
                  <p className="mt-2 text-xs text-amber-600">Add at least one clue to activate.</p>
                )}
              </div>
            </Link>
          </Card>
        );
      })}
    </>
  );
}
