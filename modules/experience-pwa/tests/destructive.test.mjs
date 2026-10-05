// Run: node --test modules/experience-pwa/tests/
// DAT-05: destructive actions only run after every guard passes.
import test from 'node:test';
import assert from 'node:assert/strict';
import { CLEAR_PHRASE, phraseMatches, removalSummary, describeRemoval, runGuarded } from '../static/js/core/destructive.js';

const mk = () => { const log = []; return { log, action: async () => { log.push('action'); }, backup: async () => { log.push('backup'); return true; } }; };

test('cancel leaves everything unchanged', async () => {
  const m = mk();
  const r = await runGuarded({ confirmed: false, action: m.action, backup: m.backup, wantBackup: true });
  assert.deepEqual(r, { ran: false, reason: 'cancelled' });
  assert.deepEqual(m.log, []);
});

test('clear-all needs the exact phrase', async () => {
  const m = mk();
  for (const bad of ['', 'delete all data', 'DELETE', 'DELETE ALL DATA!']) {
    const r = await runGuarded({ confirmed: true, phrase: CLEAR_PHRASE, input: bad, action: m.action });
    assert.equal(r.ran, false); assert.equal(r.reason, 'phrase');
  }
  assert.deepEqual(m.log, []);
  const ok = await runGuarded({ confirmed: true, phrase: CLEAR_PHRASE, input: '  DELETE ALL DATA ', action: m.action });
  assert.equal(ok.ran, true);
});

test('backup runs before the action, and a failed backup blocks it', async () => {
  const m = mk();
  await runGuarded({ confirmed: true, wantBackup: true, backup: m.backup, action: m.action });
  assert.deepEqual(m.log, ['backup', 'action']);
  const m2 = mk();
  const r = await runGuarded({ confirmed: true, wantBackup: true, backup: async () => false, action: m2.action });
  assert.deepEqual(r, { ran: false, reason: 'backup-failed' });
  assert.deepEqual(m2.log, []);
  const r3 = await runGuarded({ confirmed: true, wantBackup: true, backup: async () => { throw new Error('x'); }, action: m2.action });
  assert.equal(r3.ran, false);
});

test('user can skip the backup explicitly', async () => {
  const m = mk();
  const r = await runGuarded({ confirmed: true, wantBackup: false, backup: m.backup, action: m.action });
  assert.equal(r.ran, true);
  assert.deepEqual(m.log, ['action']);
});

test('removal summary states exactly what goes', () => {
  const s = removalSummary({ clients: [1, 2], projects: [1], timeline: [{ nodes: [1, 2, 3] }, { nodes: [1] }], notes: [1], archived: [] });
  assert.deepEqual(s, { cards: 2, nodes: 4, projects: 1, clients: 2, notes: 1, archived: 0 });
  assert.match(describeRemoval(s), /2 cards \(4 timeline entries\), 1 projects, 2 clients, 1 notes and 0 archived/);
  assert.equal(removalSummary(null).cards, 0);
});

test('phraseMatches is case-sensitive', () => {
  assert.equal(phraseMatches('DELETE ALL DATA', CLEAR_PHRASE), true);
  assert.equal(phraseMatches('delete all data', CLEAR_PHRASE), false);
});
