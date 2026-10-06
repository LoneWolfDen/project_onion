import test from 'node:test';
import assert from 'node:assert/strict';
import { detectBrowser, SOURCE_ACCESS, adviceFor, loadDeclared, saveDeclared, probeEnvironment } from '../static/js/core/capabilities.js';

test('detectBrowser reports yes, no and unknown from the environment only', () => {
  const rows = Object.fromEntries(detectBrowser({ secureContext: true, serviceWorker: false, indexedDB: true }).map((r) => [r.id, r.status]));
  assert.equal(rows.secure, 'yes');
  assert.equal(rows.sw, 'no');
  assert.equal(rows.persist, 'unknown');
});

test('the access matrix says Teams chats and Outlook cannot be read and nothing claims a connector', () => {
  const by = Object.fromEntries(SOURCE_ACCESS.map((s) => [s.source, s]));
  assert.equal(by['Teams channels and group chats'].direct, 'Cannot read');
  assert.equal(by['Outlook mail'].direct, 'Cannot read');
  assert.match(by['Agents, MCP servers, Graph APIs'].direct, /Not built/);
  assert.ok(SOURCE_ACCESS.every((s) => !/^(Live|Connected)/i.test(s.direct)));
});

test('advice follows the declared licences and never says Copilot is connected', () => {
  const a = adviceFor({ copilot: true, transcripts: true }).join(' ');
  assert.match(a, /paste-back/);
  assert.match(a, /\.vtt/);
  assert.match(adviceFor({}).join(' '), /No Copilot licence/);
});

test('declared licences round-trip and a broken store is ignored', () => {
  const m = new Map(); const st = { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, v) };
  assert.equal(saveDeclared(st, { copilot: true }), true);
  assert.deepEqual(loadDeclared(st), { copilot: true });
  m.set('onion_capability_declared', '{nope');
  assert.deepEqual(loadDeclared(st), {});
});

test('probeEnvironment never throws on a bare window', async () => {
  const env = await probeEnvironment({}, async () => { throw new Error('down'); }, false);
  assert.equal(env.vectorService, false);
  assert.equal(env.serviceWorker, false);
});
