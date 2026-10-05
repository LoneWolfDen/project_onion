// Run: node --test modules/experience-pwa/tests/
// RAD-01: continuity-risk rules, links, and no people scoring.
import test from 'node:test';
import assert from 'node:assert/strict';
import { radarFor, cardRisks, RULES, handoverCoverage } from '../static/js/core/radar.js';

const NOW = Date.parse('2026-10-05T12:00:00Z');
const day = (n) => new Date(NOW - n * 86400000).toISOString();
const card = (o) => ({ id: 'c', title: 't', privacy: 'Team Shared', source: 'Teams Chat', author: 'Walter', created_at: day(1), ...o });
const rules = (cs) => cardRisks(cs, NOW).map((r) => r.rule + ':' + r.level + ':' + r.cardId);

test('single contributor: high for a decision or risk, medium otherwise, none with two people', () => {
  assert.ok(rules([card({ id: 'a', category: 'raid', raidType: 'Risk' })]).includes('single_contributor:high:a'));
  assert.ok(rules([card({ id: 'b' })]).includes('single_contributor:medium:b'));
  const two = card({ id: 'c2', nodes: [{ kind: 'RAW', source: 'Email', author: 'Pat', at: day(1) }] });
  assert.ok(!rules([two]).some((r) => r.startsWith('single_contributor')));
});
test('stale: medium at 30 days, high at 90, none when fresh; a recent approved update refreshes it', () => {
  assert.ok(rules([card({ id: 's1', created_at: day(40) })]).includes('stale:medium:s1'));
  assert.ok(rules([card({ id: 's2', created_at: day(120) })]).includes('stale:high:s2'));
  assert.ok(!rules([card({ id: 's3', created_at: day(5) })]).some((r) => r.startsWith('stale')));
  assert.ok(!rules([card({ id: 's4', created_at: day(120), nodes: [{ kind: 'RAW', source: 'x', author: 'A', at: day(2) }] })]).some((r) => r.startsWith('stale')));
});
test('closed cards and drafts are not flagged as stale or single-contributor', () => {
  const r = rules([card({ id: 'x', created_at: day(200), itemStatus: 'closed' }), card({ id: 'y', created_at: day(200), syncStatus: 'pending_processing' })]);
  assert.deepEqual(r, []);
});
test('missing evidence: no source is high; a decision on one source is medium', () => {
  assert.ok(rules([card({ id: 'm1', source: '' })]).includes('missing_evidence:high:m1'));
  const dec = card({ id: 'm2', kind: 'decision', decision: { by: 'V', at: day(1) } });
  assert.ok(rules([dec]).includes('missing_evidence:medium:m2'));
});
test('unreviewed decision: a decision tag or proposed decision with no recorded decision', () => {
  assert.ok(rules([card({ id: 'd1', tags: ['#Decision_Record'] })]).includes('unreviewed_decision:medium:d1'));
  assert.ok(rules([card({ id: 'd2', title: 'Proposed decision: go', syncStatus: 'pending_processing' })]).includes('unreviewed_decision:medium:d2'));
  assert.ok(!rules([card({ id: 'd3', tags: ['#Decision_Record'], decision: { by: 'V', at: day(1) } })]).some((r) => r.startsWith('unreviewed')));
});
test('thin handover coverage by project: 1 of 6 is high, 3 of 6 is fine', () => {
  const p = { Project_ReferenceID: 'P1', project_name: 'Apollo' };
  const one = radarFor([card({ category: 'delivery' })], p, NOW).risks.find((r) => r.rule === 'thin_handover');
  assert.equal(one.level, 'high'); assert.equal(one.projectRef, 'P1');
  const three = radarFor(['delivery', 'raid', 'ops'].map((c, i) => card({ id: 'k' + i, category: c })), p, NOW).risks.find((r) => r.rule === 'thin_handover');
  assert.equal(three, undefined);
  assert.equal(handoverCoverage([]).covered.length, 0);
});
test('each card risk links to its card and evidence; rules are published', () => {
  const r = radarFor([card({ id: 'z', created_at: day(100) })], null, NOW).risks.find((x) => x.rule === 'stale');
  assert.equal(r.cardId, 'z'); assert.ok(r.evidence && Array.isArray(r.evidence.sources));
  Object.keys(RULES).forEach((k) => assert.ok(RULES[k].label && RULES[k].text));
});
test('radar output never names or scores people', () => {
  const out = JSON.stringify(radarFor([card({ id: 'p', author: 'Walter', created_at: day(100), nodes: [{ kind: 'RAW', source: 'E', author: 'Malcolm', at: day(100) }] })], { Project_ReferenceID: 'P', project_name: 'A' }, NOW));
  assert.doesNotMatch(out, /Walter|Malcolm/);
  assert.doesNotMatch(out, /score|rank|performance/i);
});
