// js/core/storageGuard.js — makes storage failures visible (DAT-02).
// Holds the current storage problem, classifies errors into plain-language
// messages, and retains corrupt raw state so it is never overwritten.
// Only codes, operations and timestamps are recorded: never card content.
let status = null; // { code, op, at, message, recoveryKey }
const LOG_KEY = 'onion_storage_log';
const LOG_MAX = 20;

export function describeStorageError(err, op) {
  const name = String((err && err.name) || '');
  const msg = String((err && err.message) || '');
  let code = 'unknown';
  if (/quota/i.test(name) || /quota|exceeded the storage/i.test(msg) || (err && err.code === 22)) code = 'quota';
  else if (/security/i.test(name) || /denied|not allowed|insecure/i.test(msg)) code = 'denied';
  else if (/syntax/i.test(name) || op === 'parse') code = 'parse';
  const message = {
    quota: 'Your browser storage is full, so your latest change was NOT saved. Export a backup, free up space, then try again.',
    denied: 'Your browser is blocking storage for this site (private mode or blocked site data), so changes cannot be saved. Allow site data for this page, then reload.',
    parse: 'Saved data could not be read and may be damaged. Nothing was overwritten. Download the recovery file below and keep it safe before making changes.',
    readonly: 'The app is in read-only mode to protect your saved data, so changes are NOT being saved.',
    unknown: 'Your latest change could not be saved to this browser. Try again; if it keeps failing, export a backup.',
  }[code];
  return { code, op: op || 'unknown', message };
}

function appendLog(entry) {
  try {
    const log = JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
    log.push({ at: entry.at, code: entry.code, op: entry.op });
    localStorage.setItem(LOG_KEY, JSON.stringify(log.slice(-LOG_MAX)));
  } catch (e) { /* logging must never throw */ }
}

function emit() {
  try { window.dispatchEvent(new CustomEvent('onion:storage-error', { detail: status })); } catch (e) {}
}

export function reportStorageError(err, op, extra) {
  const d = describeStorageError(err, op);
  status = { ...d, at: new Date().toISOString(), recoveryKey: (extra && extra.recoveryKey) || null };
  if (extra && extra.code) { status.code = extra.code; if (extra.message) status.message = extra.message; }
  appendLog(status);
  emit();
  return status;
}

export function clearStorageError() {
  // A corrupt-state problem stays until the user resolves it; write errors clear on the next good write.
  if (!status || status.code === 'parse' || status.code === 'readonly') return;
  status = null;
  emit();
}

export function getStorageStatus() { return status; }
export function isReadOnly() { return !!status && (status.code === 'parse' || status.code === 'readonly'); }

// Keep the unreadable raw string under a dated key so it can be recovered.
let lastRetained = { raw: null, key: null };
export function retainCorruptRaw(raw, now) {
  // readLocal runs often; retain each distinct corrupt value only once.
  if (lastRetained.raw === raw && lastRetained.key) return lastRetained.key;
  const key = 'onion_db_corrupt_' + new Date(now || Date.now()).toISOString().replace(/[:.]/g, '-');
  try { localStorage.setItem(key, String(raw)); lastRetained = { raw, key }; return key; } catch (e) { return null; }
}

export function readRecovery(key) {
  try { return key ? localStorage.getItem(key) : null; } catch (e) { return null; }
}

// Write that reports instead of swallowing. Returns true only if the value was stored.
export function safeSetItem(key, value, op) {
  try { localStorage.setItem(key, value); clearStorageError(); return true; }
  catch (err) { reportStorageError(err, op || 'write'); return false; }
}

// Called once the user has restored or discarded the damaged data.
export function resolveStorageProblem() { status = null; lastRetained = { raw: null, key: null }; emit(); }
