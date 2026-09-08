/**
 * Centralized TanStack Query keys for all application data fetching.
 *
 * Client-side components should use the hooks in lib/hooks/useHuntContract.ts
 * which leverage these keys with proper caching policies.
 *
 * NOTE: Server-side code (API routes, server components) cannot use TanStack Query
 * hooks and must call contract helpers directly from lib/contracts/hunt.ts.
 * This is acceptable because server-side calls are not subject to the same
 * duplicate request issues as client-side React components.
 */
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
  paymaster: {
    budget: (address: string | undefined) =>
      ["paymaster", "budget", address || "anonymous"] as const,
  },
  contract: {
    read: (contractId: string, method: string, args: unknown[] = []) =>
      ["contract", "read", contractId, method, ...args] as const,
  },
  hunt: {
    info: (huntId: number) => ["hunt", "info", huntId] as const,
    clue: (huntId: number, clueId: number) => ["hunt", "clue", huntId, clueId] as const,
    leaderboard: (huntId: number) => ["hunt", "leaderboard", huntId] as const,
    leaderboardPaginated: (huntId: number, page: number, limit: number) =>
      ["hunt", "leaderboard", huntId, "paginated", page, limit] as const,
    fastestPlayers: (huntId: number) => ["hunt", "fastestPlayers", huntId] as const,
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
  /**
   * Sponsorship budget changes only when the player actually submits a
   * sponsored transaction, so this can poll less aggressively than the wallet
   * balance while still catching quota changes made by an admin.
   */
  paymasterBudget: {
    staleTime: 20 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchInterval: 60 * 1000,
  },
  /**
   * Contract reads are cached to avoid redundant RPC calls. Hunt metadata and
   * clues don't change frequently, so we use a longer staleTime. Leaderboard
   * data changes more often during active hunts, so it has a shorter staleTime.
   */
  contractRead: {
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  },
  huntInfo: {
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  },
  huntClue: {
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  },
  huntLeaderboard: {
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  },
  huntFastestPlayers: {
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  },
} as const
