"use client"

import { type ReactNode } from "react"
import { ErrorBoundary } from "@/components/ErrorBoundary"

interface ComponentErrorBoundaryProps {
  children: ReactNode
  /** Name shown in the fallback UI and used for logging. */
  componentName: string
  /** Optional smaller fallback for inline use. */
  compact?: boolean
  /** Called when the boundary catches an error. */
  onError?: (error: Error) => void
}

function CompactFallback({
  componentName,
  reset,
}: {
  componentName: string
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center p-6 text-center rounded-xl border border-dashed border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/50">
      <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-3">
        <svg
          className="w-5 h-5 text-amber-600 dark:text-amber-400"
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
      <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
        {componentName} failed to load
      </p>
      <button
        onClick={reset}
        className="text-xs text-[#3737A4] dark:text-indigo-400 hover:underline mt-1"
      >
        Retry
      </button>
    </div>
  )
}

function FullFallback({
  componentName,
  reset,
}: {
  componentName: string
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[200px] p-8 text-center">
      <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-4">
        <svg
          className="w-7 h-7 text-amber-600 dark:text-amber-400"
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
      <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-1">
        {componentName} unavailable
      </h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 max-w-sm">
        This section encountered an error. You can retry or continue using the
        rest of the page.
      </p>
      <button
        onClick={reset}
        className="inline-flex items-center gap-2 bg-[#3737A4] hover:bg-[#2a2a8a] text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors"
      >
        Retry
      </button>
    </div>
  )
}

/**
 * Component-level error boundary for feature sections like hunt cards,
 * forms, leaderboard tables, etc.
 *
 * Catches rendering errors inside the wrapped subtree and displays a
 * contextual fallback without taking down the entire page.
 */
export function ComponentErrorBoundary({
  children,
  componentName,
  compact = false,
  onError,
}: ComponentErrorBoundaryProps) {
  return (
    <ErrorBoundary
      boundaryName={`Component:${componentName}`}
      onError={onError}
      fallbackRender={({ error, reset }) =>
        compact ? (
          <CompactFallback componentName={componentName} reset={reset} />
        ) : (
          <FullFallback componentName={componentName} reset={reset} />
        )
      }
    >
      {children}
    </ErrorBoundary>
  )
}
