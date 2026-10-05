import test from 'node:test';
import assert from 'node:assert/strict';
import { requestPersistence, describePersistence } from '../static/js/core/persistence.js';

test('unsupported browser is reported, not assumed safe', async () => {
  const r = await requestPersistence({});
  assert.equal(r.supported, false);
  assert.equal(describePersistence(r).level, 'unknown');
});
test('already persisted does not re-request', async () => {
  let asked = 0;
  const r = await requestPersistence({ storage: { persisted: async () => true, persist: async () => { asked++; return true; } } });
  assert.equal(r.persisted, true); assert.equal(asked, 0);
  assert.equal(describePersistence(r).level, 'ok');
});
test('denied request warns the user', async () => {
  const r = await requestPersistence({ storage: { persisted: async () => false, persist: async () => false, estimate: async () => ({ usage: 5, quota: 100 }) } });
  assert.equal(r.persisted, false); assert.equal(r.quota, 100);
  assert.equal(describePersistence(r).level, 'warn');
});
test('a throwing storage API does not break startup', async () => {
  const r = await requestPersistence({ storage: { persisted: async () => { throw new Error('x'); }, persist: async () => true } });
  assert.equal(r.supported, true); assert.equal(r.persisted, false);
});
