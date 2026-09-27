export type SorobanReadRequest = {
  key: string
  method: string
  params?: unknown[]
  parser?: (response: unknown) => unknown
}

export type SorobanRpcOptimizerOptions = {
  primaryRpcUrl?: string
  fallbackRpcUrl?: string
  debounceMs?: number
  ttlMs?: number
  fetchImpl?: typeof fetch
}

type PendingBatchEntry = {
  request: SorobanReadRequest
  resolve: (value: unknown) => void
  reject: (reason?: unknown) => void
}

type CacheEntry<T = unknown> = {
  value: T
  expiresAt: number
}

type Deferred<T> = {
  promise: Promise<T>
  resolve: (value: T | PromiseLike<T>) => void
  reject: (reason?: unknown) => void
}

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

export class SorobanRpcOptimizer {
  private readonly primaryRpcUrl: string
  private readonly fallbackRpcUrl?: string
  private readonly debounceMs: number
  private readonly ttlMs: number
  private readonly fetchImpl: typeof fetch

  private readonly pendingCache = new Map<string, CacheEntry>()
  private readonly inflightRequests = new Map<string, Promise<unknown>>()
  private readonly pendingBatch: PendingBatchEntry[] = []
  private batchTimer: ReturnType<typeof setTimeout> | null = null

  constructor(options: SorobanRpcOptimizerOptions = {}) {
    this.primaryRpcUrl = options.primaryRpcUrl ?? "https://rpc.futurenet.stellar.org"
    this.fallbackRpcUrl = options.fallbackRpcUrl
    this.debounceMs = options.debounceMs ?? 50
    this.ttlMs = options.ttlMs ?? 30_000
    this.fetchImpl = options.fetchImpl ?? fetch
  }

  async readContractState<T>(request: SorobanReadRequest): Promise<T> {
    const cacheKey = request.key
    const cached = this.pendingCache.get(cacheKey)
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value as T
    }

    const inFlight = this.inflightRequests.get(cacheKey)
    if (inFlight) {
      return inFlight as Promise<T>
    }

    const deferred = createDeferred<T>()
    this.inflightRequests.set(cacheKey, deferred.promise)

    this.pendingBatch.push({
      request,
      resolve: (value) => deferred.resolve(value as T),
      reject: (reason) => deferred.reject(reason),
    })

    if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => {
        void this.flushBatch()
      }, this.debounceMs)
    }

    return deferred.promise
  }

  clearCache(key?: string): void {
    if (key) {
      this.pendingCache.delete(key)
      this.inflightRequests.delete(key)
      return
    }

    this.pendingCache.clear()
    this.inflightRequests.clear()
  }

  private async flushBatch(): Promise<void> {
    const batch = this.pendingBatch.splice(0, this.pendingBatch.length)
    this.batchTimer = null

    if (batch.length === 0) {
      return
    }

    try {
      const results = await this.executeBatch(batch.map((entry) => entry.request))
      batch.forEach((entry, index) => {
        const value = results[index]
        this.pendingCache.set(entry.request.key, {
          value,
          expiresAt: Date.now() + this.ttlMs,
        })
        entry.resolve(value)
        this.inflightRequests.delete(entry.request.key)
      })
    } catch (error) {
      batch.forEach((entry) => {
        entry.reject(error)
        this.inflightRequests.delete(entry.request.key)
      })
    }
  }

  private async executeBatch(requests: SorobanReadRequest[]): Promise<unknown[]> {
    const endpoints = [this.primaryRpcUrl, this.fallbackRpcUrl].filter(Boolean) as string[]
    let lastError: unknown

    for (const endpoint of endpoints) {
      try {
        const response = await this.fetchImpl(endpoint, {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify(
            requests.map((request, index) => ({
              jsonrpc: "2.0",
              id: index + 1,
              method: request.method,
              params: request.params ?? [],
            }))
          ),
        })

        if (!response.ok) {
          throw new Error(`RPC request failed with status ${response.status}`)
        }

        const body = (await response.json()) as unknown
        const payloads = Array.isArray(body) ? body : [body]
        return payloads.map((payload, index) => {
          const parsed = (payload as { result?: unknown }).result
          const value = parsed !== undefined ? parsed : payload
          const request = requests[index]
          return request.parser ? request.parser(value) : value
        })
      } catch (error) {
        lastError = error
      }
    }

    throw lastError instanceof Error ? lastError : new Error("Soroban RPC batch request failed")
  }
}

export function createSorobanRpcOptimizer(options: SorobanRpcOptimizerOptions = {}): SorobanRpcOptimizer {
  return new SorobanRpcOptimizer(options)
}
