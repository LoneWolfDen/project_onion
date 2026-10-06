// tags.test.mjs — the closed tag vocabulary. A tag is a structured field, so nothing
// outside the vocabulary may become one, and no engine marker may be stored as a tag.
import test from 'node:test';
import assert from 'node:assert/strict';
import { TAGS, TAG_KEYS, tagKey, displayTag, normalizeTags, tagsFromText, TAG_PROMPT_LIST } from '../static/js/core/tags.js';
import { TAG_CATEGORY, categoryOf } from '../static/js/core/handover.js';

test('every tag spelling keys to the same canonical tag', () => {
  for (const form of ['#Risk_Watch', 'risk watch', ' #risk-watch ', 'RISK_WATCH']) {
    assert.equal(tagKey(form), 'risk_watch', form);
  }
  assert.equal(displayTag('risk_watch'), '#Risk_Watch');
  assert.equal(tagKey(null), '');
});

test('normalizeTags keeps only vocabulary tags and reports the rest separately', () => {
  const r = normalizeTags(['#Risk_Watch', 'Legacy Batch Window', '#risk-watch', '#Mock_Tagged']);
  assert.deepEqual(r.tags, ['#Risk_Watch']);
  assert.deepEqual(r.unmapped, ['#Legacy_Batch_Window', '#Mock_Tagged']);
  assert.deepEqual(normalizeTags(undefined), { tags: [], unmapped: [] });
});

test('tags from text are whole-word only: report, support and opportunity are not POs', () => {
  assert.deepEqual(tagsFromText('PO-88921 invoice delayed'), ['#Invoice_Mentioned', '#Risk_Watch']);
  assert.deepEqual(tagsFromText('support report opportunity'), []);
  assert.deepEqual(tagsFromText(''), []);
});

test('every tag in the vocabulary files a card into a handover category', () => {
  for (const k of TAG_KEYS) assert.ok(TAG_CATEGORY[k], 'no category for ' + k);
  for (const k of Object.keys(TAG_CATEGORY)) assert.ok(TAG_KEYS.includes(k), 'category for unknown tag ' + k);
  assert.equal(categoryOf({ tags: ['#Risk_Watch'] }), 'raid');
  assert.equal(categoryOf({ tags: ['#Made_Up'] }), 'uncategorised');
});

test('the AI prompt offers the vocabulary and nothing else', () => {
  for (const t of TAGS) assert.ok(TAG_PROMPT_LIST.includes(displayTag(t.key)), t.key);
  assert.ok(!/Mock|Auto/.test(TAG_PROMPT_LIST));
});
