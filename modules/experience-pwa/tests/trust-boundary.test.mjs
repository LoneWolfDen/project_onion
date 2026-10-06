// Run: node --test modules/experience-pwa/tests/trust-boundary.test.mjs
// OPS-03: critical trust-boundary tests. CI runs this file as the "critical-tests" check and again
// on release tags (.github/workflows/release-gate.yml). Each test names the boundary it protects.
// Related boundaries covered in other files: keys never in backups (backup, aiprivacy), clear-all
// needs a backup (destructive), import is all-or-nothing and keeps provenance (importEngine),
// fallback AI never Fact and Smart Append provenance in the browser smoke run (smoke.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildHandover } from '../static/js/core/handover.js';
import { buildPackage } from '../static/js/core/exportPackage.js';
import { kindOf, recordDecision } from '../static/js/core/knowledge.js';
import { evidenceStrength } from '../static/js/core/confidence.js';
import { sanitizeEvent } from '../static/js/core/logger.js';

const A = { Project_ReferenceID: 'P-A', project_name: 'Apollo' };
const B = { Project_ReferenceID: 'P-B', project_name: 'Beacon' };
const card = (o) => ({ id: 'c' + Math.random(), Project_ReferenceID: 'P-A', privacy: 'Team Shared', created_at: '2026-09-01T00:00:00Z', title: 't', content: 'x', importSourceId: 's1', ...o });
const meta = { generatedAt: '2026-10-05T10:00:00Z', generatedBy: 'Ana', timeframe: 'Full Lifecycle', packageHash: 'h'.repeat(16) };
const pkg = async (state, proj, persona = 'Ana') => {
  const files = await buildPackage([{ project: proj, perNote: '', groups: buildHandover(state, proj, { persona }) }], meta, []);
  return Object.fromEntries(files.map((f) => [f.name, f.content]));
};
const ids = (files) => JSON.parse(files['handover.json']).projects[0].statements.map((s) => s.cardId).sort();

test('draft and staged items never reach the export package', async () => {
  const state = { timeline: [card({ id: 'ok' }), card({ id: 'd1', draft: true }), card({ id: 'd2', syncStatus: 'pending_processing' }), card({ id: 'd3', pendingAppends: [{ stagedId: 'z' }] })] };
  assert.deepEqual(ids(await pkg(state, A)), ['ok']);
});

test("another person's private card never reaches the package; the owner's does", async () => {
  const state = { timeline: [card({ id: 'mine', privacy: 'My Notes (Private)', author: 'Ana' }), card({ id: 'theirs', privacy: 'My Notes (Private)', author: 'Bo' })] };
  assert.deepEqual(ids(await pkg(state, A, 'Ana')), ['mine']);
  assert.deepEqual(ids(await pkg(state, A, 'Cy')), []);
});

test('cross-project isolation: a package holds only its own project', async () => {
  const state = { timeline: [card({ id: 'a1' }), card({ id: 'b1', Project_ReferenceID: 'P-B', project_name: 'Beacon' })] };
  const files = await pkg(state, A);
  assert.deepEqual(ids(files), ['a1']);
  assert.ok(!files['handover.md'].includes('Beacon'));
});

test('mock and fallback AI text is never a Fact, in the app model or the package', async () => {
  const state = { timeline: [card({ id: 'm', aiEngine: 'mock' }), card({ id: 'f', aiEngine: 'fallback', kind: 'fact' })] };
  const files = await pkg(state, A);
  assert.deepEqual(JSON.parse(files['handover.json']).projects[0].statements.map((s) => s.kind), ['ai_suggestion', 'ai_suggestion']);
});

test('a Fact without a source id is shown as an Assumption', () => {
  assert.equal(kindOf(card({ importSourceId: '', kind: 'fact' })), 'assumption');
});

test('AI cannot create a Decision: only a named person can', () => {
  assert.throws(() => recordDecision(card({}), { by: '' }));
  assert.notEqual(kindOf(card({ kind: 'decision', decision: { rationale: 'AI' } })), 'decision');
});

test('evidence strength ignores drafts, AI nodes and repeat entries from one origin', () => {
  const e = evidenceStrength({ source: 'Email', nodes: [{ kind: 'RAW', source: 'Email' }, { kind: 'RAW', source: 'Teams', stagedAppend: true }, { kind: 'AI', text: 'x' }] });
  assert.deepEqual(e.origins, ['Email']); assert.equal(e.tier, 'Low');
});

test('the diagnostics log refuses card text, emails and phone numbers', () => {
  const e = sanitizeEvent({ module: 'import', code: 'import.staged', data: { title: 'Acme budget', email: 'a@b.co', phone: '07123456789', rows: 3 } });
  assert.deepEqual(e.data, { rows: 3 }); assert.equal(e.dropped, 3);
});

test('same input gives the same package bytes (hash is reproducible)', async () => {
  const state = { timeline: [card({ id: 'x' })] };
  assert.deepEqual(await pkg(state, A), await pkg(state, A));
});

test('no-AI answers only repeat text from scoped cards and never invent facts', async () => {
  const { mockQaFallback } = await import('../static/js/core/AiClient.js');
  const cards = [{ id: 'k1', title: 'Gateway review', content: 'Review booked for Friday.', source: 'Note' }];
  const hit = mockQaFallback('why was the gateway delayed? PO funding blocked', cards, 'Both', 'Ana');
  assert.match(hit.answer, /Gateway review/);
  assert.match(hit.answer, /\[Card k1\]/);
  for (const banned of ['PO-88921', 'Infosec', 'VNet', 'Raj', 'security clearance']) assert.ok(!hit.answer.includes(banned), banned);
  const miss = mockQaFallback('what is the budget forecast?', cards, 'Both', 'Ana');
  assert.deepEqual(miss.sources, []);
  assert.match(miss.answer, /Not found: .*nothing was inferred/);
  assert.match(miss.answer, /Searched 1 card/);
  assert.match(hit.answer, /\[(Fact|Assumption)\] "Gateway review"/);
  assert.match(mockQaFallback('gateway', [{ ...cards[0], draft: true }], 'Both', '').answer, /\[Needs confirmation\]/);
  assert.match(mockQaFallback('anything', [], 'Both', '').answer, /Not found: no sources are available/);
});
