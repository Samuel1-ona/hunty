"use client";

import { useQuery } from "@tanstack/react-query";

import { queryCachePolicy, queryKeys } from "@/lib/queryKeys";
import {
  get_clue_info,
  get_hunt,
  get_hunt_fastest_players,
  get_hunt_leaderboard,
  get_hunt_leaderboard_paginated,
} from "@/lib/contracts/hunt";
import type { ClueInfo } from "@/lib/types/clues";
import type { HuntInfo } from "@/lib/types/hunts";
import type { LeaderboardEntry, FastestPlayerEntry } from "@/lib/types/leaderboard";

/**
 * Cached hook for fetching hunt metadata.
 * Uses TanStack Query with documented staleTime to avoid redundant RPC calls.
 */
export function useHuntInfo(huntId: number | null | undefined) {
  return useQuery<HuntInfo>({
    queryKey: queryKeys.hunt.info(huntId ?? 0),
    queryFn: () => get_hunt(huntId ?? 0),
    enabled: huntId != null,
    staleTime: queryCachePolicy.huntInfo.staleTime,
    gcTime: queryCachePolicy.huntInfo.gcTime,
  });
}

/**
 * Cached hook for fetching clue information.
 * Uses TanStack Query with documented staleTime to avoid redundant RPC calls.
 */
export function useClueInfo(huntId: number | null | undefined, clueId: number | null | undefined) {
  return useQuery<ClueInfo>({
    queryKey: queryKeys.hunt.clue(huntId ?? 0, clueId ?? 0),
    queryFn: () => get_clue_info(huntId ?? 0, clueId ?? 0),
    enabled: huntId != null && clueId != null,
    staleTime: queryCachePolicy.huntClue.staleTime,
    gcTime: queryCachePolicy.huntClue.gcTime,
  });
}

/**
 * Cached hook for fetching hunt leaderboard.
 * Uses TanStack Query with documented staleTime to avoid redundant RPC calls.
 */
export function useHuntLeaderboard(huntId: number | null | undefined) {
  return useQuery<LeaderboardEntry[]>({
    queryKey: queryKeys.hunt.leaderboard(huntId ?? 0),
    queryFn: () => get_hunt_leaderboard(huntId ?? 0),
    enabled: huntId != null,
    staleTime: queryCachePolicy.huntLeaderboard.staleTime,
    gcTime: queryCachePolicy.huntLeaderboard.gcTime,
  });
}

/**
 * Cached hook for fetching paginated hunt leaderboard.
 * Uses TanStack Query with documented staleTime to avoid redundant RPC calls.
 */
export function useHuntLeaderboardPaginated(
  huntId: number | null | undefined,
  page: number = 1,
  limit: number = 20,
  currentUserAddress?: string
) {
  return useQuery<{
    entries: LeaderboardEntry[];
    total: number;
    currentUserRank?: number;
  }>({
    queryKey: queryKeys.hunt.leaderboardPaginated(huntId ?? 0, page, limit),
    queryFn: () => get_hunt_leaderboard_paginated(huntId ?? 0, page, limit, currentUserAddress),
    enabled: huntId != null,
    staleTime: queryCachePolicy.huntLeaderboard.staleTime,
    gcTime: queryCachePolicy.huntLeaderboard.gcTime,
  });
}

/**
 * Cached hook for fetching fastest players.
 * Uses TanStack Query with documented staleTime to avoid redundant RPC calls.
 */
export function useHuntFastestPlayers(huntId: number | null | undefined) {
  return useQuery<FastestPlayerEntry[]>({
    queryKey: queryKeys.hunt.fastestPlayers(huntId ?? 0),
    queryFn: () => get_hunt_fastest_players(huntId ?? 0),
    enabled: huntId != null,
    staleTime: queryCachePolicy.huntFastestPlayers.staleTime,
    gcTime: queryCachePolicy.huntFastestPlayers.gcTime,
  });
}
