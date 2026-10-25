// Run: node --test "modules/experience-pwa/tests/*.test.mjs"
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
  VS.resetVectorBreaker();
  useFetch(async () => okJson);
});

test('queueing an upsert twice for the same card keeps only the latest', () => {
  VS.queueVectorOp('upsert', { id: 'c1', project: 'Apollo', title: 'old' });
  VS.queueVectorOp('upsert', { id: 'c1', project: 'Apollo', title: 'new' });
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
  VS.queueVectorOp('upsert', { id: 'c1', project: 'Apollo' });
  assert.equal(events.at(-1).type, 'onion:vector-queue');
  assert.equal(events.at(-1).detail.pending, 1);
});

test('a corrupt queue in storage reads as empty instead of throwing', () => {
  store.set(QUEUE, '{not json');
  assert.equal(VS.pendingVectorCount(), 0);
});

test('fail-closed privacy: a private signal anywhere forces Private', () => {
  VS.queueVectorOp('upsert', { id: 'p', project: 'Apollo', privacy: 'Team Shared', nodes: [{ text: 'My Notes: secret' }] });
  const p = queue()[0].card;
  assert.equal(p.privacy, 'Private');
  assert.equal(p.is_private, true);
  VS.queueVectorOp('upsert', { id: 'q', project: 'Apollo', privacy: 'Team Shared' });
  assert.equal(queue().find((e) => e.id === 'q').card.is_private, false);
});

test('payload fields are truncated to the service limits', () => {
  VS.queueVectorOp('upsert', { id: 't', project: 'Apollo', title: 'x'.repeat(900), detail: 'd'.repeat(3000), content: 'c'.repeat(9000) });
  const c = queue()[0].card;
  assert.equal(c.title.length, 500);
  assert.equal(c.detail.length, 2000);
  assert.equal(c.content.length, 4000);
});

test('mirrorToVector while offline queues without touching the network', async () => {
  navigator.onLine = false;
  const r = await VS.mirrorToVector('upsert', { id: 'o1', project: 'Apollo' });
  assert.deepEqual(r, { queued: true, offline: true });
  assert.equal(calls.length, 0);
  assert.equal(queue().length, 1);
});

test('mirrorToVector never throws when the service is down; it queues instead', async () => {
  useFetch(async () => { throw new Error('ECONNREFUSED'); });
  const r = await VS.mirrorToVector('upsert', { id: 'f1', project: 'Apollo' });
  assert.equal(r.queued, true);
  assert.equal(r.ok, false);
  assert.equal(queue()[0].id, 'f1');
});

test('mirrorToVector returns immediately even if the service never answers (#18)', async () => {
  useFetch(() => new Promise(() => {}));
  const p = VS.mirrorToVector('upsert', { id: 'slow', project: 'Apollo' });
  const winner = await Promise.race([p.then(() => 'blocked'), tick().then(() => 'returned')]);
  assert.equal(winner, 'returned');
});

test('a 500 response counts as failure and queues the card', async () => {
  useFetch(async () => ({ ok: false, status: 500, json: async () => ({}) }));
  const r = await VS.mirrorToVector('upsert', { id: 'e500', project: 'Apollo' });
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
  VS.queueVectorOp('upsert', { id: 'a', project: 'Apollo' });
  const r = await VS.flushVectorQueue();
  assert.deepEqual(r, { flushed: 1, pending: 0 });
  assert.equal(queue().length, 0);
  const s = JSON.parse(store.get('onion_db_state'));
  assert.equal(s.timeline.find((x) => x.id === 'a').vectorSyncStatus, 'synced');
  assert.equal(s.timeline.find((x) => x.id === 'b').vectorSyncStatus, undefined);
});

test('a failed flush keeps the entry, counts the attempt and does not fake a synced tick', async () => {
  store.set('onion_db_state', JSON.stringify({ timeline: [{ id: 'a' }], notes: [] }));
  VS.queueVectorOp('upsert', { id: 'a', project: 'Apollo' });
  useFetch(async () => { throw new Error('down'); });
  const r = await VS.flushVectorQueue();
  assert.deepEqual(r, { flushed: 0, pending: 1 });
  assert.equal(queue()[0].attempts, 1);
  assert.equal(JSON.parse(store.get('onion_db_state')).timeline[0].vectorSyncStatus, undefined);
});

test('flush while offline does nothing and keeps the queue', async () => {
  VS.queueVectorOp('upsert', { id: 'a', project: 'Apollo' });
  navigator.onLine = false;
  const r = await VS.flushVectorQueue();
  assert.equal(r.offline, true);
  assert.equal(calls.length, 0);
  assert.equal(queue().length, 1);
});

test('REGRESSION: a card queued while a flush is in flight is not lost', async () => {
  VS.queueVectorOp('upsert', { id: 'first', project: 'Apollo' });
  let release;
  useFetch(() => new Promise((res) => { release = () => res(okJson); }));
  const flushing = VS.flushVectorQueue();
  await tick();
  VS.queueVectorOp('upsert', { id: 'during', project: 'Apollo' }); // user saves a card mid-flush
  release();
  await flushing;
  assert.deepEqual(queue().map((e) => e.id), ['during']);
});

test('REGRESSION: overlapping flushes post each card once', async () => {
  VS.queueVectorOp('upsert', { id: 'a', project: 'Apollo' });
  VS.queueVectorOp('upsert', { id: 'b', project: 'Apollo' });
  useFetch(async () => { await tick(); return okJson; });
  await Promise.all([VS.flushVectorQueue(), VS.flushVectorQueue()]);
  assert.equal(calls.filter((c) => c.method === 'POST').length, 2);
});

test('vectorScoreForDistance maps the shown band to a 0.5..0.95 merge score', () => {
  assert.equal(VS.vectorScoreForDistance(0), 0.95);
  assert.equal(VS.vectorScoreForDistance(0.3), 0.55); // the gate
  assert.equal(VS.vectorScoreForDistance(10), 0.5);
  assert.equal(VS.vectorScoreForDistance('x'), 0.55);
});

test('similarity depends on the distance space the service reports', () => {
  // cosine distance 1 - cos (0..2); squared L2 over normalised vectors is 2 - 2cos (0..4),
  // so the same number is a much closer match under L2.
  assert.equal(VS.similarityForDistance(0.3, 'cosine'), 0.85);
  assert.equal(VS.similarityForDistance(0.6, 'l2'), 0.85);
  assert.equal(VS.similarityForDistance(0.3, undefined), 0.85, 'unknown space is treated as cosine');
  assert.equal(VS.similarityForDistance('x', 'cosine'), 0);
});

test('a card with no author is never mirrored under someone elses name', () => {
  VS.queueVectorOp('upsert', { id: 'noauthor', project: 'Apollo' });
  const q = JSON.parse(globalThis.localStorage.getItem('onion_vector_queue') || '[]');
  assert.equal(q[q.length - 1].card.author, '');
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

test('a card without a project is never queued under a default project', () => {
  VS.queueVectorOp('upsert', { id: 'np1', title: 'x' });
  assert.equal(queue().length, 0);
  VS.queueVectorOp('upsert', { id: 'p1', title: 'x', project: 'Apollo' });
  assert.equal(queue()[0].card.project, 'Apollo');
  assert.equal(queue()[0].card.client, '');
});

// ---- #18 circuit breaker: a slow or hung service must not stall the UI ------------------
// A fetch that never answers but honours the abort signal, like a hung socket.
const useHungFetch = () => { calls = []; globalThis.fetch = (url, opts) => { calls.push({ url, method: (opts && opts.method) || 'GET' }); return new Promise((_, reject) => { if (opts && opts.signal) opts.signal.addEventListener('abort', () => reject(new Error('aborted'))); }); }; };

test('#18: a hung service costs one short wait, not 4s per lookup', async () => {
  useHungFetch();
  const t0 = Date.now();
  const r = await VS.querySimilarCards('first lookup', 'p', 'Walter');
  const first = Date.now() - t0;
  assert.deepEqual(r, { match: null, engine: 'offline' });
  assert.ok(first < 2000, `first lookup took ${first}ms, budget is 1200ms`);
  assert.equal(VS.vectorBreakerOpen(), true);
  const before = calls.length;
  const t1 = Date.now();
  for (let i = 0; i < 3; i++) assert.equal((await VS.querySimilarCards('next ' + i, 'p', 'Walter')).engine, 'offline');
  assert.ok(Date.now() - t1 < 50, 'later lookups return at once');
  assert.equal(calls.length, before, 'no request while the breaker is open');
});

test('#18: while the breaker is open, mirror writes queue and the drain waits', async () => {
  useFetch(async () => { throw new Error('ECONNREFUSED'); });
  await VS.querySimilarCards('trip the breaker', 'p', 'Walter');
  useFetch(async () => okJson);
  const r = await VS.mirrorToVector('upsert', { id: 'm1', project: 'Apollo' });
  assert.equal(r.queued, true);
  assert.equal(calls.length, 0);
  const f = await VS.flushVectorQueue();
  assert.equal(f.coolingDown, true);
  assert.equal(calls.length, 0);
  assert.deepEqual(queue().map((e) => e.id), ['m1'], 'nothing is lost: the entry waits for the next drain');
  VS.resetVectorBreaker();
  assert.deepEqual(await VS.flushVectorQueue(), { flushed: 1, pending: 0 });
});

test('#18: an HTTP error means the service is up, so the breaker stays closed', async () => {
  useFetch(async () => ({ ok: false, status: 500, json: async () => ({}) }));
  await VS.querySimilarCards('a', 'p', 'Walter');
  assert.equal(VS.vectorBreakerOpen(), false);
  await VS.mirrorToVector('upsert', { id: 'h1', project: 'Apollo' });
  assert.equal(VS.vectorBreakerOpen(), false);
});

test('#18: the drain stops at the first network failure instead of timing out on every entry', async () => {
  for (const id of ['a', 'b', 'c']) VS.queueVectorOp('upsert', { id, project: 'Apollo' });
  useFetch(async () => { throw new Error('ECONNREFUSED'); });
  const r = await VS.flushVectorQueue();
  assert.equal(calls.length, 1);
  assert.deepEqual(r, { flushed: 0, pending: 3 });
  assert.deepEqual(queue().map((e) => [e.id, e.attempts]), [['a', 1], ['b', 0], ['c', 0]]);
});

test('#18: one bad payload (HTTP 500) does not hold back the rest of the queue', async () => {
  for (const id of ['bad', 'good']) VS.queueVectorOp('upsert', { id, project: 'Apollo' });
  useFetch(async (u, o) => (JSON.parse(o.body).id === 'bad' ? { ok: false, status: 500, json: async () => ({}) } : okJson));
  const r = await VS.flushVectorQueue();
  assert.deepEqual(r, { flushed: 1, pending: 1 });
  assert.deepEqual(queue().map((e) => e.id), ['bad']);
});

// ---- #18 settings: wait time and pause are per-device and configurable ---------------------
test('settings: defaults when nothing is saved (1.2s wait, 15s pause)', () => {
  assert.deepEqual(VS.loadVectorSettings(globalThis.localStorage), { askTimeoutMs: 1200, cooldownMs: 15000, baseUrl: '' });
});

test('settings: values are clamped to safe limits, blanks return to the default', () => {
  let r = VS.saveVectorSettings(globalThis.localStorage, { askTimeoutMs: 50, cooldownMs: 9999999 });
  assert.equal(r.ok, true);
  assert.deepEqual([r.settings.askTimeoutMs, r.settings.cooldownMs], [300, 300000]);
  r = VS.saveVectorSettings(globalThis.localStorage, { askTimeoutMs: '3000', cooldownMs: '0' });
  assert.deepEqual([r.settings.askTimeoutMs, r.settings.cooldownMs], [3000, 0]);
  r = VS.saveVectorSettings(globalThis.localStorage, { askTimeoutMs: '', cooldownMs: 'abc' });
  assert.deepEqual([r.settings.askTimeoutMs, r.settings.cooldownMs], [1200, 15000]);
});

test('settings: the service address must be http(s); a bad one is refused and nothing changes', () => {
  assert.equal(VS.saveVectorSettings(globalThis.localStorage, { baseUrl: 'http://127.0.0.1:9006/' }).settings.baseUrl, 'http://127.0.0.1:9006');
  const bad = VS.saveVectorSettings(globalThis.localStorage, { baseUrl: 'javascript:alert(1)', askTimeoutMs: 5000 });
  assert.equal(bad.ok, false);
  assert.equal(VS.loadVectorSettings(globalThis.localStorage).baseUrl, 'http://127.0.0.1:9006');
  assert.equal(VS.loadVectorSettings(globalThis.localStorage).askTimeoutMs, 1200, 'refused save wrote nothing');
  VS.saveVectorSettings(globalThis.localStorage, { baseUrl: '' });
  assert.equal(VS.loadVectorSettings(globalThis.localStorage).baseUrl, '');
});

test('settings: a shorter wait applies to the next lookup', async () => {
  VS.saveVectorSettings(globalThis.localStorage, { askTimeoutMs: 300 });
  useHungFetch();
  const t0 = Date.now();
  await VS.querySimilarCards('quick', 'p', 'Walter');
  const took = Date.now() - t0;
  assert.ok(took >= 250 && took < 900, `took ${took}ms with a 300ms wait`);
});

test('settings: a pause of 0 turns the breaker off, so every lookup tries the service', async () => {
  VS.saveVectorSettings(globalThis.localStorage, { cooldownMs: 0 });
  useFetch(async () => { throw new Error('ECONNREFUSED'); });
  await VS.querySimilarCards('a', 'p', 'Walter');
  assert.equal(VS.vectorBreakerOpen(), false);
  await VS.querySimilarCards('b', 'p', 'Walter');
  assert.equal(calls.length, 2);
});
