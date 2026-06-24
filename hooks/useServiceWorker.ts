'use client';

import { useEffect, useState } from 'react';

interface SWState {
  /** True once the SW is active and controlling the page */
  ready: boolean;
  /** True when a new SW version has been installed and is waiting */
  updateAvailable: boolean;
  /** Call to activate the waiting SW and reload */
  applyUpdate: () => void;
}

export function useServiceWorker(): SWState {
  const [ready, setReady] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');

        if (registration.active) setReady(true);

        // A new SW installed and waiting
        if (registration.waiting) {
          setWaitingWorker(registration.waiting);
          setUpdateAvailable(true);
        }

        registration.addEventListener('updatefound', () => {
          const installing = registration.installing;
          if (!installing) return;
          installing.addEventListener('statechange', () => {
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              setWaitingWorker(installing);
              setUpdateAvailable(true);
            }
            if (installing.state === 'activated') setReady(true);
          });
        });

        // SW activated notification from the SW itself
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data?.type === 'SW_UPDATED') {
            setReady(true);
            setUpdateAvailable(false);
          }
        });
      } catch (err) {
        console.error('[SW] Registration failed:', err);
      }
    };

    register();
  }, []);

  const applyUpdate = () => {
    if (!waitingWorker) return;
    waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    window.location.reload();
  };

  return { ready, updateAvailable, applyUpdate };
}
