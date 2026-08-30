import { describe, expect, it, vi, beforeEach } from 'vitest';

import { evaluateAllFlags, evaluateFlag } from '@/lib/config/feature-flags';
import { FEATURE_FLAG_DEFINITIONS } from '@/lib/config/feature-flags/definitions';

beforeEach(() => {
  vi.unstubAllEnvs();
  localStorage.clear();
});

describe('Feature Flag Definitions', () => {
  it('every flag has a description and default value', () => {
    for (const [key, def] of Object.entries(FEATURE_FLAG_DEFINITIONS)) {
      expect(def.description, `Flag "${key}" missing description`).toBeTruthy();
      expect(def.defaultValue, `Flag "${key}" missing defaultValue`).not.toBeUndefined();
    }
  });

  it('all flags default to false', () => {
    const flags = evaluateAllFlags();
    for (const key of Object.keys(FEATURE_FLAG_DEFINITIONS)) {
      expect(typeof flags[key], `Flag "${key}" should be boolean`).toBe('boolean');
    }
  });
});

describe('evaluateFlag', () => {
  it('returns the default value when no env var or override is set', () => {
    expect(evaluateFlag('stagingBanner')).toBe(false);
    expect(evaluateFlag('nftMarketplace')).toBe(false);
  });

  it('reads from environment variable when set to true', () => {
    vi.stubEnv('NEXT_PUBLIC_ENABLE_STAGING_BANNER', 'true');
    expect(evaluateFlag('stagingBanner')).toBe(true);
  });

  it('reads from environment variable when set to false', () => {
    vi.stubEnv('NEXT_PUBLIC_ENABLE_STAGING_BANNER', 'false');
    expect(evaluateFlag('stagingBanner')).toBe(false);
  });

  it('runtime overrides take precedence over env vars', () => {
    vi.stubEnv('NEXT_PUBLIC_FEATURE_NFT_MARKETPLACE', 'true');
    expect(evaluateFlag('nftMarketplace', { nftMarketplace: false })).toBe(false);
  });

  it('runtime overrides can enable a flag', () => {
    expect(evaluateFlag('huntChat', { huntChat: true })).toBe(true);
  });
});

describe('evaluateAllFlags', () => {
  it('returns all flags with correct types', () => {
    const flags = evaluateAllFlags();
    const keys = Object.keys(FEATURE_FLAG_DEFINITIONS);
    expect(Object.keys(flags).length).toBe(keys.length);
    for (const key of keys) {
      expect(flags).toHaveProperty(key);
      expect(typeof flags[key]).toBe('boolean');
    }
  });

  it('applies runtime overrides to all flags', () => {
    const flags = evaluateAllFlags({
      nftMarketplace: true,
      huntChat: true,
    });
    expect(flags.nftMarketplace).toBe(true);
    expect(flags.huntChat).toBe(true);
    expect(flags.stagingBanner).toBe(false);
  });
});

describe('Environment-based overrides', () => {
  it('stagingBanner is disabled in production by environment override', () => {
    vi.stubEnv('NEXT_PUBLIC_ENVIRONMENT', 'production');
    expect(evaluateFlag('stagingBanner')).toBe(false);
  });

  it('stagingBanner can be enabled in development via env var', () => {
    vi.stubEnv('NEXT_PUBLIC_ENVIRONMENT', 'development');
    vi.stubEnv('NEXT_PUBLIC_ENABLE_STAGING_BANNER', 'true');
    expect(evaluateFlag('stagingBanner')).toBe(true);
  });
});

describe('localStorage overrides', () => {
  it('persists and reads overrides from localStorage', () => {
    const { setStoredOverride, clearStoredOverride } = require('@/lib/config/feature-flags');
    setStoredOverride('nftMarketplace', { value: true, source: 'localStorage' });
    expect(evaluateFlag('nftMarketplace')).toBe(true);
    clearStoredOverride('nftMarketplace');
    expect(evaluateFlag('nftMarketplace')).toBe(false);
  });

  it('expired overrides are ignored', () => {
    const { setStoredOverride } = require('@/lib/config/feature-flags');
    setStoredOverride('huntChat', {
      value: true,
      source: 'localStorage',
      expiresAt: Date.now() - 1000,
    });
    expect(evaluateFlag('huntChat')).toBe(false);
  });
});
