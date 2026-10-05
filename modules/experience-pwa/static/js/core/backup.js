// js/core/backup.js — full Continuum backup and restore (DAT-01).
// Pure functions (no DOM, no network, no AI): export, validate, merge, restore.
// API keys and other secrets are never part of a backup (PRV-02).
export const BACKUP_FORMAT = 'continuum-backup';
export const SCHEMA_VERSION = 1;
export const APP_VERSION = '0.21';
// Lightweight preferences only. Anything not listed here is left out of the file.
export const PREFERENCE_KEYS = ['activePersona', 'enableBackgroundSync', 'OPENROUTER_MODEL', 'LLM_PROVIDER'];

// Stable JSON (sorted keys) so the same content always hashes the same.
export function canonicalJson(v) {
  if (Array.isArray(v)) return '[' + v.map(canonicalJson).join(',') + ']';
  if (v && typeof v === 'object') {
    return '{' + Object.keys(v).filter((k) => v[k] !== undefined).sort().map((k) => JSON.stringify(k) + ':' + canonicalJson(v[k])).join(',') + '}';
  }
  return JSON.stringify(v === undefined ? null : v);
}
export async function sha256Hex(text) {
  const buf = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const LIST_KEYS = ['clients', 'projects', 'timeline', 'notes', 'archived'];

export async function buildBackup(state, preferences = {}, now = new Date()) {
  const prefs = {};
  PREFERENCE_KEYS.forEach((k) => { if (preferences[k] != null) prefs[k] = String(preferences[k]); });
  const data = JSON.parse(JSON.stringify(state || {}));
  LIST_KEYS.forEach((k) => { if (!Array.isArray(data[k])) data[k] = []; });
  const body = { data, preferences: prefs };
  return {
    format: BACKUP_FORMAT,
    appVersion: APP_VERSION,
    schemaVersion: SCHEMA_VERSION,
    generatedAt: now.toISOString(),
    contentHash: await sha256Hex(canonicalJson(body)),
    counts: Object.fromEntries(LIST_KEYS.map((k) => [k, data[k].length])),
    ...body,
  };
}

// Returns { ok, errors[] }. Never mutates anything.
export async function validateBackup(b) {
  const errors = [];
  if (!b || typeof b !== 'object' || Array.isArray(b)) return { ok: false, errors: ['This file is not a Continuum backup.'] };
  if (b.format !== BACKUP_FORMAT) errors.push('This file is not a Continuum backup.');
  if (!Number.isInteger(b.schemaVersion)) errors.push('The backup has no schema version.');
  else if (b.schemaVersion > SCHEMA_VERSION) errors.push('This backup was made by a newer version of Continuum (schema ' + b.schemaVersion + ').');
  if (!b.data || typeof b.data !== 'object') errors.push('The backup contains no data.');
  else LIST_KEYS.forEach((k) => { if (!Array.isArray(b.data[k])) errors.push('The backup is missing its "' + k + '" list.'); });
  if (b.preferences != null && (typeof b.preferences !== 'object' || Array.isArray(b.preferences))) errors.push('The backup preferences are malformed.');
  if (!errors.length) {
    const expected = await sha256Hex(canonicalJson({ data: b.data, preferences: b.preferences || {} }));
    if (expected !== b.contentHash) errors.push('The backup content does not match its checksum; the file was changed or damaged.');
  }
  return { ok: errors.length === 0, errors };
}

const KEY_OF = { clients: (r) => r && (r.name || r.id), projects: (r) => r && (r.Project_ReferenceID || r.id), timeline: (r) => r && r.id, notes: (r) => r && r.id, archived: (r) => r && r.id };
function stamp(r) { const t = Date.parse((r && (r.updated_at || r.created_at)) || ''); return Number.isNaN(t) ? 0 : t; }

// Merge: keep everything already here, add what is missing, and for the same
// record take the incoming copy only if it is strictly newer.
export function mergeState(current, incoming) {
  const out = JSON.parse(JSON.stringify(current || {}));
  const stats = { added: 0, updated: 0, kept: 0 };
  LIST_KEYS.forEach((k) => {
    const list = Array.isArray(out[k]) ? out[k] : (out[k] = []);
    const keyOf = KEY_OF[k];
    const index = new Map(list.map((r, i) => [keyOf(r), i]));
    (incoming[k] || []).forEach((r) => {
      const id = keyOf(r);
      if (id == null) { list.push(JSON.parse(JSON.stringify(r))); stats.added++; return; }
      if (!index.has(id)) { index.set(id, list.length); list.push(JSON.parse(JSON.stringify(r))); stats.added++; }
      else if (stamp(r) > stamp(list[index.get(id)])) { list[index.get(id)] = JSON.parse(JSON.stringify(r)); stats.updated++; }
      else stats.kept++;
    });
  });
  return { state: out, stats };
}

// io = { read(): state, saveSnapshot(backup): Promise<boolean>, write(state): boolean, writePrefs(prefs): void }
// Order matters: validate -> snapshot current data -> write. Any failure before
// the write leaves current data untouched.
export async function restoreBackup(backup, mode, io, now = new Date()) {
  if (mode !== 'replace' && mode !== 'merge') return { ok: false, errors: ['Choose Replace or Merge.'] };
  const v = await validateBackup(backup);
  if (!v.ok) return { ok: false, errors: v.errors };
  const current = io.read();
  const snapshot = await buildBackup(current, {}, now);
  let saved = false;
  try { saved = await io.saveSnapshot(snapshot); } catch (e) { saved = false; }
  if (!saved) return { ok: false, errors: ['Could not save a safety copy of your current data, so nothing was changed.'] };
  let next; let stats = null;
  if (mode === 'replace') next = JSON.parse(JSON.stringify(backup.data));
  else { const m = mergeState(current, backup.data); next = m.state; stats = m.stats; }
  if (!io.write(next)) return { ok: false, errors: ['Your browser could not store the restored data, so nothing was changed.'] };
  try { if (io.writePrefs && mode === 'replace') io.writePrefs(backup.preferences || {}); } catch (e) { /* preferences are best effort */ }
  return { ok: true, mode, stats, snapshotHash: snapshot.contentHash };
}
