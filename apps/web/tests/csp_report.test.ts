/**
 * Tests for the /api/csp-report route.
 *
 * Covers all acceptance-criteria items:
 *   1. Body size limit
 *   2. Rate limiting per IP
 *   3. Schema validation
 *   4. Sampling (log volume reduction)
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Module mocks (must be top-level — Vitest hoists vi.mock calls)
// ---------------------------------------------------------------------------

// @upstash/redis is an optional runtime dependency; mock it so Vite's static
// import analysis doesn't fail in environments where the package is absent.
vi.mock("@upstash/redis", () => ({
  Redis: class {
    eval() {
      return Promise.resolve([0, 0]);
    }
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convenience builder for a POST request that looks like a Next.js request. */
function makeRequest(body: unknown, opts: { ip?: string; size?: number } = {}): Request {
  const headers = new Headers({ "content-type": "application/json" });
  if (opts.ip) {
    headers.set("x-forwarded-for", opts.ip);
  }

  let bodyStr: string;
  if (opts.size !== undefined) {
    // Build an oversized payload by padding the "original-policy" field.
    bodyStr = JSON.stringify({
      "csp-report": {
        "document-uri": "https://example.com/",
        "original-policy": "x".repeat(opts.size),
      },
    });
  } else {
    bodyStr = JSON.stringify(body);
  }

  return new Request("http://localhost/api/csp-report", {
    method: "POST",
    headers,
    body: bodyStr,
  });
}

/** A valid minimal CSP report envelope. */
const validReport = {
  "csp-report": {
    "document-uri": "https://example.com/",
    referrer: "",
    "blocked-uri": "https://evil.example/script.js",
    "violated-directive": "script-src 'self'",
    "original-policy": "script-src 'self'; report-uri /api/csp-report",
    disposition: "enforce",
  },
};

// ---------------------------------------------------------------------------
// Module setup
// ---------------------------------------------------------------------------

// Reset the in-memory rate-limit cache between tests so they don't bleed.
// The cache lives in lib/rate-limit.ts; we reset it by re-importing the module
// through a vi.resetModules() call that forces each test suite to get a fresh
// copy of the singleton cache.
beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/csp-report", () => {
  // -------------------------------------------------------------------------
  // Body size limit
  // -------------------------------------------------------------------------
  describe("body size limit", () => {
    it("returns 204 for a payload within the 16 KB limit", async () => {
      const { POST } = await import("@/app/api/csp-report/route");
      const req = makeRequest(validReport, { ip: "1.2.3.4" });
      const res = await POST(req as any, {} as any);
      expect(res.status).toBe(204);
    });

    it("returns 400 when the payload exceeds 16 KB", async () => {
      const { POST } = await import("@/app/api/csp-report/route");
      // 17 KB body (well above the 16 KB cap)
      const req = makeRequest(null, { ip: "1.2.3.5", size: 17_000 });
      const res = await POST(req as any, {} as any);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/payload too large/i);
    });
  });

  // -------------------------------------------------------------------------
  // Schema validation
  // -------------------------------------------------------------------------
  describe("schema validation", () => {
    it("accepts a valid CSP report envelope", async () => {
      const { POST } = await import("@/app/api/csp-report/route");
      const req = makeRequest(validReport, { ip: "2.2.2.2" });
      const res = await POST(req as any, {} as any);
      expect(res.status).toBe(204);
    });

    it("returns 400 for an empty body", async () => {
      const { POST } = await import("@/app/api/csp-report/route");
      const req = new Request("http://localhost/api/csp-report", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "",
      });
      const res = await POST(req as any, {} as any);
      expect(res.status).toBe(400);
    });

    it("returns 400 for non-JSON body", async () => {
      const { POST } = await import("@/app/api/csp-report/route");
      const req = new Request("http://localhost/api/csp-report", {
        method: "POST",
        headers: { "content-type": "text/plain" },
        body: "not json at all",
      });
      const res = await POST(req as any, {} as any);
      expect(res.status).toBe(400);
    });

    it("returns 400 when the 'csp-report' key is missing", async () => {
      const { POST } = await import("@/app/api/csp-report/route");
      const req = makeRequest({ "something-else": {} }, { ip: "3.3.3.3" });
      const res = await POST(req as any, {} as any);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/invalid csp report payload/i);
    });

    it("returns 400 when a field exceeds its max length", async () => {
      const { POST } = await import("@/app/api/csp-report/route");
      const req = makeRequest(
        {
          "csp-report": {
            "document-uri": "https://example.com/",
            "violated-directive": "x".repeat(300), // max is 256
          },
        },
        { ip: "3.3.3.4" }
      );
      const res = await POST(req as any, {} as any);
      expect(res.status).toBe(400);
    });

    it("returns 400 for an invalid 'disposition' value", async () => {
      const { POST } = await import("@/app/api/csp-report/route");
      const req = makeRequest(
        {
          "csp-report": {
            "document-uri": "https://example.com/",
            disposition: "INVALID_VALUE",
          },
        },
        { ip: "3.3.3.5" }
      );
      const res = await POST(req as any, {} as any);
      expect(res.status).toBe(400);
    });
  });

  // -------------------------------------------------------------------------
  // Rate limiting
  // -------------------------------------------------------------------------
  describe("rate limiting", () => {
    it("returns 429 after the per-IP limit is exceeded", async () => {
      const { POST } = await import("@/app/api/csp-report/route");
      const ip = "5.5.5.5";

      // Send 30 valid requests (the configured limit)
      for (let i = 0; i < 30; i++) {
        const req = makeRequest(validReport, { ip });
        const res = await POST(req as any, {} as any);
        expect(res.status).toBe(204);
      }

      // The 31st request must be rejected
      const req = makeRequest(validReport, { ip });
      const res = await POST(req as any, {} as any);
      expect(res.status).toBe(429);
    });

    it("does not count a different IP against another's rate limit", async () => {
      const { POST } = await import("@/app/api/csp-report/route");

      // Exhaust rate limit for ip-A
      for (let i = 0; i < 30; i++) {
        await POST(makeRequest(validReport, { ip: "6.6.6.6" }) as any, {} as any);
      }

      // ip-B should still succeed
      const res = await POST(makeRequest(validReport, { ip: "7.7.7.7" }) as any, {} as any);
      expect(res.status).toBe(204);
    });

    it("includes Retry-After header on 429 responses", async () => {
      const { POST } = await import("@/app/api/csp-report/route");
      const ip = "8.8.8.8";

      for (let i = 0; i < 30; i++) {
        await POST(makeRequest(validReport, { ip }) as any, {} as any);
      }

      const res = await POST(makeRequest(validReport, { ip }) as any, {} as any);
      expect(res.status).toBe(429);
      expect(res.headers.get("retry-after")).toBeTruthy();
    });
  });

  // -------------------------------------------------------------------------
  // Sampling
  // -------------------------------------------------------------------------
  describe("sampling", () => {
    it("does not log every valid report (1-in-N sampling)", async () => {
      // Import logger first to spy on it
      const loggerModule = await import("@/lib/logger");
      const warnSpy = vi.spyOn(loggerModule.logger, "warn");

      // Force Math.random to always return 0.5 (above 1/10 threshold → skip log)
      vi.spyOn(Math, "random").mockReturnValue(0.5);

      const { POST } = await import("@/app/api/csp-report/route");
      const res = await POST(makeRequest(validReport, { ip: "9.9.9.9" }) as any, {} as any);

      expect(res.status).toBe(204);
      // With random = 0.5, 0.5 * 10 = 5 which is NOT < 1, so the warn should NOT be called
      expect(warnSpy).not.toHaveBeenCalledWith("CSP Violation Detected:", expect.anything());
    });

    it("does log when the sampler fires (random returns near-zero)", async () => {
      const loggerModule = await import("@/lib/logger");
      const warnSpy = vi.spyOn(loggerModule.logger, "warn");

      // Force Math.random to return 0 → 0 * SAMPLE_RATE = 0 < 1 → always log
      vi.spyOn(Math, "random").mockReturnValue(0);

      const { POST } = await import("@/app/api/csp-report/route");
      const res = await POST(makeRequest(validReport, { ip: "10.10.10.10" }) as any, {} as any);

      expect(res.status).toBe(204);
      expect(warnSpy).toHaveBeenCalledWith(
        "CSP Violation Detected:",
        expect.objectContaining({ blockedUri: validReport["csp-report"]["blocked-uri"] })
      );
    });
  });
});
