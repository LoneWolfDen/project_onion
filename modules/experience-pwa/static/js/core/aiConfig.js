// js/core/aiConfig.js — AI provider choice, consent and credentials (PRV-01, PRV-02).
// Default is "none": nothing leaves the device. A remote provider is used only when
// the user picked it, acknowledged that content leaves the device, AND supplied a key.
// Keys live in sessionStorage only (cleared when the browser closes). They are never
// written to localStorage, exports, logs or the UI; the UI only shows that a key is set.
export const PROVIDERS = {
  none: { label: 'No AI (stays on this device)', destination: null, sends: [] },
  openrouter: {
    label: 'OpenRouter', destination: 'openrouter.ai',
    sends: ['the text you stage or paste into the Harvester', 'for Ask: titles and content of the cards in the current privacy scope (up to 12 cards)'],
  },
  anthropic: {
    label: 'Anthropic', destination: 'api.anthropic.com',
    sends: ['the text you stage or paste into the Harvester'],
  },
};
export const DEFAULT_MODEL = 'anthropic/claude-3-haiku';
const PROVIDER_KEY = 'LLM_PROVIDER';
const ACK_KEY = 'onion_ai_ack';
const SESSION_PREFIX = 'onion_session_key_';
const LEGACY_KEYS = { openrouter: 'OPENROUTER_API_KEY', anthropic: 'ANTHROPIC_API_KEY' };

function ls() { try { return globalThis.localStorage || null; } catch (e) { return null; } }
function ss() { try { return globalThis.sessionStorage || null; } catch (e) { return null; } }
function changed() { try { window.dispatchEvent(new CustomEvent('onion:ai-config')); } catch (e) {} }

export function getProvider() {
  try { const p = ls() && ls().getItem(PROVIDER_KEY); return PROVIDERS[p] ? p : 'none'; } catch (e) { return 'none'; }
}
export function setProvider(p) {
  try { ls().setItem(PROVIDER_KEY, PROVIDERS[p] ? p : 'none'); } catch (e) {}
  changed();
}

function readAck() { try { return JSON.parse(ls().getItem(ACK_KEY) || '{}') || {}; } catch (e) { return {}; } }
export function isAcknowledged(p) { return !!readAck()[p]; }
export function setAcknowledged(p, on) {
  const a = readAck();
  if (on) a[p] = new Date().toISOString(); else delete a[p];
  try { ls().setItem(ACK_KEY, JSON.stringify(a)); } catch (e) {}
  changed();
}

export function getKey(p) { try { return (ss() && ss().getItem(SESSION_PREFIX + p)) || ''; } catch (e) { return ''; } }
export function hasKey(p) { return !!String(getKey(p)).trim(); }
export function setKey(p, key) {
  const k = String(key || '').trim();
  try { if (k) ss().setItem(SESSION_PREFIX + p, k); else ss().removeItem(SESSION_PREFIX + p); } catch (e) { return false; }
  changed();
  return hasKey(p) === !!k;
}
export function clearKey(p) { try { ss().removeItem(SESSION_PREFIX + p); } catch (e) {} changed(); }

// Older versions kept keys in localStorage. Move them to this session and delete the stored copy.
export function migrateLegacyKeys() {
  let moved = 0;
  Object.entries(LEGACY_KEYS).forEach(([p, k]) => {
    try {
      const v = ls() && ls().getItem(k);
      if (v == null) return;
      if (String(v).trim() && ss() && !hasKey(p)) { ss().setItem(SESSION_PREFIX + p, String(v).trim()); moved++; }
      ls().removeItem(k);
    } catch (e) {}
  });
  return moved;
}

// The single gate every remote call goes through.
// -> { allowed, provider, key, reason }  reason: 'provider-none' | 'not-acknowledged' | 'no-key' | 'ok'
export function resolveRemote() {
  const provider = getProvider();
  if (provider === 'none') return { allowed: false, provider, key: '', reason: 'provider-none' };
  if (!isAcknowledged(provider)) return { allowed: false, provider, key: '', reason: 'not-acknowledged' };
  const key = getKey(provider).trim();
  if (!key) return { allowed: false, provider, key: '', reason: 'no-key' };
  return { allowed: true, provider, key, reason: 'ok' };
}

export function getModel() { try { return (ls() && ls().getItem('OPENROUTER_MODEL')) || DEFAULT_MODEL; } catch (e) { return DEFAULT_MODEL; } }

const REASON_TEXT = {
  'provider-none': 'No AI provider is enabled, so everything stays on this device.',
  'not-acknowledged': 'A provider is selected but you have not confirmed that content will leave this device, so it is not being used.',
  'no-key': 'A provider is selected but no key is set for this session, so it is not being used.',
  ok: 'Remote AI is enabled.',
};
export function reasonText(reason) { return REASON_TEXT[reason] || REASON_TEXT['provider-none']; }
