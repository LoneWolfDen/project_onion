// Run: node --test modules/experience-pwa/tests/
// DAT-03: Repo boot, one-time migration, retry safety, read-only fallback, queued writes.
import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => { if (globalThis.__lsFull && k === 'onion_db_state') throw Object.assign(new Error('quota'), { name: 'QuotaExceededError' }); store.set(k, String(v)); },
  removeItem: (k) => { store.delete(k); },
};
globalThis.window = { addEventListener() {}, dispatchEvent: () => true };
const R = await import('../static/js/core/repo.js');
const SG = await import('../static/js/core/storageGuard.js');

const fake = (over = {}) => {
  const f = { value: null, puts: [], opened: 0, async open() { f.opened++; if (over.failOpen) throw new Error('open failed'); }, async get() { if (over.failGet) throw new Error('get failed'); return f.value; },
    async put(v) { if (over.failPut && over.failPut()) throw new Error('put failed'); f.puts.push(v); f.value = over.corruptPut ? v + 'x' : v; }, async del() { f.value = null; } };
  return f;
};
beforeEach(() => { store.clear(); globalThis.__lsFull = false; SG.resolveStorageProblem(); });

test('empty everywhere: IndexedDB mode, first write is persisted', async () => {
  const s = fake(); const st = await R.initRepo({ store: s });
  assert.equal(st.mode, 'idb'); assert.equal(st.migrated, false); assert.equal(R.getRaw(), null);
  R.setRaw('{"a":1}'); await R.flushRepo();
  assert.equal(s.value, '{"a":1}'); assert.equal(R.getRaw(), '{"a":1}'); assert.equal(store.get('onion_db_state'), '{"a":1}', 'mirror kept');
});

test('migrates localStorage once, keeps a dated backup, verifies by reading back', async () => {
  store.set('onion_db_state', '{"timeline":[1]}');
  const s = fake(); const st = await R.initRepo({ store: s, now: new Date('2026-10-05T12:00:00Z') });
  assert.equal(st.mode, 'idb'); assert.equal(st.migrated, true);
  assert.equal(s.value, '{"timeline":[1]}');
  assert.equal(store.get('onion_db_state_premigrate_20261005'), '{"timeline":[1]}');
  assert.equal(R.getRaw(), '{"timeline":[1]}');
});

test('IndexedDB data wins over localStorage on later boots', async () => {
  store.set('onion_db_state', '{"old":true}'); const s = fake(); s.value = '{"new":true}';
  await R.initRepo({ store: s }); assert.equal(R.getRaw(), '{"new":true}');
});

test('failed migration check leaves localStorage as the store and is retried next boot', async () => {
  store.set('onion_db_state', '{"x":1}');
  const bad = fake({ corruptPut: true }); const st = await R.initRepo({ store: bad });
  assert.equal(st.mode, 'localStorage'); assert.match(st.reason, /migration check failed/);
  assert.equal(R.getRaw(), '{"x":1}'); assert.equal(store.get('onion_db_state'), '{"x":1}');
  const good = fake(); const again = await R.initRepo({ store: good });
  assert.equal(again.mode, 'idb'); assert.equal(again.migrated, true);
});

test('unreadable local data is not migrated; the existing corrupt-data flow keeps it', async () => {
  store.set('onion_db_state', '{"timeline":[{"id":"x"');
  const s = fake(); const st = await R.initRepo({ store: s });
  assert.equal(st.mode, 'localStorage'); assert.equal(st.reason, 'local-data-unreadable'); assert.equal(s.value, null);
});

test('no IndexedDB and never used: plain localStorage mode', async () => {
  const st = await R.initRepo({ store: null });
  assert.equal(st.mode, 'localStorage'); assert.equal(SG.isReadOnly(), false);
  R.setRaw('{"k":1}'); assert.equal(store.get('onion_db_state'), '{"k":1}');
});

test('IndexedDB used before but unreadable now: explicit read-only, nothing overwritten', async () => {
  store.set('continuum_storage_mode', 'idb'); store.set('onion_db_state', '{"stale":1}');
  const st = await R.initRepo({ store: fake({ failOpen: true }) });
  assert.equal(st.mode, 'localStorage'); assert.equal(SG.isReadOnly(), true);
  assert.match(SG.getStorageStatus().message, /read-only mode/);
});

test('a full localStorage mirror does not stop saving', async () => {
  const s = fake(); await R.initRepo({ store: s });
  globalThis.__lsFull = true; R.setRaw('{"big":1}'); await R.flushRepo();
  assert.equal(s.value, '{"big":1}'); assert.equal(R.getRaw(), '{"big":1}');
});

test('rapid writes are coalesced and the latest wins', async () => {
  const s = fake(); await R.initRepo({ store: s });
  R.setRaw('1'); R.setRaw('2'); R.setRaw('3'); await R.flushRepo();
  assert.equal(s.value, '3'); assert.ok(s.puts.length <= 2);
});

test('a failed write is reported and retried', async () => {
  let n = 0; const s = fake({ failPut: () => ++n === 1 }); await R.initRepo({ store: s });
  R.setRaw('{"r":1}'); await R.flushRepo();
  assert.equal(s.value, '{"r":1}', 'retry succeeded');
  assert.equal(SG.getStorageStatus(), null, 'cleared after a good write');
});

test('removeRaw clears both copies', async () => {
  const s = fake(); await R.initRepo({ store: s }); R.setRaw('{"a":1}'); await R.flushRepo();
  R.removeRaw(); await R.flushRepo(); assert.equal(s.value, null); assert.equal(R.getRaw(), null); assert.equal(store.get('onion_db_state'), undefined);
});
