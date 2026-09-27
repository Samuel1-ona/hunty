import { NextResponse } from "next/server";

interface RateLimitConfig {
  limit: number;
  windowMs: number;
}

// In-memory cache for rate limiting. 
// Note: In a production environment with multiple server instances, 
// this should be replaced with Redis or a similar distributed store.
const cache = new Map<string, { count: number; expires: number }>();

/**
 * Simple in-memory rate limiter for Next.js API routes.
 */
export function rateLimit(ip: string, config: RateLimitConfig = { limit: 60, windowMs: 60 * 1000 }) {
  const now = Date.now();
  const key = `ratelimit_${ip}`;
  const record = cache.get(key);

  if (!record || now > record.expires) {
    cache.set(key, { count: 1, expires: now + config.windowMs });
    return { 
      success: true, 
      remaining: config.limit - 1,
      reset: now + config.windowMs 
    };
  }

  if (record.count >= config.limit) {
    return { 
      success: false, 
      remaining: 0,
      reset: record.expires
    };
  }

  record.count += 1;
  return { 
    success: true, 
    remaining: config.limit - record.count,
    reset: record.expires
  };
}

/**
 * Helper to get client IP from request headers.
 */
export function getIP(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return "127.0.0.1";
}

/**
 * Standard error response for rate limited requests.
 */
export function rateLimitResponse(reset: number) {
  return NextResponse.json(
    { error: "Too many requests. Please try again later." },
    { 
      status: 429,
      headers: {
        "X-RateLimit-Reset": Math.ceil(reset / 1000).toString(),
        "Retry-After": Math.ceil((reset - Date.now()) / 1000).toString()
      }
    }
  );
}
