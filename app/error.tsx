"use client"

import { useEffect } from "react"
import Link from "next/link"
import { logger } from "@/lib/logger"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    logger.error("[ErrorBoundary] Unhandled error:", error)
  }, [error])

  return (
    <div className="min-h-screen bg-[#0b0c10] text-white pb-24 flex items-center justify-center">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/3 w-150 h-100 bg-violet-700/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-100p h-75 bg-indigo-600/15 rounded-full blur-[100px]" />
      </div>

      <main className="relative max-w-xl mx-auto px-6 text-center">
        <h1 className="text-6xl font-extrabold mb-4">500</h1>
        <p className="text-zinc-400 text-lg mb-4">Something went wrong</p>
        <p className="text-zinc-500 text-sm mb-8 max-w-md mx-auto">
          An unexpected error occurred. Our team has been notified.
          {error.digest && (
            <span className="block mt-2 font-mono text-xs text-zinc-600">
              Error ID: {error.digest}
            </span>
          )}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-black font-semibold px-5 py-3 rounded-md transition-colors"
          >
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
          >
            Return to Game Arcade
          </Link>
        </div>
      </main>
    </div>
  )
}
