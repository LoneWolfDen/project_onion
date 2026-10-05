// Run: node --test modules/experience-pwa/tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import { confidenceBreakdown, confidenceTier, buildConfidenceText } from '../static/js/core/confidence.js';

const text = (origins, rows = 1) => {
  const b = confidenceBreakdown(origins.map((o) => ({ origin: o })), rows);
  return buildConfidenceText(b, confidenceTier(b.pct));
};

test('single source is reported as not yet corroborated, never "fused"', () => {
  const t = text(['Teams Chat']);
  assert.equal(t.lead, 'Model confidence: Medium — 1 source (Teams Chat), not yet corroborated');
  assert.equal(t.sources, '');
});

test('three sources incl. Salesforce: fused + validated via Salesforce', () => {
  const t = text(['Email', 'Teams Chat', 'Salesforce'], 3);
  assert.equal(t.lead, 'Model confidence: High — 3 sources fused, validated via Salesforce');
  assert.equal(t.sources, 'Email + Teams Chat + Salesforce');
});

test('two non-system sources: fused, no validation claim', () => {
  const t = text(['Email', 'Teams Chat']);
  assert.match(t.lead, /2 sources fused$/);
  assert.doesNotMatch(t.lead, /validated/);
});

test('duplicate origins count once', () => {
  const t = text(['Email', 'Email', 'Email'], 3);
  assert.match(t.lead, /1 source \(Email\)/);
});

test('empty evidence does not throw', () => {
  assert.match(buildConfidenceText(null, 'Low').lead, /no sources recorded/);
});
