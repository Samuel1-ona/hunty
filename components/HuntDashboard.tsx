"use client"

import Link from "next/link"
import { useState, type MouseEvent as ReactMouseEvent } from "react"
import { Plus, Trash2, Trophy, Copy, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardDescription, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ActivateHuntModal } from "@/components/ActivateHuntModal"
import { EmptyState } from "@/components/EmptyState"
import { LeaderboardTable } from "@/components/LeaderBoardTable"
import { deleteHunts, archiveHunts } from "@/lib/huntStore"
import {
  HUNT_HISTORY_STATUS_FILTERS,
  type HuntHistorySortOption,
  type HuntHistoryStatusFilter,
} from "@/lib/huntHistory"
import type { ClueRow, StoredHunt } from "@/lib/types"

interface HuntDashboardProps {
  hunts: StoredHunt[]
  totalHunts: number
  filteredCount: number
  currentPage: number
  totalPages: number
  pageSize: number
  startItem: number
  endItem: number
  statusFilter: HuntHistoryStatusFilter
  sortOption: HuntHistorySortOption
  onStatusFilterChange: (status: HuntHistoryStatusFilter) => void
  onSortChange: (sort: HuntHistorySortOption) => void
  onPageChange: (page: number) => void
  onActivate: (huntId: number) => Promise<void>
  onRefresh: () => void
  onSaveClues: (huntId: number, clues: ClueRow[]) => Promise<void>
}

function StatusBadge({ status }: { status: StoredHunt["status"] }) {
  const styles =
    status === "Active"
      ? "border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-800/50 dark:bg-emerald-900/30 dark:text-emerald-400"
      : status === "Completed"
        ? "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
        : status === "Cancelled"
          ? "border-rose-200 bg-rose-100 text-rose-700 dark:border-rose-800/50 dark:bg-rose-900/30 dark:text-rose-300"
          : "border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-800/50 dark:bg-amber-900/30 dark:text-amber-400"

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        styles
      )}
    >
      {status}
    </span>
  )
}

const STATUS_LABELS: Record<HuntHistoryStatusFilter, string> = {
  all: "All",
  active: "Active",
  completed: "Completed",
  draft: "Draft",
  cancelled: "Cancelled",
}

const SORT_LABELS: Record<HuntHistorySortOption, string> = {
  newest: "Newest",
  oldest: "Oldest",
  "most-players": "Most Players",
  "highest-reward": "Highest Reward",
}

export function HuntDashboard({
  hunts,
  totalHunts,
  filteredCount,
  currentPage,
  totalPages,
  pageSize,
  startItem,
  endItem,
  statusFilter,
  sortOption,
  onStatusFilterChange,
  onSortChange,
  onPageChange,
  onActivate,
  onRefresh,
  onSaveClues,
}: HuntDashboardProps) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [modalHunt, setModalHunt] = useState<StoredHunt | null>(null)
  const [activatingId, setActivatingId] = useState<number | null>(null)
  const [clueModalHunt, setClueModalHunt] = useState<StoredHunt | null>(null)
  const [leaderboardHunt, setLeaderboardHunt] = useState<StoredHunt | null>(null)
  const [clueRows, setClueRows] = useState<ClueRow[]>([
    { id: 1, question: "", answer: "", points: 10 },
  ])
  const [poolHuntId, setPoolHuntId] = useState<number | null>(null)
  const [isSavingClues, setIsSavingClues] = useState(false)

  const visibleHuntIds = hunts.map((hunt) => hunt.id)
  const selectedVisibleCount = visibleHuntIds.filter((id) => selectedIds.has(id)).length
  const allVisibleSelected = hunts.length > 0 && selectedVisibleCount === hunts.length
  const pageNumbers = Array.from({ length: totalPages }, (_, index) => index + 1).filter(
    (pageNumber) =>
      pageNumber === 1 ||
      pageNumber === totalPages ||
      Math.abs(pageNumber - currentPage) <= 1
  )

  const toggleSelect = (id: number) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  const toggleSelectAll = () => {
    const next = new Set(selectedIds)

    if (allVisibleSelected) {
      visibleHuntIds.forEach((id) => next.delete(id))
    } else {
      visibleHuntIds.forEach((id) => next.add(id))
    }

    setSelectedIds(next)
  }

  const handleBatchDelete = () => {
    if (selectedIds.size === 0) return
    if (confirm(`Are you sure you want to delete ${selectedIds.size} hunts?`)) {
      deleteHunts(Array.from(selectedIds))
      setSelectedIds(new Set())
      onRefresh()
      toast.success("Hunts deleted successfully")
    }
  }

  const handleBatchArchive = () => {
    if (selectedIds.size === 0) return
    archiveHunts(Array.from(selectedIds))
    setSelectedIds(new Set())
    onRefresh()
    toast.success("Hunts archived successfully")
  }

  const handleCopyId = (event: ReactMouseEvent<HTMLElement>, id: number) => {
    event.preventDefault()
    event.stopPropagation()
    navigator.clipboard.writeText(id.toString())
    toast.success("Copied Hunt ID to clipboard!")
  }

  const handleActivateClick = (hunt: StoredHunt) => {
    setModalHunt(hunt)
  }

  const handleConfirmActivate = async () => {
    if (!modalHunt) return
    setActivatingId(modalHunt.id)
    try {
      await onActivate(modalHunt.id)
      onRefresh()
      setModalHunt(null)
    } finally {
      setActivatingId(null)
    }
  }

  const openClueModal = (hunt: StoredHunt) => {
    setClueRows([{ id: 1, question: "", answer: "", points: 10 }])
    setClueModalHunt(hunt)
  }

  const addClueRow = () => {
    const newId = clueRows.length > 0 ? Math.max(...clueRows.map((row) => row.id)) + 1 : 1
    setClueRows([...clueRows, { id: newId, question: "", answer: "", points: 10 }])
  }

  const removeClueRow = (id: number) => {
    if (clueRows.length > 1) {
      setClueRows(clueRows.filter((row) => row.id !== id))
    }
  }

  const updateClueRow = (
    id: number,
    field: keyof Omit<ClueRow, "id">,
    value: string | number
  ) => {
    setClueRows(clueRows.map((row) => (row.id === id ? { ...row, [field]: value } : row)))
  }

  const handleSaveClues = async () => {
    if (!clueModalHunt) return
    const validRows = clueRows.filter((row) => row.question.trim() && row.answer.trim())
    if (!validRows.length) return

    setIsSavingClues(true)
    try {
      await onSaveClues(clueModalHunt.id, validRows)
      onRefresh()
      setClueModalHunt(null)
    } finally {
      setIsSavingClues(false)
    }
  }

  const cluesAreValid = clueRows.some((row) => row.question.trim() && row.answer.trim())
  const resultsLabel =
    filteredCount === totalHunts
      ? `${totalHunts} total hunts`
      : `${filteredCount} of ${totalHunts} hunts`

  return (
    <>
      <div className="mb-6 rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-950/60">
        <div className="flex flex-col gap-5 border-b border-slate-200 pb-5 dark:border-white/10 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Hunt history
            </p>
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
            const isActiveFilter = filter === statusFilter

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
            )
          })}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Checkbox
              id="select-all"
              checked={allVisibleSelected}
              onCheckedChange={toggleSelectAll}
            />
            <label
              htmlFor="select-all"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 dark:text-slate-300"
            >
              Select Page
            </label>
          </div>

          {selectedIds.size > 0 && (
            <div className="flex animate-in items-center gap-3 fade-in slide-in-from-top-2">
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                {selectedIds.size} selected
              </span>
              <div className="h-4 w-[1px] bg-slate-200 dark:bg-white/10" />
              <Button
                size="sm"
                variant="outline"
                onClick={handleBatchArchive}
                className="h-8 border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
              >
                Archive
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleBatchDelete}
                className="h-8 border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
              >
                <Trash2 className="mr-1 h-3 w-3" />
                Delete
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedIds(new Set())}
                className="h-8 px-2 text-slate-500"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {hunts.length === 0 ? (
        <div className="col-span-full rounded-3xl border border-dashed border-slate-300 bg-white/70 px-6 py-14 text-center shadow-sm dark:border-white/10 dark:bg-slate-950/50">
          <p className="text-lg font-semibold text-slate-900 dark:text-white">
            No hunts found for this filter
          </p>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Try another status or sort option to explore your hunt history.
          </p>
        </div>
      ) : (
          hunts.map((hunt) => {
            const isDraft = hunt.status === "Draft"
            const isActive = hunt.status === "Active"
            const isCompleted = hunt.status === "Completed"
            const hasClues = hunt.cluesCount > 0
            const canActivate = isDraft && hasClues

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
                    onCheckedChange={() => toggleSelect(hunt.id)}
                    onClick={(e: React.MouseEvent) => e.stopPropagation()}
                    className="h-5 w-5 rounded-md border-slate-300 dark:border-white/20"
                    aria-label={`Select hunt ${hunt.title}`}
                  />
                </div>
                <Link href={`/hunt/${hunt.id}`}>
                  <div className="p-5">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <CardTitle className="line-clamp-2 text-lg dark:text-white">{hunt.title}</CardTitle>
                        <div className="flex items-center gap-1 bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded-md text-xs text-slate-500 dark:text-slate-400 font-mono">
                          #{hunt.id}
                          <button
                            onClick={(e) => handleCopyId(e, hunt.id)}
                            aria-label={`Copy hunt ID ${hunt.id}`}
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
                    <div className="mb-4 flex flex-wrap gap-2">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-white/5 dark:text-slate-300">
                        {hunt.playerCount ?? 0} players
                      </span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-white/5 dark:text-slate-300">
                        {hunt.rewardPool ?? 0} XLM reward pool
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {hunt.cluesCount} {hunt.cluesCount === 1 ? "clue" : "clues"}
                      </span>
                      <div className="flex gap-2">
                        {isDraft && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openClueModal(hunt)}
                            className="border-[#3737A4] text-[#3737A4] hover:bg-[#3737A4] hover:text-white"
                          >
                            <Plus className="mr-1 h-3 w-3" />
                            Add Clues
                          </Button>
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
                        {isDraft && (
                          <Button
                            size="sm"
                            onClick={() => handleActivateClick(hunt)}
                            disabled={!canActivate}
                            className="bg-gradient-to-b from-[#39A437] to-[#194F0C] hover:bg-green-700 disabled:pointer-events-none disabled:opacity-50"
                          >
                            Activate
                          </Button>
                        )}
                      </div>
                    </div>
                    {isDraft && !hasClues && (
                      <p className="mt-2 text-xs text-amber-600">
                        Add at least one clue to activate.
                      </p>
                    )}
                  </div>
                </Link>
              </Card>
            )
          })
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {filteredCount <= pageSize
            ? "Everything fits on one page."
            : `Browsing ${filteredCount} hunts in pages of ${pageSize}.`}
        </p>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={currentPage === 1}
            onClick={() => onPageChange(currentPage - 1)}
          >
            Previous
          </Button>

          {pageNumbers.map((pageNumber, index) => {
            const previousPage = pageNumbers[index - 1]
            const shouldShowGap =
              typeof previousPage === "number" && pageNumber - previousPage > 1

            return (
              <div key={pageNumber} className="flex items-center gap-2">
                {shouldShowGap && (
                  <span className="px-1 text-sm text-slate-400">…</span>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant={pageNumber === currentPage ? "default" : "outline"}
                  onClick={() => onPageChange(pageNumber)}
                  className={
                    pageNumber === currentPage
                      ? "min-w-9 bg-[#3737A4] text-white hover:bg-[#2d2d8d]"
                      : "min-w-9"
                  }
                >
                  {pageNumber}
                </Button>
              </div>
            )
          })}

          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={currentPage === totalPages}
            onClick={() => onPageChange(currentPage + 1)}
          >
            Next
          </Button>
        </div>
      </div>

      <ActivateHuntModal
        isOpen={!!modalHunt}
        onClose={() => setModalHunt(null)}
        onConfirm={handleConfirmActivate}
        huntTitle={modalHunt?.title ?? ""}
        isActivating={activatingId !== null}
      />

      <Dialog open={!!leaderboardHunt} onOpenChange={(open) => !open && setLeaderboardHunt(null)}>
        <DialogContent showCloseButton className="bg-[#f9f9ff] sm:max-w-2xl dark:bg-slate-950">
          <DialogHeader className="mb-4">
            <DialogTitle className="bg-gradient-to-b from-[#3737A4] to-[#0C0C4F] bg-clip-text text-center text-2xl font-bold text-transparent">
              Leaderboard - {leaderboardHunt?.title}
            </DialogTitle>
          </DialogHeader>

          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-inner dark:border-white/5 dark:bg-slate-900">
            {leaderboardHunt && <LeaderboardTable huntId={leaderboardHunt.id} />}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!clueModalHunt} onOpenChange={(open) => !open && setClueModalHunt(null)}>
        <DialogContent showCloseButton className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="bg-gradient-to-b from-[#3737A4] to-[#0C0C4F] bg-clip-text text-2xl font-bold text-transparent">
              Add Clues - {clueModalHunt?.title}
            </DialogTitle>
          </DialogHeader>

          <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
            <div className="grid grid-cols-[1fr_1fr_56px_32px] gap-2 px-1">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Riddle / Question
              </span>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Answer
              </span>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Points
              </span>
              <span />
            </div>

            {clueRows.map((row, index) => (
              <div key={row.id} className="grid grid-cols-[1fr_1fr_56px_32px] items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-4 shrink-0 text-xs text-slate-400 dark:text-slate-500">
                    {index + 1}.
                  </span>
                  <Input
                    placeholder="e.g. What has keys but no locks?"
                    value={row.question}
                    onChange={(event) => updateClueRow(row.id, "question", event.target.value)}
                    className="py-2 pl-3 text-sm"
                  />
                </div>
                <Input
                  placeholder="Answer (e.g. keyboard|laptop)"
                  value={row.answer}
                  onChange={(event) => updateClueRow(row.id, "answer", event.target.value)}
                  className="py-2 pl-3 text-sm"
                />
                <Input
                  type="number"
                  placeholder="10"
                  value={row.points}
                  min={1}
                  onChange={(event) =>
                    updateClueRow(row.id, "points", parseInt(event.target.value, 10) || 0)
                  }
                  className="py-2 pl-3 text-sm"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeClueRow(row.id)}
                  aria-label={`Remove clue row ${index + 1}`}
                  disabled={clueRows.length === 1}
                  className="text-red-400 hover:text-red-600 disabled:opacity-30"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 pt-2 dark:border-white/10">
            <Button
              type="button"
              variant="outline"
              onClick={addClueRow}
              className="flex items-center gap-1 border-[#3737A4] text-[#3737A4] hover:bg-[#3737A4] hover:text-white"
            >
              <Plus className="h-4 w-4" />
              Add Row
            </Button>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setClueModalHunt(null)}>
                Cancel
              </Button>
              <Button
                onClick={handleSaveClues}
                disabled={isSavingClues || !cluesAreValid}
                className="bg-gradient-to-b from-[#39A437] to-[#194F0C] text-white hover:bg-green-700 disabled:opacity-50"
              >
                {isSavingClues ? "Saving..." : "Save Clues"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {poolHuntId !== null && (
        <RewardPoolManager huntId={poolHuntId} isOpen={poolHuntId !== null} onClose={() => setPoolHuntId(null)} />
      )}
    </>
  )
}
