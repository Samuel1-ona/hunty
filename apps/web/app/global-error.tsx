"use client"

import { useEffect } from "react"

import { logger } from "@/lib/logger"
import { captureException } from "@/lib/errorTracking"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    logger.error("[GlobalError] Fatal error:", error)
    captureException(error, { digest: error.digest, boundary: 'GlobalError' })
  }, [error])

  return (
    <html lang="en">
      <body className="bg-[#0b0c10] text-white">
        <div className="min-h-screen flex items-center justify-center p-8">
          <div className="max-w-md text-center" role="alert">
            <div className="w-20 h-20 rounded-full bg-red-900/30 flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-10 h-10 text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                />
              </svg>
            </div>
            <h1 className="text-5xl font-extrabold mb-3">500</h1>
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
              className="bg-emerald-500 hover:bg-emerald-600 text-black font-semibold px-6 py-3 rounded-md transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
