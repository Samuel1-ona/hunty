"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * Generic full-page loading skeleton shown by the root Suspense boundary
 * while a route segment is streaming in.
 *
 * Matches the site's colour palette and avoids layout shift by reserving
 * a full viewport height.  Pulse animation is disabled when the user
 * prefers reduced motion.
 */
export function PageSkeleton() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      role="status"
      aria-label="Loading page…"
      initial={shouldReduceMotion ? false : { opacity: 0 }}
      animate={
        shouldReduceMotion ? {} : { opacity: 1, transition: { duration: 0.2 } }
      }
      className="min-h-screen bg-gradient-to-tr from-blue-100 via-purple-50 to-[#f9f9ff] dark:from-slate-900 dark:via-slate-900 dark:to-slate-800"
    >
      {/* Simulated header bar */}
      <div className="max-w-[1600px] mx-auto px-14 pt-8 pb-6 flex items-center justify-between">
        <div
          className={`h-8 w-24 rounded-xl bg-slate-200 dark:bg-slate-700 ${
            shouldReduceMotion ? "" : "animate-pulse"
          }`}
        />
        <div
          className={`h-8 w-32 rounded-xl bg-slate-200 dark:bg-slate-700 ${
            shouldReduceMotion ? "" : "animate-pulse"
          }`}
        />
      </div>

      {/* Content area */}
      <div className="max-w-[1600px] mx-auto px-14 pt-8 space-y-6">
        {/* Hero block */}
        <div
          className={`h-52 w-full rounded-3xl bg-slate-200 dark:bg-slate-700/60 ${
            shouldReduceMotion ? "" : "animate-pulse"
          }`}
        />

        {/* Card grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pt-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className={`h-64 rounded-2xl bg-slate-200 dark:bg-slate-700/60 ${
                shouldReduceMotion ? "" : "animate-pulse"
              }`}
              style={
                shouldReduceMotion ? {} : { animationDelay: `${i * 60}ms` }
              }
            />
          ))}
        </div>
      </div>

      {/* Screen-reader only live region */}
      <span className="sr-only" aria-live="polite">
        Loading, please wait…
      </span>
    </motion.div>
  );
}
