"use client"

import { type ReactNode } from "react"
import { ErrorBoundary } from "@/components/ErrorBoundary"
import { logger } from "@/lib/logger"

function PageErrorFallback({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-tr from-blue-100 via-purple-100 to-[#f9f9ff] dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 flex items-center justify-center p-8">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/3 w-150 h-100 bg-violet-700/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-100p h-75 bg-indigo-600/15 rounded-full blur-[100px]" />
      </div>

      <main className="relative max-w-xl mx-auto px-6 text-center" role="alert">
        <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-10 h-10 text-red-500 dark:text-red-400"
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

        <h1 className="text-4xl font-extrabold text-slate-800 dark:text-white mb-3">
          Page Error
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-8 max-w-md mx-auto">
          This page encountered an unexpected error. You can try reloading it or
          return to the main arcade.
          {error.digest && (
            <span className="block mt-2 font-mono text-xs text-zinc-600 dark:text-zinc-500">
              Error ID: {error.digest}
            </span>
          )}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 bg-[#3737A4] hover:bg-[#2a2a8a] text-white font-semibold px-6 py-3 rounded-lg text-sm transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
            </svg>
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center gap-2 text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-white transition-colors text-sm"
          >
            Return to Game Arcade
          </a>
        </div>
      </main>
    </div>
  )
}

interface PageErrorBoundaryProps {
  children: ReactNode
  /** Optional name for log identification. */
  pageName?: string
}

/**
 * Page-level error boundary.
 * Wraps entire page content; displays a full-page fallback with retry and
 * navigation back to the arcade. Use this in layout files or page components.
 */
export function PageErrorBoundary({ children, pageName }: PageErrorBoundaryProps) {
  return (
    <ErrorBoundary
      boundaryName={pageName ? `PageBoundary:${pageName}` : "PageBoundary"}
      onError={(error, errorInfo) => {
        logger.error("[PageErrorBoundary]", error, errorInfo)
      }}
      fallbackRender={({ error, reset }) => (
        <PageErrorFallback error={error} reset={reset} />
      )}
    >
      {children}
    </ErrorBoundary>
  )
}
