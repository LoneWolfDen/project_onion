// Project Onion PWA Service Worker — offline start, update prompt, background sync bridge.
// Layers: (1) localStorage queue `onion_vector_queue` (js/core/VectorSync.js) is the source of
// truth for vector sync and works without a SW; (2) this SW precaches the app shell so the app
// starts offline, and wakes pages on reconnect so they flush the queue.
//
// Rules (PWA-02):
//  - Versioned cache name; old caches are deleted on activate.
//  - Explicit precache list, generated: run `node scripts/gen-sw-precache.mjs` after adding files
//    (tests/pwa.test.mjs fails if the list is stale).
//  - No unconditional skipWaiting: a new worker waits and the page shows "Update available";
//    the page sends {type:'SKIP_WAITING'} only when the user accepts.
//  - Same-origin GETs are network-first (fresh when online, cached copy when offline).
//  - Card data and the vector API are never cached.
// Bump SW_VERSION whenever this file's logic or the precache list changes.
const SW_VERSION = 'continuum-sw-v11';
const CACHE = SW_VERSION;
const PRECACHE = [
  '/',
  '/index.html',
  '/css/components/banner.css',
  '/css/hierarchy.css',
  '/css/presentation.css',
  '/css/styles.css',
  '/css/tokens.css',
  '/css/typography.css',
  '/icons/apple-touch-icon.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
  '/js/components/AiSettings.js',
  '/js/components/App.js',
  '/js/components/AppCenter.js',
  '/js/components/AppLeft.js',
  '/js/components/AppRight.js',
  '/js/components/BackupPanel.js',
  '/js/components/ConfirmDialog.js',
  '/js/components/DiagnosticsPanel.js',
  '/js/components/HandoverModal.js',
  '/js/components/HarvesterPanel.js',
  '/js/components/ImportWizard.js',
  '/js/components/KnowledgePanel.js',
  '/js/components/MailImportDialog.js',
  '/js/components/OriginalsPanel.js',
  '/js/components/PiiSettings.js',
  '/js/components/ProjectModal.js',
  '/js/components/RadarPanel.js',
  '/js/components/StorageBanner.js',
  '/js/components/TimelineCard.js',
  '/js/components/UpdateBanner.js',
  '/js/constants/personas.js',
  '/js/constants/worldOfContinuum.js',
  '/js/core/AiClient.js',
  '/js/core/FailoverDB.js',
  '/js/core/PiiGate.js',
  '/js/core/VectorSync.js',
  '/js/core/aiConfig.js',
  '/js/core/backup.js',
  '/js/core/compounding.js',
  '/js/core/confidence.js',
  '/js/core/destructive.js',
  '/js/core/exportPackage.js',
  '/js/core/handover.js',
  '/js/core/importEngine.js',
  '/js/core/importTemplates.js',
  '/js/core/knowledge.js',
  '/js/core/layoutFlag.js',
  '/js/core/logger.js',
  '/js/core/mailImport.js',
  '/js/core/matchExplain.js',
  '/js/core/persistence.js',
  '/js/core/pii.js',
  '/js/core/presentation.js',
  '/js/core/pwa.js',
  '/js/core/radar.js',
  '/js/core/repo.js',
  '/js/core/schema.js',
  '/js/core/source.js',
  '/js/core/storageGuard.js',
  '/js/core/timeAgo.js',
  '/js/core/zip.js',
  '/js/data/demoDataset.js',
  '/js/data/mockSeed.js',
  '/js/data/seedData.v2.js',
  '/js/main.js',
  '/js/vendor/htm.umd.js',
  '/js/vendor/react-dom.production.min.js',
  '/js/vendor/react.production.min.js',
  '/js/vendor/xlsx.full.min.js',
  '/manifest.webmanifest'
];
const VECTOR_PATHS = ['/ingest', '/delete', '/health', '/ask', '/list'];
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // cache: 'reload' bypasses the HTTP cache so the precache is never built from stale copies.
    await Promise.all(PRECACHE.map(async (u) => {
      try { const res = await fetch(new Request(u, { cache: 'reload' })); if (res && res.ok) await cache.put(u, res); } catch (e) { /* offline during install: runtime caching fills the gap */ }
    }));
  })());
});
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try { const keys = await caches.keys(); await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))); } catch (e) {}
    try { await self.clients.claim(); } catch (e) {}
  })());
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
  const u = new URL(url);
  if (u.origin !== self.location.origin || u.pathname === '/sw.js') return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const res = await fetch(req);
      if (res && res.ok && PRECACHE.indexOf(u.pathname) >= 0) { try { cache.put(u.pathname, res.clone()); } catch (e) {} }
      return res;
    } catch (e) {
      const hit = await cache.match(u.pathname, { ignoreSearch: true });
      if (hit) return hit;
      if (req.mode === 'navigate') { const shell = await cache.match('/index.html'); if (shell) return shell; }
      return new Response('Offline', { status: 503 });
    }
  })());
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
  if (d && d.type === 'SKIP_WAITING') { try { self.skipWaiting(); } catch (e) {} return; }
  if (d && d.type === 'onion:register-sync' && self.registration && self.registration.sync) {
    try { event.waitUntil(self.registration.sync.register('onion-vector-sync')); } catch (e) {}
  }
});
