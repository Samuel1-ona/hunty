import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { rateLimit, getIP, rateLimitResponse } from "../rate-limit";

describe("rateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows the first request and returns remaining count", () => {
    const result = rateLimit("192.168.1.1");
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(59);
    expect(result.reset).toBeGreaterThan(Date.now());
  });

  it("allows requests up to the limit", () => {
    const ip = "10.0.0.1";
    for (let i = 0; i < 60; i++) {
      const result = rateLimit(ip);
      if (i < 60) {
        expect(result.success).toBe(true);
      }
    }
  });

  it("blocks requests that exceed the limit", () => {
    const ip = "10.0.0.2";
    for (let i = 0; i < 60; i++) {
      rateLimit(ip);
    }
    const result = rateLimit(ip);
    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("rejects with zero remaining when exceeded", () => {
    const ip = "10.0.0.3";
    for (let i = 0; i < 61; i++) {
      rateLimit(ip);
    }
    const result = rateLimit(ip);
    expect(result.remaining).toBe(0);
  });

  it("resets after the time window expires", () => {
    const ip = "10.0.0.4";
    const config = { limit: 3, windowMs: 1000 };

    expect(rateLimit(ip, config).success).toBe(true);
    expect(rateLimit(ip, config).success).toBe(true);
    expect(rateLimit(ip, config).success).toBe(true);
    expect(rateLimit(ip, config).success).toBe(false);

    vi.advanceTimersByTime(1001);

    const result = rateLimit(ip, config);
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it("accepts custom limit and window configurations", () => {
    const ip = "10.0.0.5";
    const config = { limit: 5, windowMs: 2000 };

    for (let i = 0; i < 5; i++) {
      expect(rateLimit(ip, config).success).toBe(true);
    }
    expect(rateLimit(ip, config).success).toBe(false);
  });

  it("tracks different IPs independently", () => {
    const ip1 = "10.0.0.6";
    const ip2 = "10.0.0.7";

    for (let i = 0; i < 60; i++) {
      rateLimit(ip1);
    }
    expect(rateLimit(ip1).success).toBe(false);

    const result = rateLimit(ip2);
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(59);
  });

  it("returns the correct reset timestamp", () => {
    vi.setSystemTime(1000000);
    const result = rateLimit("10.0.0.8", { limit: 10, windowMs: 5000 });
    expect(result.reset).toBe(1005000);
  });

  it("uses default config when none is provided", () => {
    const result = rateLimit("10.0.0.9");
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(59);
    expect(typeof result.reset).toBe("number");
  });
});

describe("getIP", () => {
  it("returns the IP from x-forwarded-for header", () => {
    const req = new Request("http://localhost", {
      headers: { "x-forwarded-for": "203.0.113.195" },
    });
    expect(getIP(req)).toBe("203.0.113.195");
  });

  it("returns the first IP from a comma-separated x-forwarded-for header", () => {
    const req = new Request("http://localhost", {
      headers: {
        "x-forwarded-for": "203.0.113.195, 198.51.100.14, 192.0.2.1",
      },
    });
    expect(getIP(req)).toBe("203.0.113.195");
  });

  it("returns 127.0.0.1 when no x-forwarded-for header is present", () => {
    const req = new Request("http://localhost");
    expect(getIP(req)).toBe("127.0.0.1");
  });

  it("trims whitespace from the IP value", () => {
    const req = new Request("http://localhost", {
      headers: { "x-forwarded-for": "  203.0.113.195  " },
    });
    expect(getIP(req)).toBe("203.0.113.195");
  });

  it("falls back to 127.0.0.1 when x-forwarded-for is empty", () => {
    const req = new Request("http://localhost", {
      headers: { "x-forwarded-for": "" },
    });
    expect(getIP(req)).toBe("127.0.0.1");
  });
});

describe("rateLimitResponse", () => {
  it("returns a 429 status response", () => {
    const reset = Date.now() + 60000;
    const response = rateLimitResponse(reset);
    expect(response.status).toBe(429);
  });

  it("sets X-RateLimit-Reset header to the reset timestamp in seconds", () => {
    const reset = 2000000;
    const response = rateLimitResponse(reset);
    expect(response.headers.get("X-RateLimit-Reset")).toBe("2000");
  });

  it("sets Retry-After header", () => {
    vi.useFakeTimers();
    vi.setSystemTime(1000000);

    const reset = 1060000;
    const response = rateLimitResponse(reset);
    const retryAfter = response.headers.get("Retry-After");
    expect(retryAfter).toBe("60");

    vi.useRealTimers();
  });

  it("returns an error message in the JSON body", async () => {
    const reset = Date.now() + 60000;
    const response = rateLimitResponse(reset);
    const body = await response.json();
    expect(body).toEqual({ error: "Too many requests. Please try again later." });
  });

  it("returns a JSON content-type header", () => {
    const reset = Date.now() + 60000;
    const response = rateLimitResponse(reset);
    expect(response.headers.get("content-type")).toMatch(/application\/json/);
  });
});
