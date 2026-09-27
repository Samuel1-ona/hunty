"use client"

import { useEffect } from "react"
import { logger } from "@/lib/logger"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    logger.error("[GlobalError] Fatal error:", error)
  }, [error])

  return (
    <html lang="en">
      <body className="bg-[#0b0c10] text-white">
        <div className="min-h-screen flex items-center justify-center p-8">
          <div className="max-w-md text-center">
            <h1 className="text-6xl font-extrabold mb-4">500</h1>
            <p className="text-zinc-400 text-lg mb-2">Critical error</p>
            <p className="text-zinc-500 text-sm mb-8">
              The application encountered a critical error. Please try again.
              {error.digest && (
                <span className="block mt-2 font-mono text-xs text-zinc-600">
                  Error ID: {error.digest}
                </span>
              )}
            </p>
            <button
              onClick={reset}
              className="bg-emerald-500 hover:bg-emerald-600 text-black font-semibold px-5 py-3 rounded-md transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
