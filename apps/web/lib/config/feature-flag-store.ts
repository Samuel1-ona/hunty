import { create } from "zustand"

import type { FeatureFlagKey, FeatureFlagMap, FeatureFlagOverride, FeatureFlagValue } from "@/lib/config/feature-flags"
import { evaluateAllFlags, evaluateFlag, getStoredOverrides, clearStoredOverride } from "@/lib/config/feature-flags"

interface FeatureFlagState {
  flags: FeatureFlagMap
  overrides: Record<string, FeatureFlagOverride>
  initialized: boolean

  init: () => void
  getFlag: <K extends FeatureFlagKey>(key: K) => FeatureFlagMap[K]
  isEnabled: (key: FeatureFlagKey) => boolean
  setOverride: (key: FeatureFlagKey, value: FeatureFlagValue, expiresAt?: number) => void
  clearOverride: (key: FeatureFlagKey) => void
  clearAllOverrides: () => void
  refreshFlags: () => void
}

export const useFeatureFlagStore = create<FeatureFlagState>()((set, get) => ({
  flags: {} as FeatureFlagMap,
  overrides: {},
  initialized: false,

  init: () => {
    if (get().initialized) return
    const storedOverrides = getStoredOverrides()
    const activeOverrides: Record<string, FeatureFlagOverride> = {}
    for (const [key, override] of Object.entries(storedOverrides)) {
      if (override.expiresAt && Date.now() >= override.expiresAt) {
        clearStoredOverride(key)
        continue
      }
      activeOverrides[key] = override
    }

    const runtimeOverrides = Object.fromEntries(
      Object.entries(activeOverrides).map(([k, v]) => [k, v.value]),
    ) as Partial<Record<FeatureFlagKey, FeatureFlagValue>>

    set({
      flags: evaluateAllFlags(runtimeOverrides),
      overrides: activeOverrides,
      initialized: true,
    })
  },

  getFlag: (key) => {
    const state = get()
    return state.flags[key] ?? evaluateFlag(key)
  },

  isEnabled: (key) => {
    return Boolean(get().getFlag(key))
  },

  setOverride: (key, value, expiresAt) => {
    const override: FeatureFlagOverride = {
      value,
      source: "runtime",
      ...(expiresAt ? { expiresAt } : {}),
    }

    const runtimeOverrides = {
      ...Object.fromEntries(
        Object.entries(get().overrides).map(([k, v]) => [k, v.value]),
      ),
      [key]: value,
    } as Partial<Record<FeatureFlagKey, FeatureFlagValue>>

    set({
      flags: evaluateAllFlags(runtimeOverrides),
      overrides: { ...get().overrides, [key]: override },
    })
  },

  clearOverride: (key) => {
    clearStoredOverride(key)
    const { [key]: _removed, ...remainingOverrides } = get().overrides

    const runtimeOverrides = Object.fromEntries(
      Object.entries(remainingOverrides).map(([k, v]) => [k, v.value]),
    ) as Partial<Record<FeatureFlagKey, FeatureFlagValue>>

    set({
      flags: evaluateAllFlags(runtimeOverrides),
      overrides: remainingOverrides,
    })
  },

  clearAllOverrides: () => {
    set({
      flags: evaluateAllFlags(),
      overrides: {},
    })
  },

  refreshFlags: () => {
    const state = get()
    const runtimeOverrides = Object.fromEntries(
      Object.entries(state.overrides).map(([k, v]) => [k, v.value]),
    ) as Partial<Record<FeatureFlagKey, FeatureFlagValue>>
    set({ flags: evaluateAllFlags(runtimeOverrides) })
  },
}))
