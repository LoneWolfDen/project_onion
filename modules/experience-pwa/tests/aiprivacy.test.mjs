// Run: node --test modules/experience-pwa/tests/
// PRV-01/02: no-AI default, explicit consent, session-only keys, fail closed.
import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const mkStore = () => { const m = new Map(); return { m, getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); }, removeItem: (k) => { m.delete(k); } }; };
const local = mkStore(); const session = mkStore();
globalThis.localStorage = local; globalThis.sessionStorage = session;
globalThis.window = { addEventListener() {}, removeEventListener() {}, dispatchEvent: () => true };
let calls = [];
let fetchImpl = async () => { throw new Error('fetch must not be called'); };
globalThis.fetch = (url, opts) => { calls.push({ url: String(url), opts }); return fetchImpl(url, opts); };

const C = await import('../static/js/core/aiConfig.js');
const AI = await import('../static/js/core/AiClient.js');
const B = await import('../static/js/core/backup.js');

const okOpenRouter = async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify({ synthesizedText: 'S', tags: ['#t'], impactScore: 0.6 }) } }] }) });
const enable = (p) => { C.setProvider(p); C.setAcknowledged(p, true); C.setKey(p, 'sk-test-secret-123'); };

beforeEach(() => { local.m.clear(); session.m.clear(); calls = []; fetchImpl = async () => { throw new Error('fetch must not be called'); }; });

test('default provider is none and nothing is sent', async () => {
  assert.equal(C.getProvider(), 'none');
  const r = await AI.processWithAI('Contract signed for PO-123', 'Email');
  assert.equal(r.aiEngine, 'mock');
  assert.equal(calls.length, 0);
  assert.equal(AI.aiEngineLabel(r.aiEngine, r.aiModel), 'No AI (local rules)');
});

test('provider without consent or without a key fails closed', async () => {
  C.setProvider('openrouter');
  assert.equal(C.resolveRemote().reason, 'not-acknowledged');
  await AI.processWithAI('x', 'Email');
  C.setAcknowledged('openrouter', true);
  assert.equal(C.resolveRemote().reason, 'no-key');
  const r = await AI.processWithAI('x', 'Email');
  assert.equal(r.aiEngine, 'mock');
  assert.match(r.aiFallbackReason, /no key/i);
  assert.equal(calls.length, 0);
});

test('with provider, consent and key the call is made and labelled with provider and model', async () => {
  enable('openrouter'); fetchImpl = okOpenRouter;
  const r = await AI.processWithAI('Status update', 'Email');
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /openrouter\.ai/);
  assert.equal(r.aiEngine, 'live');
  assert.match(AI.aiEngineLabel(r.aiEngine, r.aiModel), /^OpenRouter · /);
});

test('a failing provider is reported as a fallback, never as success', async () => {
  enable('openrouter'); fetchImpl = async () => ({ ok: false, status: 500 });
  const r = await AI.processWithAI('x', 'Email');
  assert.equal(r.aiEngine, 'fallback');
  assert.match(r.aiFallbackReason, /OpenRouter/);
  assert.match(AI.aiEngineLabel(r.aiEngine, r.aiModel), /provider failed/);
});

test('Anthropic failure never retries through another provider', async () => {
  enable('anthropic'); fetchImpl = async () => ({ ok: false, status: 500 });
  C.setAcknowledged('openrouter', true); C.setKey('openrouter', 'other-key');
  const r = await AI.processWithAI('x', 'Email');
  assert.equal(r.aiEngine, 'fallback');
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /anthropic\.com/);
});

test('keys never touch localStorage, and the stored copies are removed on migration', () => {
  C.setKey('openrouter', 'sk-live-abc');
  assert.equal([...local.m.values()].some((v) => v.includes('sk-live-abc')), false);
  assert.equal(session.m.size, 1);
  local.m.set('OPENROUTER_API_KEY', 'sk-old-key'); local.m.set('ANTHROPIC_API_KEY', 'ant-old');
  session.m.clear();
  assert.equal(C.migrateLegacyKeys(), 2);
  assert.equal(local.m.has('OPENROUTER_API_KEY'), false);
  assert.equal(local.m.has('ANTHROPIC_API_KEY'), false);
  assert.equal(C.hasKey('openrouter'), true);
  assert.equal(C.getProvider(), 'none', 'a migrated key does not turn remote AI on');
});

test('clearing the key turns remote AI off again', () => {
  enable('openrouter'); assert.equal(C.resolveRemote().allowed, true);
  C.clearKey('openrouter'); assert.equal(C.resolveRemote().allowed, false);
});

test('backups carry the provider choice but never keys or consent', async () => {
  enable('openrouter');
  const prefs = {}; B.PREFERENCE_KEYS.forEach((k) => { const v = local.getItem(k); if (v != null) prefs[k] = v; });
  const b = await B.buildBackup({ clients: [], projects: [], timeline: [], notes: [], archived: [] }, { ...prefs, OPENROUTER_API_KEY: 'sk-test-secret-123', onion_ai_ack: '{"openrouter":"x"}' });
  const text = JSON.stringify(b);
  assert.ok(!text.includes('sk-test-secret-123'));
  assert.ok(!text.includes('onion_ai_ack'));
});

test('unknown provider values fall back to none', () => {
  local.m.set('LLM_PROVIDER', 'evil');
  assert.equal(C.getProvider(), 'none');
});
