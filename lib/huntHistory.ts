import type { HuntStatus, StoredHunt } from "@/lib/types"

export const HUNT_HISTORY_PAGE_SIZE = 10

export const HUNT_HISTORY_STATUS_FILTERS = [
  "all",
  "active",
  "completed",
  "draft",
  "cancelled",
] as const

export const HUNT_HISTORY_SORT_OPTIONS = [
  "newest",
  "oldest",
  "most-players",
  "highest-reward",
] as const

export type HuntHistoryStatusFilter = (typeof HUNT_HISTORY_STATUS_FILTERS)[number]
export type HuntHistorySortOption = (typeof HUNT_HISTORY_SORT_OPTIONS)[number]

type HuntHistoryViewOptions = {
  status: HuntHistoryStatusFilter
  sort: HuntHistorySortOption
  page: number
  pageSize?: number
}

export type HuntHistoryView = {
  pageHunts: StoredHunt[]
  totalHunts: number
  filteredCount: number
  currentPage: number
  totalPages: number
  pageSize: number
  startItem: number
  endItem: number
}

const STATUS_FILTER_TO_HUNT_STATUS: Record<
  Exclude<HuntHistoryStatusFilter, "all">,
  HuntStatus
> = {
  active: "Active",
  completed: "Completed",
  draft: "Draft",
  cancelled: "Cancelled",
}

export function parseHuntHistoryStatusFilter(
  value?: string | null
): HuntHistoryStatusFilter {
  if (!value) return "all"

  return HUNT_HISTORY_STATUS_FILTERS.includes(value as HuntHistoryStatusFilter)
    ? (value as HuntHistoryStatusFilter)
    : "all"
}

export function parseHuntHistorySortOption(
  value?: string | null
): HuntHistorySortOption {
  if (!value) return "newest"

  return HUNT_HISTORY_SORT_OPTIONS.includes(value as HuntHistorySortOption)
    ? (value as HuntHistorySortOption)
    : "newest"
}

export function parseHuntHistoryPage(value?: string | null): number {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1
}

export function buildHuntHistoryQuery(options: {
  status: HuntHistoryStatusFilter
  sort: HuntHistorySortOption
  page: number
}): string {
  const params = new URLSearchParams()

  if (options.status !== "all") {
    params.set("status", options.status)
  }

  if (options.sort !== "newest") {
    params.set("sort", options.sort)
  }

  if (options.page > 1) {
    params.set("page", String(options.page))
  }

  return params.toString()
}

export function getHuntHistoryView(
  hunts: StoredHunt[],
  options: HuntHistoryViewOptions
): HuntHistoryView {
  const pageSize = options.pageSize ?? HUNT_HISTORY_PAGE_SIZE
  const filteredHunts = filterHuntsByStatus(hunts, options.status)
  const sortedHunts = sortHunts(filteredHunts, options.sort)
  const filteredCount = sortedHunts.length
  const totalPages = filteredCount === 0 ? 1 : Math.ceil(filteredCount / pageSize)
  const currentPage = Math.min(options.page, totalPages)
  const startIndex = (currentPage - 1) * pageSize
  const pageHunts = sortedHunts.slice(startIndex, startIndex + pageSize)
  const startItem = filteredCount === 0 ? 0 : startIndex + 1
  const endItem = startIndex + pageHunts.length

  return {
    pageHunts,
    totalHunts: hunts.length,
    filteredCount,
    currentPage,
    totalPages,
    pageSize,
    startItem,
    endItem,
  }
}

function filterHuntsByStatus(
  hunts: StoredHunt[],
  status: HuntHistoryStatusFilter
): StoredHunt[] {
  if (status === "all") return hunts

  return hunts.filter((hunt) => hunt.status === STATUS_FILTER_TO_HUNT_STATUS[status])
}

function sortHunts(
  hunts: StoredHunt[],
  sort: HuntHistorySortOption
): StoredHunt[] {
  return [...hunts].sort((left, right) => compareHunts(left, right, sort))
}

function compareHunts(
  left: StoredHunt,
  right: StoredHunt,
  sort: HuntHistorySortOption
): number {
  if (sort === "oldest") {
    return compareNumbers(getSortTimestamp(left), getSortTimestamp(right), "asc")
  }

  if (sort === "most-players") {
    const playersComparison = compareNumbers(
      left.playerCount ?? 0,
      right.playerCount ?? 0,
      "desc"
    )
    return playersComparison !== 0
      ? playersComparison
      : compareNumbers(getSortTimestamp(left), getSortTimestamp(right), "desc")
  }

  if (sort === "highest-reward") {
    const rewardComparison = compareNumbers(
      left.rewardPool ?? 0,
      right.rewardPool ?? 0,
      "desc"
    )

    if (rewardComparison !== 0) return rewardComparison

    const rewardTypeComparison = compareNumbers(
      getRewardTypeWeight(left.rewardType),
      getRewardTypeWeight(right.rewardType),
      "desc"
    )

    return rewardTypeComparison !== 0
      ? rewardTypeComparison
      : compareNumbers(getSortTimestamp(left), getSortTimestamp(right), "desc")
  }

  return compareNumbers(getSortTimestamp(left), getSortTimestamp(right), "desc")
}

function compareNumbers(
  left: number,
  right: number,
  direction: "asc" | "desc"
): number {
  return direction === "asc" ? left - right : right - left
}

function getSortTimestamp(hunt: StoredHunt): number {
  return hunt.createdAt ?? hunt.startTime ?? hunt.endTime ?? hunt.id
}

function getRewardTypeWeight(rewardType: StoredHunt["rewardType"]): number {
  if (rewardType === "Both") return 2
  if (rewardType === "NFT") return 1
  return 0
}
