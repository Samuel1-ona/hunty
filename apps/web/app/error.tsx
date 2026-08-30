'use client';

import * as Sentry from '@sentry/nextjs';
import Link from 'next/link';
import { useEffect } from 'react';

import { logger } from '@/lib/logger';
import { ErrorState } from '@/components/QueryState';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error('[RouteError] Unhandled error:', error);
    Sentry.captureException(error, {
      tags: { boundary: 'RouteError', digest: error.digest },
    });
  }, [error]);

  const errorMessage = error.digest
    ? `An unexpected error occurred. Our team has been notified. (Error ID: ${error.digest})`
    : 'An unexpected error occurred. Our team has been notified.';

  return (
    <div className="min-h-screen bg-[#0b0c10] text-white pb-24 flex items-center justify-center p-6">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/3 w-150 h-100 bg-violet-700/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-100p h-75 bg-indigo-600/15 rounded-full blur-[100px]" />
      </div>

      <main className="relative w-full max-w-xl mx-auto flex flex-col items-center" role="alert">
        <div className="w-full">
          <ErrorState
            title="500 - Something went wrong"
            description={errorMessage}
            onRetry={reset}
          />
        </div>

        <Link
          href="/"
          className="mt-8 inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
        >
          Return to Game Arcade
        </Link>
      </main>
    </div>
  );
}
