"use client"

import * as Sentry from "@sentry/nextjs"
import { Component, type ErrorInfo, type ReactNode } from "react"

import { logger } from "@/lib/logger"

type FallbackRenderProps = {
  error: Error
  reset: () => void
}

type Props = {
  children: ReactNode
  fallback?: ReactNode
  fallbackRender?: (props: FallbackRenderProps) => ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  /** A label used in logs to identify which boundary caught the error. */
  boundaryName?: string
}

type State = {
  hasError: boolean
  error: Error | null
}

/**
 * Base error boundary with Sentry-ready error reporting.
 *
 * Wrap any subtree to catch rendering errors and display a graceful
 * fallback. The `onError` callback is Sentry-ready: pass
 * `(err) => Sentry.captureException(err)` to wire up reporting.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const label = this.props.boundaryName ?? "ErrorBoundary"
    logger.error(`[${label}] Caught error:`, error, errorInfo)
    // Report to Sentry with the boundary name as a tag for easy filtering.
    Sentry.captureException(error, {
      tags: { boundary: label },
      extra: { componentStack: errorInfo.componentStack },
    })
    this.props.onError?.(error, errorInfo)
  }

  private reset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      const error = this.state.error!

      if (this.props.fallbackRender) {
        return this.props.fallbackRender({ error, reset: this.reset })
      }

      if (this.props.fallback) return this.props.fallback

      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
            <span className="text-2xl" aria-hidden>!</span>
          </div>
          <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-2">
            Something went wrong
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-md">
            An unexpected error occurred in this section. Try refreshing the page.
          </p>
          <button
            onClick={this.reset}
            className="inline-flex items-center gap-2 bg-[#3737A4] hover:bg-[#2a2a8a] text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors"
          >
            Try again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
