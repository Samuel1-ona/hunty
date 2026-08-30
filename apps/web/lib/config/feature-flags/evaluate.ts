import { getEnvironmentConfig, type Environment } from '@/lib/config/environment';

import type { FeatureFlagKey, FeatureFlagOverride, FeatureFlagValue } from './definitions';
import { FEATURE_FLAG_DEFINITIONS } from './definitions';

const OVERRIDE_STORAGE_KEY = 'hunty-flag-overrides';

export function getStoredOverrides(): Record<string, FeatureFlagOverride> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(OVERRIDE_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, FeatureFlagOverride>) : {};
  } catch {
    return {};
  }
}

export function setStoredOverride(key: string, override: FeatureFlagOverride): void {
  if (typeof window === 'undefined') return;
  const overrides = getStoredOverrides();
  overrides[key] = override;
  localStorage.setItem(OVERRIDE_STORAGE_KEY, JSON.stringify(overrides));
}

export function clearStoredOverride(key: string): void {
  if (typeof window === 'undefined') return;
  const overrides = getStoredOverrides();
  delete overrides[key];
  localStorage.setItem(OVERRIDE_STORAGE_KEY, JSON.stringify(overrides));
}

export function clearAllStoredOverrides(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(OVERRIDE_STORAGE_KEY);
}

function readEnvVar(envVar: string): string | undefined {
  try {
    return (process.env as Record<string, string | undefined>)[envVar];
  } catch {
    return undefined;
  }
}

function resolveFromEnvVar<T extends FeatureFlagValue>(
  definition: (typeof FEATURE_FLAG_DEFINITIONS)[FeatureFlagKey]
): T | undefined {
  if (!definition.envVar) return undefined;
  const raw = readEnvVar(definition.envVar);
  if (raw === undefined) return undefined;
  return coerceValue(raw, definition.defaultValue) as T;
}

function coerceValue<T extends FeatureFlagValue>(raw: string, defaultValue: T): T {
  if (typeof defaultValue === 'boolean') {
    return (raw === 'true') as T;
  }
  if (typeof defaultValue === 'number') {
    const n = Number(raw);
    return (Number.isNaN(n) ? defaultValue : n) as T;
  }
  return raw as T;
}

function resolveEnvironmentOverride<T extends FeatureFlagValue>(
  definition: (typeof FEATURE_FLAG_DEFINITIONS)[FeatureFlagKey],
  environment: Environment
): T | undefined {
  if (!definition.environments) return undefined;
  return definition.environments[environment] as T | undefined;
}

export function evaluateFlag<K extends FeatureFlagKey>(
  key: K,
  runtimeOverrides?: Partial<Record<FeatureFlagKey, FeatureFlagValue>>
): FeatureFlagMap[K] {
  const definition = FEATURE_FLAG_DEFINITIONS[key];
  const environment = getEnvironmentConfig().environment as Environment;

  const runtimeValue = runtimeOverrides?.[key];
  if (runtimeValue !== undefined) {
    return runtimeValue as FeatureFlagMap[K];
  }

  const storedOverrides = getStoredOverrides();
  const stored = storedOverrides[key];
  if (stored && stored.value !== undefined) {
    if (!stored.expiresAt || Date.now() < stored.expiresAt) {
      return stored.value as FeatureFlagMap[K];
    }
    clearStoredOverride(key);
  }

  const envValue = resolveFromEnvVar(definition);
  if (envValue !== undefined) {
    return envValue as FeatureFlagMap[K];
  }

  const envOverride = resolveEnvironmentOverride(definition, environment);
  if (envOverride !== undefined) {
    return envOverride as FeatureFlagMap[K];
  }

  return definition.defaultValue as FeatureFlagMap[K];
}

export function evaluateAllFlags(
  runtimeOverrides?: Partial<Record<FeatureFlagKey, FeatureFlagValue>>
): FeatureFlagMap {
  const keys = Object.keys(FEATURE_FLAG_DEFINITIONS) as FeatureFlagKey[];
  const result = {} as FeatureFlagMap;
  for (const key of keys) {
    result[key] = evaluateFlag(key, runtimeOverrides);
  }
  return result;
}
