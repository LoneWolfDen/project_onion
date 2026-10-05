// Run: node --test modules/experience-pwa/tests/
// DAT-02: storage failures must be visible, corrupt state must be kept, and a
// failed write must never look like a success.
import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const store = new Map();
let failWrites = null; // null | Error to throw from setItem
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => { if (failWrites) throw failWrites; store.set(k, String(v)); },
  removeItem: (k) => { store.delete(k); },
};
const events = [];
globalThis.window = { addEventListener() {}, removeEventListener() {}, dispatchEvent: (e) => { events.push(e); return true; } };
Object.defineProperty(globalThis, 'navigator', { value: { onLine: true }, configurable: true, writable: true });
const realSetInterval = globalThis.setInterval;
const realSetTimeout = globalThis.setTimeout;
globalThis.setInterval = () => 0;
globalThis.setTimeout = () => 0;
const DB = await import('../static/js/core/FailoverDB.js');
const SG = await import('../static/js/core/storageGuard.js');
globalThis.setInterval = realSetInterval;
globalThis.setTimeout = realSetTimeout;

const KEY = 'onion_db_state';
const kinds = () => events.map((e) => e.type);

beforeEach(() => {
  store.clear(); events.length = 0; failWrites = null;
  SG.resolveStorageProblem(); events.length = 0;
});

test('quota error on write is reported, not shown as saved', () => {
  failWrites = Object.assign(new Error('The quota has been exceeded.'), { name: 'QuotaExceededError' });
  DB.writeLocal({ clients: [], projects: [], timeline: [{ id: 'c1' }], notes: [], archived: [] });
  assert.ok(kinds().includes('onion:storage-error'));
  assert.ok(!kinds().includes('onion:db-update'), 'no success event after a failed write');
  const st = SG.getStorageStatus();
  assert.equal(st.code, 'quota');
  assert.match(st.message, /NOT saved/);
});

test('successful write emits db-update and clears an earlier write error', () => {
  failWrites = new Error('boom');
  DB.writeLocal({ timeline: [] });
  assert.ok(SG.getStorageStatus());
  failWrites = null;
  DB.writeLocal({ timeline: [] });
  assert.equal(SG.getStorageStatus(), null);
  assert.ok(kinds().includes('onion:db-update'));
});

test('corrupt saved state is retained, reported, and not overwritten', () => {
  const corrupt = '{"timeline":[{"id":"precious"';
  store.set(KEY, corrupt);
  const s = DB.readLocal();
  assert.deepEqual(s.timeline, []);
  const st = SG.getStorageStatus();
  assert.equal(st.code, 'parse');
  assert.ok(st.recoveryKey && st.recoveryKey.startsWith('onion_db_corrupt_'));
  assert.equal(store.get(st.recoveryKey), corrupt, 'raw copy kept under recovery key');
  // The placeholder empty state must not replace the damaged original.
  DB.writeLocal(s);
  assert.equal(store.get(KEY), corrupt);
  assert.equal(SG.getStorageStatus().code, 'readonly');
});

test('reading corrupt state repeatedly keeps one recovery copy', () => {
  store.set(KEY, '{bad');
  DB.readLocal(); DB.readLocal(); DB.readLocal();
  assert.equal([...store.keys()].filter((k) => k.startsWith('onion_db_corrupt_')).length, 1);
});

test('valid data is not touched by a failed read of another key', () => {
  const good = JSON.stringify({ clients: [], projects: [], timeline: [{ id: 'keep' }], notes: [], archived: [] });
  store.set(KEY, good);
  const s = DB.readLocal();
  assert.equal(s.timeline[0].id, 'keep');
  assert.equal(SG.getStorageStatus(), null);
});

test('storage log records code and operation only, never content', () => {
  SG.reportStorageError(Object.assign(new Error('SECRET-CARD-TEXT quota exceeded'), { name: 'QuotaExceededError' }), 'write');
  const log = store.get('onion_storage_log') || '';
  assert.ok(log.includes('quota'));
  assert.ok(!log.includes('SECRET-CARD-TEXT'));
});

test('describeStorageError gives plain-language guidance per cause', () => {
  assert.equal(SG.describeStorageError(Object.assign(new Error('x'), { name: 'SecurityError' }), 'write').code, 'denied');
  assert.equal(SG.describeStorageError(new SyntaxError('bad json'), 'parse').code, 'parse');
  assert.equal(SG.describeStorageError(new Error('?'), 'write').code, 'unknown');
});
