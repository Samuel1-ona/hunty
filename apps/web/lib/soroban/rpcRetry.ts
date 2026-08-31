const RETRYABLE_STATUS_CODES = new Set([408, 409, 425, 429, 500, 502, 503, 504])

const RETRYABLE_MESSAGE_PATTERNS = [
  /network/i,
  /timeout/i,
  /timed out/i,
  /socket hang up/i,
  /econnreset/i,
  /econnrefused/i,
  /enotfound/i,
  /ehostunreach/i,
  /too many requests/i,
  /rate limit/i,
  /fetch failed/i,
  /failed to fetch/i,
]

export type RpcRetryOptions = {
  maxAttempts?: number
  initialDelayMs?: number
  maxDelayMs?: number
  backoffMultiplier?: number
  jitterRatio?: number
  timeoutMs?: number
}

const DEFAULT_OPTIONS: Required<RpcRetryOptions> = {
  maxAttempts: 4,
  initialDelayMs: 800,
  maxDelayMs: 12000,
  backoffMultiplier: 2,
  jitterRatio: 0.2,
  timeoutMs: 15000,
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`RPC request timed out after ${timeoutMs}ms`)), timeoutMs)
    ),
  ])
}

function parseRetryAfterMs(value: string | undefined): number | undefined {
  if (!value) return undefined
  const seconds = Number(value)
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000
  const asDate = Date.parse(value)
  if (Number.isNaN(asDate)) return undefined
  const diff = asDate - Date.now()
  return diff > 0 ? diff : undefined
}

function getStatus(error: unknown): number | undefined {
  const anyErr = error as
    | {
        status?: number
        response?: { status?: number }
      }
    | undefined
  return anyErr?.status ?? anyErr?.response?.status
}

function getRetryAfterHeaderMs(error: unknown): number | undefined {
  const anyErr = error as
    | {
        response?: {
          headers?:
            | Record<string, string | number | undefined>
            | { get?: (key: string) => string | null }
        }
      }
    | undefined
  const headers = anyErr?.response?.headers
  if (!headers) return undefined

  if (typeof (headers as { get?: (key: string) => string | null }).get === "function") {
    const raw = (headers as { get: (key: string) => string | null }).get("retry-after") ?? undefined
    return parseRetryAfterMs(raw)
  }

  const record = headers as Record<string, string | number | undefined>
  const value = record["retry-after"] ?? record["Retry-After"]
  return parseRetryAfterMs(value != null ? String(value) : undefined)
}

function isRetryableError(error: unknown): boolean {
  const status = getStatus(error)
  if (status && RETRYABLE_STATUS_CODES.has(status)) return true

  const message = error instanceof Error ? error.message : String(error ?? "")
  return RETRYABLE_MESSAGE_PATTERNS.some((pattern) => pattern.test(message))
}

export async function withSorobanRpcRetry<T>(
  operation: () => Promise<T>,
  options?: RpcRetryOptions
): Promise<T> {
  const cfg = { ...DEFAULT_OPTIONS, ...options }
  let delayMs = cfg.initialDelayMs
  let lastError: unknown

  for (let attempt = 1; attempt <= cfg.maxAttempts; attempt += 1) {
    try {
      return await withTimeout(operation(), cfg.timeoutMs)
    } catch (error) {
      lastError = error
      if (attempt >= cfg.maxAttempts || !isRetryableError(error)) break

      const retryAfterMs = getRetryAfterHeaderMs(error)
      const jitter = delayMs * cfg.jitterRatio * Math.random()
      const waitMs = Math.min(
        retryAfterMs ?? delayMs + jitter,
        cfg.maxDelayMs
      )
      await sleep(waitMs)
      delayMs = Math.min(delayMs * cfg.backoffMultiplier, cfg.maxDelayMs)
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Soroban RPC request failed")
}

