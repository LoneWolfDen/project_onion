// Run: node --test modules/experience-pwa/tests/
// HND-01/02/03: handover model, approved-only, categories from fields, review gate.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as H from '../static/js/core/handover.js';

const proj = { Project_ReferenceID: 'P-1', project_name: 'Apollo' };
const card = (o) => ({ id: 'c' + Math.random(), Project_ReferenceID: 'P-1', privacy: 'Team Shared', created_at: '2026-09-01T00:00:00Z', title: 't', content: 'x', ...o });
const NOW = Date.parse('2026-10-05T00:00:00Z');

test('category comes from the category field, then structured tags; never from text', () => {
  assert.equal(H.categoryOf(card({ category: 'finances' })), 'finances');
  assert.equal(H.categoryOf(card({ tags: ['#Milestone_Tracked'] })), 'delivery');
  assert.equal(H.categoryOf(card({ tags: ['#Risk_Watch'] })), 'raid');
  assert.equal(H.categoryOf(card({ title: 'Invoice overdue, budget risk, blocked', content: 'PO payment csat' })), 'uncategorised');
  assert.equal(H.categoryOf(card({ category: 'nonsense' })), 'uncategorised');
});

test('open or closed comes from status fields only', () => {
  assert.equal(H.isClosed(card({ content: 'this is closed and resolved and approved' })), false);
  assert.equal(H.isClosed(card({ itemStatus: 'Closed' })), true);
  assert.equal(H.isClosed(card({ closed_at: '2026-09-02' })), true);
  assert.equal(H.isClosed(card({ tags: ['#Resolved'] })), true);
});

test('staged and unconfirmed items stay out of the handover and are listed separately', () => {
  const state = { timeline: [card({ id: 'a' }), card({ id: 'b', syncStatus: 'pending_processing' }), card({ id: 'c', pendingAppends: [{ stagedId: 'z' }] }), card({ id: 'd', draft: true })] };
  const m = H.buildHandover(state, proj, { now: NOW });
  assert.deepEqual(m.cards.map((c) => c.id), ['a']);
  assert.deepEqual(m.needsConfirmation.map((c) => c.id).sort(), ['b', 'c', 'd']);
});

test('private cards need the owner; other projects and old cards are excluded by window', () => {
  const state = { timeline: [card({ id: 'mine', privacy: 'My Notes (Private)', author: 'Ana' }), card({ id: 'theirs', privacy: 'Private', author: 'Bo' }), card({ id: 'other', Project_ReferenceID: 'P-2', project_name: 'Other' }), card({ id: 'old', created_at: '2026-01-01T00:00:00Z' })] };
  assert.deepEqual(H.buildHandover(state, proj, { persona: 'Ana', timeframe: '3m', now: NOW }).cards.map((c) => c.id), ['mine']);
  assert.deepEqual(H.buildHandover(state, proj, { persona: 'Ana', timeframe: 'full', now: NOW }).cards.map((c) => c.id).sort(), ['mine', 'old']);
});

test('empty sections say Not found; counts add up', () => {
  const m = H.buildHandover({ timeline: [card({ category: 'delivery' })] }, proj, { now: NOW });
  assert.equal(m.sections.find((s) => s.key === 'delivery').empty, '');
  assert.equal(m.sections.find((s) => s.key === 'finances').empty, H.NOT_FOUND);
  assert.equal(Object.values(m.counts).reduce((a, b) => a + b, 0), 1);
  assert.equal(H.buildHandover({}, proj).sections.every((s) => s.empty === H.NOT_FOUND), true);
});

test('review gate: confirmation is valid only for the exact package', async () => {
  const mk = (extra) => [{ project: proj, perNote: '', groups: H.buildHandover({ timeline: [card({ id: 'a', category: 'delivery' }), ...extra] }, proj, { now: NOW }) }];
  const opts = { timeframe: 'full', coverNotes: 'hi' };
  const h1 = await H.packageHash(mk([]), opts);
  assert.equal(h1, await H.packageHash(mk([]), opts));
  const conf = H.makeConfirmation(h1, 'Ana', new Date('2026-10-05T10:00:00Z'));
  assert.equal(conf.at, '2026-10-05T10:00:00.000Z');
  assert.equal(H.confirmationValid(conf, h1), true);
  assert.equal(H.confirmationValid(conf, await H.packageHash(mk([card({ id: 'b' })]), opts)), false, 'new item invalidates');
  assert.equal(H.confirmationValid(conf, await H.packageHash(mk([]), { ...opts, coverNotes: 'changed' })), false, 'note change invalidates');
  assert.equal(H.confirmationValid(null, h1), false);
});
