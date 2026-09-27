export const queryKeys = {
  hunts: {
    active: () => ["hunts", "active"] as const,
    featured: () => ["hunts", "featured"] as const,
    detail: (huntId: number | string) => ["hunts", "detail", String(huntId)] as const,
    clues: (huntId: number | null | undefined) => ["hunts", "clues", huntId ?? "unknown"] as const,
  },
  registration: {
    status: (huntId: number | undefined, playerAddress: string | undefined) =>
      ["registration", "status", huntId ?? "unknown", playerAddress ?? "anonymous"] as const,
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
} as const
