import type { FeatureFlagKey, FeatureFlagMap, FeatureFlagValue } from './definitions';
import { FEATURE_FLAG_DEFINITIONS } from './definitions';
import { evaluateFlag } from './evaluate';

export function isFeatureEnabled(key: FeatureFlagKey): boolean {
  return Boolean(evaluateFlag(key));
}

export function getFeatureFlagValue<K extends FeatureFlagKey>(key: K): FeatureFlagMap[K] {
  return evaluateFlag(key);
}

export function getAllFeatureFlags(
  overrides?: Partial<Record<FeatureFlagKey, FeatureFlagValue>>
): FeatureFlagMap {
  const keys = Object.keys(FEATURE_FLAG_DEFINITIONS) as FeatureFlagKey[];
  const result = {} as FeatureFlagMap;
  for (const key of keys) {
    result[key] = evaluateFlag(key, overrides);
  }
  return result;
}

export type { FeatureFlagKey, FeatureFlagMap, FeatureFlagValue };
