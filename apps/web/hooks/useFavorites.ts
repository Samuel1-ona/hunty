'use client';

import { useState, useEffect, useContext, useCallback } from 'react';
import { WalletContext } from '@/lib/context/WalletContext';
import { logger } from '@/lib/logger';

export function useFavorites() {
  const wallet = useContext(WalletContext);
  const publicKey = wallet?.publicKey ?? 'anonymous';
  const storageKey = `favorites_${publicKey}`;

  const [favorites, setFavorites] = useState<number[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load favorites from local storage on mount or when the account changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        setFavorites(JSON.parse(stored));
      } else {
        setFavorites([]);
      }
    } catch (e) {
      logger.error('Failed to parse favorites from local storage', e);
      setFavorites([]);
    } finally {
      setIsLoaded(true);
    }
  }, [storageKey]);

  const toggleFavorite = useCallback(
    (huntId: number) => {
      setFavorites((prev) => {
        let nextFavorites;
        if (prev.includes(huntId)) {
          nextFavorites = prev.filter((id) => id !== huntId);
        } else {
          nextFavorites = [...prev, huntId];
        }

        try {
          localStorage.setItem(storageKey, JSON.stringify(nextFavorites));
        } catch (e) {
          logger.error('Failed to save favorites to local storage', e);
        }

        return nextFavorites;
      });
    },
    [storageKey]
  );

  const isFavorite = useCallback(
    (huntId: number) => {
      return favorites.includes(huntId);
    },
    [favorites]
  );

  return { favorites, toggleFavorite, isFavorite, isLoaded };
}
