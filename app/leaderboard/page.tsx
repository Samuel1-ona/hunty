"use client"

import { Suspense, useCallback, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Copy, Check, Trophy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Header } from "@/components/Header"
import { LeaderboardTable } from "@/components/LeaderBoardTable"
import { LeaderboardFilterBar } from "@/components/LeaderboardFilterBar"
import type { LeaderboardFilters, LeaderboardTimePeriod, LeaderboardMetric } from "@/lib/types"
import type { ClueDifficulty } from "@/lib/types"

const DEFAULT_FILTERS: LeaderboardFilters = {
  timePeriod: "all",
  category: "all",
  difficulty: "all",
  metric: "points",
}

function parseFiltersFromParams(params: URLSearchParams): LeaderboardFilters {
  const timePeriod = params.get("period") as LeaderboardTimePeriod | null
  const category = params.get("category") ?? "all"
  const difficulty = params.get("difficulty") as ClueDifficulty | "all" | null
  const metric = params.get("metric") as LeaderboardMetric | null

  const validPeriods: LeaderboardTimePeriod[] = ["today", "week", "month", "all"]
  const validDifficulties: (ClueDifficulty | "all")[] = ["all", "Easy", "Medium", "Hard"]
  const validMetrics: LeaderboardMetric[] = ["points", "completions"]

  return {
    timePeriod: timePeriod && validPeriods.includes(timePeriod) ? timePeriod : DEFAULT_FILTERS.timePeriod,
    category: category || DEFAULT_FILTERS.category,
    difficulty: difficulty && validDifficulties.includes(difficulty) ? difficulty : DEFAULT_FILTERS.difficulty,
    metric: metric && validMetrics.includes(metric) ? metric : DEFAULT_FILTERS.metric,
  }
}

function LeaderboardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [filters, setFilters] = useState<LeaderboardFilters>(() => parseFiltersFromParams(searchParams))
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setFilters(parseFiltersFromParams(searchParams))
  }, [searchParams])

  const handleFilterChange = useCallback((updated: Partial<LeaderboardFilters>) => {
    setFilters((prev) => {
      const next = { ...prev, ...updated }
      const params = new URLSearchParams()
      if (next.timePeriod !== "all") params.set("period", next.timePeriod)
      if (next.category !== "all") params.set("category", next.category)
      if (next.difficulty !== "all") params.set("difficulty", next.difficulty)
      if (next.metric !== "points") params.set("metric", next.metric)
      const query = params.toString()
      router.replace(`/leaderboard${query ? `?${query}` : ""}`, { scroll: false })
      return next
    })
  }, [router])

  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [])

  const isFiltered =
    filters.timePeriod !== "all" ||
    filters.category !== "all" ||
    filters.difficulty !== "all" ||
    filters.metric !== "points"

  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
        <Button variant="ghost" asChild className="flex items-center gap-2 text-zinc-400 hover:text-white hover:bg-white/5">
          <Link href="/">
            <ArrowLeft className="h-4 w-4" />
            Back to Arcade
          </Link>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleCopyLink}
          className="flex items-center gap-2 border-white/20 text-white hover:bg-white/10"
        >
          {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copied!" : "Share filtered view"}
        </Button>
      </div>

      <div className="mb-8">
        <h1 className="mb-2 text-3xl sm:text-4xl font-bold tracking-tight text-white leading-tight">
          Global Leaderboard
        </h1>
        <p className="text-zinc-400 text-base">
          Rankings across all hunts - auto-refreshes every 30 seconds
        </p>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-6">
        <LeaderboardFilterBar filters={filters} onChange={handleFilterChange} />
      </div>

      {isFiltered && (
        <div className="mb-4 flex items-center gap-2">
          <span className="text-xs text-zinc-500">Active filters applied.</span>
          <button
            onClick={() => {
              router.replace("/leaderboard", { scroll: false })
              setFilters(DEFAULT_FILTERS)
            }}
            className="text-xs text-[#6b8cff] hover:underline"
          >
            Clear all
          </button>
        </div>
      )}

      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-inner">
        <LeaderboardTable huntId={1} filters={filters} />
      </div>
    </>
  )
}

export default function LeaderboardPage() {
  return (
    <div className="min-h-screen bg-[#0b0c10] text-white pb-12 relative">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/3 w-150 h-100 bg-violet-700/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-100 h-75 bg-indigo-600/15 rounded-full blur-[100px]" />
      </div>

      <Header />

      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 relative z-10">
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-20">
              <Trophy className="w-8 h-8 text-zinc-600 animate-pulse" />
            </div>
          }
        >
          <LeaderboardContent />
        </Suspense>
      </div>
    </div>
  )
}
