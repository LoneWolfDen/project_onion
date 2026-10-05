// js/core/pwa.js — service worker registration and the "Update available" flow (PWA-02).
// A new worker waits (sw.js has no unconditional skipWaiting); the page tells the user and,
// only on accept, asks the worker to take over and reloads once.
export const UPDATE_EVENT = 'onion:sw-update';

// Calls onWaiting(worker) when a new worker is installed and an older one still controls the page.
export function watchRegistration(reg, onWaiting, hasController = () => !!(globalThis.navigator && navigator.serviceWorker && navigator.serviceWorker.controller)) {
  if (!reg) return;
  const check = (w) => { if (w && w.state === 'installed' && hasController()) onWaiting(w); };
  if (reg.waiting && hasController()) onWaiting(reg.waiting);
  reg.addEventListener('updatefound', () => {
    const w = reg.installing;
    if (!w) return;
    w.addEventListener('statechange', () => check(w));
  });
}

export function applyUpdate(worker, reload = () => location.reload(), sw = globalThis.navigator && navigator.serviceWorker) {
  if (!worker) return false;
  let done = false;
  if (sw && sw.addEventListener) sw.addEventListener('controllerchange', () => { if (!done) { done = true; reload(); } });
  worker.postMessage({ type: 'SKIP_WAITING' });
  return true;
}

export function registerServiceWorker() {
  try {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator) || window.isSecureContext === false) return;
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      try { if (reg && reg.sync) reg.sync.register('onion-vector-sync').catch(() => {}); } catch (e) {}
      watchRegistration(reg, (worker) => { window.__onionWaitingWorker = worker; window.dispatchEvent(new CustomEvent(UPDATE_EVENT)); });
      // Look for a new version whenever the app is reopened or comes back online.
      const poll = () => { try { reg.update(); } catch (e) {} };
      window.addEventListener('online', poll);
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') poll(); });
    }).catch(() => { /* the localStorage queue still works without a service worker */ });
  } catch (e) { /* ignore */ }
}
