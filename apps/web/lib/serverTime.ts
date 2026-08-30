/**
 * Server-synced time helpers to prevent client clock manipulation of hunt timers.
 */

export interface ServerTimeSnapshot {
  /** Authoritative server Unix time in milliseconds. */
  serverNowMs: number;
  /** Client Date.now() when the snapshot was taken. */
  clientNowMs: number;
  /** serverNowMs - clientNowMs */
  offsetMs: number;
}

let cachedOffsetMs = 0;
let lastSyncedAt = 0;
const SYNC_TTL_MS = 60_000;

export function getCachedTimeOffsetMs(): number {
  return cachedOffsetMs;
}

export function setCachedTimeOffsetMs(offsetMs: number): void {
  cachedOffsetMs = offsetMs;
  lastSyncedAt = Date.now();
}

/** Approximate authoritative now using the last known offset. */
export function getServerSyncedNowMs(): number {
  return Date.now() + cachedOffsetMs;
}

/** Unix seconds using server-synced clock. */
export function getServerSyncedNowSeconds(): number {
  return Math.floor(getServerSyncedNowMs() / 1000);
}

export function isTimeSyncStale(ttlMs = SYNC_TTL_MS): boolean {
  return Date.now() - lastSyncedAt > ttlMs;
}

/**
 * Compute offset from a server response.
 * Prefer `serverNowMs` / `serverTimestamp` fields; falls back to Date header.
 */
export function computeOffsetFromServerPayload(
  payload: { serverNowMs?: number; serverTimestamp?: number; timestamp?: string },
  clientNowMs = Date.now()
): ServerTimeSnapshot {
  let serverNowMs: number | undefined = payload.serverNowMs;

  if (serverNowMs == null && typeof payload.serverTimestamp === 'number') {
    // Heuristic: values < 1e12 are seconds
    serverNowMs =
      payload.serverTimestamp < 1e12 ? payload.serverTimestamp * 1000 : payload.serverTimestamp;
  }

  if (serverNowMs == null && payload.timestamp) {
    const parsed = Date.parse(payload.timestamp);
    if (!Number.isNaN(parsed)) serverNowMs = parsed;
  }

  if (serverNowMs == null) {
    serverNowMs = clientNowMs;
  }

  const offsetMs = serverNowMs - clientNowMs;
  setCachedTimeOffsetMs(offsetMs);
  return { serverNowMs, clientNowMs, offsetMs };
}

/**
 * Fetch /api/v1/time (or fallback /api/health) and cache the offset.
 */
export async function syncServerTime(fetchImpl: typeof fetch = fetch): Promise<ServerTimeSnapshot> {
  const clientBefore = Date.now();
  try {
    const res = await fetchImpl('/api/v1/time', { cache: 'no-store' });
    const clientAfter = Date.now();
    const clientNowMs = Math.floor((clientBefore + clientAfter) / 2);
    if (res.ok) {
      const body = (await res.json()) as {
        serverNowMs?: number;
        serverTimestamp?: number;
        timestamp?: string;
      };
      return computeOffsetFromServerPayload(body, clientNowMs);
    }
  } catch {
    // fall through to health
  }

  try {
    const res = await fetchImpl('/api/health', { cache: 'no-store' });
    const clientAfter = Date.now();
    const clientNowMs = Math.floor((clientBefore + clientAfter) / 2);
    if (res.ok) {
      const body = (await res.json()) as { timestamp?: string };
      return computeOffsetFromServerPayload(body, clientNowMs);
    }
  } catch {
    // ignore
  }

  return computeOffsetFromServerPayload({}, Date.now());
}
