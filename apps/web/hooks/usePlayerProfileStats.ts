'use client';

import { useEffect, useMemo, useState } from 'react';

import { getAllHunts } from '@/lib/huntStore';
import { logger } from '@/lib/logger';
import {
  emptyProfileStats,
  getPlayerProfileSummary,
  type PlayerHuntCompletion,
  type PlayerProfileStats,
} from '@/lib/playerProfileStats';

export interface UsePlayerProfileStatsResult {
  stats: PlayerProfileStats;
  timeline: PlayerHuntCompletion[];
  isLoading: boolean;
  error: string | null;
}

/**
 * Loads a player's aggregated profile statistics and hunt completion timeline
 * from on-chain leaderboard data.
 *
 * Works for any address, so it powers both the connected player's own profile
 * and the public `/profile/[address]` view. Passing an empty address simply
 * yields empty stats without issuing any reads.
 */
export function usePlayerProfileStats(
  address: string | null | undefined
): UsePlayerProfileStatsResult {
  const [stats, setStats] = useState<PlayerProfileStats>(emptyProfileStats);
  const [timeline, setTimeline] = useState<PlayerHuntCompletion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalisedAddress = useMemo(() => address?.trim() ?? '', [address]);

  useEffect(() => {
    if (!normalisedAddress) {
      setStats(emptyProfileStats());
      setTimeline([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    const load = async () => {
      try {
        // Hunts are read from the local store; leaderboards for each of them
        // are then fetched from the contract layer.
        const hunts = getAllHunts();
        const summary = await getPlayerProfileSummary(normalisedAddress, hunts);

        if (cancelled) return;
        setStats(summary.stats);
        setTimeline(summary.timeline);
      } catch (err) {
        logger.error('Failed to load player profile stats:', err);
        if (cancelled) return;
        setStats(emptyProfileStats());
        setTimeline([]);
        setError(err instanceof Error ? err.message : 'Failed to load profile statistics.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [normalisedAddress]);

  return { stats, timeline, isLoading, error };
}
