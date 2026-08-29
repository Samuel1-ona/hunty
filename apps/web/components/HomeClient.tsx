"use client";
import { ArrowRight, Trophy, Search, HelpCircle } from "lucide-react";
"use client";

import { EmptyState } from "@/components/QueryState";
import { useInfiniteQuery,useQueryClient } from "@tanstack/react-query"
import { useWindowVirtualizer } from "@tanstack/react-virtual"
import Image from "next/image"
import Link from "next/link"
import dynamic from "next/dynamic"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { X, ArrowRight, Trophy, Search, HelpCircle, Compass } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { getHuntCapacity, getRemainingSpots } from "@/lib/huntStore"
import { ErrorBoundary } from "@/components/ErrorBoundary"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Header } from "@/components/Header"
import { HuntCoverImage } from "@/components/HuntCoverImage"
import { HuntOfTheWeekBanner } from "@/components/HuntOfTheWeekBanner"
import { HuntCardSkeletonGrid } from "@/components/LoadingSkeletons"
import { Card, CardDescription, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { usePlayerCounts } from "@/hooks/usePlayerCounts"
import { useRecentlyCompleted } from "@/hooks/useRecentlyCompleted"
import { hankenGrotesk } from "@/lib/font"
import { getAllHunts, getHunt, getSpotlightHunts, isHuntPromoted, type StoredHunt } from "@/lib/huntStore"
import { queryCachePolicy, queryKeys } from "@/lib/queryKeys"
import { StarRating } from "@/components/StarRating"
import { FavoriteButton } from "@/components/FavoriteButton"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import type { PlayerCountResult } from "@/lib/types"

const OnboardingTour = dynamic(() => import("@/components/OnboardingTour"), {
  ssr: false,
})

const LeaderboardTable = dynamic(
  () => import("@/components/LeaderBoardTable").then((mod) => mod.LeaderboardTable),
  {
    ssr: false,
  }
)

const FeaturedHunts = dynamic(
  () => import("@/components/FeaturedHunts").then((mod) => mod.FeaturedHunts),
  {
    loading: () => <Skeleton className="h-44 w-full rounded-2xl" />,
  }
);

const GlobalActivityFeed = dynamic(
  () => import("@/components/GlobalActivityFeed").then((mod) => mod.GlobalActivityFeed),
  {
    ssr: false,
    loading: () => <Skeleton className="h-40 w-full rounded-2xl" />,
  }
);

const RecentlyCompletedSection = dynamic(
  () => import("@/components/RecentlyCompletedSection").then((mod) => mod.RecentlyCompletedSection),
  {
    loading: () => <Skeleton className="h-40 w-full rounded-2xl" />,
  }
);

interface WalletOption {
  id: string;
  name: string;
  icon: string;
  description?: string;
}

const walletOptions: WalletOption[] = [];

const ACTIVE_PAGE_SIZE = 12;
const INACTIVE_PAGE_SIZE = 6;
const ACTIVE_GRID_GAP = 24;
const ACTIVE_CARD_ESTIMATED_HEIGHT = 360;

function sortByRecentFirst(a: StoredHunt, b: StoredHunt): number {
  const aSortTime = a.endTime ?? a.startTime ?? 0;
  const bSortTime = b.endTime ?? b.startTime ?? 0;
  return bSortTime - aSortTime;
}

function fetchInactiveHunts() {
  return getAllHunts()
    .filter((hunt) => hunt.status !== "Active" && !hunt.is_private)
    .sort(sortByRecentFirst);
}

// Active and Completed hunts for the public Game Arcade.
// Private hunts (is_private=true) are excluded from the public arcade.
function fetchAllHunts() {
  return getAllHunts().filter(
    (h) => (h.status === "Active" || h.status === "Completed") && !h.is_private
  );
}

function getActiveGridColumnCount(width: number): number {
  if (width >= 1280) return 4;
  if (width >= 1024) return 3;
  if (width >= 640) return 2;
  return 1;
}

function ActiveHuntCard({
  hunt,
  playerCount,
}: {
  hunt: StoredHunt;
  playerCount?: PlayerCountResult;
}) {
  return (
    <Card className="h-full overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm hover:shadow-md transition-shadow relative">
      <div className="absolute top-3 right-3 z-10">
        <FavoriteButton huntId={hunt.id} />
      </div>
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
          {hunt.difficulty && (
             <span
              className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                hunt.difficulty === "Easy" ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-500/20 dark:text-green-300 dark:border-green-500/30" :
                hunt.difficulty === "Medium" ? "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-500/20 dark:text-yellow-300 dark:border-yellow-500/30" :
                hunt.difficulty === "Hard" ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/20 dark:text-red-300 dark:border-red-500/30" :
                "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/30"
              }`}
            >
              {hunt.difficulty}
            </span>
          )}
          {isHuntPromoted(hunt) && (
            <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-pink-100 px-2 py-0.5 text-[10px] font-semibold text-pink-700">
              Promoted
            </span>
          )}
          {playerCount?.isTrending && (
            <span
              className="shrink-0 inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-700"
              aria-label="Trending hunt"
            >
              Trending
            </span>
          )}
        </div>
        <div className="flex items-center justify-between mb-2">
          <StarRating rating={hunt.averageRating} count={hunt.reviewCount} />
          {hunt.averageDifficulty != null && (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-700 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600" title="Average Player Difficulty Rating">
              Difficulty: {hunt.averageDifficulty}/4
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
            <span
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-medium ${
                hunt.rewardType === "XLM"
                  ? "bg-green-50 text-green-700"
                  : hunt.rewardType === "NFT"
                    ? "bg-purple-50 text-purple-700"
                    : "bg-amber-50 text-amber-700"
              }`}
            >
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
            {getHuntCapacity(hunt) !== undefined && (
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-medium text-indigo-700">
                {getRemainingSpots(hunt)} of {getHuntCapacity(hunt)} spots left
              </span>
            )}
          </div>
          <div className="flex gap-2 mt-2 w-full justify-between">
            <Button
              size="sm"
              className="bg-gradient-to-r from-[#3737A4] to-[#0C0C4F] hover:opacity-90 text-white rounded-xl font-semibold h-8 text-[11px] px-3"
              onClick={() => {
                window.location.href = `/hunt/${hunt.id}`;
              }}
            >
              Play
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-[#3737A4] hover:bg-slate-100 dark:hover:bg-slate-700/50 flex items-center gap-1 h-8 text-[11px] font-semibold dark:text-blue-400"
              onClick={() => {
                window.location.href = `/hunt/${hunt.id}/leaderboard`;
              }}
            >
              <Trophy className="w-3.5 h-3.5" />
              Watch Live
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

function VirtualizedActiveHuntsGrid({
  hunts,
  playerCounts,
}: {
  hunts: StoredHunt[];
  playerCounts: ReturnType<typeof usePlayerCounts>["counts"];
}) {
  const parentRef = useRef<HTMLDivElement | null>(null);
  const [columnCount, setColumnCount] = useState(1);
  const [scrollMargin, setScrollMargin] = useState(0);
  const rowCount = Math.ceil(hunts.length / columnCount);

  useEffect(() => {
    const parent = parentRef.current;
    if (!parent) return;

    const updateGridMetrics = () => {
      setColumnCount(getActiveGridColumnCount(parent.getBoundingClientRect().width));
      setScrollMargin(window.scrollY + parent.getBoundingClientRect().top);
    };

    updateGridMetrics();
    const resizeObserver = new ResizeObserver(updateGridMetrics);
    resizeObserver.observe(parent);
    window.addEventListener("resize", updateGridMetrics);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateGridMetrics);
    };
  }, []);

  const rowVirtualizer = useWindowVirtualizer({
    count: rowCount,
    estimateSize: () => ACTIVE_CARD_ESTIMATED_HEIGHT,
    gap: ACTIVE_GRID_GAP,
    overscan: 3,
    scrollMargin,
  });

  return (
    <div ref={parentRef} className="relative w-full">
      <div className="relative w-full" style={{ height: `${rowVirtualizer.getTotalSize()}px` }}>
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const startIndex = virtualRow.index * columnCount;
          const rowHunts = hunts.slice(startIndex, startIndex + columnCount);

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
                willChange: "transform",
              }}
            >
              {rowHunts.map((hunt) => (
                <ErrorBoundary
                  key={hunt.id}
                  fallback={
                    <div className="h-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center min-h-[200px]">
                      <div className="flex flex-col items-center gap-2 text-slate-400 dark:text-slate-500 p-4 text-center">
                        <Image
                          src="/icons/logo.png"
                          alt="Hunty logo"
                          width={40}
                          height={40}
                          className="opacity-40"
                        />
                        <span className="text-xs font-medium">Unable to load hunt card</span>
                      </div>
                    </div>
                  }
                >
                  <ActiveHuntCard hunt={hunt} playerCount={playerCounts.get(String(hunt.id))} />
                </ErrorBoundary>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SpotlightCarousel({ hunts }: { hunts: StoredHunt[] }) {
  if (hunts.length === 0) return null

  return (
    <section className="mt-10 rounded-3xl border border-pink-100 bg-linear-to-r from-pink-50 via-white to-amber-50 p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Spotlight Hunts</h2>
          <p className="text-sm text-slate-600">Featured creator placements for the next 24 hours.</p>
        </div>
        <span className="rounded-full bg-pink-100 px-3 py-1 text-xs font-semibold text-pink-700">
          Paid placement
        </span>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {hunts.map((hunt) => (
          <Link
            key={hunt.id}
            href={`/hunt/${hunt.id}`}
            className="min-w-[280px] max-w-[320px] rounded-2xl border border-white/80 bg-white/90 p-5 shadow-sm transition-transform hover:-translate-y-0.5"
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="rounded-full bg-pink-100 px-2.5 py-1 text-[11px] font-semibold text-pink-700">
                Promoted
              </span>
              <span className="text-xs text-slate-500">
                Ends {hunt.promotedUntil ? new Date(hunt.promotedUntil * 1000).toLocaleString() : "soon"}
              </span>
            </div>
            <h3 className="text-lg font-semibold text-slate-900">{hunt.title}</h3>
            <p className="mt-2 line-clamp-3 text-sm text-slate-600">{hunt.description}</p>
            <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
              <span>{hunt.cluesCount} clues</span>
              <span>•</span>
              <span>{hunt.rewardType} rewards</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}

function getHuntMapPosition(hunt: StoredHunt): { x: number; y: number } {
  const lat = hunt.mapLatitude ?? 40 + ((hunt.id * 17) % 20);
  const lng = hunt.mapLongitude ?? -20 + ((hunt.id * 23) % 40);

  const x = 72 + ((lng + 180) / 360) * 856;
  const y = 80 + ((90 - lat) / 90) * 360;

  return { x, y };
}

function ActiveHuntsMap({ hunts }: { hunts: StoredHunt[] }) {
  const router = useRouter();
  const clusters = useMemo(() => {
    const map = new Map<string, { x: number; y: number; count: number; hunts: StoredHunt[] }>();

    for (const hunt of hunts) {
      const { x, y } = getHuntMapPosition(hunt);
      const bucketX = Math.round(x / 28);
      const bucketY = Math.round(y / 28);
      const key = `${bucketX}:${bucketY}`;
      const existing = map.get(key);

      if (existing) {
        existing.count += 1;
        existing.hunts.push(hunt);
        existing.x = (existing.x * (existing.count - 1) + x) / existing.count;
        existing.y = (existing.y * (existing.count - 1) + y) / existing.count;
      } else {
        map.set(key, { x, y, count: 1, hunts: [hunt] });
      }
    }

    return [...map.values()].sort((a, b) => b.count - a.count);
  }, [hunts]);

  if (hunts.length === 0) return null;

  return (
    <section className="mt-12">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-b from-[#3737A4] to-[#0C0C4F] bg-clip-text text-transparent">
            Active Hunt Map
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Explore live hunts by location and open a pin to jump in.
          </p>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-slate-50 shadow-sm">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#e7e9ff,#f8fafc_52%,#eef2ff_100%)]" />
        <svg
          viewBox="0 0 1000 520"
          className="relative h-[360px] w-full"
          aria-hidden="true"
          preserveAspectRatio="xMidYMid meet"
        >
          <path d="M80 120C150 60 220 30 310 50C355 60 400 90 450 100C490 108 530 80 580 88C655 100 720 170 780 150C860 120 930 150 950 200V438C880 384 820 370 760 398C700 425 620 448 550 420C480 392 405 360 332 370C245 382 140 448 80 438V120Z" fill="rgba(79,70,229,0.08)" stroke="rgba(79,70,229,0.12)" strokeWidth="2" />
          <path d="M150 250C210 200 270 180 340 210C410 240 455 228 510 185C560 145 610 130 700 170C760 195 815 195 865 175" fill="none" stroke="rgba(148,163,184,0.45)" strokeWidth="2" strokeDasharray="6 10" />
          <path d="M125 292C174 260 220 270 250 312C275 346 314 355 342 332C378 303 417 285 460 298C515 315 545 372 600 390C675 415 722 340 800 322C870 306 905 328 945 344" fill="none" stroke="rgba(148,163,184,0.3)" strokeWidth="2" strokeDasharray="3 12" />
          {[...Array(9)].map((_, index) => (
            <line
              key={`grid-${index}`}
              x1={80 + index * 100}
              x2={80 + index * 100}
              y1={20}
              y2={500}
              stroke="rgba(148,163,184,0.12)"
              strokeWidth="1"
            />
          ))}
          {[...Array(7)].map((_, index) => (
            <line
              key={`row-${index}`}
              x1={30}
              x2={970}
              y1={60 + index * 60}
              y2={60 + index * 60}
              stroke="rgba(148,163,184,0.10)"
              strokeWidth="1"
            />
          ))}
        </svg>

        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-0 top-0 h-full w-full bg-[radial-gradient(circle_at_center,transparent_40%,rgba(15,23,42,0.06)_100%)]" />
        </div>

        <div className="absolute inset-0">
          {clusters.map((cluster) => {
            const hunt = cluster.hunts[0];
            const left = (cluster.x / 1000) * 100;
            const top = (cluster.y / 520) * 100;
            const isDense = cluster.count > 1;

            return (
              <button
                key={`${hunt.id}-${cluster.x}-${cluster.y}`}
                type="button"
                onClick={() => router.push(`/hunt/${hunt.id}`)}
                className="absolute -translate-x-1/2 -translate-y-1/2 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-[#3737A4] rounded-full"
                style={{ left: `${left}%`, top: `${top}%` }}
                aria-label={`Open ${hunt.title}`}
              >
                <span
                  className={`flex items-center justify-center rounded-full border-2 border-white shadow-lg ${
                    isDense
                      ? "h-8 w-8 bg-[#3737A4] text-[10px] font-bold text-white"
                      : "h-5 w-5 bg-[#E87785] text-white"
                  }`}
                >
                  {isDense ? cluster.count : ""}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

const INACTIVE_CARD_ESTIMATED_HEIGHT = 200
const INACTIVE_GRID_GAP = 24

function getInactiveGridColumnCount(width: number): number {
  if (width >= 1280) return 4;
  if (width >= 1024) return 3;
  if (width >= 640) return 2;
  return 1;
}

function VirtualizedInactiveHuntsGrid({ hunts }: { hunts: StoredHunt[] }) {
  const parentRef = useRef<HTMLDivElement | null>(null);
  const [columnCount, setColumnCount] = useState(1);
  const [scrollMargin, setScrollMargin] = useState(0);
  const rowCount = Math.ceil(hunts.length / columnCount);

  useEffect(() => {
    const parent = parentRef.current;
    if (!parent) return;

    const updateGridMetrics = () => {
      setColumnCount(getInactiveGridColumnCount(parent.getBoundingClientRect().width));
      setScrollMargin(window.scrollY + parent.getBoundingClientRect().top);
    };

    updateGridMetrics();
    const resizeObserver = new ResizeObserver(updateGridMetrics);
    resizeObserver.observe(parent);
    window.addEventListener("resize", updateGridMetrics);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateGridMetrics);
    };
  }, []);

  const rowVirtualizer = useWindowVirtualizer({
    count: rowCount,
    estimateSize: () => INACTIVE_CARD_ESTIMATED_HEIGHT,
    gap: INACTIVE_GRID_GAP,
    overscan: 5,
    scrollMargin,
  });

  return (
    <div ref={parentRef} className="relative w-full">
      <div className="relative w-full" style={{ height: `${rowVirtualizer.getTotalSize()}px` }}>
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const startIndex = virtualRow.index * columnCount;
          const rowHunts = hunts.slice(startIndex, startIndex + columnCount);

          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={rowVirtualizer.measureElement}
              className="absolute left-0 top-0 grid w-full"
              style={{
                gap: `${INACTIVE_GRID_GAP}px`,
                gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
                transform: `translateY(${virtualRow.start - scrollMargin}px)`,
                willChange: "transform",
              }}
            >
              {rowHunts.map((hunt) => (
                <Card
                  key={`inactive-${hunt.id}`}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white/90 shadow-sm h-full"
                >
                  <div className="p-5 flex flex-col justify-between h-full">
                    <div>
                      <CardTitle className="text-lg font-semibold mb-2 line-clamp-2">
                        {hunt.title}
                      </CardTitle>
                      <StarRating
                        rating={hunt.averageRating}
                        count={hunt.reviewCount}
                        className="mb-2"
                      />
                      {hunt.difficulty && (
                        <div className="mb-2">
                           <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                            hunt.difficulty === "Easy" ? "bg-green-50 text-green-700 border-green-200" :
                            hunt.difficulty === "Medium" ? "bg-yellow-50 text-yellow-700 border-yellow-200" :
                            hunt.difficulty === "Hard" ? "bg-red-50 text-red-700 border-red-200" :
                            "bg-purple-50 text-purple-700 border-purple-200"
                           }`}>
                            {hunt.difficulty}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between mb-2">
                        <StarRating rating={hunt.averageRating} count={hunt.reviewCount} />
                        {hunt.averageDifficulty != null && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700 border border-slate-200" title="Average Player Difficulty Rating">
                            Difficulty: {hunt.averageDifficulty}/4
                          </span>
                        )}
                      </div>
                      <CardDescription className="text-sm text-slate-600 mb-4 line-clamp-3">
                        {hunt.description}
                      </CardDescription>
                    </div>
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
          );
        })}
      </div>
    </div>
  );
}

export default function GameArcade() {
  const t = useTranslations("home")
  const queryClient = useQueryClient()
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false)
  const [isConnectingWallet, setIsConnectingWallet] = useState(false)
  const [displayName, setDisplayName] = useState("")
  const [gameLink, setGameLink] = useState("")
  const [walletAddress, setWalletAddress] = useState("")

  const [visibleActiveCount, setVisibleActiveCount] = useState(ACTIVE_PAGE_SIZE)
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isLoadingMoreActive, setIsLoadingMoreActive] = useState(false)
  const [inactiveHunts, setInactiveHunts] = useState<StoredHunt[]>([])
  const [visibleInactiveCount, setVisibleInactiveCount] = useState(INACTIVE_PAGE_SIZE)
  const [isLoadingMoreInactive, setIsLoadingMoreInactive] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState<"leaderboard" | "none">("none")
  const [rewardFilter, setRewardFilter] = useState<"all" | "XLM" | "NFT" | "Both">("all")
  const [statusFilter, setStatusFilter] = useState<"all" | "Active" | "Completed">("Active")
  const [difficultyFilter, setDifficultyFilter] = useState<"all" | "Easy" | "Medium" | "Hard">("all")
  const [categoryFilter, setCategoryFilter] = useState<"all" | "Urban" | "Campus" | "Office" | "Museum" | "General">("all")
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "popular" | "reward-high" | "difficulty" | "clues-high" | "clues-low" | "rating-high">("newest")

  const isLoadedRef = useRef(false)

  // Sync filter state from URL to component state
  useEffect(() => {
    const q = searchParams.get("q") ?? "";
    const reward = searchParams.get("reward") ?? "all";
    const status = searchParams.get("status") ?? "Active";
    const difficulty = searchParams.get("difficulty") ?? "all";
    const category = searchParams.get("category") ?? "all";
    const sortBy = searchParams.get("sortBy") ?? "newest";

    setSearchQuery(q);
    if (["all", "XLM", "NFT", "Both"].includes(reward)) {
      setRewardFilter(reward as "all" | "XLM" | "NFT" | "Both");
    }
    if (["all", "Active", "Completed"].includes(status)) {
      setStatusFilter(status as "all" | "Active" | "Completed");
    }
    if (["all", "Easy", "Medium", "Hard"].includes(difficulty)) {
      setDifficultyFilter(difficulty as "all" | "Easy" | "Medium" | "Hard");
    }
    if (["all", "Urban", "Campus", "Office", "Museum", "General"].includes(category)) {
      setCategoryFilter(category as "all" | "Urban" | "Campus" | "Office" | "Museum" | "General");
    }
    if (["newest", "oldest", "popular", "reward-high", "difficulty", "clues-high", "clues-low", "rating-high"].includes(sortBy)) {
      setSortBy(sortBy as "newest" | "oldest" | "popular" | "reward-high" | "difficulty" | "clues-high" | "clues-low" | "rating-high");
    }
  }, [searchParams]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());

    if (searchQuery) params.set("q", searchQuery); else params.delete("q");
    if (rewardFilter !== "all") params.set("reward", rewardFilter); else params.delete("reward");
    if (statusFilter !== "Active") params.set("status", statusFilter); else params.delete("status");
    if (difficultyFilter !== "all") params.set("difficulty", difficultyFilter); else params.delete("difficulty");
    if (categoryFilter !== "all") params.set("category", categoryFilter); else params.delete("category");
    if (sortBy !== "newest") params.set("sortBy", sortBy); else params.delete("sortBy");

    const queryString = params.toString();
    const nextUrl = queryString ? `${pathname}?${queryString}` : pathname;

    // Use replace to avoid adding to browser history for every filter change
    router.replace(nextUrl, { scroll: false });
  }, [searchQuery, rewardFilter, statusFilter, difficultyFilter, categoryFilter, sortBy]);

  // Load hunts using Infinite Query with cursor-based pagination
  const {
    data: infiniteData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingHunts,
  } = useInfiniteQuery({
    queryKey: [
      "hunts",
      "infinite",
      statusFilter,
      rewardFilter,
      difficultyFilter,
      categoryFilter,
      searchQuery,
      sortBy,
    ],
    queryFn: async ({ pageParam }) => {
      const cursorVal = pageParam !== null ? pageParam : "";
      const res = await fetch(
        `/api/v1/hunts?limit=12&cursor=${cursorVal}&status=${statusFilter}&reward=${rewardFilter}&difficulty=${difficultyFilter}&category=${categoryFilter}&search=${encodeURIComponent(
          searchQuery
        )}&sortBy=${sortBy}`
      );
      if (!res.ok) {
        throw new Error("Failed to fetch hunts");
      }
      return res.json() as Promise<{
        data: StoredHunt[];
        pagination: {
          total: number;
          limit: number;
          cursor: number | null;
          nextCursor: number | null;
        };
      }>;
    },
    initialPageParam: null as number | null,
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor,
    staleTime: queryCachePolicy.hunts.staleTime,
    gcTime: queryCachePolicy.hunts.gcTime,
  });

  // Flatten infinite scroll pages into a single flat array
  const filteredHunts = useMemo(() => {
    if (!infiniteData) return [];
    return infiniteData.pages.flatMap((page) => page.data);
  }, [infiniteData]);

  // Only render the first visibleActiveCount hunts for pagination
  const displayedActiveHunts = useMemo(
    () => filteredHunts.slice(0, visibleActiveCount),
    [filteredHunts, visibleActiveCount]
  );
  const hasMoreActiveLoaded = visibleActiveCount < filteredHunts.length;

  // Retrieve total results count matching current filters
  const totalResults = useMemo(() => {
    return infiniteData?.pages[0]?.pagination.total ?? 0;
  }, [infiniteData]);

  // Pre-fetch hunt details when active list updates
  useEffect(() => {
    filteredHunts.slice(0, 6).forEach((hunt) => {
      queryClient.prefetchQuery({
        queryKey: queryKeys.hunts.detail(hunt.id),
        queryFn: () => getHunt(String(hunt.id)),
        staleTime: queryCachePolicy.hunts.staleTime,
      });
    });
  }, [filteredHunts, queryClient]);

  // Get player counts for all active/visible hunts
  const allHuntIds = useMemo(() => filteredHunts.map((h) => String(h.id)), [filteredHunts]);
  const { counts: playerCounts, refetch: refetchPlayerCounts } = usePlayerCounts(allHuntIds);

  // Refresh player counts whenever the hunt list loads/changes.
  useEffect(() => {
    if (filteredHunts.length > 0) refetchPlayerCounts();
  }, [filteredHunts.length, refetchPlayerCounts]);

  // Derive recently completed hunts from the local store (not limited by pagination)
  const allHuntsList = useMemo(() => {
    return fetchAllHunts();
  }, []);

  const searchSuggestions = useMemo(() => {
    const uniqueTitles = Array.from(new Set(allHuntsList.map((hunt) => hunt.title)));
    const normalized = searchQuery.trim().toLowerCase();
    if (!normalized) return uniqueTitles.slice(0, 8);
    return uniqueTitles.filter((title) => title.toLowerCase().includes(normalized)).slice(0, 8);
  }, [allHuntsList, searchQuery]);

  const recentlyCompleted = useRecentlyCompleted(allHuntsList);
  const spotlightHunts = useMemo(() => getSpotlightHunts(), []);

  const visibleInactiveHunts = useMemo(
    () => inactiveHunts.slice(0, visibleInactiveCount),
    [inactiveHunts, visibleInactiveCount]
  );
  const hasMoreInactiveHunts = visibleInactiveCount < inactiveHunts.length;

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("tab") === "leaderboard") {
        setActiveTab("leaderboard");
      }
    }
  }, []);

  // Sync/update inactive hunts when infiniteData changes (indicating new hunt modifications or state refresh)
  useEffect(() => {
    setInactiveHunts(fetchInactiveHunts());
    setVisibleInactiveCount(INACTIVE_PAGE_SIZE);
  }, [infiniteData]);

  const loadMoreInactiveHunts = useCallback(() => {
    if (!hasMoreInactiveHunts || isLoadingMoreInactive) return;
    setIsLoadingMoreInactive(true);
    setTimeout(() => {
      setVisibleInactiveCount((prev) => Math.min(prev + INACTIVE_PAGE_SIZE, inactiveHunts.length));
      setIsLoadingMoreInactive(false);
    }, 250);
  }, [hasMoreInactiveHunts, inactiveHunts.length, isLoadingMoreInactive]);

  const showPreviousInactiveHunts = useCallback(() => {
    setVisibleInactiveCount((prev) => Math.max(prev - INACTIVE_PAGE_SIZE, INACTIVE_PAGE_SIZE));
  }, []);

  const hasPreviousInactiveHunts = visibleInactiveCount > INACTIVE_PAGE_SIZE;

  // Active hunts: Load More fetches next API page then expands visible slice
  const loadMoreActiveHunts = useCallback(() => {
    if (hasMoreActiveLoaded) {
      setIsLoadingMoreActive(true);
      setTimeout(() => {
        setVisibleActiveCount((prev) => Math.min(prev + ACTIVE_PAGE_SIZE, filteredHunts.length));
        setIsLoadingMoreActive(false);
      }, 150);
    } else if (hasNextPage && !isFetchingNextPage) {
      setIsLoadingMoreActive(true);
      fetchNextPage().then(() => {
        setVisibleActiveCount((prev) => prev + ACTIVE_PAGE_SIZE);
        setIsLoadingMoreActive(false);
      });
    }
  }, [hasMoreActiveLoaded, hasNextPage, isFetchingNextPage, fetchNextPage, filteredHunts.length]);

  const showPreviousActiveHunts = useCallback(() => {
    setVisibleActiveCount((prev) => Math.max(prev - ACTIVE_PAGE_SIZE, ACTIVE_PAGE_SIZE));
  }, []);

  const hasPreviousActiveHunts = visibleActiveCount > ACTIVE_PAGE_SIZE;
  const canLoadMoreActive = hasMoreActiveLoaded || hasNextPage;

  // Save scroll position on scroll
  useEffect(() => {
    let timeoutId: number;
    const handleScroll = () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        sessionStorage.setItem("arcade_scroll_y", String(window.scrollY));
      }, 100);
    };

    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, []);

  // Restore scroll position
  useEffect(() => {
    if (!isLoadingHunts && filteredHunts.length > 0) {
      const savedScrollY = sessionStorage.getItem("arcade_scroll_y");
      if (savedScrollY) {
        const targetY = parseInt(savedScrollY, 10);
        if (!isNaN(targetY) && targetY > 0) {
          const timeoutId = setTimeout(() => {
            window.scrollTo({ top: targetY, behavior: "instant" });
          }, 150);
          return () => clearTimeout(timeoutId);
        }
      }
    }
  }, [isLoadingHunts, filteredHunts.length]);

  // Clear scroll position and reset pagination when filter state changes
  useEffect(() => {
    setSearchQuery("");
    setRewardFilter("all");
    setStatusFilter("Active");
    setDifficultyFilter("all");
    setCategoryFilter("all");
    setSortBy("newest");
    setVisibleActiveCount(ACTIVE_PAGE_SIZE);
    setVisibleInactiveCount(INACTIVE_PAGE_SIZE);
  }, [statusFilter, rewardFilter, difficultyFilter, categoryFilter, searchQuery, sortBy]);

  const clearAllFilters = () => {
    setSearchQuery("");
    setRewardFilter("all");
    setStatusFilter("Active");
    setDifficultyFilter("all");
    setCategoryFilter("all");
    setSortBy("newest");
    setVisibleInactiveCount(INACTIVE_PAGE_SIZE);
  };

  const handleWalletSelect = () => {
    setIsConnectingWallet(true);
    // Simulate wallet address generation
    setWalletAddress("0xe5f...E5");
  };

  const handleContinue = () => {
    setIsWalletModalOpen(false);
    setIsConnectingWallet(false);
    setDisplayName("");
  };

  const handleCreateGame = () => {
    window.location.href = "/hunty";
  };

  return (
    <div
      className={`min-h-screen bg-gradient-to-tr from-blue-100 bg-purple-100 to-[#f9f9ff] dark:from-slate-900 dark:bg-slate-900 dark:to-slate-800 pb-[75px]`}
    >
      <OnboardingTour tourType="player" />
      {/* Header */}
      <Header />

      {/* Main Content */}
      <div className="max-w-[1600px] px-14 pt-10 pb-12 bg-white dark:bg-slate-900 mx-auto rounded-4xl relative">
        {/* Featured Hunt of the Week Hero Banner */}
        <ErrorBoundary fallback={null}>
          <HuntOfTheWeekBanner />
        </ErrorBoundary>

        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-[#0C0C4F] shadow-lg absolute left-1/2 top-1 -translate-x-1/2 -translate-y-1/2">
            {/* logo */}
            <Image src="/icons/logo.png" alt="Logo" width={96} height={96} />
          </div>
          <h1 className={`text-4xl md:text-5xl bg-gradient-to-b from-[#3737A4] to-[#0C0C4F] bg-clip-text text-transparent font-bold mb-12 ${hankenGrotesk.variable} antialiased bg-gradient-to-br from-#3737A4 to-#0C0C4F mt-12`}>{t("title")}</h1>
          <h1
            className={`text-4xl md:text-5xl bg-gradient-to-b from-[#3737A4] to-[#0C0C4F] bg-clip-text text-transparent font-bold mb-12 ${hankenGrotesk.variable} antialiased bg-gradient-to-br from-#3737A4 to-#0C0C4F mt-12`}
          >
            The Ultimate Web3 Game Arcade
          </h1>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <Button className="bg-[#0C0C4F] hover:bg-slate-700 text-white px-6 py-3 rounded-lg text-xl font-black" onClick={handleCreateGame}>
            {t("createGame")}
          </Button>
          <Button asChild variant="outline" className="border-2 border-[#0C0C4F] text-[#0C0C4F] hover:bg-[#0C0C4F]/10 px-6 py-3 rounded-lg text-xl font-black">
            <Link href="/dashboard">{t("myHunts")}</Link>
          </Button>
          <Button
            className={`px-6 py-3 rounded-lg text-xl font-black ${
              activeTab === "leaderboard"
                ? "bg-[#3737A4] text-white"
                : "bg-gradient-to-b from-[#3737A4] to-[#0C0C4F] text-white hover:opacity-90"
            }`}
            onClick={() => setActiveTab(activeTab === "leaderboard" ? "none" : "leaderboard")}
          >
            {t("leaderboard")}
          </Button>
          <Button asChild className="bg-gradient-to-b from-[#3737A4] to-[#0C0C4F] hover:opacity-90 text-white px-6 py-3 rounded-lg text-xl font-black gap-2">
            <Link href="/feed">
              <Compass className="w-5 h-5" />
              {t("huntFeed")}
            </Link>
          </Button>
          <Button id="play-button" className="bg-[#E87785] hover:bg-[#d4606f] text-white px-6 py-3 rounded-lg text-xl font-black">{t("playGame")}</Button>
        </div>

        {/* Leaderboard Section */}
        {activeTab === "leaderboard" && (
          <div className="mb-12 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="max-w-4xl mx-auto bg-[#f9f9ff] rounded-3xl p-8 border border-slate-100 shadow-inner">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h2 className="text-3xl font-bold bg-gradient-to-b from-[#3737A4] to-[#0C0C4F] text-transparent bg-clip-text">
                  {t("globalLeaderboard")}
                </h2>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="border-[#3737A4] text-[#3737A4] hover:bg-[#3737A4]/5 text-xs"
                  >
                    <Link href="/leaderboard">Full view with filters</Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveTab("none")}
                    className="text-slate-500 hover:text-slate-800"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </div>
              <LeaderboardTable huntId={1} />
            </div>
          </div>
        )}

        {/* Game Link Input */}
        <div className="text-center mb-12">
          <p className="text-slate-700 mb-4 font-medium">{t("enterGameLink")}</p>
          <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
            <Input
              type="url"
              placeholder={t("gameLinkPlaceholder")}
              value={gameLink}
              onChange={(e) => setGameLink(e.target.value)}
              className="flex-1 px-4 py-2 rounded-lg border-2 border-gray-300 focus:border-pink-400"
            />
            <Button className="bg-[#E87785] hover:bg-[#d4606f] text-white px-6 py-3 rounded-lg text-xl font-black">{t("playGame")}</Button>
            <Button className="bg-[#E87785] hover:bg-[#d4606f] text-white px-6 py-3 rounded-lg text-xl font-black">
              Play Game
            </Button>
          </div>
        </div>

        {/* Game Cards */}
        <div
          className={`flex flex-col sm:flex-row md:justify-between  bg-[#ececfa] backdrop-blur-md rounded-2xl border border-white/20 pl-6 pt-6 pb-16`}
          style={{
            boxShadow:
              "inset 0 1px 0 0 rgba(255, 255, 255, 0.1), inset 0 0 20px rgba(0, 0, 0, 0.15), 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
          }}
        >
          <div>
            <div className="bg-gradient-to-br from-[#2F2FFF] to-[#E87785] bg-clip-text text-transparent font-normal text-4xl text-center mb-4 md:mb-0 md:text-start">
              How To Play Hunty
            </div>
          </div>

          {/* Hunty Game */}
          <div>
            <div className={` flex-1 md:flex gap-2 bg-transparent`}>
              <Card className="flex-1 text-white justify-center max-w-56">
                <div className="bg-gradient-to-br from-[#3737A4] to-[#0C0C4F] flex-1 rounded-t-lg p-3">
                  <CardTitle className="text-[13px] font-bold">What is the fastest bird?</CardTitle>
                  <CardDescription className="text-[8px] mt-2 text-white">
                    The Description appears here...Yorem ipsum dolor sit amet, consectetur
                    adipiscing elit.
                  </CardDescription>
                  <div className="mt-2">
                    <Image src="/static-images/image1.png" alt="bird" width={132} height={132} />
                  </div>
                  <div className="mt-2">
                    <Button className="bg-gradient-to-b from-[#2F2FFF]  to-[#E87785] sh-6 text-[7.76px] p-[3px]">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="lucide lucide-link-icon lucide-link"
                      >
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                      </svg>
                      <span>Hint To Unlock</span>
                    </Button>
                  </div>
                </div>
                <div
                  className="flex gap-1 bg-white items-center align-center p-3 rounded-b-lg
                  "
                >
                  <Input
                    placeholder="Enter code to unlock"
                    className="px-3.5 py-1 text-[8px] rounded-full"
                  />
                  <div className="bg-gradient-to-b from-[#3737A4]  to-[#0C0C4F] rounded-lg flex items-center justify-center p-2">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </Card>

              <div className="bg-white/40 backdrop-blur-lg"></div>
              <Card className="mr-[-80px] [clip-path:polygon(0_0,68%_0,68%_100%,0_100%)] hidden md:block">
                <div className="bg-gradient-to-br from-[#3737A4] to-[#0C0C4F] text-white p-3 rounded-t-lg">
                  <CardTitle className="text-[13px] font-bold">What is the biggest bird?</CardTitle>
                  <CardDescription className="text-[8px] mt-2 text-white">
                    long legs, tiny brain{" "}
                  </CardDescription>
                  <div className="mt-2">
                    <Button className="bg-gradient-to-b from-[#2F2FFF]  to-[#E87785] text-[8px]">
                      {" "}
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="lucide lucide-link-icon lucide-link"
                      >
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                      </svg>{" "}
                      <span className="text-[8px]">Hint To Unlock</span>
                    </Button>
                  </div>
                </div>

                <div
                  className="flex gap-1 bg-white items-center align-center p-3 rounded-b-lg
                  "
                >
                  <Input placeholder="Enter code to unlock" className="h-[19px] text-[8px]" />
                  <div className="bg-gradient-to-b from-[#3737A4]  to-[#0C0C4F] rounded-md flex items-center justify-center p-0.5">
                    <ArrowRight color="white" className="w-4 h-4" />
                  </div>
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
        <ErrorBoundary fallback={null}>
          <FeaturedHunts />
        </ErrorBoundary>

        {/* Recently Completed — derived from the same hunt list, no extra fetch */}
        <RecentlyCompletedSection hunts={recentlyCompleted} />

        <SpotlightCarousel hunts={spotlightHunts} />

        <ActiveHuntsMap hunts={displayedActiveHunts} />

        {/* Active Hunts Grid */}
        <div id="discovery-arcade" className="mt-10">
          <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-6 border-b border-slate-100 dark:border-white/5 pb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-b from-[#3737A4] to-[#0C0C4F] bg-clip-text text-transparent flex items-center gap-3">
                Discovery Arcade
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs font-semibold text-[#3737A4] dark:text-indigo-400 hover:underline gap-1.5 flex items-center p-1 h-auto"
                  onClick={() =>
                    window.dispatchEvent(
                      new CustomEvent("start-onboarding-tour", { detail: { tourType: "player" } })
                    )
                  }
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  Take Tour
                </Button>
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Find the perfect challenge for you
              </p>
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
              <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                <select
                  value={difficultyFilter}
                  onChange={(e) =>
                    setDifficultyFilter(e.target.value as "all" | "Easy" | "Medium" | "Hard")
                  }
                  className="h-10 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#3737A4]/50 cursor-pointer"
                >
                  <option value="all">All Difficulty</option>
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>

                <select
                  value={categoryFilter}
                  onChange={(e) =>
                    setCategoryFilter(
                      e.target.value as "all" | "Urban" | "Campus" | "Office" | "Museum" | "General"
                    )
                  }
                  className="h-10 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#3737A4]/50 cursor-pointer"
                >
                  <option value="all">All Categories</option>
                  <option value="Urban">Urban</option>
                  <option value="Campus">Campus</option>
                  <option value="Office">Office</option>
                  <option value="Museum">Museum</option>
                  <option value="General">General</option>
                </select>

                <div className="relative flex-1 sm:w-64">
                  <Input
                    list="hunt-search-suggestions"
                    placeholder="Search title or description..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-[#3737A4] focus:ring-[#3737A4] pl-3 h-10 rounded-xl"
                  />
                  <datalist id="hunt-search-suggestions">
                    {searchSuggestions.map((suggestion) => (
                      <option key={suggestion} value={suggestion} />
                    ))}
                  </datalist>
                </div>

                <select
                  value={sortBy}
                  onChange={(e) =>
                    setSortBy(
                      e.target.value as
                        | "newest"
                        | "oldest"
                        | "popular"
                        | "reward-high"
                        | "difficulty"
                        | "clues-high"
                        | "clues-low"
                        | "rating-high"
                    )
                  }
                  className="h-10 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#3737A4]/50 cursor-pointer"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="popular">Most Popular</option>
                  <option value="reward-high">Highest Reward</option>
                  <option value="difficulty">Hardest First</option>
                  <option value="rating-high">Highest Rated</option>
                  <option value="clues-high">Most Clues</option>
                  <option value="clues-low">Fewest Clues</option>
                </select>

                <Button
                  variant="outline"
                  onClick={clearAllFilters}
                  className="h-10 rounded-xl border-slate-200 dark:border-slate-700"
                >
                  Clear Filters
                </Button>
              </div>

              {isLoadingHunts ? (
                <div className="skeleton-shimmer h-4 w-24 rounded-md bg-slate-200 dark:bg-slate-700" />
              ) : (
                <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider hidden xl:block">
                  {totalResults} result{totalResults === 1 ? "" : "s"}
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
                title={
                  searchQuery ? "No hunts match your search" : "No hunts yet, create your first!"
                }
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
            <>
              <VirtualizedActiveHuntsGrid
                hunts={displayedActiveHunts}
                playerCounts={playerCounts}
              />

              {(canLoadMoreActive || hasPreviousActiveHunts || isLoadingMoreActive) && (
                <div className="flex items-center justify-center gap-3 mt-6">
                  {hasPreviousActiveHunts && (
                    <Button
                      variant="outline"
                      onClick={showPreviousActiveHunts}
                      className="rounded-xl border-slate-200 dark:border-slate-700 text-sm font-semibold"
                    >
                      Show Previous
                    </Button>
                  )}
                  {isLoadingMoreActive ? (
                    <div className="skeleton-shimmer h-4 w-24 rounded-md bg-slate-200 dark:bg-slate-700" />
                  ) : canLoadMoreActive ? (
                    <Button
                      variant="outline"
                      onClick={loadMoreActiveHunts}
                      className="rounded-xl border-slate-200 dark:border-slate-700 text-sm font-semibold"
                    >
                      Load More
                    </Button>
                  ) : null}
                </div>
              )}
            </>
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
              <VirtualizedInactiveHuntsGrid hunts={visibleInactiveHunts} />

              {(hasMoreInactiveHunts || hasPreviousInactiveHunts || isLoadingMoreInactive) && (
                <div className="flex items-center justify-center gap-3 mt-6">
                  {hasPreviousInactiveHunts && (
                    <Button
                      variant="outline"
                      onClick={showPreviousInactiveHunts}
                      className="rounded-xl border-slate-200 dark:border-slate-700 text-sm font-semibold"
                    >
                      Show Previous
                    </Button>
                  )}
                  {isLoadingMoreInactive ? (
                    <p className="text-center text-sm text-slate-500">Loading more hunts...</p>
                  ) : hasMoreInactiveHunts ? (
                    <Button
                      variant="outline"
                      onClick={loadMoreInactiveHunts}
                      className="rounded-xl border-slate-200 dark:border-slate-700 text-sm font-semibold"
                    >
                      Load More
                    </Button>
                  ) : null}
                </div>
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
            <DialogTitle className="bg-gradient-to-b from-[#3737A4] to-[#0C0C4F] bg-clip-text text-transparent font-semibold text-2xl">
              Connect a wallet
            </DialogTitle>
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
                        {_wallet.description && (
                          <div className="text-sm opacity-80">{_wallet.description}</div>
                        )}
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
                <label className="text-sm font-medium text-slate-700 block mb-2">
                  Wallet Address
                </label>
                <div className="bg-[#e4e4e4] p-3 rounded-lg text-sm text-slate-600">
                  {walletAddress}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">
                  Set a Display Name (optional)
                </label>
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
    </div>
  );
}

{
  /* <Card>
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
   */
}
 