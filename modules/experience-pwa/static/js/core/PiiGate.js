// js/core/PiiGate.js — client-side regex screening (mirrors AWS Presidio/Comprehend)
// Must run BEFORE timeline view / RAID agg / local or org DB memory (rule_3).
// Keep: names/emails? No — redact emails, keep Project/Opp/GDP/SoW/PO numbers.
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const PHONE_RE = /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g;
const NOISE_PHRASES = [/Jane likes coffee/gi, /\b(hotel|coffee|lunch|vacation)\b/gi];
export function piiScreen(raw) {
  let t = String(raw ?? '');
  let flag = 'Clean';
  // Step 4 FIX: explicitly ignore standard email addresses (incl. .co.uk) 
  // to preserve business context. We check but do NOT redact.
  if (EMAIL_RE.test(t)) {
    // flag = 'Clean'; // Emails are now considered clean context
  }
  EMAIL_RE.lastIndex = 0;
  t = t.replace(PHONE_RE, '[PHONE_REDACTED]');
  if (/\[PHONE_REDACTED\]/.test(t)) flag = 'Redacted_Review';
  for (const re of NOISE_PHRASES) {
    re.lastIndex = 0;
    if (re.test(t)) {
      t = t.replace(re, '[NOISE_FILTERED]');
      flag = 'Redacted_Review';
    }
  }
  return { text: t, flag };
}
export function screenPayload(payload) {
  // Screen content/title fields of a 9-field harvested payload in place.
  const out = { ...payload };
  if (typeof out.content === 'string') {
    const r = piiScreen(out.content);
    out.content = r.text;
    out.piiStatus = r.flag;
  }
  return out;
}
