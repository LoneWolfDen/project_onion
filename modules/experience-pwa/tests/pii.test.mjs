// Run: node --test modules/experience-pwa/tests/
// PRV-05: one screening module; emails kept, phones/noise/custom redacted, originals retained locally.
import test from 'node:test';
import assert from 'node:assert/strict';
const store = new Map();
globalThis.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => { store.set(k, String(v)); }, removeItem: (k) => { store.delete(k); } };
const P = await import('../static/js/core/pii.js');
const G = await import('../static/js/core/PiiGate.js');

test('phones are redacted, emails and project numbers are kept', () => {
  const r = P.screen('Call 555-123-4567 or mail a.b@client.example about O-730201 and PO-1234');
  assert.equal(r.text, 'Call [PHONE_REDACTED] or mail a.b@client.example about O-730201 and PO-1234');
  assert.equal(r.flag, 'Redacted_Review'); assert.deepEqual(r.kept, ['a.b@client.example']);
  assert.deepEqual(r.redactions.map((d) => d.kind), ['phone']);
});

test('clean text stays clean', () => { const r = P.screen('Milestone moved to Friday'); assert.equal(r.flag, 'Clean'); assert.equal(r.text, 'Milestone moved to Friday'); });

test('default noise words and configured words and patterns', () => {
  assert.equal(P.screen('lunch at the hotel').text, '[NOISE_FILTERED] at the [NOISE_FILTERED]');
  const cfg = { noiseWords: ['padel'], patterns: [{ name: 'NI', source: '\\b[A-Z]{2}\\d{6}[A-D]\\b' }, { name: 'bad', source: '(' }] };
  const r = P.screen('padel with AB123456C', cfg);
  assert.equal(r.text, '[NOISE_FILTERED] with [REDACTED:NI]');
  assert.equal(P.sanitiseConfig(cfg).patterns.length, 1, 'invalid pattern dropped');
});

test('saved config applies to every caller, including the PiiGate entry point and titles', () => {
  P.saveConfig({ noiseWords: ['secretproj'] });
  assert.equal(G.piiScreen('about secretproj').text, 'about [NOISE_FILTERED]');
  assert.equal(P.screenTitle('Call 555-123-4567 now, this is a long title'.padEnd(120, 'x'), 40).includes('555'), false);
  assert.equal(P.screenTitle('abc', 2), 'ab');
  store.clear();
});

test('redaction preview is plain language and mentions kept emails', () => {
  const s = P.summariseRedactions(['call 555-123-4567', 'me@x.example', 'lunch']);
  assert.deepEqual(s.lines, ['1 phone number will be redacted', '1 noise word will be filtered', '1 email address is kept on purpose']);
  assert.deepEqual(P.summariseRedactions(['nothing here']).lines, ['Nothing to redact']);
});

test('originals are retained locally only when screening changed the text', () => {
  assert.equal(P.retainOriginal('c1', 'call 555-123-4567', 'call [PHONE_REDACTED]'), true);
  assert.equal(P.getOriginal('c1'), 'call 555-123-4567');
  assert.equal(P.retainOriginal('c2', 'same', 'same'), false);
  assert.equal(P.getOriginal('c2'), null);
});

test('backup export never includes retained originals', async () => {
  const B = await import('../static/js/core/backup.js');
  assert.ok(!B.PREFERENCE_KEYS.includes(P.ORIGINALS_KEY));
});
