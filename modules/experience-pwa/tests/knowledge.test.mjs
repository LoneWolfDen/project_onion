// Run: node --test modules/experience-pwa/tests/
// KNW-01/02/04: statement kinds, decisions, evidence strength.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as K from '../static/js/core/knowledge.js';
import { buildHandover, packageManifest } from '../static/js/core/handover.js';
import { evidenceStrength } from '../static/js/core/confidence.js';

const proj = { Project_ReferenceID: 'P-1', project_name: 'Apollo' };
const card = (o) => ({ id: 'c' + Math.random(), Project_ReferenceID: 'P-1', privacy: 'Team Shared', created_at: '2026-09-01T00:00:00Z', title: 't', content: 'x', ...o });

test('a Fact needs a source id; without one it shows as an Assumption', () => {
  assert.equal(K.kindOf(card({ importSourceId: 'src-1' })), 'fact');
  assert.equal(K.kindOf(card({ kind: 'fact', sourceIds: ['a'] })), 'fact');
  assert.equal(K.kindOf(card({ kind: 'fact' })), 'assumption');
  assert.equal(K.kindOf(card({})), 'assumption');
});

test('mock and fallback AI output can never be a Fact', () => {
  for (const aiEngine of ['mock', 'fallback']) {
    assert.equal(K.kindOf(card({ aiEngine, kind: 'fact', sourceIds: ['a'], importSourceId: 'b' })), 'ai_suggestion');
  }
  assert.equal(K.kindOf(card({ aiEngine: 'live', sourceIds: ['a'] })), 'fact');
});

test('buildHandover reports a kind for every approved card and blocks mock facts', () => {
  const state = { timeline: [
    card({ id: 'f', importSourceId: 's1' }), card({ id: 'm', aiEngine: 'mock', sourceIds: ['s1'] }),
    card({ id: 'r', category: 'raid', raidType: 'Risk', importSourceId: 's1' }), card({ id: 'a', raidType: 'Assumption', importSourceId: 's1' }),
  ] };
  const h = buildHandover(state, proj);
  assert.deepEqual(h.kinds, { f: 'fact', m: 'ai_suggestion', r: 'risk', a: 'assumption' });
  assert.equal(h.kindCounts.fact, 1); assert.equal(h.kindCounts.ai_suggestion, 1);
});

test('kind comes from structured fields, never from text', () => {
  assert.equal(K.kindOf(card({ title: 'We decided to go with plan B', content: 'decision approved', importSourceId: 's' })), 'fact');
  assert.equal(K.kindOf(card({ tags: ['#decision_record'], importSourceId: 's' })), 'fact');
  assert.equal(K.kindOf(card({ tags: ['#action_item'], importSourceId: 's' })), 'action');
});

test('decision exists only when a person recorded it; AI cannot create or keep one', () => {
  const c = card({ id: 'x', importSourceId: 's' });
  assert.throws(() => K.recordDecision(c, {}), /name of the person/);
  const d = K.recordDecision(c, { by: 'Ana', rationale: 'Client agreed', at: new Date('2026-10-01T10:00:00Z') });
  assert.equal(K.kindOf(d), 'decision');
  assert.deepEqual(d.decision, { by: 'Ana', at: '2026-10-01T10:00:00.000Z', rationale: 'Client agreed', sourceCardId: 'x' });
  assert.equal(K.kindOf({ ...c, kind: 'decision' }), 'fact', 'a kind field alone is not a decision');
  assert.equal(K.kindOf({ ...c, decision: { rationale: 'AI said so' } }), 'fact');
  assert.equal(K.kindOf(K.clearDecision(d)), 'fact');
});

test('statement ids are stable and differ by card', () => {
  const c = card({ id: 'one', importSourceId: 's' });
  assert.equal(K.statementId(c), K.statementId({ ...c, title: 'changed' }));
  assert.notEqual(K.statementId(c), K.statementId({ ...c, id: 'two' }));
  const st = K.statementOf(c);
  assert.deepEqual(st.sourceIds, ['s']); assert.equal(st.kind, 'fact');
});

test('package manifest carries kind and source ids so the review gate hashes them', () => {
  const g = buildHandover({ timeline: [card({ id: 'f', importSourceId: 's1' })] }, proj);
  const m = packageManifest([{ project: proj, perNote: '', groups: g }], {});
  assert.equal(m.projects[0].items[0].kind, 'fact'); assert.deepEqual(m.projects[0].items[0].sourceIds, ['s1']);
});

test('evidence strength counts approved independent sources only', () => {
  const raw = (source, extra = {}) => ({ kind: 'RAW', source, ...extra });
  const base = { source: 'Email', nodes: [raw('Email'), raw('Email'), raw('Teams', { stagedAppend: true }), { kind: 'AI', text: 'x' }] };
  const e = evidenceStrength(base);
  assert.deepEqual(e.origins, ['Email'], 'duplicates and drafts do not add sources');
  assert.equal(e.pct, 66);
  assert.equal(e.tier, 'Low');
  assert.equal(e.ignored.drafts, 1); assert.equal(e.ignored.aiNodes, 1);
});

test('documented reachability: one source Low, two Medium, three need 1 extra entry for High', () => {
  const mk = (n, rows = 0) => ({ source: 'S0', nodes: [...Array(n - 1)].map((_, i) => ({ kind: 'RAW', source: 'S' + (i + 1) })).concat([...Array(rows)].map(() => ({ kind: 'RAW', source: 'S0' }))) });
  assert.deepEqual([evidenceStrength(mk(1)).pct, evidenceStrength(mk(1)).tier], [63, 'Low']);
  assert.deepEqual([evidenceStrength(mk(2)).pct, evidenceStrength(mk(2)).tier], [71, 'Medium']);
  assert.equal(evidenceStrength(mk(3)).pct, 82);
  assert.equal(evidenceStrength(mk(3, 1)).tier, 'High');
  assert.equal(evidenceStrength(mk(4)).tier, 'High');
  assert.equal(evidenceStrength({ source: 'S0', nodes: [] }).tier, 'Low');
});

test('a pasted Copilot reply is Inference or Recommendation, never Fact or Decision', async () => {
  const { kindOf } = await import('../static/js/core/knowledge.js');
  const base = { id: 'x', origin: 'copilot-pasted', importSourceId: 's1' };
  assert.equal(kindOf(base), 'inference');
  assert.equal(kindOf({ ...base, kind: 'fact' }), 'inference');
  assert.equal(kindOf({ ...base, kind: 'recommendation' }), 'recommendation');
  assert.equal(kindOf({ ...base, decision: { by: 'Ana', at: '2026-01-01' } }), 'inference');
});
