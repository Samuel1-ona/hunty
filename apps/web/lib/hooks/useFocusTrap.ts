"use client"

import { useEffect, useRef, type RefObject } from "react"

/**
 * Focusable element selector.
 *
 * Excludes disabled elements and anything explicitly hidden from assistive tech
 * (aria-hidden on the element itself). Buttons, links with href, form controls,
 * [tabindex] elements, contenteditable regions, and media with controls are all
 * considered focusable per the WAI-ARIA Authoring Practices.
 */
const FOCUSABLE_SELECTOR = [
  'a[href]:not([tabindex="-1"])',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  'audio[controls]',
  'video[controls]',
  '[contenteditable]:not([contenteditable="false"])',
].join(",")

export interface UseFocusTrapOptions {
  /** When false, the trap is set up but no auto-focus happens on mount. Default: true. */
  autoFocus?: boolean
  /** When false, the previously-focused element is not restored on close. Default: true. */
  restoreFocus?: boolean
}

export type FocusTrapRef<T extends HTMLElement> = RefObject<T | null>

/**
 * Traps Tab focus within `containerRef` while `active` is true and restores
 * focus to the element that was focused before the trap was activated.
 *
 * Used by overlays (modals, menus, drawers) to satisfy WCAG 2.4.3 (Focus Order)
 * and 2.4.7 (Focus Visible) without each component having to re-implement it.
 *
 * `options` are read through refs so toggling them mid-flight does not tear
 * down the active trap (which would otherwise spuriously restore focus).
 *
 * Returns the ref to attach to the container element.
 */
export function useFocusTrap<T extends HTMLElement = HTMLDivElement>(
  active: boolean,
  options: UseFocusTrapOptions = {}
): FocusTrapRef<T> {
  const containerRef = useRef<T | null>(null)
  const previouslyFocusedRef = useRef<HTMLElement | null>(null)

  // Cheap, synchronous mutation of refs during render keeps the active trap
  // stable (no `useEffect` with empty-deps and no spurious teardown).
  const autoFocusRef = useRef(options.autoFocus ?? true)
  const restoreFocusRef = useRef(options.restoreFocus ?? true)
  autoFocusRef.current = options.autoFocus ?? true
  restoreFocusRef.current = options.restoreFocus ?? true

  useEffect(() => {
    if (!active) return

    // Capture the element that had focus before the trap activated so we can
    // restore it on close. Skipped when `restoreFocus` is false.
    if (restoreFocusRef.current && typeof document !== "undefined") {
      previouslyFocusedRef.current = document.activeElement as HTMLElement | null
    }

    const container = containerRef.current
    if (!container) return

    const getFocusable = (): HTMLElement[] => {
      const nodes = Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      )
      // Filter out elements that are aria-hidden themselves, and any element
      // whose closest ancestor is aria-hidden (it's not reachable for AT users).
      return nodes.filter((el) => {
        if (el.getAttribute("aria-hidden") === "true") return false
        let parent: HTMLElement | null = el.parentElement
        while (parent && parent !== container) {
          if (parent.getAttribute("aria-hidden") === "true") return false
          parent = parent.parentElement
        }
        // Also skip visually-hidden via inline style — focusable but not visible.
        const style = window.getComputedStyle(el)
        if (style.visibility === "hidden" || style.display === "none") return false
        return true
      })
    }

    if (autoFocusRef.current) {
      const focusable = getFocusable()
      if (focusable.length > 0) {
        focusable[0].focus()
      } else {
        // No focusable child — make the container itself focusable so screen
        // readers still announce it.
        if (!container.hasAttribute("tabindex")) {
          container.setAttribute("tabindex", "-1")
        }
        container.focus()
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return
      const focusable = getFocusable()
      if (focusable.length === 0) {
        event.preventDefault()
        container.focus()
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const activeEl = document.activeElement as HTMLElement | null
      const isInside = activeEl && container.contains(activeEl)
      if (event.shiftKey) {
        if (!isInside || activeEl === first) {
          event.preventDefault()
          last.focus()
        }
      } else {
        if (!isInside || activeEl === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown, true)
    return () => {
      document.removeEventListener("keydown", handleKeyDown, true)
      if (restoreFocusRef.current) {
        const prev = previouslyFocusedRef.current
        // Only restore if the previous trigger is still in the document — an
        // unmounted parent would otherwise throw trying to focus a detached node.
        if (prev && document.body.contains(prev)) {
          prev.focus()
        }
      }
    }
  }, [active])

  return containerRef
}
