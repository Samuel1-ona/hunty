"use client"

import { useFeatureFlagContext } from "@/components/FeatureFlagProvider"
import type { FeatureFlagKey, FeatureFlagMap } from "@/lib/config/feature-flags"

export function useFeatureFlag<K extends FeatureFlagKey>(key: K): FeatureFlagMap[K] {
  const { getFlag } = useFeatureFlagContext()
  return getFlag(key)
}

export function useIsFeatureEnabled(key: FeatureFlagKey): boolean {
  const { isEnabled } = useFeatureFlagContext()
  return isEnabled(key)
}

export function useAllFeatureFlags(): FeatureFlagMap {
  const { flags } = useFeatureFlagContext()
  return flags
}
