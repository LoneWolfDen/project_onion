// Run: node --test modules/experience-pwa/tests/
// HUI-02: Presentation Mode hides private and draft content, never changes data.
import test from 'node:test';
import assert from 'node:assert/strict';
import { forPresentation, hiddenCount, hiddenInPresentation, applyPresentation } from '../static/js/core/presentation.js';

const cards = [
  { id: 'a', privacy: 'Team Shared' },
  { id: 'b', privacy: 'My Notes (Private)' },
  { id: 'c', privacy: 'Team Shared', syncStatus: 'pending_processing' },
  { id: 'd', privacy: 'Team Shared', draft: true },
  { id: 'e', privacy: 'Private' },
  { id: 'f' },
];
test('private and draft cards are hidden, shared approved cards stay', () => {
  assert.deepEqual(forPresentation(cards).map((c) => c.id), ['a', 'f']);
  assert.equal(hiddenCount(cards), 4);
  assert.equal(hiddenInPresentation(null), false);
});
test('filtering does not modify or remove the saved data', () => {
  const before = JSON.stringify(cards);
  forPresentation(cards);
  assert.equal(JSON.stringify(cards), before);
  assert.equal(cards.length, 6);
});
test('attribute is set and cleared on the document element', () => {
  const attrs = {};
  const doc = { documentElement: { setAttribute: (k, v) => { attrs[k] = v; }, removeAttribute: (k) => { delete attrs[k]; } } };
  applyPresentation(doc, true); assert.equal(attrs['data-presentation'], 'on');
  applyPresentation(doc, false); assert.equal('data-presentation' in attrs, false);
});
