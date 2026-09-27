"use client"

import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { usePathname } from "next/navigation"
import { type ReactNode, useEffect } from "react"

/**
 * Wraps every page in an AnimatePresence boundary so route changes
 * produce a smooth fade + slight upward slide transition.
 *
 * Reduced-motion: when the OS "prefers-reduced-motion" flag is set
 * the component still mounts/unmounts correctly but uses an instant
 * opacity-only transition (no layout shift).
 */
export function PageTransitionWrapper({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const shouldReduceMotion = useReducedMotion()

  // Reset scroll to top on every route change so the incoming page
  // always starts at the top — prevents a perceived layout shift where
  // the new page appears mid-scroll from the previous route.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" })
  }, [pathname])

  const variants = {
    initial: shouldReduceMotion
      ? { opacity: 0 }
      : { opacity: 0, y: 12 },
    animate: shouldReduceMotion
      ? { opacity: 1, transition: { duration: 0.15 } }
      : { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.25, 0.1, 0.25, 1] } },
    exit: shouldReduceMotion
      ? { opacity: 0, transition: { duration: 0.1 } }
      : { opacity: 0, y: -8, transition: { duration: 0.18, ease: [0.25, 0.1, 0.25, 1] } },
  }

  return (
    // mode="wait" ensures the exit animation completes before the next
    // page enters — avoids two pages overlapping in the DOM.
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        data-page-transition          // ← activates will-change hint in globals.css
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
        style={{ minHeight: "inherit" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
