'use client';

import type { AchievementId } from '@hunty/types';
import { Pin, PinOff } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ACHIEVEMENTS, RARITY_BORDER_COLORS, RARITY_COLORS } from '@/lib/achievements/config';
import {
  type AchievementProgressStats,
  getAchievementProgress,
  getAllAchievementsWithStatus,
} from '@/lib/achievements/service';
import { logger } from '@/lib/logger';
import { cn } from '@/lib/utils';

interface AchievementShowcaseProps {
  playerAddress: string;
  stats: AchievementProgressStats;
  isOwnProfile?: boolean;
}

const ownerSecretKey = (address: string) =>
  `hunty_achievement_showcase_owner_secret_${address.toLowerCase()}`;

export function AchievementShowcase({
  playerAddress,
  stats,
  isOwnProfile = false,
}: AchievementShowcaseProps) {
  const [achievements, setAchievements] = useState<ReturnType<typeof getAllAchievementsWithStatus>>(
    []
  );
  const [pinned, setPinned] = useState<AchievementId[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const progress = useMemo(
    () =>
      new Map(
        getAchievementProgress(playerAddress, stats).map((item) => [item.achievementId, item])
      ),
    [playerAddress, stats]
  );

  useEffect(() => {
    if (!playerAddress) return;

    const loadAchievements = () => {
      setAchievements(getAllAchievementsWithStatus(playerAddress));
    };
    loadAchievements();
    fetch(`/api/v1/achievements/showcase?address=${encodeURIComponent(playerAddress)}`)
      .then(async (response) =>
        response.ok ? ((await response.json()) as { pinned: AchievementId[] }) : null
      )
      .then((data) => {
        if (data) setPinned(data.pinned);
      })
      .catch((error) => logger.error('Failed to load pinned achievements:', error));
  }, [playerAddress]);

  async function persistPinned(nextPinned: AchievementId[]): Promise<boolean> {
    setIsSaving(true);
    try {
      const ownerSecret = localStorage.getItem(ownerSecretKey(playerAddress)) ?? undefined;
      const response = await fetch('/api/v1/achievements/showcase', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: playerAddress, pinned: nextPinned, ownerSecret }),
      });
      if (!response.ok) return false;

      const data = (await response.json()) as { pinned: AchievementId[]; ownerSecret?: string };
      if (data.ownerSecret) localStorage.setItem(ownerSecretKey(playerAddress), data.ownerSecret);
      setPinned(data.pinned);
      return true;
    } catch (error) {
      logger.error('Failed to save pinned achievements:', error);
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function togglePin(id: AchievementId) {
    const isPinned = pinned.includes(id);
    if (isPinned) {
      await persistPinned(pinned.filter((pinnedId) => pinnedId !== id));
      return;
    }
    const achievement = achievements.find((item) => item.id === id);
    if (!achievement?.earned) return;
    if (pinned.length >= 3) return;
    await persistPinned([...pinned, id]);
  }

  const pinnedAchievements = pinned.map((id) => ACHIEVEMENTS[id]).filter(Boolean);

  return (
    <section aria-label="Achievement showcase" className="mb-10">
      <Card>
        <CardHeader>
          <CardTitle>Achievement Showcase</CardTitle>
          <CardDescription>
            {isOwnProfile
              ? 'Pin up to three earned achievements to your public profile.'
              : 'Highlighted achievements'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {pinnedAchievements.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {pinnedAchievements.map((achievement) => (
                <div
                  key={achievement.id}
                  className={cn(
                    'rounded-xl border-2 bg-gradient-to-br p-4 text-white',
                    RARITY_COLORS[achievement.rarity],
                    RARITY_BORDER_COLORS[achievement.rarity]
                  )}
                >
                  <div className="text-3xl" aria-hidden="true">
                    {achievement.icon}
                  </div>
                  <p className="mt-2 font-semibold">{achievement.title}</p>
                  <p className="text-xs text-white/85">{achievement.condition}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No achievements pinned yet.</p>
          )}

          <div>
            <h3 className="mb-3 font-semibold text-slate-800">All achievements</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <TooltipProvider>
                {achievements.map((achievement) => {
                  const itemProgress = progress.get(achievement.id);
                  const isPinned = pinned.includes(achievement.id);
                  return (
                    <Tooltip key={achievement.id}>
                      <TooltipTrigger asChild>
                        <div
                          className={cn(
                            'relative flex min-h-36 flex-col items-center justify-center rounded-xl border-2 p-3 text-center',
                            achievement.earned
                              ? `bg-gradient-to-br ${RARITY_COLORS[achievement.rarity]} ${RARITY_BORDER_COLORS[achievement.rarity]} text-white`
                              : 'border-slate-300 bg-slate-100 text-slate-500 opacity-70'
                          )}
                        >
                          {isOwnProfile && achievement.earned && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              disabled={isSaving}
                              onClick={() => void togglePin(achievement.id)}
                              className="absolute right-1 top-1 h-7 w-7 text-current hover:bg-white/20 hover:text-current"
                              aria-label={
                                isPinned ? `Unpin ${achievement.title}` : `Pin ${achievement.title}`
                              }
                            >
                              {isPinned ? (
                                <PinOff className="h-3.5 w-3.5" />
                              ) : (
                                <Pin className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          )}
                          <span className="text-3xl" aria-hidden="true">
                            {achievement.icon}
                          </span>
                          <span className="mt-2 text-xs font-semibold">{achievement.title}</span>
                          {achievement.earned ? (
                            <span className="mt-1 text-xs">Earned</span>
                          ) : itemProgress ? (
                            <span className="mt-1 text-xs">
                              {itemProgress.current}/{itemProgress.target}
                            </span>
                          ) : null}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="font-semibold">{achievement.title}</p>
                        <p className="text-sm">{achievement.description}</p>
                        <p className="text-xs text-slate-400">Criteria: {achievement.condition}</p>
                        {itemProgress && (
                          <p className="text-xs text-slate-400">
                            Progress: {itemProgress.current}/{itemProgress.target}
                          </p>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </TooltipProvider>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
