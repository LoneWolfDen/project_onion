// Run: node --test modules/experience-pwa/tests/
// KNW-03 / RAD-02: compounding and reuse rules.
import test from 'node:test';
import assert from 'node:assert/strict';
import { contributorsOf, makeReuse, compounding, knowledgeMetrics, isVerifiedReuse } from '../static/js/core/compounding.js';
import { evidenceStrength } from '../static/js/core/confidence.js';
import { recordDecision } from '../static/js/core/knowledge.js';

const orig = () => ({ id: 'c1', projectId: 'Apollo', project_name: 'Apollo', title: 'Batch sync', type: 'Scrape', source: 'Teams Chat', author: 'Walter', privacy: 'Team Shared', content: 'nightly batch',
  nodes: [{ kind: 'RAW', source: 'RAID Log Excel', author: 'Malcolm', text: 'x' }, { kind: 'AI', author: 'AI', text: 'summary' }, { kind: 'RAW', source: 'Email', author: 'Pat', stagedAppend: true, text: 'draft' }] });
const target = { project_name: 'Beacon', Project_ReferenceID: 'PRJ-B' };

test('contributors are approved people only: no AI, no staged drafts, no duplicates', () => {
  assert.deepEqual(contributorsOf(orig()), ['Walter', 'Malcolm']);
  assert.deepEqual(contributorsOf({ id: 'p', syncStatus: 'pending_processing', author: 'Sam' }), []);
});
test('draft evidence does not raise strength; an approved independent source does; the same source twice does not', () => {
  const c = orig();
  assert.equal(evidenceStrength(c).origins.length, 2);
  c.nodes.push({ kind: 'RAW', source: 'Email', author: 'Pat' });
  assert.equal(evidenceStrength(c).origins.length, 3);
  c.nodes.push({ kind: 'RAW', source: 'Email', author: 'Pat' });
  assert.equal(evidenceStrength(c).origins.length, 3);
});
test('reuse creates a private Draft and leaves the original untouched', () => {
  const o = orig(); const before = JSON.stringify(o);
  const r = makeReuse(o, target, { by: 'Vamsi', now: new Date('2026-10-05T10:00:00Z') });
  assert.equal(JSON.stringify(o), before);
  assert.equal(r.draft, true); assert.equal(r.privacy, 'My Notes (Private)'); assert.equal(r.syncStatus, 'pending_processing');
  assert.equal(r.projectId, 'Beacon');
  assert.notEqual(r.id, o.id);
});
test('cross-project reuse keeps original contributors, sources and strength', () => {
  const r = makeReuse(orig(), target, { by: 'Vamsi' });
  assert.deepEqual(r.reusedFrom.contributors, ['Walter', 'Malcolm']);
  assert.equal(r.reusedFrom.cardId, 'c1'); assert.equal(r.reusedFrom.projectId, 'Apollo');
  assert.equal(r.reusedFrom.strength.sources, 2);
  assert.equal(r.reusedFrom.by, 'Vamsi');
});
test('a reuse needs a person and a target', () => {
  assert.throws(() => makeReuse(orig(), target, {}), /name of the person/);
  assert.throws(() => makeReuse(orig(), null, { by: 'x' }), /Choose a project/);
});
test('pending reuse is not verified reuse; approving it verifies it', () => {
  const o = orig(); const r = makeReuse(o, target, { by: 'Vamsi' });
  let k = compounding(o, [o, r]);
  assert.equal(k.pendingReuse, 1); assert.equal(k.verifiedReuse, 0);
  const approved = { ...r, draft: false, syncStatus: 'synced', privacy: 'Team Shared' };
  assert.equal(isVerifiedReuse(approved), true);
  k = compounding(o, [o, approved]);
  assert.equal(k.verifiedReuse, 1); assert.equal(k.reusedIn[0].projectId, 'Beacon');
});
test('shows what changed since reuse, decisions and handovers that used it', () => {
  const o = orig(); const r = makeReuse(o, target, { by: 'V' });
  o.nodes.push({ kind: 'RAW', source: 'GDP', author: 'Ana' });
  const dec = recordDecision({ id: 'd1', title: 'Go nightly' }, { by: 'V' }); dec.decision.sourceCardId = 'c1';
  const k = compounding(o, [o, r, dec], [{ at: 'now', by: 'V', project: 'Apollo', cardIds: ['c1', 'z'] }]);
  assert.equal(k.reusedIn[0].newSinceReuse, 1);
  assert.equal(k.decisions.length, 1);
  assert.equal(k.handovers.length, 1);
});
test('metrics keep contribution count and verified reuse apart, drafts excluded', () => {
  const o = orig(); const r = { ...makeReuse(o, target, { by: 'V' }), draft: false, syncStatus: 'synced' };
  const m = knowledgeMetrics([o, r, { id: 'd', draft: true }]);
  assert.deepEqual(Object.keys(m).sort(), ['cards', 'contributions', 'verifiedReuse']);
  assert.equal(m.verifiedReuse, 1); assert.equal(m.cards, 2);
});
import { loadHandoverUses, recordHandoverUse } from '../static/js/core/compounding.js';
test('handover uses keep ids, who and when only, and stay bounded', () => {
  const m = new Map(); const s = { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) };
  recordHandoverUse(s, { hash: 'abcdef0123456789zzzz', by: 'V', project: 'Apollo', cardIds: ['c1'], at: new Date('2026-10-05T10:00:00Z') });
  const u = loadHandoverUses(s);
  assert.deepEqual(Object.keys(u[0]).sort(), ['at', 'by', 'cardIds', 'hash', 'project']);
  assert.equal(u[0].hash.length, 16);
  for (let i = 0; i < 250; i++) recordHandoverUse(s, { cardIds: ['x'] });
  assert.equal(loadHandoverUses(s).length, 200);
});
