// persistence.js — ask the browser to keep Continuum data (DAT-04).
// Without this the browser may evict localStorage/IndexedDB under storage pressure.
export function describePersistence(info) {
  if (!info || !info.supported) return { level: 'unknown', text: 'This browser cannot tell whether your data is protected from automatic clean-up. Export a backup regularly.' };
  if (info.persisted) return { level: 'ok', text: 'Browser storage is protected: your data will not be cleared automatically.' };
  return { level: 'warn', text: 'The browser has not protected your data from automatic clean-up. Export a backup regularly.' };
}
export async function requestPersistence(nav = (typeof navigator !== 'undefined' ? navigator : null)) {
  const s = nav && nav.storage;
  if (!s || typeof s.persist !== 'function') return { supported: false, persisted: false };
  let persisted = false;
  try {
    persisted = typeof s.persisted === 'function' ? await s.persisted() : false;
    if (!persisted) persisted = !!(await s.persist());
  } catch (e) { persisted = false; }
  let usage = null, quota = null;
  try { if (typeof s.estimate === 'function') { const est = await s.estimate(); usage = est.usage; quota = est.quota; } } catch (e) { /* estimate is optional */ }
  return { supported: true, persisted, usage, quota };
}
