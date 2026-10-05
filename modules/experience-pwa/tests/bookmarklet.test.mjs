// Run: node --test modules/experience-pwa/tests/
// IMP-05: bookmarklet gate and the bookmarklet source itself.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkClipboard, parseApproved, saveApproved, loadApproved, normalizeHost, isEnabled } from '../static/js/core/bookmarklet.js';

const cap = (o) => JSON.stringify([{ type: 'Scrape', title: 't', source: 'portal.example.com', content: 'hello', ...o }]);

test('off by default: nothing is accepted without an approved source', () => {
  assert.equal(isEnabled([]), false);
  const r = checkClipboard(cap({}), []);
  assert.equal(r.ok, false);
  assert.match(r.reason, /off/i);
});
test('capture from an approved host is accepted; host is normalised', () => {
  const r = checkClipboard(cap({ source: 'Portal.Example.com' }), ['portal.example.com']);
  assert.equal(r.ok, true);
  assert.equal(r.items[0].source, 'portal.example.com');
});
test('capture from another host is refused', () => {
  const r = checkClipboard(cap({ source: 'evil.example.org' }), ['portal.example.com']);
  assert.equal(r.ok, false);
  assert.equal(r.refused, 1);
});
test('only whitelisted fields are kept (no ids, cookies, tokens, project override)', () => {
  const r = checkClipboard(cap({ cookie: 'x', token: 'y', projectId: 'other', id: 'forced', syncStatus: 'done' }), ['portal.example.com']);
  assert.deepEqual(Object.keys(r.items[0]).sort(), ['content', 'source', 'title', 'type']);
});
test('plain text and bad JSON are refused', () => {
  assert.equal(checkClipboard('just some pasted text', ['portal.example.com']).ok, false);
});
test('approved list round trips and ignores junk', () => {
  const store = new Map();
  const s = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) };
  saveApproved(s, ['https://A.com/x', 'a.com', '']);
  assert.deepEqual(loadApproved(s), ['a.com']);
  assert.deepEqual(parseApproved('{bad'), []);
  assert.equal(normalizeHost('https://Portal.Example.com:8443/p?q=1'), 'portal.example.com');
});
test('bookmarklet source never clicks, expands, reads cookies or storage, or calls the network', () => {
  const src = readFileSync(new URL('../static/bookmarklet.js', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  for (const bad of [/\.click\(/, /aria-expanded/, /document\.cookie/, /localStorage|sessionStorage/, /fetch\(|XMLHttpRequest|sendBeacon/, /type=["']?password|input\[/i, /querySelectorAll/]) {
    assert.doesNotMatch(src, bad, String(bad));
  }
});
