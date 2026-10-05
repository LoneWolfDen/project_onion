// js/core/logger.js — safe local logger and Diagnostics export (OPS-01/02).
// Rules: an event is a module name, an event code and a few counters. Never card text, titles,
// names, emails, file contents or error messages. Strings in `data` must be short lowercase tokens
// (no spaces, no @, no long digit runs); anything else is dropped and counted. The log is bounded
// and stays on this device until the user previews and downloads it.
export const MAX_EVENTS = 200;
export const LOG_KEY = 'continuum_diag_log';
const LEVELS = ['info', 'warn', 'error'];
const MODULE_RE = /^[a-z][a-z0-9_]{1,24}$/;
const CODE_RE = /^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+$/;
const KEY_RE = /^[a-z][a-zA-Z0-9_]{0,24}$/;
const TOKEN_RE = /^[a-z0-9_.:-]{1,40}$/;

function cleanValue(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? Math.round(v * 1000) / 1000 : undefined;
  if (typeof v === 'boolean') return v;
  if (typeof v === 'string' && TOKEN_RE.test(v) && !/\d{7,}/.test(v)) return v;
  return undefined;
}
export function sanitizeEvent(e, now = new Date()) {
  const ev = e || {};
  if (!MODULE_RE.test(String(ev.module || '')) || !CODE_RE.test(String(ev.code || ''))) return null;
  const out = { at: now.toISOString(), level: LEVELS.includes(ev.level) ? ev.level : 'info', module: ev.module, code: ev.code };
  const data = {}; let dropped = 0;
  Object.keys(ev.data && typeof ev.data === 'object' ? ev.data : {}).slice(0, 12).forEach((k) => {
    const v = KEY_RE.test(k) ? cleanValue(ev.data[k]) : undefined;
    if (v === undefined) dropped += 1; else data[k] = v;
  });
  if (Object.keys(data).length) out.data = data;
  if (dropped) out.dropped = dropped;
  return out;
}

// store: { get(): string | null, set(text) }. Failures never throw: logging must not break the app.
export function createLogger(store, nowFn = () => new Date()) {
  const read = () => { try { const a = JSON.parse(store.get() || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } };
  const write = (a) => { try { store.set(JSON.stringify(a)); } catch (e) { /* full or blocked: drop it */ } };
  return {
    log(module, code, data, level) {
      const ev = sanitizeEvent({ module, code, data, level }, nowFn());
      if (!ev) return false;
      write(read().concat([ev]).slice(-MAX_EVENTS));
      return true;
    },
    events: read,
    clear() { write([]); },
    // Exactly what would be downloaded, so the user can read it first.
    exportText(meta = {}) {
      const m = {};
      ['appVersion', 'swVersion', 'storageMode'].forEach((k) => { if (meta[k]) m[k] = String(meta[k]).slice(0, 40); });
      return JSON.stringify({ format: 'continuum-diagnostics', generatedAt: nowFn().toISOString(), ...m, events: read() }, null, 2);
    },
  };
}

const fileToken = (f) => { const base = String(f || '').split(/[?#]/)[0].split('/').pop().toLowerCase().replace(/[^a-z0-9_.-]/g, ''); return base.slice(0, 40) || 'unknown'; };
const nameToken = (n) => String(n || 'error').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 30) || 'error';

// Global handlers keep only the error class name and where it happened, never the message.
export function installGlobalHandlers(logger, win) {
  const onError = (ev) => {
    const err = ev && ev.error;
    logger.log('app', 'app.uncaught_error', { name: nameToken(err && err.name), file: fileToken(ev && ev.filename), line: ev && ev.lineno, col: ev && ev.colno }, 'error');
  };
  const onRejection = (ev) => {
    const r = ev && ev.reason;
    logger.log('app', 'app.unhandled_rejection', { name: nameToken(r && r.name) }, 'error');
  };
  win.addEventListener('error', onError); win.addEventListener('unhandledrejection', onRejection);
  return () => { win.removeEventListener('error', onError); win.removeEventListener('unhandledrejection', onRejection); };
}

export const browserStore = {
  get: () => { try { return localStorage.getItem(LOG_KEY); } catch (e) { return null; } },
  set: (t) => { localStorage.setItem(LOG_KEY, t); },
};
let shared = null;
export function logger() { if (!shared) shared = createLogger(browserStore); return shared; }
export const logEvent = (module, code, data, level) => { try { return logger().log(module, code, data, level); } catch (e) { return false; } };
