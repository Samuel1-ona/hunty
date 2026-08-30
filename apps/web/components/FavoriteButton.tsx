'use client';

import React from 'react';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFavorites } from '@/hooks/useFavorites';

interface FavoriteButtonProps {
  huntId: number;
  className?: string;
  iconClassName?: string;
}

export function FavoriteButton({ huntId, className, iconClassName }: FavoriteButtonProps) {
  const { isFavorite, toggleFavorite, isLoaded } = useFavorites();

  if (!isLoaded) return null;

  const favorited = isFavorite(huntId);

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleFavorite(huntId);
      }}
      className={cn(
        'flex items-center justify-center rounded-full p-1.5 transition-all active:scale-90',
        favorited
          ? 'bg-pink-100 dark:bg-pink-900/30 text-pink-500 dark:text-pink-400'
          : 'bg-white/80 dark:bg-slate-800/80 text-slate-400 hover:text-pink-400 backdrop-blur-sm shadow-sm',
        className
      )}
      aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
      title={favorited ? 'Remove from favorites' : 'Add to favorites'}
    >
      <Heart
        className={cn('w-4 h-4 transition-transform', favorited && 'fill-current', iconClassName)}
      />
    </button>
  );
}
