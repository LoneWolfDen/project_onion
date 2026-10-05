// Run: node --test modules/experience-pwa/tests/
// OPS-01/02: the safe logger never stores content, is bounded, and the global handlers keep no messages.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createLogger, sanitizeEvent, installGlobalHandlers, MAX_EVENTS } from '../static/js/core/logger.js';

const mem = () => { let v = null; return { get: () => v, set: (t) => { v = t; } }; };
const NOW = () => new Date('2026-10-05T10:00:00Z');

test('an event is module, code and counters; free text is dropped and counted', () => {
  const e = sanitizeEvent({ module: 'import', code: 'import.staged', level: 'warn', data: { rows: 12, ok: true, adapter: 'raid', title: 'Budget meeting with Acme', who: 'ana@client.example', phone: '5551234567', 'bad key': 1 } }, NOW());
  assert.deepEqual(e, { at: '2026-10-05T10:00:00.000Z', level: 'warn', module: 'import', code: 'import.staged', data: { rows: 12, ok: true, adapter: 'raid' }, dropped: 4 });
});

test('bad module or code is rejected, so message-like strings cannot become codes', () => {
  assert.equal(sanitizeEvent({ module: 'import', code: 'Failed to parse Budget.xlsx' }), null);
  assert.equal(sanitizeEvent({ module: 'Import Module', code: 'a.b' }), null);
  assert.equal(sanitizeEvent({ module: 'app', code: 'nodots' }), null);
});

test('log is bounded to the newest events', () => {
  const l = createLogger(mem(), NOW);
  for (let i = 0; i < MAX_EVENTS + 25; i++) l.log('app', 'app.tick', { n: i });
  const ev = l.events();
  assert.equal(ev.length, MAX_EVENTS);
  assert.equal(ev[0].data.n, 25); assert.equal(ev.at(-1).data.n, MAX_EVENTS + 24);
});

test('storage failures never throw', () => {
  const l = createLogger({ get: () => { throw new Error('blocked'); }, set: () => { throw new Error('full'); } }, NOW);
  assert.doesNotThrow(() => l.log('app', 'app.start', {}));
  assert.deepEqual(l.events(), []);
});

test('global handlers keep the error class and place, never the message', () => {
  const l = createLogger(mem(), NOW); const h = {};
  const win = { addEventListener: (t, f) => { h[t] = f; }, removeEventListener() {} };
  installGlobalHandlers(l, win);
  const err = new TypeError('Cannot read card "Secret budget for Acme" of undefined');
  h.error({ error: err, message: err.message, filename: 'http://x/js/components/App.js?v=1', lineno: 42, colno: 7 });
  h.unhandledrejection({ reason: new RangeError('contains me@client.example') });
  const ev = l.events();
  assert.deepEqual(ev.map((e) => e.code), ['app.uncaught_error', 'app.unhandled_rejection']);
  assert.deepEqual(ev[0].data, { name: 'typeerror', file: 'app.js', line: 42, col: 7 });
  const dump = JSON.stringify(ev);
  assert.ok(!/Secret|Acme|client\.example/.test(dump));
});

test('export text is exactly the stored events plus allowed metadata', () => {
  const l = createLogger(mem(), NOW);
  l.log('backup', 'backup.exported', {});
  const out = JSON.parse(l.exportText({ appVersion: '0.21', storageMode: 'idb', secret: 'nope' }));
  assert.equal(out.format, 'continuum-diagnostics'); assert.equal(out.appVersion, '0.21'); assert.equal(out.secret, undefined);
  assert.equal(out.events.length, 1);
  l.clear(); assert.deepEqual(l.events(), []);
});
