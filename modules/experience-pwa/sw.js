// Project Onion PWA Service Worker — offline-first background sync queue.
// STRATEGY (per plan: Service Worker OR localStorage queue):
// We implement BOTH layers: (1) localStorage queue `onion_vector_queue` owned
// by js/core/VectorSync.js is the source of truth — it works even when the SW
// is not installed; (2) this SW provides Background Sync + opportunistic
// replay so queued {upsert->POST /ingest, delete->DELETE|POST /delete} ops
// flush automatically when connectivity returns, plus offline navigation fallback.
// Cache-first for same-origin GET (app shell), network-first for vector API.
const SW_VERSION = 'onion-sw-v1-privacyfix';
const VECTOR_PATHS = ['/ingest', '/delete', '/health', '/ask'];
function vectorBase() { return 'http://localhost:8006'; }
self.addEventListener('install', (event) => {
  try { self.skipWaiting(); } catch (e) {}
});
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => { try { await self.clients.claim(); } catch (e) {} })());
});
function isVectorRequest(url) {
  try {
    const u = new URL(url);
    return u.port === '8006' || VECTOR_PATHS.some((p) => u.pathname === p || u.pathname.endsWith(p));
  } catch (e) { return false; }
}
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (!req || req.method !== 'GET') return; // Never cache mutation POSTs.
  const url = req.url || '';
  if (isVectorRequest(url)) {
    event.respondWith((async () => {
      try {
        const res = await fetch(req);
        try { await notifyClients({ type: 'onion:vector-online' }); } catch (e) {}
        return res;
      } catch (e) {
        try { await notifyClients({ type: 'onion:vector-offline' }); } catch (e2) {}
        return new Response(JSON.stringify({ status: 'queued_offline' }), { status: 503, headers: { 'Content-Type': 'application/json' } });
      }
    })());
    return;
  }
  if (event.request.url && new URL(event.request.url).origin === self.location.origin) {
    event.respondWith((async () => {
      try {
        const cache = await caches.open(SW_VERSION);
        const cached = await cache.match(req, { ignoreSearch: false });
        const live = fetch(req).then((res) => {
          try { if (res && res.ok) cache.put(req, res.clone()); } catch (e) {}
          return res;
        }).catch(() => null);
        if (cached) return cached;
        const net = await live;
        if (net) return net;
        if (req.mode === 'navigate') {
          const fallback = await cache.match('/index.html').catch(() => null);
          if (fallback) return fallback;
        }
        return new Response('Offline', { status: 503 });
      } catch (e) {
        return fetch(req).catch(() => new Response('Offline', { status: 503 }));
      }
    })());
  }
});
async function notifyClients(msg) {
  try {
    const list = await self.clients.matchAll({ type: 'window' });
    list.forEach((c) => { try { c.postMessage(msg); } catch (e) {} });
  } catch (e) {}
}
// Background Sync: browser wakes SW on reconnect — tell pages to flush queue.
self.addEventListener('sync', (event) => {
  if (event.tag === 'onion-vector-sync') {
    event.waitUntil(notifyClients({ type: 'onion:flush-vector-queue' }));
  }
});
self.addEventListener('message', (event) => {
  const d = (event && event.data) || {};
  if (d && d.type === 'onion:register-sync' && self.registration && self.registration.sync) {
    try { event.waitUntil(self.registration.sync.register('onion-vector-sync')); } catch (e) {}
  }
});
