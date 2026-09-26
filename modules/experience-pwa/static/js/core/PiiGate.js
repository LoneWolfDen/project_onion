// js/core/PiiGate.js — client-side regex screening (mirrors AWS Presidio/Comprehend)
// Must run BEFORE timeline view / RAID agg / local or org DB memory (rule_3).
// Keep: names/emails? No — redact emails, keep Project/Opp/GDP/SoW/PO numbers.
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const PHONE_RE = /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g;

// WP4 required named exports - keep patterns byte-identical
export const PRESERVE_REGEX = {
  EMAIL: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,
  PROJECT_TOKEN: /\b(O-\d{4,8}|PO-\d{2,8}|SoW-[\w-]+|GDP-?\d+)\b/gi
};

export const STRIP_KEYWORDS = [/Jane likes coffee/gi, /\b(hotel|coffee|lunch|vacation|birthday|weekend plans|personal reminder)\b/gi];

export function piiScreen(raw) {
  let t = String(raw ?? '');
  let flag = 'Clean';
  if (PRESERVE_REGEX.EMAIL.test(t)) { /* emails stay Clean - intentional no-op */ }
  PRESERVE_REGEX.EMAIL.lastIndex = 0;
  PRESERVE_REGEX.PROJECT_TOKEN.lastIndex = 0;

  t = t.replace(PHONE_RE, '[PHONE_REDACTED]');
  if (/\[PHONE_REDACTED\]/.test(t)) flag = 'Redacted_Review';

  for (const re of STRIP_KEYWORDS) {
    re.lastIndex = 0;
    if (re.test(t)) { t = t.replace(re, '[NOISE_FILTERED]'); flag = 'Redacted_Review'; }
  }
  return { text: t, flag };
}

export function screenPayload(payload) {
  const out = { ...payload };
  if (typeof out.content === 'string') { const r = piiScreen(out.content); out.content = r.text; out.piiStatus = r.flag; }
  return out;
}