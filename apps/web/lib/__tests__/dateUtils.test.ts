import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  formatDate,
  formatISOString,
  formatTimestamp,
  formatTimestampWithTimezone,
  getCountdown,
} from "../dateUtils"

describe("dateUtils", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("formatTimestamp", () => {
    it("formats unix timestamps into readable strings", () => {
      const result = formatTimestamp(1704067200);
      expect(result).toBeTruthy();
      expect(typeof result).toBe("string");
    });

    it("handles unix epoch", () => {
      const result = formatTimestamp(0);
      expect(result).toBeTruthy();
      expect(typeof result).toBe("string");
    });

    it("handles far future timestamps", () => {
      const result = formatTimestamp(4102444800);
      expect(result).toBeTruthy();
      expect(typeof result).toBe("string");
    });

    it("handles negative timestamps (dates before 1970)", () => {
      const result = formatTimestamp(-126230400);
      expect(result).toBeTruthy();
      expect(typeof result).toBe("string");
    });

    it("throws RangeError for NaN timestamps", () => {
      expect(() => formatTimestamp(NaN)).toThrow(RangeError);
    });

    it("handles fractional timestamps", () => {
      const result = formatTimestamp(1704067200.5);
      expect(result).toBeTruthy();
      expect(typeof result).toBe("string");
    });
  });

  describe("formatDate", () => {
    it("formats unix timestamps into readable dates", () => {
      const result = formatDate(1704067200);
      expect(result).toBeTruthy();
      expect(typeof result).toBe("string");
    });

    it("handles unix epoch", () => {
      const result = formatDate(0);
      expect(result).toBeTruthy();
      expect(typeof result).toBe("string");
    });

    it("handles negative timestamps", () => {
      const result = formatDate(-126230400);
      expect(result).toBeTruthy();
      expect(typeof result).toBe("string");
    });

    it("throws RangeError for NaN timestamps", () => {
      expect(() => formatDate(NaN)).toThrow(RangeError);
    });

    it("returns a shorter format than formatTimestamp", () => {
      const ts = 1704067200;
      const dateResult = formatDate(ts);
      const timestampResult = formatTimestamp(ts);
      expect(dateResult.length).toBeLessThanOrEqual(timestampResult.length);
    });
  });

  describe("formatISOString", () => {
    it("formats valid ISO strings", () => {
      const result = formatISOString("2026-02-10T14:32:00Z");
      expect(result).toBeTruthy();
      expect(typeof result).toBe("string");
    });

    it("returns original value for invalid ISO strings", () => {
      const invalid = "not-a-date";
      expect(formatISOString(invalid)).toBe(invalid);
    });

    it("returns original value for empty string", () => {
      expect(formatISOString("")).toBe("");
    });

    it("returns original value for malformed date strings", () => {
      expect(formatISOString("2026-13-01T00:00:00Z")).toBe("2026-13-01T00:00:00Z");
    });

    it("handles ISO strings without timezone", () => {
      const result = formatISOString("2026-02-10T14:32:00");
      expect(result).toBeTruthy();
      expect(typeof result).toBe("string");
    });

    it("handles date-only ISO strings", () => {
      const result = formatISOString("2026-02-10");
      expect(result).toBeTruthy();
      expect(typeof result).toBe("string");
    });
  });

  describe("getCountdown", () => {
    beforeEach(() => {
      vi.spyOn(Date, "now").mockReturnValue(1000 * 1000);
    });

    it("returns null when timestamp has passed", () => {
      expect(getCountdown(999)).toBeNull();
    });

    it("returns null when timestamp equals current time", () => {
      expect(getCountdown(1000)).toBeNull();
    });

    it("formats seconds correctly", () => {
      expect(getCountdown(1030)).toBe("30s");
    });

    it("formats minutes and seconds correctly", () => {
      expect(getCountdown(1090)).toBe("1m 30s");
    });

    it("formats hours, minutes and seconds correctly", () => {
      expect(getCountdown(4690)).toBe("1h 1m 30s");
    });

    it("formats days, hours, minutes and seconds correctly", () => {
      expect(getCountdown(91930)).toBe("1d 1h 15m 30s");
    });

    it("formats only minutes when hours and days are zero", () => {
      expect(getCountdown(1060)).toBe("1m 00s");
    });

    it("includes minutes even when hours are zero", () => {
      expect(getCountdown(90000)).toBe("1d 43m 20s");
    });

    it("pads seconds with leading zero", () => {
      expect(getCountdown(1005)).toBe("05s");
    });

    it("handles very large timestamps", () => {
      const result = getCountdown(1000000 + 90061);
      expect(result).toContain("d");
      expect(result).toContain("s");
    });

    it("returns correct countdown for exactly one hour", () => {
      expect(getCountdown(1000 + 3600)).toBe("1h 00s")
    })
  })
})

// ---------------------------------------------------------------------------
// Locale-param extension tests
// ---------------------------------------------------------------------------
describe("dateUtils – locale params", () => {
  const TS = 1739197920 // 2026-02-10T14:32:00Z

  describe("formatTimestamp with locale", () => {
    it("accepts a locale without throwing", () => {
      expect(() => formatTimestamp(TS, "en-US")).not.toThrow()
      expect(() => formatTimestamp(TS, "es-ES")).not.toThrow()
      expect(() => formatTimestamp(TS, "fr-FR")).not.toThrow()
    })

    it("returns a non-empty string for each locale", () => {
      expect(formatTimestamp(TS, "en-US").length).toBeGreaterThan(0)
      expect(formatTimestamp(TS, "es-ES").length).toBeGreaterThan(0)
      expect(formatTimestamp(TS, "fr-FR").length).toBeGreaterThan(0)
    })
  })

  describe("formatDate with locale", () => {
    it("accepts locales without throwing", () => {
      expect(() => formatDate(TS, "en-US")).not.toThrow()
      expect(() => formatDate(TS, "es-ES")).not.toThrow()
    })

    it("is shorter or equal to formatTimestamp (no time part)", () => {
      expect(formatDate(TS, "en-US").length).toBeLessThanOrEqual(
        formatTimestamp(TS, "en-US").length,
      )
    })
  })

  describe("formatISOString with locale", () => {
    it("accepts locale param", () => {
      const result = formatISOString("2026-02-10T14:32:00Z", "en-US")
      expect(result.length).toBeGreaterThan(0)
    })

    it("still returns original on bad input", () => {
      expect(formatISOString("bad-date", "es-ES")).toBe("bad-date")
    })
  })

  describe("formatTimestampWithTimezone", () => {
    it("includes a timezone abbreviation", () => {
      const result = formatTimestampWithTimezone(TS, "en-US", "UTC")
      expect(result).toMatch(/UTC|GMT/)
    })

    it("differs between UTC and America/New_York", () => {
      const utc = formatTimestampWithTimezone(TS, "en-US", "UTC")
      const nyc = formatTimestampWithTimezone(TS, "en-US", "America/New_York")
      expect(utc).not.toBe(nyc)
    })
  })
})