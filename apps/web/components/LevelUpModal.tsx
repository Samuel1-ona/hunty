'use client';

import confetti from 'canvas-confetti';
import { useReducedMotion } from 'framer-motion';
import { useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getLevelTierForXp } from '@/lib/level';
import type { LevelTier } from '@/lib/level/config';

interface LevelUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  oldLevel: number;
  newLevel: number;
  oldTier: LevelTier;
  newTier: LevelTier;
}

export function LevelUpModal({
  isOpen,
  onClose,
  oldLevel,
  newLevel,
  oldTier,
  newTier,
}: LevelUpModalProps) {
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (isOpen && !prefersReducedMotion) {
      confetti({
        particleCount: 200,
        spread: 90,
        origin: { y: 0.5 },
        colors: ['#FFD700', '#FFA500', '#FF69B4', '#00CED1'],
      });
    }
  }, [isOpen, prefersReducedMotion]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md text-center">
        <DialogHeader>
          <DialogTitle className="bg-gradient-to-br from-yellow-400 to-orange-500 bg-clip-text text-transparent text-3xl font-bold mb-4">
            🎉 Level Up!
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <div className="flex items-center justify-center gap-4">
            <div className="flex flex-col items-center p-4 rounded-xl bg-slate-100 dark:bg-slate-800">
              <span className="text-4xl">{oldTier.icon}</span>
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400 mt-1">
                Lvl {oldLevel}
              </span>
              <span className="text-xs text-slate-500">{oldTier.title}</span>
            </div>
            <div className="text-4xl text-slate-400">→</div>
            <div className="flex flex-col items-center p-4 rounded-xl bg-gradient-to-br from-yellow-100 to-orange-100 dark:from-yellow-900/30 dark:to-orange-900/30 border-2 border-yellow-300 dark:border-yellow-700">
              <span className="text-4xl">{newTier.icon}</span>
              <span className="text-sm font-bold text-yellow-800 dark:text-yellow-200 mt-1">
                Lvl {newLevel}
              </span>
              <span className="text-xs text-yellow-700 dark:text-yellow-300 font-medium">
                {newTier.title}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border border-yellow-200 dark:border-yellow-800">
            <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-200 mb-2">
              New Benefits Unlocked!
            </p>
            <ul className="text-sm text-yellow-800 dark:text-yellow-300 space-y-1">
              {newTier.benefits.map((benefit, index) => (
                <li key={index} className="flex items-center gap-2">
                  <span className="text-yellow-500">✓</span>
                  {benefit}
                </li>
              ))}
            </ul>
          </div>

          <Button
            onClick={onClose}
            className="w-full bg-gradient-to-br from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white font-bold rounded-xl"
          >
            Continue
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
