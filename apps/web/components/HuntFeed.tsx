"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useInfiniteQuery } from "@tanstack/react-query"
import {
  Flame,
  Sparkles,
  MapPin,
  Star,
  Compass,
  RefreshCw,
  Search,
  UserCheck,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { queryCachePolicy, queryKeys } from "@/lib/queryKeys"
import { HuntFeedCard, HuntFeedCardGridSkeleton } from "@/components/HuntFeedCard"
import { EmptyState } from "@/components/EmptyState"
import type { HuntAgeClassification, StoredHunt, HuntFeedCategory } from "@/lib/types"
import { getDistanceMeters } from "@/lib/locationServices"
import { getStoredSession } from "@/lib/session"
import { useRefreshByUser } from "@/hooks/useRefreshByUser"

// ─── Constants ───────────────────────────────────────────────────────────

const CATEGORIES: {
  key: HuntFeedCategory
  label: string
  icon: React.ReactNode
  description: string
}[] = [
  {
    key: "trending",
    label: "Trending",
    icon: <Flame className="w-4 h-4" />,
    description: "Most popular hunts right now",
  },
  {
    key: "new",
    label: "New",
    icon: <Sparkles className="w-4 h-4" />,
    description: "Latest hunts added",
  },
  {
    key: "nearby",
    label: "Nearby",
    icon: <MapPin className="w-4 h-4" />,
    description: "Hunts near your location",
  },
  {
    key: "featured",
    label: "Featured",
    icon: <Star className="w-4 h-4" />,
    description: "Editor's picks this week",
  },
  {
    key: "following",
    label: "Following",
    icon: <UserCheck className="w-4 h-4" />,
    description: "New hunts from creators you follow",
  },
]

const FEED_PAGE_SIZE = 12
const SCROLL_THRESHOLD_PX = 300
const PULL_REFRESH_THRESHOLD_PX = 80

// Grid column mappings (static strings for Tailwind compatibility)
const GRID_COLUMNS_SM: Record<string, string> = {
  "1": "sm:grid-cols-1",
  "2": "sm:grid-cols-2",
  "3": "sm:grid-cols-3",
  "4": "sm:grid-cols-4",
}

const GRID_COLUMNS_MD: Record<string, string> = {
  "1": "md:grid-cols-1",
  "2": "md:grid-cols-2",
  "3": "md:grid-cols-3",
  "4": "md:grid-cols-4",
}

const GRID_COLUMNS_LG: Record<string, string> = {
  "1": "lg:grid-cols-1",
  "2": "lg:grid-cols-2",
  "3": "lg:grid-cols-3",
  "4": "lg:grid-cols-4",
}

const GRID_COLUMNS_XL: Record<string, string> = {
  "1": "xl:grid-cols-1",
  "2": "xl:grid-cols-2",
  "3": "xl:grid-cols-3",
  "4": "xl:grid-cols-4",
}

// ─── Category Descriptions & Empty States ──────────────────────────────────

const CATEGORY_EMPTY: Record<HuntFeedCategory, {
  title: string
  description: string
  icon: React.ReactNode
}> = {
  trending: {
    title: "No trending hunts yet",
    description: "Be the first to play and make a hunt trend! Create or join a hunt to get things started.",
    icon: <Flame className="w-10 h-10 text-orange-500" />,
  },
  new: {
    title: "No new hunts available",
    description: "There are no recently created hunts yet. Check back soon or create your own!",
    icon: <Sparkles className="w-10 h-10 text-yellow-500" />,
  },
  nearby: {
    title: "No nearby hunts found",
    description: "There are no hunts near your location. Enable location access or check other categories.",
    icon: <Compass className="w-10 h-10 text-blue-500" />,
  },
  featured: {
    title: "No featured hunts right now",
    description: "Check back later for featured hunts picked by our editors.",
    icon: <Star className="w-10 h-10 text-purple-500" />,
  },
  following: {
    title: "No hunts from creators you follow",
    description: "Follow creators to see their new hunts here. Tap Follow on a creator's profile.",
    icon: <UserCheck className="w-10 h-10 text-emerald-500" />,
  },
}

// ─── Geolocation helpers ──────────────────────────────────────────────────

function requestLocationPermission(): Promise<GeolocationPosition | null> {
  if (typeof window === "undefined" || !navigator.geolocation) return Promise.resolve(null)
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => resolve(position),
      () => resolve(null),
      { timeout: 5000, enableHighAccuracy: false }
    )
  })
}

function getHuntDistanceMeters(hunt: StoredHunt, userLocation: { latitude: number; longitude: number } | null): number | undefined {
  if (!userLocation) return undefined
  if (typeof hunt.mapLatitude !== "number" || typeof hunt.mapLongitude !== "number") {
    return undefined
  }

  return getDistanceMeters(
    { latitude: userLocation.latitude, longitude: userLocation.longitude },
    { latitude: hunt.mapLatitude, longitude: hunt.mapLongitude }
  )
}

// ─── Pull-to-refresh indicator ──────────────────────────────────────────────

function PullToRefreshIndicator({
  refreshing,
  pullDistance,
}: {
  refreshing: boolean
  pullDistance: number
}) {
  if (!refreshing && pullDistance <= 0) return null

  return (
    <div
      className={cn(
        "flex items-center justify-center py-4 text-sm text-slate-500 dark:text-slate-400 transition-all duration-200",
        refreshing && "py-6"
      )}
      style={{
        opacity: Math.min(1, pullDistance / PULL_REFRESH_THRESHOLD_PX),
        transform: `scale(${Math.min(1, pullDistance / PULL_REFRESH_THRESHOLD_PX)})`,
      }}
    >
      <RefreshCw
        className={cn(
          "w-5 h-5 mr-2",
          refreshing && "animate-spin"
        )}
      />
      <span>
        {refreshing
          ? "Refreshing..."
          : pullDistance >= PULL_REFRESH_THRESHOLD_PX
          ? "Release to refresh"
          : "Pull to refresh"}
      </span>
    </div>
  )
}

// ─── Grid class builder ────────────────────────────────────────────────────

function buildGridClasses(gridColumns?: {
  sm?: number
  md?: number
  lg?: number
  xl?: number
}): string {
  if (!gridColumns) return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"

  // Always start with a base single-column layout as a safe fallback
  const classes: string[] = ["grid-cols-1"]
  if (gridColumns.sm) classes.push(GRID_COLUMNS_SM[String(gridColumns.sm)] ?? "sm:grid-cols-2")
  if (gridColumns.md) classes.push(GRID_COLUMNS_MD[String(gridColumns.md)] ?? "md:grid-cols-2")
  if (gridColumns.lg) classes.push(GRID_COLUMNS_LG[String(gridColumns.lg)] ?? "lg:grid-cols-3")
  if (gridColumns.xl) classes.push(GRID_COLUMNS_XL[String(gridColumns.xl)] ?? "xl:grid-cols-4")

  return classes.join(" ")
}

// ─── Main Component ────────────────────────────────────────────────────────

interface HuntFeedProps {
  /** Initial active category */
  defaultCategory?: HuntFeedCategory
  /** Optional class name */
  className?: string
  /** Whether to show the category navigation header */
  showHeader?: boolean
  /** Optional callback when category changes */
  onCategoryChange?: (category: HuntFeedCategory) => void
  /** Grid columns configuration */
  gridColumns?: {
    sm?: number
    md?: number
    lg?: number
    xl?: number
  }
}

export function HuntFeed({
  defaultCategory = "trending",
  className,
  showHeader = true,
  onCategoryChange,
  gridColumns,
}: HuntFeedProps) {
  const [activeCategory, setActiveCategory] = useState<HuntFeedCategory>(defaultCategory)
  const [geoLoading, setGeoLoading] = useState(false)
  const [geoError, setGeoError] = useState<string | null>(null)
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null)
  const [ageClassification, setAgeClassification] = useState<HuntAgeClassification | "all">("all")

  // Pull-to-refresh state
  const [pullDistance, setPullDistance] = useState(0)
  const [isPulling, setIsPulling] = useState(false)
  const touchStartRef = useRef(0)
  const feedContainerRef = useRef<HTMLDivElement | null>(null)

  // ─── Infinite Query ────────────────────────────────────────────────────

  const {
    data: infiniteData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingHunts,
    refetch,
  } = useInfiniteQuery({
    queryKey: [...queryKeys.hunts.feed(activeCategory), ageClassification],
    queryFn: async ({ pageParam }) => {
      const cursorVal = pageParam !== null ? String(pageParam) : ""

      // The "following" filter scopes the feed to creators the current player
      // follows. It is not a server-side category, so we request the "new"
      // category and pass the follower wallet via `following`.
      const effectiveCategory = activeCategory === "following" ? "new" : activeCategory

      // For the "nearby" category, pass coordinates if available
      let url = `/api/v1/hunts?limit=${FEED_PAGE_SIZE}&cursor=${cursorVal}&status=Active&category=${effectiveCategory}&sortBy=newest&ageClassification=${ageClassification}`

      if (activeCategory === "following") {
        const session = getStoredSession()
        const followerWallet = session?.publicKey
        if (!followerWallet) {
          return {
            data: [] as StoredHunt[],
            pagination: { total: 0, limit: FEED_PAGE_SIZE, cursor: null, nextCursor: null },
            category: activeCategory,
          }
        }
        url += `&following=${encodeURIComponent(followerWallet)}`
      }

      // Try to include geolocation for nearby
      if (activeCategory === "nearby") {
        try {
          const pos = await requestLocationPermission()
          if (pos) {
            url += `&lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`
          }
        } catch {
          // Silently fall back to non-geo results
        }
      }

      const res = await fetch(url)
      if (!res.ok) {
        throw new Error("Failed to fetch hunt feed")
      }
      return res.json() as Promise<{
        data: StoredHunt[]
        pagination: {
          total: number
          limit: number
          cursor: number | null
          nextCursor: number | null
        }
        category: string
      }>
    },
    initialPageParam: null as number | null,
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor,
    staleTime: queryCachePolicy.hunts.staleTime,
    gcTime: queryCachePolicy.hunts.gcTime,
  })

  // ─── Pull-to-refresh ───────────────────────────────────────────────────

  const { isRefreshing, onRefresh } = useRefreshByUser(async () => {
    await refetch()
  })

  // ─── Touch handlers for pull-to-refresh ─────────────────────────────────

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (feedContainerRef.current && feedContainerRef.current.scrollTop <= 0) {
      touchStartRef.current = e.touches[0]?.clientY ?? 0
      setIsPulling(true)
    }
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling || isRefreshing) return
    const currentY = e.touches[0]?.clientY ?? 0
    const diff = currentY - touchStartRef.current
    if (diff > 0) {
      // Apply damping to make it feel more natural
      setPullDistance(Math.min(diff * 0.5, PULL_REFRESH_THRESHOLD_PX * 1.5))
    }
  }, [isPulling, isRefreshing])

  const handleTouchEnd = useCallback(() => {
    if (pullDistance >= PULL_REFRESH_THRESHOLD_PX && !isRefreshing) {
      onRefresh()
    }
    setPullDistance(0)
    setIsPulling(false)
  }, [pullDistance, isRefreshing, onRefresh])

  // ─── Infinite scroll observer ──────────────────────────────────────────

  const loadMoreRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const target = loadMoreRef.current
    if (!target || !hasNextPage || isFetchingNextPage || isRefreshing) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          fetchNextPage()
        }
      },
      { rootMargin: `${SCROLL_THRESHOLD_PX}px` }
    )

    observer.observe(target)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, isRefreshing])

  // ─── Flatten pages ─────────────────────────────────────────────────────

  const hunts = useMemo(() => {
    if (!infiniteData) return []
    const baseHunts = infiniteData.pages.flatMap((page) => page.data)

    if (activeCategory !== "nearby" || !userLocation) {
      return baseHunts
    }

    return [...baseHunts].sort((a, b) => {
      const distanceA = getHuntDistanceMeters(a, userLocation)
      const distanceB = getHuntDistanceMeters(b, userLocation)

      if (typeof distanceA !== "number" && typeof distanceB !== "number") return 0
      if (typeof distanceA !== "number") return 1
      if (typeof distanceB !== "number") return -1
      return distanceA - distanceB
    })
  }, [activeCategory, infiniteData, userLocation])

  const totalResults = useMemo(() => {
    return infiniteData?.pages[0]?.pagination.total ?? 0
  }, [infiniteData])

  // ─── Category change handler ───────────────────────────────────────────

  const handleCategoryChange = useCallback(
    (category: HuntFeedCategory) => {
      setActiveCategory(category)
      onCategoryChange?.(category)
      // Reset scroll position
      if (feedContainerRef.current) {
        feedContainerRef.current.scrollTop = 0
      }
      window.scrollTo({ top: 0, behavior: "instant" })

      // Trigger geolocation for nearby tab
      if (category === "nearby") {
        setGeoLoading(true)
        setGeoError(null)
        requestLocationPermission()
          .then((pos) => {
            if (pos) {
              setUserLocation({
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
              })
            } else {
              setUserLocation(null)
            }
            if (!pos) {
              setGeoError("Location access denied. Showing recent hunts instead.")
            }
            setGeoLoading(false)
          })
          .catch(() => {
            setUserLocation(null)
            setGeoError("Unable to get location. Showing recent hunts instead.")
            setGeoLoading(false)
          })
      }
    },
    [onCategoryChange]
  )

  // ─── Active category info ──────────────────────────────────────────────

  const activeCategoryInfo = CATEGORIES.find(
    (cat) => cat.key === activeCategory
  )
  const emptyState = CATEGORY_EMPTY[activeCategory]

  // ─── Grid classes ──────────────────────────────────────────────────────

  const gridClasses = useMemo(() => buildGridClasses(gridColumns), [gridColumns])

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <section
      aria-label="Hunt Feed"
      className={cn("w-full", className)}
    >
      {/* Header with category tabs */}
      {showHeader && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Compass className="w-5 h-5 text-[#3737A4]" />
              <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100">
                Discover Hunts
              </h2>
            </div>
            {totalResults > 0 && (
              <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
                {totalResults} hunt{totalResults === 1 ? "" : "s"}
              </p>
            )}
          </div>

          {/* Category Tabs */}
          <div
            className="flex gap-1 overflow-x-auto pb-2 -mx-1 px-1 [&::-webkit-scrollbar]:hidden"
            role="tablist"
            aria-label="Hunt categories"
          >
            {CATEGORIES.map((category) => {
              const isActive = activeCategory === category.key
              return (
                <button
                  key={category.key}
                  role="tab"
                  aria-selected={isActive}
                  aria-label={category.description}
                  onClick={() => handleCategoryChange(category.key)}
                  disabled={category.key === "nearby" && geoLoading}
                  className={cn(
                    "flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 whitespace-nowrap",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3737A4] focus-visible:ring-offset-2",
                    isActive
                      ? "bg-[#3737A4] text-white shadow-md shadow-[#3737A4]/20"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-200",
                    category.key === "nearby" && geoLoading && "opacity-50 cursor-wait"
                  )}
                >
                  {category.icon}
                  <span>{category.label}</span>
                </button>
              )
            })}
          </div>

          {/* Active category description */}
          {activeCategoryInfo && (
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 px-1">
              {activeCategoryInfo.description}
            </p>
          )}

          <label className="mt-3 flex items-center gap-2 px-1 text-xs text-slate-500 dark:text-slate-400">
            <span>Age suitability</span>
            <select
              value={ageClassification}
              onChange={(event) =>
                setAgeClassification(event.target.value as HuntAgeClassification | "all")
              }
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              aria-label="Filter hunts by age suitability"
            >
              <option value="all">Any</option>
              <option value="all-ages">All ages</option>
              <option value="13-plus">13+</option>
              <option value="16-plus">16+</option>
              <option value="18-plus">18+</option>
            </select>
          </label>

          {/* Geo error message */}
          {geoError && (
            <p className="mt-2 text-xs text-amber-600 dark:text-amber-400 px-1">
              {geoError}
            </p>
          )}
        </div>
      )}

      {/* Feed content */}
      <div
        ref={feedContainerRef}
        className="relative"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Pull-to-refresh indicator */}
        <PullToRefreshIndicator
          refreshing={isRefreshing}
          pullDistance={pullDistance}
        />

        {/* Loading state */}
        {isLoadingHunts && !isRefreshing ? (
          <HuntFeedCardGridSkeleton count={FEED_PAGE_SIZE} />
        ) : hunts.length === 0 ? (
          /* Empty state */
          <EmptyState
            icon={emptyState.icon}
            title={emptyState.title}
            description={emptyState.description}
            action={{
              label: "Browse all hunts",
              onPress: () => window.location.href = "/",
            }}
          />
        ) : (
          <>
            {/* Hunt grid */}
            <div className={cn("grid gap-4 md:gap-6", gridClasses)}>
              {hunts.map((hunt) => (
                <HuntFeedCard
                  key={`${activeCategory}-${hunt.id}`}
                  hunt={hunt}
                  distanceMeters={getHuntDistanceMeters(hunt, userLocation)}
                />
              ))}
            </div>

            {/* Loading more indicator */}
            <div ref={loadMoreRef} className="w-full">
              {isFetchingNextPage && (
                <div className="mt-6">
                  <HuntFeedCardGridSkeleton count={3} />
                </div>
              )}
            </div>

            {/* End of results marker */}
            {!hasNextPage && hunts.length > 0 && (
              <div className="mt-8 text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 dark:bg-slate-800 text-xs text-slate-500 dark:text-slate-400">
                  <Search className="w-3.5 h-3.5" />
                  You&apos;ve reached the end
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  )
}
