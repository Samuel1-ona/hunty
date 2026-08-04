import { NextResponse } from "next/server"

interface RateLimitConfig {
  limit: number
  windowMs: number
}

interface RateLimitResult {
  success: boolean
  remaining: number
  reset: number
}

interface Store {
  increment(key: string, windowMs: number): Promise<{ count: number; expires: number }>
}

function createInMemoryStore(): Store {
  const cache = new Map<string, { count: number; expires: number }>()
  return {
    async increment(key: string, windowMs: number) {
      const now = Date.now()
      const record = cache.get(key)
      if (!record || now > record.expires) {
        const entry = { count: 1, expires: now + windowMs }
        cache.set(key, entry)
        return entry
      }
      record.count += 1
      return record
    },
  }
}

async function createRedisStore(): Promise<Store> {
  const { Redis } = await import("@upstash/redis")
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  })

  return {
    async increment(key: string, windowMs: number) {
      const now = Date.now()
      const [count, ttl] = await redis.eval(
        `local c = redis.call("INCR",KEYS[1])
         if c==1 then redis.call("PEXPIRE",KEYS[1],ARGV[1]) end
         local t = redis.call("PTTL",KEYS[1])
         return {c,t}`,
        [key],
        [windowMs],
      ) as [number, number]

      const expires = ttl > 0 ? now + ttl : now + windowMs
      return { count, expires }
    },
  }
}

let storePromise: Promise<Store> | null = null

function getStore(): Promise<Store> {
  if (storePromise) return storePromise

  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  if (url && token) {
    storePromise = createRedisStore()
  } else {
    storePromise = Promise.resolve(createInMemoryStore())
  }

  return storePromise
}

export async function rateLimit(
  ip: string,
  config: RateLimitConfig = { limit: 60, windowMs: 60 * 1000 },
): Promise<RateLimitResult> {
  const store = await getStore()
  const now = Date.now()
  const key = `ratelimit:${config.windowMs}:${ip}`

  const { count, expires } = await store.increment(key, config.windowMs)

  return {
    success: count <= config.limit,
    remaining: Math.max(0, config.limit - count),
    reset: expires,
  }
}

export function getIP(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for")
  if (forwarded) {
    return forwarded.split(",")[0].trim()
  }
  return "127.0.0.1"
}

export function rateLimitResponse(reset: number) {
  return NextResponse.json(
    { error: "Too many requests. Please try again later.", code: "RATE_LIMITED" },
    {
      status: 429,
      headers: {
        "X-RateLimit-Reset": Math.ceil(reset / 1000).toString(),
        "Retry-After": Math.ceil((reset - Date.now()) / 1000).toString(),
      },
    },
  )
}
