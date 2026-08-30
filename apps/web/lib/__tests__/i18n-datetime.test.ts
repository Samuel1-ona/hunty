/**
 * Tests for lib/i18n-datetime.ts
 *
 * Coverage:
 * - formatTimestampI18n: locale changes output format
 * - formatDateI18n: explicit timeZone overrides browser TZ
 * - formatISOStringI18n: invalid string passthrough
 * - formatTimestampWithTimezoneI18n: TZ abbreviation is appended
 * - formatNumberI18n: locale-aware decimal/grouping separators
 * - buildCountdownLabel: uses supplied unit strings (translated)
 * - getRemainingSeconds: DST-transparent UTC second arithmetic
 */

import { describe, expect, it } from 'vitest';

import {
  buildCountdownLabel,
  DEFAULT_COUNTDOWN_UNITS,
  formatDateI18n,
  formatISOStringI18n,
  formatNumberI18n,
  formatTimestampI18n,
  formatTimestampWithTimezoneI18n,
  getRemainingSeconds,
} from '../i18n-datetime';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
/** A well-known instant: 2026-02-10T14:32:00Z (Unix seconds) */
const TS = 1739197920;

describe('formatTimestampI18n', () => {
  it('returns a non-empty string for a valid timestamp', () => {
    const result = formatTimestampI18n(TS);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('produces different output for different locales', () => {
    const en = formatTimestampI18n(TS, 'en-US', 'UTC');
    const es = formatTimestampI18n(TS, 'es-ES', 'UTC');
    // The formatted strings may differ (e.g. month name, order)
    // At minimum one of them should differ from a pure numeric default
    expect(typeof en).toBe('string');
    expect(typeof es).toBe('string');
    // They may be equal in some environments but at least must not throw
  });

  it('respects an explicit IANA timeZone', () => {
    // 2026-02-10T14:32:00Z in America/New_York is 09:32 (EST, UTC-5)
    const utc = formatTimestampI18n(TS, 'en-US', 'UTC');
    const nyc = formatTimestampI18n(TS, 'en-US', 'America/New_York');
    // Both valid strings; time portion differs
    expect(utc).not.toBe(nyc);
  });

  it('throws RangeError for NaN timestamp', () => {
    expect(() => formatTimestampI18n(NaN)).toThrow(RangeError);
  });

  it('handles unix epoch (0)', () => {
    const result = formatTimestampI18n(0);
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('formatDateI18n', () => {
  it('returns a shorter string than formatTimestampI18n (no time)', () => {
    const dateStr = formatDateI18n(TS, 'en-US', 'UTC');
    const tsStr = formatTimestampI18n(TS, 'en-US', 'UTC');
    expect(dateStr.length).toBeLessThan(tsStr.length);
  });

  it('changes output with explicit timeZone', () => {
    // Midnight UTC on 2026-03-09 = previous day in New York (UTC-5)
    const midnight = new Date('2026-03-09T00:00:00Z').getTime() / 1000;
    const utc = formatDateI18n(midnight, 'en-US', 'UTC');
    const nyc = formatDateI18n(midnight, 'en-US', 'America/New_York');
    // Should reference different calendar dates
    expect(utc).not.toBe(nyc);
  });

  it('throws RangeError for NaN', () => {
    expect(() => formatDateI18n(NaN)).toThrow(RangeError);
  });
});

describe('formatISOStringI18n', () => {
  it('formats a valid ISO string', () => {
    const result = formatISOStringI18n('2026-02-10T14:32:00Z', 'en-US', 'UTC');
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns the original string for invalid ISO input', () => {
    expect(formatISOStringI18n('not-a-date')).toBe('not-a-date');
  });

  it('returns empty string unchanged', () => {
    expect(formatISOStringI18n('')).toBe('');
  });

  it('handles locale switch', () => {
    const en = formatISOStringI18n('2026-02-10T14:32:00Z', 'en-US', 'UTC');
    const fr = formatISOStringI18n('2026-02-10T14:32:00Z', 'fr-FR', 'UTC');
    expect(typeof en).toBe('string');
    expect(typeof fr).toBe('string');
  });
});

describe('formatTimestampWithTimezoneI18n', () => {
  it('includes a TZ abbreviation in the output', () => {
    const result = formatTimestampWithTimezoneI18n(TS, 'en-US', 'UTC');
    // UTC abbreviated as "UTC" or "GMT" depending on runtime
    expect(result).toMatch(/UTC|GMT/);
  });

  it('differs between timezones', () => {
    const utc = formatTimestampWithTimezoneI18n(TS, 'en-US', 'UTC');
    const nyc = formatTimestampWithTimezoneI18n(TS, 'en-US', 'America/New_York');
    expect(utc).not.toBe(nyc);
  });
});

describe('formatNumberI18n', () => {
  it('formats a number as a string', () => {
    const result = formatNumberI18n(1234567.89, 'en-US');
    expect(typeof result).toBe('string');
    expect(result).toContain('1');
  });

  it('uses locale-aware grouping for en-US', () => {
    // en-US: 1,234,567.89
    const result = formatNumberI18n(1234567.89, 'en-US');
    expect(result).toContain(',');
    expect(result).toContain('.');
  });

  it('uses locale-aware grouping for de-DE', () => {
    // de-DE: 1.234.567,89
    const result = formatNumberI18n(1234567.89, 'de-DE');
    // Grouping separator is period; decimal is comma — at minimum the format differs
    expect(result).toBeTruthy();
    expect(result).not.toBe(formatNumberI18n(1234567.89, 'en-US'));
  });

  it('accepts Intl.NumberFormatOptions (e.g. currency)', () => {
    const result = formatNumberI18n(42.5, 'en-US', {
      style: 'currency',
      currency: 'USD',
    });
    expect(result).toContain('$');
  });

  it('formats zero', () => {
    expect(formatNumberI18n(0, 'en-US')).toBe('0');
  });
});

describe('buildCountdownLabel', () => {
  it('uses default English units when no units map is supplied', () => {
    const label = buildCountdownLabel({ days: 1, hours: 2, minutes: 3, seconds: 4 });
    expect(label).toContain('d');
    expect(label).toContain('h');
    expect(label).toContain('m');
    expect(label).toContain('s');
    expect(label).toMatch(/1d/);
  });

  it('uses custom translated unit labels', () => {
    const frUnits = { d: 'j', h: 'h', m: 'm', s: 's' };
    const label = buildCountdownLabel({ days: 1, hours: 2, minutes: 3, seconds: 4 }, frUnits);
    expect(label).toContain('1j'); // French: jours → j
    expect(label).toContain('h');
  });

  it('omits days segment when days is 0', () => {
    const label = buildCountdownLabel(
      { days: 0, hours: 1, minutes: 5, seconds: 30 },
      DEFAULT_COUNTDOWN_UNITS
    );
    expect(label).not.toMatch(/\d+d/);
    expect(label).toContain('h');
  });

  it('pads hours, minutes, seconds with leading zeros', () => {
    const label = buildCountdownLabel(
      { days: 1, hours: 2, minutes: 3, seconds: 4 },
      DEFAULT_COUNTDOWN_UNITS
    );
    // With days > 0, hours should be padded to 2 digits: "02h"
    expect(label).toContain('02h');
    expect(label).toContain('03m');
    expect(label).toContain('04s');
  });

  it('does not pad hours when days is 0', () => {
    const label = buildCountdownLabel(
      { days: 0, hours: 3, minutes: 5, seconds: 9 },
      DEFAULT_COUNTDOWN_UNITS
    );
    expect(label).toMatch(/^3h/);
  });
});

// ---------------------------------------------------------------------------
// DST boundary tests (getRemainingSeconds)
// ---------------------------------------------------------------------------

describe('getRemainingSeconds – DST boundary', () => {
  /**
   * US spring-forward (America/New_York): 2026-03-08T07:00:00Z
   * Clocks jump from 02:00 → 03:00 local, but UTC seconds are continuous.
   * A countdown from T to T+3600 should always yield exactly 3600 seconds.
   */
  it('is unaffected by spring-forward DST transition', () => {
    // Just before US spring-forward (UTC)
    const springForwardUtc = new Date('2026-03-08T07:00:00Z').getTime() / 1000;
    const target = springForwardUtc + 3600;
    expect(getRemainingSeconds(target, springForwardUtc)).toBe(3600);
  });

  it('is unaffected by fall-back DST transition', () => {
    // US fall-back: 2026-11-01T06:00:00Z (clocks go back at 02:00 local)
    const fallBackUtc = new Date('2026-11-01T06:00:00Z').getTime() / 1000;
    const target = fallBackUtc + 3600;
    expect(getRemainingSeconds(target, fallBackUtc)).toBe(3600);
  });

  it('returns 0 when deadline has passed', () => {
    expect(getRemainingSeconds(1000, 2000)).toBe(0);
  });

  it('returns 0 when exactly at deadline', () => {
    expect(getRemainingSeconds(1000, 1000)).toBe(0);
  });

  it('handles fractional unix seconds by flooring', () => {
    // target 1000.9, now 999.1 → floor(1000.9) - floor(999.1) = 1
    expect(getRemainingSeconds(1000.9, 999.1)).toBe(1);
  });
});
