// js/core/pii.js — the one screening module (PRV-05). Pure and DOM-free; storage is optional.
// Used for pasted text, notes, titles, bookmarklet scrapes and file imports (via PiiGate.js).
// Rules agreed 5 Oct: phone numbers and configured noise words and patterns are redacted;
// email addresses are kept on purpose (shown as "kept" in previews); project, opportunity,
// GDP, SoW and PO numbers are never touched. Redacted originals can be retained locally,
// never in backups, exports or vector sync.
export const PHONE_RE = /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g;
export const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
export const PRESERVE_REGEX = {
  EMAIL: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,
  PROJECT_TOKEN: /\b(O-\d{4,8}|PO-\d{2,8}|SoW-[\w-]+|GDP-?\d+)\b/gi,
};
export const DEFAULT_NOISE = ['Jane likes coffee', 'hotel', 'coffee', 'lunch', 'vacation', 'birthday', 'weekend plans', 'personal reminder'];
export const STRIP_KEYWORDS = [/Jane likes coffee/gi, /\b(hotel|coffee|lunch|vacation|birthday|weekend plans|personal reminder)\b/gi];

const CFG_KEY = 'continuum_pii_config';
const ORIG_KEY = 'continuum_pii_originals';
const MAX_ORIGINALS = 500;
const esc = (w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// config: { noiseWords: string[] (added to defaults), patterns: [{ name, source }] }
export function sanitiseConfig(c) {
  const words = (Array.isArray(c && c.noiseWords) ? c.noiseWords : []).map((w) => String(w).trim()).filter((w) => w && w.length <= 60).slice(0, 100);
  const patterns = [];
  (Array.isArray(c && c.patterns) ? c.patterns : []).slice(0, 20).forEach((p) => {
    const source = String((p && p.source) || '').trim();
    if (!source || source.length > 200) return;
    try { new RegExp(source, 'gi'); patterns.push({ name: String((p && p.name) || 'custom').slice(0, 40), source }); } catch (e) { /* invalid pattern is dropped */ }
  });
  return { noiseWords: words, patterns };
}
export function loadConfig() { try { return sanitiseConfig(JSON.parse(localStorage.getItem(CFG_KEY) || '{}')); } catch (e) { return sanitiseConfig({}); } }
export function saveConfig(c) { const v = sanitiseConfig(c); try { localStorage.setItem(CFG_KEY, JSON.stringify(v)); } catch (e) { /* not remembered */ } return v; }

// Returns { text, flag, redactions: [{ kind, match }], kept: [email...] }.
export function screen(raw, config) {
  const cfg = config ? sanitiseConfig(config) : loadConfig();
  let t = String(raw == null ? '' : raw);
  const redactions = [];
  const kept = (t.match(EMAIL_RE) || []).slice();
  const sub = (re, kind, token) => { t = t.replace(re, (m) => { redactions.push({ kind, match: m }); return token; }); };
  sub(new RegExp(PHONE_RE.source, 'g'), 'phone', '[PHONE_REDACTED]');
  sub(/Jane likes coffee/gi, 'noise', '[NOISE_FILTERED]');
  sub(/\b(hotel|coffee|lunch|vacation|birthday|weekend plans|personal reminder)\b/gi, 'noise', '[NOISE_FILTERED]');
  if (cfg.noiseWords.length) sub(new RegExp('\\b(' + cfg.noiseWords.map(esc).join('|') + ')\\b', 'gi'), 'noise', '[NOISE_FILTERED]');
  cfg.patterns.forEach((p) => sub(new RegExp(p.source, 'gi'), 'custom', '[REDACTED:' + p.name + ']'));
  return { text: t, flag: redactions.length ? 'Redacted_Review' : 'Clean', redactions, kept };
}
export function piiScreen(raw) { const r = screen(raw); return { text: r.text, flag: r.flag }; }
export function screenTitle(raw, max = 80) { return screen(raw).text.slice(0, max); }
export function screenPayload(payload) {
  const out = { ...payload };
  if (typeof out.content === 'string') { const r = piiScreen(out.content); out.content = r.text; out.piiStatus = r.flag; }
  return out;
}

// Plain-language preview of what screening will do to a set of texts.
export function summariseRedactions(texts, config) {
  const n = { phone: 0, noise: 0, custom: 0 }; let kept = 0;
  texts.forEach((x) => { const r = screen(x, config); r.redactions.forEach((d) => { n[d.kind] += 1; }); kept += r.kept.length; });
  const lines = [];
  if (n.phone) lines.push(n.phone + ' phone number' + (n.phone === 1 ? '' : 's') + ' will be redacted');
  if (n.noise) lines.push(n.noise + ' noise word' + (n.noise === 1 ? '' : 's') + ' will be filtered');
  if (n.custom) lines.push(n.custom + ' match' + (n.custom === 1 ? '' : 'es') + ' for your own patterns will be redacted');
  if (!lines.length) lines.push('Nothing to redact');
  if (kept) lines.push(kept + ' email address' + (kept === 1 ? ' is' : 'es are') + ' kept on purpose');
  return { counts: n, kept, lines };
}

// Protected originals: kept on this device only, keyed by card id, when screening changed the text.
export function retainOriginal(id, original, screened) {
  if (!id || original === screened) return false;
  try {
    const all = JSON.parse(localStorage.getItem(ORIG_KEY) || '{}');
    all[String(id)] = { text: String(original), at: new Date().toISOString() };
    const keys = Object.keys(all);
    if (keys.length > MAX_ORIGINALS) keys.sort((a, b) => all[a].at.localeCompare(all[b].at)).slice(0, keys.length - MAX_ORIGINALS).forEach((k) => delete all[k]);
    localStorage.setItem(ORIG_KEY, JSON.stringify(all));
    return true;
  } catch (e) { return false; }
}
export function getOriginal(id) { try { const e = JSON.parse(localStorage.getItem(ORIG_KEY) || '{}')[String(id)]; return e ? e.text : null; } catch (e) { return null; } }
export const ORIGINALS_KEY = ORIG_KEY;
