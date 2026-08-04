export const queryKeys = {
  hunts: {
    active: () => ["hunts", "active"] as const,
    featured: () => ["hunts", "featured"] as const,
    detail: (huntId: number | string) => ["hunts", "detail", String(huntId)] as const,
    clues: (huntId: number | null | undefined) => ["hunts", "clues", huntId ?? "unknown"] as const,
    feed: (category: string) => ["hunts", "feed", category] as const,
  },
  registration: {
    status: (huntId: number | undefined, playerAddress: string | undefined) =>
      ["registration", "status", huntId ?? "unknown", playerAddress ?? "anonymous"] as const,
  },
  wallet: {
    balance: (address: string | undefined) =>
      ["wallet", "balance", address || "anonymous"] as const,
    nftCount: (address: string | undefined) =>
      ["wallet", "nftCount", address || "anonymous"] as const,
  },
} as const

export const queryCachePolicy = {
  hunts: {
    staleTime: 2 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchInterval: 90 * 1000,
  },
  featuredHunts: {
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchInterval: 2 * 60 * 1000,
  },
  registrationStatus: {
    staleTime: 30 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchInterval: 45 * 1000,
  },
  /**
   * The wallet balance polls on a 30s cadence. `staleTime` sits below that so a
   * remount or window focus between ticks fetches fresh data rather than
   * serving a value that is nearly a full poll old.
   */
  walletBalance: {
    staleTime: 15 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchInterval: 30 * 1000,
  },
} as const
