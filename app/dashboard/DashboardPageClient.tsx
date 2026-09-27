"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Header } from "@/components/Header"
import { HuntDashboard } from "@/components/HuntDashboard"
import { RewardHistoryPanel } from "@/components/RewardHistoryPanel"
import type { StoredHunt } from "@/lib/types"
import {
  getCreatorHunts,
  updateHuntStatus,
  saveClueLocally,
  takeHuntStoreSnapshot,
  restoreHuntStoreSnapshot,
} from "@/lib/huntStore"
import { activateHunt, addClue } from "@/lib/contracts/hunt"
import { withTransactionToast } from "@/lib/txToast"
import {
  buildHuntHistoryQuery,
  getHuntHistoryView,
  parseHuntHistoryPage,
  parseHuntHistorySortOption,
  parseHuntHistoryStatusFilter,
  type HuntHistorySortOption,
  type HuntHistoryStatusFilter,
} from "@/lib/huntHistory"

type SearchParamValue = string | string[] | undefined

type DashboardPageClientProps = {
  searchParams?: Record<string, SearchParamValue>
}

function readSearchParam(value?: SearchParamValue): string | null {
  if (typeof value === "string") return value
  if (Array.isArray(value)) return value[0] ?? null
  return null
}

export function DashboardPageClient({
  searchParams = {},
}: DashboardPageClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [hunts, setHunts] = useState<StoredHunt[]>([])

  const refresh = useCallback(() => {
    setHunts(getCreatorHunts())
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const statusFilter = parseHuntHistoryStatusFilter(
    readSearchParam(searchParams.status)
  )
  const sortOption = parseHuntHistorySortOption(readSearchParam(searchParams.sort))
  const requestedPage = parseHuntHistoryPage(readSearchParam(searchParams.page))

  const historyView = useMemo(
    () =>
      getHuntHistoryView(hunts, {
        status: statusFilter,
        sort: sortOption,
        page: requestedPage,
      }),
    [hunts, requestedPage, sortOption, statusFilter]
  )

  const replaceHistoryQuery = useCallback(
    (nextState: {
      page?: number
      sort?: HuntHistorySortOption
      status?: HuntHistoryStatusFilter
    }) => {
      const query = buildHuntHistoryQuery({
        status: nextState.status ?? statusFilter,
        sort: nextState.sort ?? sortOption,
        page: nextState.page ?? historyView.currentPage,
      })

      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    },
    [historyView.currentPage, pathname, router, sortOption, statusFilter]
  )

  useEffect(() => {
    const currentQuery = buildHuntHistoryQuery({
      status: statusFilter,
      sort: sortOption,
      page: requestedPage,
    })
    const normalizedQuery = buildHuntHistoryQuery({
      status: statusFilter,
      sort: sortOption,
      page: historyView.currentPage,
    })

    if (currentQuery !== normalizedQuery) {
      router.replace(
        normalizedQuery ? `${pathname}?${normalizedQuery}` : pathname,
        { scroll: false }
      )
    }
  }, [historyView.currentPage, pathname, requestedPage, router, sortOption, statusFilter])

  const handleActivate = useCallback(
    async (huntId: number) => {
      const snapshot = takeHuntStoreSnapshot()
      updateHuntStatus(huntId, "Active")
      refresh()

      try {
        await withTransactionToast(
          async (setStage) => {
            setStage("approving")
            return activateHunt(huntId)
          },
          {
            pending: "Pending â€” preparing transactionâ€¦",
            approving: "Approving â€” sign in your walletâ€¦",
            confirmed: "Confirmed! Hunt is now visible in the Game Arcade.",
          }
        )
      } catch (error) {
        restoreHuntStoreSnapshot(snapshot)
        refresh()
        throw error
      }
    },
    [refresh]
  )

  const handleSaveClues = useCallback(
    async (huntId: number, clues: { question: string; answer: string; points: number }[]) => {
      const snapshot = takeHuntStoreSnapshot()
      const normalizedClues = clues.map((clue) => ({
        question: clue.question.trim(),
        answer: clue.answer.trim().toLowerCase(),
        points: clue.points,
      }))

      for (const clue of normalizedClues) {
        saveClueLocally({
          huntId,
          question: clue.question,
          answer: clue.answer,
          points: clue.points,
        })
      }
      refresh()

      try {
        for (const clue of normalizedClues) {
          await withTransactionToast(
            async (setStage) => {
              setStage("approving")
              return addClue(huntId, clue.question, clue.answer, clue.points)
            },
            {
              pending: `Pending â€” preparing clue "${clue.question.slice(0, 30)}â€¦"`,
              approving: "Approving â€” sign in your walletâ€¦",
              confirmed: "Clue confirmed!",
            }
          )
        }
      } catch (error) {
        restoreHuntStoreSnapshot(snapshot)
        refresh()
        throw error
      }
    },
    [refresh]
  )

  return (
    <div className="min-h-screen bg-gradient-to-tr from-blue-100 via-purple-100 to-[#f9f9ff] pb-12">
      <Header balance="24.2453" />

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center gap-4">
          <Button
            variant="ghost"
            asChild
            className="flex items-center gap-2 text-slate-700 hover:text-slate-900"
          >
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
              Game Arcade
            </Link>
          </Button>
        </div>

        <h1 className="mb-2 bg-linear-to-br from-[#3737A4] to-[#0C0C4F] bg-clip-text text-3xl font-bold text-transparent">
          My Hunts
        </h1>
        <p className="mb-8 text-slate-600">
          Activate a draft hunt so players can see it in the Game Arcade. Active hunts cannot be edited.
        </p>

        <RewardHistoryPanel hunts={hunts} onRefresh={refresh} />

        <HuntDashboard
          hunts={historyView.pageHunts}
          totalHunts={historyView.totalHunts}
          filteredCount={historyView.filteredCount}
          currentPage={historyView.currentPage}
          totalPages={historyView.totalPages}
          pageSize={historyView.pageSize}
          startItem={historyView.startItem}
          endItem={historyView.endItem}
          statusFilter={statusFilter}
          sortOption={sortOption}
          onStatusFilterChange={(nextStatus) =>
            replaceHistoryQuery({ status: nextStatus, page: 1 })
          }
          onSortChange={(nextSort) =>
            replaceHistoryQuery({ sort: nextSort, page: 1 })
          }
          onPageChange={(nextPage) => replaceHistoryQuery({ page: nextPage })}
          onActivate={handleActivate}
          onRefresh={refresh}
          onSaveClues={handleSaveClues}
        />
      </div>
    </div>
  )
}
