import test from 'node:test';
import assert from 'node:assert/strict';
import { getLayout, setLayout, applyLayout } from '../static/js/core/layoutFlag.js';

const store = (init = {}) => { const d = { ...init }; return { getItem: (k) => (k in d ? d[k] : null), setItem: (k, v) => { d[k] = v; } }; };
const doc = () => { const a = {}; return { documentElement: { setAttribute: (k, v) => { a[k] = v; }, removeAttribute: (k) => { delete a[k]; }, a } }; };

test('layout is classic by default and unknown values fall back', () => {
  assert.equal(getLayout(store()), 'classic');
  assert.equal(getLayout(store({ continuum_layout: 'weird' })), 'classic');
  assert.equal(getLayout(null), 'classic');
});
test('set, read back and apply to the page', () => {
  const s = store(); const d = doc();
  assert.equal(setLayout(s, 'hierarchy'), 'hierarchy'); assert.equal(getLayout(s), 'hierarchy');
  applyLayout(d, 'hierarchy'); assert.equal(d.documentElement.a['data-layout'], 'hierarchy');
  applyLayout(d, 'classic'); assert.equal('data-layout' in d.documentElement.a, false);
});
test('blocked storage does not throw', () => {
  assert.equal(setLayout({ setItem() { throw new Error('x'); } }, 'hierarchy'), 'hierarchy');
});
