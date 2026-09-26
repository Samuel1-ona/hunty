"use client"

import { createContext, type ReactNode, useContext, useEffect, useMemo } from "react"

import { useFeatureFlagStore } from "@/lib/config/feature-flag-store"
import type { FeatureFlagKey as FFKey, FeatureFlagMap } from "@/lib/config/feature-flags"

interface FeatureFlagContextValue {
  flags: FeatureFlagMap
  isEnabled: (key: FFKey) => boolean
  getFlag: <K extends FFKey>(key: K) => FeatureFlagMap[K]
}

const FeatureFlagContext = createContext<FeatureFlagContextValue | null>(null)

export function FeatureFlagProvider({ children }: { children: ReactNode }) {
  const initialized = useFeatureFlagStore((s) => s.initialized)
  const flags = useFeatureFlagStore((s) => s.flags)
  const init = useFeatureFlagStore((s) => s.init)
  const isEnabled = useFeatureFlagStore((s) => s.isEnabled)
  const getFlag = useFeatureFlagStore((s) => s.getFlag)

  useEffect(() => {
    init()
  }, [init])

  const value = useMemo<FeatureFlagContextValue>(
    () => ({ flags, isEnabled, getFlag }),
    [flags, isEnabled, getFlag],
  )

  if (!initialized) {
    return <>{children}</>
  }

  return <FeatureFlagContext.Provider value={value}>{children}</FeatureFlagContext.Provider>
}

export function useFeatureFlagContext(): FeatureFlagContextValue {
  const ctx = useContext(FeatureFlagContext)
  if (ctx == null) {
    throw new Error("useFeatureFlagContext must be used within a FeatureFlagProvider")
  }
  return ctx
}
