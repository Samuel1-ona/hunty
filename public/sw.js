const CACHE_VERSION = 'v1';
const STATIC_CACHE = `hunty-static-${CACHE_VERSION}`;
const API_CACHE = `hunty-api-${CACHE_VERSION}`;
const OFFLINE_URL = '/offline.html';

// Static assets to pre-cache on install
const STATIC_ASSETS = [
  '/',
  '/offline.html',
  '/favicon.ico',
];

// ── Install: pre-cache static assets ─────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// ── Activate: clean up old caches ────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE && k !== API_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
  // Notify all clients that a new SW version is active
  self.clients.matchAll().then((clients) =>
    clients.forEach((client) => client.postMessage({ type: 'SW_UPDATED' }))
  );
});

// ── Fetch: routing strategy ───────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin requests
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  // API routes: network-first, fall back to cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstWithCache(request, API_CACHE));
    return;
  }

  // Static assets (CSS, JS, images, fonts): cache-first
  if (/\.(js|css|png|jpg|jpeg|svg|gif|webp|woff2?|ico)$/i.test(url.pathname)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Navigation requests: network-first, fall back to offline page
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }
});

// ── Background Sync: replay queued actions ───────────────────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'hunty-sync') {
    event.waitUntil(replayPendingActions());
  }
});

async function replayPendingActions() {
  const db = await openDB();
  const tx = db.transaction('pendingActions', 'readwrite');
  const store = tx.objectStore('pendingActions');
  const all = await idbGetAll(store);

  for (const action of all) {
    try {
      await fetch(action.url, {
        method: action.method,
        headers: action.headers,
        body: action.body,
      });
      store.delete(action.id);
    } catch {
      // Leave failed actions in the queue for next sync attempt
    }
  }
}

// ── Cache helpers ─────────────────────────────────────────────────────────────
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
  }
  return response;
}

async function networkFirstWithCache(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response(JSON.stringify({ error: 'offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// ── Minimal IndexedDB helpers (no dependencies) ───────────────────────────────
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('hunty-sw', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('pendingActions', { keyPath: 'id', autoIncrement: true });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbGetAll(store) {
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
