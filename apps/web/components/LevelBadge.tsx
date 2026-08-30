'use client';

import React from 'react';

import { getLevelTierForXp, getPlayerLevel, getXpProgress } from '@/lib/level';
import { cn } from '@/lib/utils';

interface LevelBadgeProps {
  playerAddress?: string;
  xp?: number;
  className?: string;
}

export function LevelBadge({ playerAddress, xp, className }: LevelBadgeProps) {
  const levelData = playerAddress ? getPlayerLevel(playerAddress) : null;
  const displayXp = xp ?? levelData?.totalXp ?? 0;
  const tier = getLevelTierForXp(displayXp);

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r text-white text-sm font-medium shadow-sm',
        tier.color,
        className
      )}
    >
      <span className="text-lg">{tier.icon}</span>
      <span>Lvl {tier.level}</span>
      <span className="text-white/80">•</span>
      <span>{tier.title}</span>
    </div>
  );
}

interface LevelProgressProps {
  playerAddress: string;
  className?: string;
}

export function LevelProgress({ playerAddress, className }: LevelProgressProps) {
  const levelData = getPlayerLevel(playerAddress);
  const tier = getLevelTierForXp(levelData.totalXp);
  const progressData = getXpProgress(levelData.totalXp);

  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Level {tier.level} - {tier.title}
        </span>
        <span className="text-sm text-slate-500 dark:text-slate-400">
          {progressData.current} / {progressData.required} XP
        </span>
      </div>
      <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className={cn('h-full bg-gradient-to-r transition-all duration-500', tier.color)}
          style={{ width: `${progressData.percentage}%` }}
        />
      </div>
    </div>
  );
}
