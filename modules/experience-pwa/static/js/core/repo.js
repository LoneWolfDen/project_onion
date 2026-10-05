// js/core/repo.js — where the main state lives (DAT-03).
// The app reads state synchronously in many places, so the Repo keeps the whole state in memory
// and persists every change to IndexedDB (no 5 MB localStorage quota). localStorage keeps a
// best-effort mirror so older readers, and a rollback, still work.
//
// Boot (initRepo, before the app renders):
//   1. IndexedDB has state                -> use it.
//   2. IndexedDB empty, localStorage has readable state -> one-time migration: dated backup copy
//      of the localStorage text, write to IndexedDB, read back and compare. Any failure leaves
//      localStorage as the store and nothing is lost; the next boot simply retries.
//   3. IndexedDB unavailable and never used -> plain localStorage mode (same as before).
//   4. IndexedDB was used before but cannot be read now -> explicit read-only mode, so a stale
//      mirror can never overwrite newer data.
import { reportStorageError, clearStorageError } from './storageGuard.js';

export const STORAGE_KEY = 'onion_db_state';
export const MODE_KEY = 'continuum_storage_mode';
export const BACKUP_PREFIX = 'onion_db_state_premigrate_';
const DB_NAME = 'continuum-db', STORE = 'kv', IDB_KEY = 'state';
const CHANNEL = 'continuum-state';
const RETRIES = 3;

const st = { mode: 'localStorage', cache: null, store: null, queue: null, writing: null, reason: '', migrated: false, channel: null };
const ls = {
  get: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set: (k, v) => { localStorage.setItem(k, v); },
  del: (k) => { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } },
};

// Minimal promise wrapper around one IndexedDB key/value store.
export function createIdbStore(factory) {
  const f = factory || (typeof indexedDB !== 'undefined' ? indexedDB : null);
  if (!f) return null;
  let db = null;
  const tx = (mode, fn) => new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode); const r = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve(r && r.result); t.onerror = () => reject(t.error); t.onabort = () => reject(t.error || new Error('aborted'));
  });
  return {
    open: () => new Promise((resolve, reject) => {
      const req = f.open(DB_NAME, 1);
      req.onupgradeneeded = () => { req.result.createObjectStore(STORE); };
      req.onsuccess = () => { db = req.result; resolve(); };
      req.onerror = () => reject(req.error); req.onblocked = () => reject(new Error('blocked'));
    }),
    get: async () => { const v = await tx('readonly', (s) => s.get(IDB_KEY)); return v == null ? null : v; },
    put: (text) => tx('readwrite', (s) => s.put(text, IDB_KEY)),
    del: () => tx('readwrite', (s) => s.delete(IDB_KEY)),
  };
}

const parseable = (raw) => { try { const v = JSON.parse(raw); return !!v && typeof v === 'object'; } catch (e) { return false; } };
const stamp = (d) => d.toISOString().slice(0, 10).replace(/-/g, '');

export async function initRepo(opts = {}) {
  const store = opts.store === undefined ? createIdbStore() : opts.store;
  const now = opts.now || new Date();
  Object.assign(st, { mode: 'localStorage', cache: null, store: null, queue: null, writing: null, reason: '', migrated: false });
  const usedBefore = ls.get(MODE_KEY) === 'idb';
  if (!store) { st.reason = 'indexeddb-unavailable'; if (usedBefore) goReadOnly('IndexedDB is not available in this browser'); return status(); }
  try {
    await store.open();
    const fromIdb = await store.get();
    const lsRaw = ls.get(STORAGE_KEY);
    if (fromIdb != null) st.cache = fromIdb;
    else if (lsRaw != null && lsRaw !== '') {
      if (!parseable(lsRaw)) { st.reason = 'local-data-unreadable'; return status(); } // existing corrupt-data flow handles it
      const bk = BACKUP_PREFIX + stamp(now);
      if (ls.get(bk) == null) { try { ls.set(bk, lsRaw); } catch (e) { /* backup is best effort: the original stays in place anyway */ } }
      await store.put(lsRaw);
      if ((await store.get()) !== lsRaw) throw new Error('migration check failed');
      st.cache = lsRaw; st.migrated = true;
    }
    st.store = store; st.mode = 'idb';
    try { ls.set(MODE_KEY, 'idb'); } catch (e) { /* marker only guards read-only fallback */ }
    listen();
  } catch (e) {
    st.reason = String((e && e.message) || e); st.mode = 'localStorage'; st.store = null; st.cache = null;
    if (usedBefore) goReadOnly('Your data store could not be opened (' + st.reason + ')');
  }
  return status();
}
function goReadOnly(why) {
  reportStorageError(null, 'write', { code: 'readonly', message: 'The app is in read-only mode to protect your saved data: ' + why + '. You can still read and export. Reload to try again.' });
}
export function status() { return { mode: st.mode, migrated: st.migrated, reason: st.reason }; }
export function repoMode() { return st.mode; }

export function getRaw() { return st.mode === 'idb' ? st.cache : ls.get(STORAGE_KEY); }
// Synchronous. In localStorage mode a refused write throws (callers report it). In IndexedDB mode the
// write is queued, so a later failure is reported through the storage banner instead.
export function setRaw(text) {
  if (st.mode !== 'idb') { ls.set(STORAGE_KEY, text); return; }
  st.cache = text;
  try { ls.set(STORAGE_KEY, text); } catch (e) { /* mirror is best effort */ }
  enqueue({ op: 'put', text });
}
export function removeRaw() {
  ls.del(STORAGE_KEY);
  if (st.mode !== 'idb') return;
  st.cache = null; enqueue({ op: 'del' });
}
function enqueue(job) { st.queue = job; if (!st.writing) st.writing = drain(); }
async function drain() {
  let tries = 0;
  while (st.queue) {
    const job = st.queue; st.queue = null;
    try {
      if (job.op === 'put') await st.store.put(job.text); else await st.store.del();
      tries = 0; clearStorageError();
      try { if (st.channel) st.channel.postMessage({ type: 'changed' }); } catch (e) { /* ignore */ }
    } catch (e) {
      tries += 1; if (!st.queue) st.queue = job; // newer job wins, otherwise retry this one
      reportStorageError(e, 'write');
      if (tries >= RETRIES) break;
      await new Promise((r) => setTimeout(r, 400 * tries));
    }
  }
  st.writing = null;
}
export function flushRepo() { return st.writing || Promise.resolve(); }
export function pendingWrite() { return !!st.queue || !!st.writing; }

// Other tabs: pick up their changes so this tab never overwrites them with a stale copy.
function listen() {
  try {
    if (typeof BroadcastChannel === 'undefined' || st.channel) return;
    st.channel = new BroadcastChannel(CHANNEL);
    if (typeof st.channel.unref === 'function') st.channel.unref(); // never keep a Node process alive (tests)
    st.channel.onmessage = async () => {
      try {
        if (st.writing || st.queue) return; // our own newer write will follow
        const v = await st.store.get();
        if (v !== st.cache) { st.cache = v; window.dispatchEvent(new CustomEvent('onion:db-update', { detail: { at: new Date().toISOString(), source: 'other-tab' } })); }
      } catch (e) { /* keep current copy */ }
    };
  } catch (e) { /* single-tab only */ }
}
