"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useWindowVirtualizer } from "@tanstack/react-virtual"
import Image from "next/image"
import Link from "next/link"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { X, ArrowRight, Trophy, Search } from "lucide-react"
import { Card, CardDescription, CardTitle } from "@/components/ui/card"
import { HuntCardSkeletonGrid } from "@/components/LoadingSkeletons"
import { Header } from "@/components/Header"
import { getAllHunts, getHunt, type StoredHunt } from "@/lib/huntStore"
import { LeaderboardTable } from "@/components/LeaderBoardTable"
import { EmptyState } from "@/components/EmptyState"
import { HuntOfTheWeekBanner } from "@/components/HuntOfTheWeekBanner"
import { hankenGrotesk } from "@/lib/font"
import { HuntCoverImage } from "@/components/HuntCoverImage"
import { Footer } from "@/components/Footer"
import { usePlayerCounts } from "@/hooks/usePlayerCounts"
import { useRecentlyCompleted } from "@/hooks/useRecentlyCompleted"
import type { PlayerCountResult } from "@/lib/types"
import { queryCachePolicy, queryKeys } from "@/lib/queryKeys"

const OnboardingTour = dynamic(() => import("@/components/OnboardingTour"), {
  ssr: false,
})

const FeaturedHunts = dynamic(
  () => import("@/components/FeaturedHunts").then((mod) => mod.FeaturedHunts),
  {
    loading: () => <Skeleton className="h-44 w-full rounded-2xl" />,
  }
)

const GlobalActivityFeed = dynamic(
  () => import("@/components/GlobalActivityFeed").then((mod) => mod.GlobalActivityFeed),
  {
    loading: () => <Skeleton className="h-40 w-full rounded-2xl" />,
  }
)

const RecentlyCompletedSection = dynamic(
  () => import("@/components/RecentlyCompletedSection").then((mod) => mod.RecentlyCompletedSection),
  {
    loading: () => <Skeleton className="h-40 w-full rounded-2xl" />,
  }
)

interface WalletOption {
  id: string
  name: string
  icon: string
  description?: string
}

const walletOptions: WalletOption[] = []

const INACTIVE_PAGE_SIZE = 6
const ACTIVE_GRID_GAP = 24
const ACTIVE_CARD_ESTIMATED_HEIGHT = 360

function sortByRecentFirst(a: StoredHunt, b: StoredHunt): number {
  const aSortTime = a.endTime ?? a.startTime ?? 0
  const bSortTime = b.endTime ?? b.startTime ?? 0
  return bSortTime - aSortTime
}

function fetchInactiveHunts() {
  return getAllHunts()
    .filter((hunt) => hunt.status !== "Active" && !hunt.is_private)
    .sort(sortByRecentFirst)
}

// Active and Completed hunts for the public Game Arcade.
// Private hunts (is_private=true) are excluded from the public arcade.
function fetchAllHunts() {
  return getAllHunts().filter((h) => (h.status === "Active" || h.status === "Completed") && !h.is_private)
}

function getActiveGridColumnCount(width: number): number {
  if (width >= 1280) return 4
  if (width >= 1024) return 3
  if (width >= 640) return 2
  return 1
}

function ActiveHuntCard({
  hunt,
  playerCount,
}: {
  hunt: StoredHunt
  playerCount?: PlayerCountResult
}) {
  return (
    <Card className="h-full overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm hover:shadow-md transition-shadow">
      <HuntCoverImage
        src={hunt.coverImageCid}
        alt={`${hunt.title} cover`}
        className="relative w-full h-40 bg-slate-100"
      />
      <div className="p-5">
        <div className="flex items-center gap-2 mb-1">
          <CardTitle className="text-lg font-semibold line-clamp-2 dark:text-slate-100 flex-1">
            {hunt.title}
          </CardTitle>
          {playerCount?.isTrending && (
            <span
              className="shrink-0 inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-700"
              aria-label="Trending hunt"
            >
              Trending
            </span>
          )}
        </div>
        <CardDescription className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-3">
          {hunt.description}
        </CardDescription>
        <div className="flex items-center justify-between mt-4">
          <div className="flex gap-2 items-center flex-wrap">
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-[11px] font-medium text-[#3737A4]">
              {hunt.cluesCount} {hunt.cluesCount === 1 ? "Clue" : "Clues"}
            </span>
            <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-medium ${
              hunt.rewardType === "XLM" ? "bg-green-50 text-green-700" :
              hunt.rewardType === "NFT" ? "bg-purple-50 text-purple-700" :
              "bg-amber-50 text-amber-700"
            }`}>
              {hunt.rewardType} Reward
            </span>
            {playerCount && !playerCount.isLoading && !playerCount.error && (
              <span
                className="player-count inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-700 px-3 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-300"
                aria-label={`${playerCount.count} player${playerCount.count !== 1 ? "s" : ""} registered`}
              >
                {playerCount.count} player{playerCount.count !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          <div className="flex gap-2 mt-2 w-full justify-between">
            <Button
              size="sm"
              className="bg-gradient-to-r from-[#3737A4] to-[#0C0C4F] hover:opacity-90 text-white rounded-xl font-semibold h-8 text-[11px] px-3"
              onClick={() => {
                window.location.href = `/hunt/${hunt.id}`
              }}
            >
              Play
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-[#3737A4] hover:bg-slate-100 dark:hover:bg-slate-700/50 flex items-center gap-1 h-8 text-[11px] font-semibold dark:text-blue-400"
              onClick={() => {
                window.location.href = `/hunt/${hunt.id}/leaderboard`
              }}
            >
              <Trophy className="w-3.5 h-3.5" />
              Watch Live
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}

function VirtualizedActiveHuntsGrid({
  hunts,
  playerCounts,
}: {
  hunts: StoredHunt[]
  playerCounts: ReturnType<typeof usePlayerCounts>["counts"]
}) {
  const parentRef = useRef<HTMLDivElement | null>(null)
  const [columnCount, setColumnCount] = useState(1)
  const [scrollMargin, setScrollMargin] = useState(0)
  const rowCount = Math.ceil(hunts.length / columnCount)

  useEffect(() => {
    const parent = parentRef.current
    if (!parent) return

    const updateGridMetrics = () => {
      setColumnCount(getActiveGridColumnCount(parent.getBoundingClientRect().width))
      setScrollMargin(window.scrollY + parent.getBoundingClientRect().top)
    }

    updateGridMetrics()
    const resizeObserver = new ResizeObserver(updateGridMetrics)
    resizeObserver.observe(parent)
    window.addEventListener("resize", updateGridMetrics)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener("resize", updateGridMetrics)
    }
  }, [])

  const rowVirtualizer = useWindowVirtualizer({
    count: rowCount,
    estimateSize: () => ACTIVE_CARD_ESTIMATED_HEIGHT,
    gap: ACTIVE_GRID_GAP,
    overscan: 3,
    scrollMargin,
  })

  return (
    <div ref={parentRef} className="relative w-full">
      <div
        className="relative w-full"
        style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const startIndex = virtualRow.index * columnCount
          const rowHunts = hunts.slice(startIndex, startIndex + columnCount)

          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={rowVirtualizer.measureElement}
              className="absolute left-0 top-0 grid w-full"
              style={{
                gap: `${ACTIVE_GRID_GAP}px`,
                gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
                transform: `translateY(${virtualRow.start - scrollMargin}px)`,
              }}
            >
              {rowHunts.map((hunt) => (
                <ActiveHuntCard
                  key={hunt.id}
                  hunt={hunt}
                  playerCount={playerCounts.get(String(hunt.id))}
                />
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function GameArcade() {
  const queryClient = useQueryClient()
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false)
  const [isConnectingWallet, setIsConnectingWallet] = useState(false)
  const [displayName, setDisplayName] = useState("")
  const [gameLink, setGameLink] = useState("")
  const [walletAddress, setWalletAddress] = useState("")
  const [balance, setBalance] = useState("")

  const [inactiveHunts, setInactiveHunts] = useState<StoredHunt[]>([])
  const [visibleInactiveCount, setVisibleInactiveCount] = useState(INACTIVE_PAGE_SIZE)
  const [isLoadingMoreInactive, setIsLoadingMoreInactive] = useState(false)
  const inactiveEndReachedRef = useRef<HTMLDivElement | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState<"leaderboard" | "none">("none")
  const [rewardFilter, setRewardFilter] = useState<"all" | "XLM" | "NFT" | "Both">("all")
  const [statusFilter, setStatusFilter] = useState<"all" | "Active" | "Completed">("Active")
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "clues-high" | "clues-low">("newest")

  const isLoadedRef = useRef(false)

  // Load initial filter states from sessionStorage to persist state within the session
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedSearch = sessionStorage.getItem("arcade_searchQuery")
      if (savedSearch) setSearchQuery(savedSearch)

      const savedReward = sessionStorage.getItem("arcade_rewardFilter")
      if (savedReward && ["all", "XLM", "NFT", "Both"].includes(savedReward)) {
        setRewardFilter(savedReward as "all" | "XLM" | "NFT" | "Both")
      }

      const savedStatus = sessionStorage.getItem("arcade_statusFilter")
      if (savedStatus && ["all", "Active", "Completed"].includes(savedStatus)) {
        setStatusFilter(savedStatus as "all" | "Active" | "Completed")
      }
      isLoadedRef.current = true
    }
  }, [])

  // Sync states to sessionStorage on change
  useEffect(() => {
    if (isLoadedRef.current && typeof window !== "undefined") {
      sessionStorage.setItem("arcade_searchQuery", searchQuery)
    }
  }, [searchQuery])

  useEffect(() => {
    if (isLoadedRef.current && typeof window !== "undefined") {
      sessionStorage.setItem("arcade_rewardFilter", rewardFilter)
    }
  }, [rewardFilter])

  useEffect(() => {
    if (isLoadedRef.current && typeof window !== "undefined") {
      sessionStorage.setItem("arcade_statusFilter", statusFilter)
    }
  }, [statusFilter])

  const { data: hunts = [], isLoading: isLoadingHunts } = useQuery({
    queryKey: queryKeys.hunts.active(),
    queryFn: async () => fetchAllHunts(),
    staleTime: queryCachePolicy.hunts.staleTime,
    gcTime: queryCachePolicy.hunts.gcTime,
    refetchInterval: queryCachePolicy.hunts.refetchInterval,
    refetchIntervalInBackground: true,
  })

  useEffect(() => {
    hunts.slice(0, 6).forEach((hunt) => {
      queryClient.prefetchQuery({
        queryKey: queryKeys.hunts.detail(hunt.id),
        queryFn: () => getHunt(String(hunt.id)),
        staleTime: queryCachePolicy.hunts.staleTime,
      })
    })
  }, [hunts, queryClient])

  // Fetch player counts for all visible hunts. refetch is called on mount via
  // useEffect below to ensure counts are fresh on each arcade page load.
  const allHuntIds = hunts.map((h) => String(h.id))
  const { counts: playerCounts, refetch: refetchPlayerCounts } = usePlayerCounts(allHuntIds)

  // Derive recently completed hunts from the same list — no extra fetch.
  const recentlyCompleted = useRecentlyCompleted(hunts)

  // Refresh player counts whenever the hunt list loads/changes.
  useEffect(() => {
    if (hunts.length > 0) refetchPlayerCounts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hunts.length])

  const visibleInactiveHunts = useMemo(
    () => inactiveHunts.slice(0, visibleInactiveCount),
    [inactiveHunts, visibleInactiveCount]
  )
  const hasMoreInactiveHunts = visibleInactiveCount < inactiveHunts.length

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search)
      if (params.get("tab") === "leaderboard") {
        setActiveTab("leaderboard")
      }
    }
  }, [])

  useEffect(() => {
    setInactiveHunts(fetchInactiveHunts())
    setVisibleInactiveCount(INACTIVE_PAGE_SIZE)
  }, [hunts])

  const loadMoreInactiveHunts = useCallback(() => {
    if (!hasMoreInactiveHunts || isLoadingMoreInactive) return
    setIsLoadingMoreInactive(true)
    setTimeout(() => {
      setVisibleInactiveCount((prev) => Math.min(prev + INACTIVE_PAGE_SIZE, inactiveHunts.length))
      setIsLoadingMoreInactive(false)
    }, 250)
  }, [hasMoreInactiveHunts, inactiveHunts.length, isLoadingMoreInactive])

  useEffect(() => {
    const target = inactiveEndReachedRef.current
    if (!target || !hasMoreInactiveHunts) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMoreInactiveHunts()
        }
      },
      { rootMargin: "160px 0px 160px 0px" }
    )

    observer.observe(target)
    return () => observer.disconnect()
  }, [hasMoreInactiveHunts, loadMoreInactiveHunts, visibleInactiveHunts.length])

  const handleWalletSelect = () => {
    setIsConnectingWallet(true)
    // Simulate wallet address generation
    setWalletAddress("0xe5f...E5")
  }

  const handleContinue = () => {
    setBalance("24.2453")
    setIsWalletModalOpen(false)
    setIsConnectingWallet(false)
    setDisplayName("")
  }

  const handleCreateGame = () => {
    window.location.href = "/hunty"
  }

  const filteredHunts = hunts
    .filter((hunt) => {
      const matchesSearch =
        hunt.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        hunt.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesReward =
        rewardFilter === "all" ||
        hunt.rewardType === rewardFilter ||
        (rewardFilter !== "Both" && hunt.rewardType === "Both") ||
        (rewardFilter === "Both" && hunt.rewardType === "Both");
  
      const matchesStatus =
        statusFilter === "all" || hunt.status === statusFilter;
  
      return matchesSearch && matchesReward && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === "newest") return (b.startTime || 0) - (a.startTime || 0);
      if (sortBy === "oldest") return (a.startTime || 0) - (b.startTime || 0);
      if (sortBy === "clues-high") return b.cluesCount - a.cluesCount;
      if (sortBy === "clues-low") return a.cluesCount - b.cluesCount;
      return 0;
    });

  return (
    <div
      className={`min-h-screen bg-gradient-to-tr from-blue-100 bg-purple-100 to-[#f9f9ff] dark:from-slate-900 dark:bg-slate-900 dark:to-slate-800 pb-[75px]`}
    >
      <OnboardingTour />
      {/* Header */}
      <Header
        balance={balance}
      />

      {/* Main Content */}
      <div className="max-w-[1600px] px-14 pt-10 pb-12 bg-white dark:bg-slate-900 mx-auto rounded-4xl relative">
        {/* Featured Hunt of the Week Hero Banner */}
        <HuntOfTheWeekBanner />

        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-[#0C0C4F] shadow-lg absolute left-1/2 top-1 -translate-x-1/2 -translate-y-1/2">
            {/* logo */}
            <Image src="/icons/logo.png" alt="Logo" width={96} height={96} />
          </div>
          <h1 className={`text-4xl md:text-5xl bg-gradient-to-b from-[#3737A4] to-[#0C0C4F] bg-clip-text text-transparent font-bold mb-12 ${hankenGrotesk.variable} antialiased bg-gradient-to-br from-#3737A4 to-#0C0C4F mt-12`}>The Ultimate Web3 Game Arcade</h1>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <Button className="bg-[#0C0C4F] hover:bg-slate-700 text-white px-6 py-3 rounded-lg text-xl font-black" onClick={handleCreateGame}>
            Create Game
          </Button>
          <Button asChild variant="outline" className="border-2 border-[#0C0C4F] text-[#0C0C4F] hover:bg-[#0C0C4F]/10 px-6 py-3 rounded-lg text-xl font-black">
            <Link href="/dashboard">My Hunts</Link>
          </Button>
          <Button
            className={`px-6 py-3 rounded-lg text-xl font-black ${activeTab === "leaderboard"
              ? "bg-[#3737A4] text-white"
              : "bg-gradient-to-b from-[#3737A4] to-[#0C0C4F] text-white hover:opacity-90"
              }`}
            onClick={() => setActiveTab(activeTab === "leaderboard" ? "none" : "leaderboard")}
          >
            Leaderboard
          </Button>
          <Button id="play-button" className="bg-[#E87785] hover:bg-[#d4606f] text-white px-6 py-3 rounded-lg text-xl font-black">Play Game</Button>
        </div>

        {/* Leaderboard Section */}
        {activeTab === "leaderboard" && (
          <div className="mb-12 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="max-w-4xl mx-auto bg-[#f9f9ff] rounded-3xl p-8 border border-slate-100 shadow-inner">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-bold bg-gradient-to-b from-[#3737A4] to-[#0C0C4F] text-transparent bg-clip-text">
                  Global Leaderboard
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveTab("none")}
                  className="text-slate-500 hover:text-slate-800"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <LeaderboardTable huntId={1} />
            </div>
          </div>
        )}

        {/* Game Link Input */}
        <div className="text-center mb-12">
          <p className="text-slate-700 mb-4 font-medium">Enter Game Link</p>
          <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
            <Input
              type="url"
              placeholder="https://www.galagorch.com/g/***"
              value={gameLink}
              onChange={(e) => setGameLink(e.target.value)}
              className="flex-1 px-4 py-2 rounded-lg border-2 border-gray-300 focus:border-pink-400"
            />
            <Button className="bg-[#E87785] hover:bg-[#d4606f] text-white px-6 py-3 rounded-lg text-xl font-black">Play Game</Button>
          </div>
        </div>

        {/* Game Cards */}
        <div className={`flex flex-col sm:flex-row md:justify-between  bg-[#ececfa] backdrop-blur-md rounded-2xl border border-white/20 pl-6 pt-6 pb-16`}
          style={{
            boxShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.1), inset 0 0 20px rgba(0, 0, 0, 0.15), 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
          }}>
          <div>
            <div className="bg-gradient-to-br from-[#2F2FFF] to-[#E87785] bg-clip-text text-transparent font-normal text-4xl text-center mb-4 md:mb-0 md:text-start">How To Play Hunty</div>
          </div>

          {/* Hunty Game */}
          <div>
            <div className={` flex-1 md:flex gap-2 bg-transparent`}>
              <Card className="flex-1 text-white justify-center max-w-56">
                <div className="bg-gradient-to-br from-[#3737A4] to-[#0C0C4F] flex-1 rounded-t-lg p-3">
                  <CardTitle className="text-[13px] font-bold">What is the fastest bird?</CardTitle>
                  <CardDescription className="text-[8px] mt-2 text-white">The Description appears here...Yorem ipsum dolor sit amet, consectetur adipiscing elit.</CardDescription>
                  <div className="mt-2">
                    <Image src="/static-images/image1.png" alt="bird" width={132} height={132} />
                  </div>
                  <div className="mt-2">
                    <Button className="bg-gradient-to-b from-[#2F2FFF]  to-[#E87785] sh-6 text-[7.76px] p-[3px]"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-link-icon lucide-link"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg><span>Hint To Unlock</span></Button>
                  </div>
                </div>
                <div className="flex gap-1 bg-white items-center align-center p-3 rounded-b-lg
                  ">
                  <Input placeholder="Enter code to unlock" className="px-3.5 py-1 text-[8px] rounded-full" />
                  <div className="bg-gradient-to-b from-[#3737A4]  to-[#0C0C4F] rounded-lg flex items-center justify-center p-2"><ArrowRight className="w-4 h-4" /></div>
                </div>
              </Card>

              <div className="bg-white/40 backdrop-blur-lg"></div>
              <Card className="mr-[-80px] [clip-path:polygon(0_0,68%_0,68%_100%,0_100%)] hidden md:block">
                <div className="bg-gradient-to-br from-[#3737A4] to-[#0C0C4F] text-white p-3 rounded-t-lg">
                  <CardTitle className="text-[13px] font-bold">What is the biggest bird?</CardTitle>
                  <CardDescription className="text-[8px] mt-2 text-white">long legs, tiny brain </CardDescription>
                  <div className="mt-2">
                    <Button className="bg-gradient-to-b from-[#2F2FFF]  to-[#E87785] text-[8px]"> <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-link-icon lucide-link"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg> <span className="text-[8px]">Hint To Unlock</span></Button>
                  </div>

                </div>

                <div className="flex gap-1 bg-white items-center align-center p-3 rounded-b-lg
                  ">
                  <Input placeholder="Enter code to unlock" className="h-[19px] text-[8px]" />
                  <div className="bg-gradient-to-b from-[#3737A4]  to-[#0C0C4F] rounded-md flex items-center justify-center p-0.5"><ArrowRight color="white" className="w-4 h-4" /></div>
                </div>
              </Card>

            </div>

          </div>

        </div>

        {/* Global Activity Feed */}
        <div className="mt-10 mb-10">
          <GlobalActivityFeed />
        </div>

        {/* Featured Hunts Hero Section */}
        <FeaturedHunts />

        {/* Recently Completed — derived from the same hunt list, no extra fetch */}
        <RecentlyCompletedSection hunts={recentlyCompleted} />

        {/* Active Hunts Grid */}
        <div className="mt-10">
          <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-6 border-b border-slate-100 dark:border-white/5 pb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-b from-[#3737A4] to-[#0C0C4F] bg-clip-text text-transparent">
                Discovery Arcade
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Find the perfect challenge for you</p>
            </div>
            
            <div className="flex flex-col xl:flex-row items-center gap-4 w-full md:w-auto">
              {/* Status Filter */}
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-full sm:w-auto">
                {(["all", "Active", "Completed"] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`flex-1 px-4 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                      statusFilter === status
                        ? "bg-white dark:bg-slate-700 text-[#3737A4] shadow-sm"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                    }`}
                  >
                    {status === "all" ? "All" : status === "Active" ? "Live" : "Ended"}
                  </button>
                ))}
              </div>

              {/* Reward Filter */}
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-full sm:w-auto">
                {(["all", "XLM", "NFT", "Both"] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setRewardFilter(type)}
                    className={`flex-1 px-4 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                      rewardFilter === type
                        ? "bg-white dark:bg-slate-700 text-[#3737A4] shadow-sm"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                    }`}
                  >
                    {type === "all" ? "All Prizes" : type}
                  </button>
                ))}
              </div>

              {/* Search and Sort */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Input
                    placeholder="Search title..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-[#3737A4] focus:ring-[#3737A4] pl-3 h-10 rounded-xl"
                  />
                </div>
                
                <select
                  value={sortBy}
                  onChange={(e) =>
                    setSortBy(e.target.value as "newest" | "oldest" | "clues-high" | "clues-low")
                  }
                  className="h-10 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#3737A4]/50 cursor-pointer"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="clues-high">Most Clues</option>
                  <option value="clues-low">Fewest Clues</option>
                </select>
              </div>

              {isLoadingHunts ? (
                <div className="skeleton-shimmer h-4 w-24 rounded-md bg-slate-200 dark:bg-slate-700" />
              ) : (
                <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider hidden xl:block">
                  {filteredHunts.length} result{filteredHunts.length === 1 ? "" : "s"}
                </p>
              )}
            </div>
          </div>

          {isLoadingHunts ? (
            <HuntCardSkeletonGrid />
          ) : filteredHunts.length === 0 ? (
            <div className="py-10">
              <EmptyState
                icon={<Search className="w-10 h-10 text-slate-500 dark:text-slate-400" />}
                title={searchQuery ? "No hunts match your search" : "No hunts yet, create your first!"}
                description={
                  searchQuery
                    ? "Try a different keyword or clear the search to see more hunts."
                    : "There are no hunts available yet. Create a new hunt to get started."
                }
                action={{
                  label: searchQuery ? "Clear search" : "Create your first hunt",
                  href: searchQuery ? "/" : "/hunty",
                }}
              />
            </div>
          ) : (
            <VirtualizedActiveHuntsGrid hunts={filteredHunts} playerCounts={playerCounts} />
          )}
        </div>

        {/* Extended Hunt Feed (FlatList-like onEndReached pagination) */}
        <div className="mt-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl md:text-3xl font-semibold bg-gradient-to-b from-[#6B7280] to-[#1F2937] bg-clip-text text-transparent">
              Older / Inactive Hunts
            </h2>
            <p className="text-sm text-slate-600">
              {isLoadingHunts
                ? "Loading archive..."
                : `${visibleInactiveHunts.length} of ${inactiveHunts.length} loaded`}
            </p>
          </div>

          {isLoadingHunts ? (
            <HuntCardSkeletonGrid />
          ) : inactiveHunts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 py-10 text-center text-slate-600">
              No inactive hunts yet.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {visibleInactiveHunts.map((hunt) => (
                  <Card
                    key={`inactive-${hunt.id}`}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white/90 shadow-sm"
                  >
                    <div className="p-5">
                      <CardTitle className="text-lg font-semibold mb-2 line-clamp-2">
                        {hunt.title}
                      </CardTitle>
                      <CardDescription className="text-sm text-slate-600 mb-4 line-clamp-3">
                        {hunt.description}
                      </CardDescription>
                      <div className="flex items-center justify-between mt-4">
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-medium text-slate-700">
                          {hunt.status}
                        </span>
                        <span className="text-xs text-slate-500">
                          {hunt.cluesCount} {hunt.cluesCount === 1 ? "clue" : "clues"}
                        </span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              <div ref={inactiveEndReachedRef} className="h-1 w-full" />

              {isLoadingMoreInactive && (
                <p className="text-center text-sm text-slate-500 mt-4">Loading more hunts...</p>
              )}

              {!hasMoreInactiveHunts && visibleInactiveHunts.length > 0 && (
                <p className="text-center text-sm text-slate-500 mt-4">
                  You&apos;ve reached the end of the hunt archive.
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Wallet Connection Modal */}
      <Dialog open={isWalletModalOpen} onOpenChange={setIsWalletModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="flex flex-row items-center justify-between">
            <DialogTitle className="bg-gradient-to-b from-[#3737A4] to-[#0C0C4F] bg-clip-text text-transparent font-semibold text-2xl">Connect a wallet</DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsWalletModalOpen(false)}
              className="p-[6px] rounded-xl bg-gradient-to-b from-[#FD0A44] to-[#932331] text-white"
            >
              <X className="h-6 w-6 stroke-3" />
            </Button>
          </DialogHeader>

          {!isConnectingWallet ? (
            <div className="space-y-3">
              {walletOptions.length > 0 ? (
                walletOptions.map((_wallet) => (
                  <Button
                    key={_wallet.id}
                    onClick={() => handleWalletSelect()}
                    className="w-full bg-[#0C0C4F] hover:bg-slate-700 text-white p-4 rounded-lg flex items-center gap-3 justify-start px-6 py-6"
                  >
                    <span className="text-xl">{_wallet.icon}</span>
                    <div className="text-left">
                      <div className="flex">
                        <div className="font-medium">{_wallet.name}</div>
                        {_wallet.description && <div className="text-sm opacity-80">{_wallet.description}</div>}
                      </div>
                    </div>
                  </Button>
                ))
              ) : (
                <div className="text-center py-8 text-slate-600">
                  <p>No wallet options available.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">Wallet Address</label>
                <div className="bg-[#e4e4e4] p-3 rounded-lg text-sm text-slate-600">{walletAddress}</div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">Set a Display Name (optional)</label>
                <Input
                  placeholder="DisplayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full"
                />
              </div>

              <Button
                onClick={handleContinue}
                className=" bg-[#0C0C4F] hover:bg-[#23234491] text-white text-xl rounded-xl font-black flex items-center gap-2 px-6 py-3 float-right"
              >
                Continue
                <ArrowRight className="w-6 h-6 stroke-3" />
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  )
}




{/* <Card>
<div className={`p-8 flex-1 bg-[#ececfa] backdrop-blur-md rounded-2xl border border-white/20" style={{boxShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.1), inset 0 0 20px rgba(0, 0, 0, 0.15), 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)`}>
<div className="grid grid-cols-5 gap-1.5 max-w-80 mx-auto">
         
          Row

        <div className="col-start-2">
          <div className="w-12 h-12 bg-gradient-to-b from-[#0C0C4F] to-[#474785] rounded-lg flex items-center justify-center border-6 border-[#474785]">
            <span className="text-white font-bold text-lg">W</span>
          </div>
        </div>
        <div className="col-start-4 col-span-2 grid grid-cols-2 gap-2">
          <div className="w-12 h-12 bg-gradient-to-b from-[#576065] to-[#787884] rounded-lg border-6 border-[#666672]"></div>
        </div>

         Row 2 

        <div className="w-12 h-12 bg-gradient-to-b from-[#4F0C14] to-[#A43751] rounded-lg flex items-center justify-center border-6 border-[#E87785]">
          <span className="text-white font-bold text-lg">A</span>
        </div>
        <div className="w-12 h-12 bg-gradient-to-b from-[#0C0C4F] to-[#474785] rounded-lg flex items-center justify-center border-6 border-[#474785]">
          <span className="text-white font-bold text-lg">A</span>
        </div>
        <div className="col-start-4 col-span-2 grid grid-cols-2 gap-2">
          <div className="w-12 h-12 bg-gradient-to-b from-[#576065] to-[#787884] rounded-lg border-6 border-[#666672]"></div>
        </div>

         Row 3 - GREAT 

        <div className="w-12 h-12 bg-gradient-to-b from-[#0C0C4F] to-[#474785] rounded-lg flex items-center justify-center border-6 border-[#474785]">
          <span className="text-white font-bold text-lg">G</span>
        </div>
        <div className="w-12 h-12 bg-gradient-to-b from-[#0C0C4F] to-[#474785] rounded-lg flex items-center justify-center border-6 border-[#474785]">
          <span className="text-white font-bold text-lg">R</span>
        </div>
        <div className="w-12 h-12 bg-gradient-to-b from-[#0C0C4F] to-[#474785] rounded-lg flex items-center justify-center border-6 border-[#474785]">
          <span className="text-white font-bold text-lg">E</span>
        </div>
        <div className="w-12 h-12 bg-gradient-to-b from-[#0C0C4F] to-[#474785] rounded-lg flex items-center justify-center border-6 border-[#474785]">
          <span className="text-white font-bold text-lg">A</span>
        </div>
        <div className="w-12 h-12 bg-gradient-to-b from-[#0C0C4F] to-[#474785] rounded-lg flex items-center justify-center border-6 border-[#474785]">
          <span className="text-white font-bold text-lg">T</span>
        </div>

         Row 4
        
         <div className="w-12 h-12 bg-gradient-to-b from-[#576065] to-[#787884] rounded-lg border-6 border-[#666672]"></div>
        <div className="col-start-4">
          <div className="w-12 h-12 bg-gradient-to-b from-[#576065] to-[#787884] rounded-lg border-6 border-[#666672]"></div>
        </div>
      </div>    
        </div>

        <Link className="bg-[#2D2D97]  py-6 rounded-br-lg rounded-bl-lg text-white text-2xl font-bold text-center tracking-wider" href="/">
          CROSSBITES
        </Link>
        </Card>   
   */}
