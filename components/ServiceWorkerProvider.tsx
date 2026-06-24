'use client';

import { useServiceWorker } from '@/hooks/useServiceWorker';

export function ServiceWorkerProvider() {
  const { updateAvailable, applyUpdate } = useServiceWorker();

  if (!updateAvailable) return null;

  return (
    <div
      role="alert"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-lg bg-emerald-500 px-4 py-3 text-black shadow-lg"
    >
      <span className="text-sm font-medium">A new version of Hunty is available.</span>
      <button
        onClick={applyUpdate}
        className="rounded bg-black/15 px-3 py-1 text-sm font-semibold hover:bg-black/25"
      >
        Update now
      </button>
    </div>
  );
}
