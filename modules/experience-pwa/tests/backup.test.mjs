// Run: node --test modules/experience-pwa/tests/
// DAT-01: backup/restore round trip, validation, Replace/Merge, safety copy.
import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => { store.set(k, String(v)); },
  removeItem: (k) => { store.delete(k); },
};
globalThis.window = { addEventListener() {}, removeEventListener() {}, dispatchEvent: () => true };
Object.defineProperty(globalThis, 'navigator', { value: { onLine: true }, configurable: true, writable: true });
const realSetInterval = globalThis.setInterval;
const realSetTimeout = globalThis.setTimeout;
globalThis.setInterval = () => 0;
globalThis.setTimeout = () => 0;
const B = await import('../static/js/core/backup.js');
const DB = await import('../static/js/core/FailoverDB.js');
const SG = await import('../static/js/core/storageGuard.js');
globalThis.setInterval = realSetInterval;
globalThis.setTimeout = realSetTimeout;

const sample = () => ({
  clients: [{ name: 'Acme Corp' }],
  projects: [{ Project_ReferenceID: 'P-1', project_name: 'Apollo' }],
  timeline: [{ id: 'c1', title: 'One', updated_at: '2026-01-01T00:00:00Z', nodes: [{ kind: 'RAW', text: 'x' }] }],
  notes: [{ id: 'n1', text: 'note' }],
  archived: [],
});
const mkIo = (state, over = {}) => {
  let cur = JSON.parse(JSON.stringify(state)); const snaps = []; let prefs = null;
  return {
    get cur() { return cur; }, snaps, get prefs() { return prefs; },
    read: () => cur,
    saveSnapshot: async (s) => { snaps.push(s); return true; },
    write: (s) => { cur = s; return true; },
    writePrefs: (p) => { prefs = p; },
    ...over,
  };
};
beforeEach(() => { store.clear(); SG.resolveStorageProblem(); });

test('export has required metadata and counts', async () => {
  const b = await B.buildBackup(sample(), { activePersona: 'Brené' }, new Date('2026-10-05T10:00:00Z'));
  assert.equal(b.format, 'continuum-backup');
  assert.equal(b.generatedAt, '2026-10-05T10:00:00.000Z');
  assert.equal(b.schemaVersion, B.SCHEMA_VERSION);
  assert.ok(b.appVersion);
  assert.match(b.contentHash, /^[0-9a-f]{64}$/);
  assert.deepEqual(b.counts, { clients: 1, projects: 1, timeline: 1, notes: 1, archived: 0 });
  assert.deepEqual((await B.validateBackup(b)).errors, []);
});

test('backups never contain API keys or unlisted settings', async () => {
  const b = await B.buildBackup(sample(), { OPENROUTER_API_KEY: 'sk-secret', ANTHROPIC_API_KEY: 'k', activePersona: 'Daniel' });
  assert.deepEqual(Object.keys(b.preferences), ['activePersona']);
  assert.ok(!JSON.stringify(b).includes('sk-secret'));
});

test('same content gives the same hash regardless of key order', async () => {
  const a = await B.buildBackup({ clients: [{ a: 1, b: 2 }], projects: [], timeline: [], notes: [], archived: [] });
  const b = await B.buildBackup({ clients: [{ b: 2, a: 1 }], projects: [], timeline: [], notes: [], archived: [] });
  assert.equal(a.contentHash, b.contentHash);
});

test('validation rejects wrong format, newer schema, missing lists and tampering', async () => {
  const good = await B.buildBackup(sample());
  assert.equal((await B.validateBackup(null)).ok, false);
  assert.equal((await B.validateBackup({ hello: 1 })).ok, false);
  assert.equal((await B.validateBackup({ ...good, schemaVersion: 99 })).ok, false);
  const missing = JSON.parse(JSON.stringify(good)); delete missing.data.notes;
  assert.equal((await B.validateBackup(missing)).ok, false);
  const tampered = JSON.parse(JSON.stringify(good)); tampered.data.timeline[0].title = 'Changed';
  const r = await B.validateBackup(tampered);
  assert.equal(r.ok, false);
  assert.match(r.errors.join(' '), /checksum/);
});

test('invalid import changes nothing and takes no snapshot', async () => {
  const io = mkIo(sample());
  const bad = await B.buildBackup(sample()); bad.data.timeline[0].title = 'Changed';
  const r = await B.restoreBackup(bad, 'replace', io);
  assert.equal(r.ok, false);
  assert.deepEqual(io.cur, sample());
  assert.equal(io.snaps.length, 0);
});

test('replace restores an equivalent state and snapshots the previous data first', async () => {
  const original = sample();
  const backup = await B.buildBackup(original, { activePersona: 'Malcolm' });
  const io = mkIo({ clients: [], projects: [], timeline: [{ id: 'other' }], notes: [], archived: [] });
  const r = await B.restoreBackup(backup, 'replace', io);
  assert.equal(r.ok, true);
  assert.deepEqual(io.cur, backup.data);
  assert.equal(io.snaps.length, 1);
  assert.equal(io.snaps[0].data.timeline[0].id, 'other', 'safety copy holds the replaced data');
  assert.deepEqual(io.prefs, { activePersona: 'Malcolm' });
});

test('merge keeps existing records, adds missing ones, and only takes strictly newer copies', async () => {
  const incoming = sample();
  incoming.timeline = [
    { id: 'c1', title: 'Older copy', updated_at: '2025-01-01T00:00:00Z' },
    { id: 'c2', title: 'New card', updated_at: '2026-02-01T00:00:00Z' },
  ];
  const backup = await B.buildBackup(incoming);
  const io = mkIo(sample());
  const r = await B.restoreBackup(backup, 'merge', io);
  assert.equal(r.ok, true);
  assert.equal(r.stats.added, 1);
  assert.equal(r.stats.updated, 0);
  const ids = io.cur.timeline.map((c) => c.id).sort();
  assert.deepEqual(ids, ['c1', 'c2']);
  assert.equal(io.cur.timeline.find((c) => c.id === 'c1').title, 'One');
  assert.equal(io.cur.clients.length, 1, 'duplicate client not added');
  const newer = { ...incoming, timeline: [{ id: 'c1', title: 'Newer', updated_at: '2026-06-01T00:00:00Z' }] };
  const io2 = mkIo(sample());
  await B.restoreBackup(await B.buildBackup(newer), 'merge', io2);
  assert.equal(io2.cur.timeline.find((c) => c.id === 'c1').title, 'Newer');
});

test('if the safety copy cannot be saved, nothing changes', async () => {
  const io = mkIo(sample(), { saveSnapshot: async () => false });
  const r = await B.restoreBackup(await B.buildBackup({ clients: [], projects: [], timeline: [], notes: [], archived: [] }), 'replace', io);
  assert.equal(r.ok, false);
  assert.deepEqual(io.cur, sample());
});

test('if the final write fails, the result says so', async () => {
  const io = mkIo(sample(), { write: () => false });
  const r = await B.restoreBackup(await B.buildBackup(sample()), 'replace', io);
  assert.equal(r.ok, false);
  assert.match(r.errors[0], /nothing was changed/);
});

test('unknown mode is rejected', async () => {
  const r = await B.restoreBackup(await B.buildBackup(sample()), 'overwrite', mkIo(sample()));
  assert.equal(r.ok, false);
});

test('round trip through real storage into a fresh browser', async () => {
  DB.tryWriteLocal(sample());
  const backup = await B.buildBackup(DB.readLocal());
  const file = JSON.parse(JSON.stringify(backup)); // as if saved and re-opened
  store.clear(); // fresh browser
  const io = { read: () => DB.readLocal(), saveSnapshot: async () => true, write: (s) => DB.tryWriteLocal(s, { force: true }), writePrefs() {} };
  const r = await B.restoreBackup(file, 'replace', io);
  assert.equal(r.ok, true);
  const after = DB.readLocal();
  assert.deepEqual(after.timeline.map((c) => c.id), ['c1']);
  assert.deepEqual(after.clients, [{ name: 'Acme Corp' }]);
});

test('restore is the way out of read-only mode after corrupt state', async () => {
  store.set('onion_db_state', '{bad');
  DB.readLocal();
  assert.equal(SG.isReadOnly(), true);
  assert.equal(DB.tryWriteLocal(sample()), false, 'normal writes are refused');
  const r = await B.restoreBackup(await B.buildBackup(sample()), 'replace',
    { read: () => ({}), saveSnapshot: async () => true, write: (s) => DB.tryWriteLocal(s, { force: true }), writePrefs() {} });
  assert.equal(r.ok, true);
  assert.equal(SG.isReadOnly(), false);
  assert.equal(DB.readLocal().timeline[0].id, 'c1');
});
