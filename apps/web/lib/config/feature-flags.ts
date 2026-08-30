// Test-only barrel so `@/lib/config/feature-flags` resolves as a single
// module path even though the canonical implementation lives in the
// `feature-flags/` directory. See `./feature-flags/index.ts` for the source
// of truth — keep this file in sync if exports are added or renamed.

export {
  evaluateAllFlags,
  evaluateFlag,
  getStoredOverrides,
  setStoredOverride,
  clearStoredOverride,
  clearAllStoredOverrides,
  FEATURE_FLAG_DEFINITIONS,
  type FeatureFlagDefinition,
  type FeatureFlagKey,
  type FeatureFlagMap,
  type FeatureFlagOverride,
  type FeatureFlagValue,
} from './feature-flags/index';
