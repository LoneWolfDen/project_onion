// Run: node --test modules/experience-pwa/tests/
// VectorSync is a browser module; we stub localStorage/window/navigator/fetch
// before importing it so the queue and mirror logic run under plain Node.
import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => { store.set(k, String(v)); },
  removeItem: (k) => { store.delete(k); },
};
const events = [];
globalThis.window = { addEventListener() {}, dispatchEvent: (e) => { events.push(e); return true; } };
Object.defineProperty(globalThis, 'navigator', { value: { onLine: true }, configurable: true, writable: true });

// The module starts a 60s interval and a 3s timer on import; neutralise them
// so the test process can exit.
const realSetInterval = globalThis.setInterval;
const realSetTimeout = globalThis.setTimeout;
globalThis.setInterval = () => 0;
globalThis.setTimeout = () => 0;
const VS = await import('../static/js/core/VectorSync.js');
globalThis.setInterval = realSetInterval;
globalThis.setTimeout = realSetTimeout;

const QUEUE = 'onion_vector_queue';
const queue = () => JSON.parse(store.get(QUEUE) || '[]');
let calls;
const okJson = { ok: true, status: 200, json: async () => ({ status: 'success' }) };
const useFetch = (impl) => { calls = []; globalThis.fetch = async (url, opts) => { calls.push({ url, method: (opts && opts.method) || 'GET', body: opts && opts.body ? JSON.parse(opts.body) : null }); return impl(url, opts, calls.length); }; };
const tick = () => new Promise((r) => setImmediate(r));

beforeEach(() => {
  store.clear();
  events.length = 0;
  navigator.onLine = true;
  useFetch(async () => okJson);
});

test('queueing an upsert twice for the same card keeps only the latest', () => {
  VS.queueVectorOp('upsert', { id: 'c1', title: 'old' });
  VS.queueVectorOp('upsert', { id: 'c1', title: 'new' });
  assert.equal(queue().length, 1);
  assert.equal(queue()[0].card.title, 'new');
});

test('an upsert without an id is ignored, not queued as an empty card', () => {
  VS.queueVectorOp('upsert', { title: 'no id' });
  assert.equal(queue().length, 0);
});

test('delete is queued by id, from a string or a card', () => {
  VS.queueVectorOp('delete', 'a');
  VS.queueVectorOp('delete', { id: 'b' });
  assert.deepEqual(queue().map((e) => [e.op, e.id]), [['delete', 'a'], ['delete', 'b']]);
});

test('queue changes are announced to the UI with the pending count', () => {
  VS.queueVectorOp('upsert', { id: 'c1' });
  assert.equal(events.at(-1).type, 'onion:vector-queue');
  assert.equal(events.at(-1).detail.pending, 1);
});

test('a corrupt queue in storage reads as empty instead of throwing', () => {
  store.set(QUEUE, '{not json');
  assert.equal(VS.pendingVectorCount(), 0);
});

test('fail-closed privacy: a private signal anywhere forces Private', () => {
  VS.queueVectorOp('upsert', { id: 'p', privacy: 'Team Shared', nodes: [{ text: 'My Notes: secret' }] });
  const p = queue()[0].card;
  assert.equal(p.privacy, 'Private');
  assert.equal(p.is_private, true);
  VS.queueVectorOp('upsert', { id: 'q', privacy: 'Team Shared' });
  assert.equal(queue().find((e) => e.id === 'q').card.is_private, false);
});

test('payload fields are truncated to the service limits', () => {
  VS.queueVectorOp('upsert', { id: 't', title: 'x'.repeat(900), detail: 'd'.repeat(3000), content: 'c'.repeat(9000) });
  const c = queue()[0].card;
  assert.equal(c.title.length, 500);
  assert.equal(c.detail.length, 2000);
  assert.equal(c.content.length, 4000);
});

test('mirrorToVector while offline queues without touching the network', async () => {
  navigator.onLine = false;
  const r = await VS.mirrorToVector('upsert', { id: 'o1' });
  assert.deepEqual(r, { queued: true, offline: true });
  assert.equal(calls.length, 0);
  assert.equal(queue().length, 1);
});

test('mirrorToVector never throws when the service is down; it queues instead', async () => {
  useFetch(async () => { throw new Error('ECONNREFUSED'); });
  const r = await VS.mirrorToVector('upsert', { id: 'f1' });
  assert.equal(r.queued, true);
  assert.equal(r.ok, false);
  assert.equal(queue()[0].id, 'f1');
});

test('mirrorToVector returns immediately even if the service never answers (#18)', async () => {
  useFetch(() => new Promise(() => {}));
  const p = VS.mirrorToVector('upsert', { id: 'slow' });
  const winner = await Promise.race([p.then(() => 'blocked'), tick().then(() => 'returned')]);
  assert.equal(winner, 'returned');
});

test('a 500 response counts as failure and queues the card', async () => {
  useFetch(async () => ({ ok: false, status: 500, json: async () => ({}) }));
  const r = await VS.mirrorToVector('upsert', { id: 'e500' });
  assert.equal(r.queued, true);
});

test('delete falls back from DELETE to POST when DELETE is rejected', async () => {
  useFetch(async (u, o) => (o.method === 'DELETE' ? { ok: false, status: 405, json: async () => ({}) } : okJson));
  await VS.flushVectorQueue();
  VS.queueVectorOp('delete', 'gone');
  const r = await VS.flushVectorQueue();
  assert.equal(r.flushed, 1);
  assert.deepEqual(calls.map((c) => c.method), ['DELETE', 'POST']);
});

test('flush posts queued cards, empties the queue and marks only those ids synced', async () => {
  store.set('onion_db_state', JSON.stringify({ timeline: [{ id: 'a' }, { id: 'b' }], notes: [] }));
  VS.queueVectorOp('upsert', { id: 'a' });
  const r = await VS.flushVectorQueue();
  assert.deepEqual(r, { flushed: 1, pending: 0 });
  assert.equal(queue().length, 0);
  const s = JSON.parse(store.get('onion_db_state'));
  assert.equal(s.timeline.find((x) => x.id === 'a').vectorSyncStatus, 'synced');
  assert.equal(s.timeline.find((x) => x.id === 'b').vectorSyncStatus, undefined);
});

test('a failed flush keeps the entry, counts the attempt and does not fake a synced tick', async () => {
  store.set('onion_db_state', JSON.stringify({ timeline: [{ id: 'a' }], notes: [] }));
  VS.queueVectorOp('upsert', { id: 'a' });
  useFetch(async () => { throw new Error('down'); });
  const r = await VS.flushVectorQueue();
  assert.deepEqual(r, { flushed: 0, pending: 1 });
  assert.equal(queue()[0].attempts, 1);
  assert.equal(JSON.parse(store.get('onion_db_state')).timeline[0].vectorSyncStatus, undefined);
});

test('flush while offline does nothing and keeps the queue', async () => {
  VS.queueVectorOp('upsert', { id: 'a' });
  navigator.onLine = false;
  const r = await VS.flushVectorQueue();
  assert.equal(r.offline, true);
  assert.equal(calls.length, 0);
  assert.equal(queue().length, 1);
});

test('REGRESSION: a card queued while a flush is in flight is not lost', async () => {
  VS.queueVectorOp('upsert', { id: 'first' });
  let release;
  useFetch(() => new Promise((res) => { release = () => res(okJson); }));
  const flushing = VS.flushVectorQueue();
  await tick();
  VS.queueVectorOp('upsert', { id: 'during' }); // user saves a card mid-flush
  release();
  await flushing;
  assert.deepEqual(queue().map((e) => e.id), ['during']);
});

test('REGRESSION: overlapping flushes post each card once', async () => {
  VS.queueVectorOp('upsert', { id: 'a' });
  VS.queueVectorOp('upsert', { id: 'b' });
  useFetch(async () => { await tick(); return okJson; });
  await Promise.all([VS.flushVectorQueue(), VS.flushVectorQueue()]);
  assert.equal(calls.filter((c) => c.method === 'POST').length, 2);
});

test('vectorScoreForDistance maps distance to a 0.5..0.95 merge score', () => {
  assert.equal(VS.vectorScoreForDistance(0), 0.95);
  assert.equal(VS.vectorScoreForDistance(1.2), 0.55);
  assert.equal(VS.vectorScoreForDistance(10), 0.5);
  assert.equal(VS.vectorScoreForDistance('x'), 0.55);
});

test('querySimilarCards: needs similarity >= 0.85 (distance <= 0.3) and never throws', async () => {
  const hit = (d) => async () => ({ ok: true, status: 200, json: async () => ({ retrieved: [{ id: 'm', distance: d, document: 'Title: Hello\nbody' }] }) });
  useFetch(hit(0.2));
  const m = await VS.querySimilarCards('some text', 'p', 'Walter');
  assert.equal(m.match.title, 'Hello');
  useFetch(hit(0.5));
  assert.equal((await VS.querySimilarCards('some text')).match, null);
  useFetch(async () => { throw new Error('down'); });
  assert.deepEqual(await VS.querySimilarCards('some text'), { match: null, engine: 'offline' });
  assert.deepEqual(await VS.querySimilarCards('   '), { match: null, engine: 'none' });
});
