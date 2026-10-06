// js/core/tags.js — the closed tag vocabulary. Pure: no DOM, no storage.
// A tag is a structured field, not a word scraped from text. Only the tags below exist; they are the
// ones handover.js maps to a category and knowledge.js reads. Anything else an AI returns is kept
// separately as an unconfirmed suggestion, never as a tag that moves a card into a section.
export const TAGS = [
  { key: 'decision_record', label: 'Decision record' },
  { key: 'milestone_tracked', label: 'Milestone' },
  { key: 'timezone_shift', label: 'Timezone shift' },
  { key: 'invoice_mentioned', label: 'Invoice or PO' },
  { key: 'client_feedback', label: 'Client feedback' },
  { key: 'client_issue', label: 'Client issue' },
  { key: 'resource_change', label: 'Resource change' },
  { key: 'runbook', label: 'Runbook' },
  { key: 'data_quality', label: 'Data quality' },
  { key: 'action_item', label: 'Action' },
  { key: 'lesson_learned', label: 'Lesson learned' },
  { key: 'lesson_applied', label: 'Lesson applied' },
  { key: 'risk_watch', label: 'Risk watch' },
];
export const TAG_KEYS = TAGS.map((t) => t.key);
export const tagMeta = (key) => TAGS.find((t) => t.key === tagKey(key)) || null;

// '#Risk_Watch', 'risk watch', ' #risk-watch ' all key to 'risk_watch'.
export function tagKey(t) {
  // Trim before stripping the '#': ' #risk-watch ' must key the same as '#Risk_Watch'.
  return String(t == null ? '' : t).trim().replace(/^#+/, '').trim().toLowerCase().replace(/[\s-]+/g, '_');
}
export const displayTag = (key) => '#' + tagKey(key).split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join('_');

// Splits anything (a card's tags, an AI reply) into known tags and leftovers.
// Known tags come back in the canonical display form, in vocabulary order, without duplicates.
export function normalizeTags(raw) {
  const list = (Array.isArray(raw) ? raw : raw == null || raw === '' ? [] : [raw]).map(tagKey).filter(Boolean);
  const known = TAG_KEYS.filter((k) => list.includes(k)).map(displayTag);
  const seen = new Set();
  const unmapped = list.filter((k) => !TAG_KEYS.includes(k) && !seen.has(k) && seen.add(k)).slice(0, 10).map(displayTag);
  return { tags: known, unmapped };
}

// Deterministic tags from the words a card actually uses. Whole words only, so "report",
// "support" and "opportunity" are not purchase orders. Evidence of a mention, never of an outcome.
const RULES = [
  ['invoice_mentioned', /\b(po|pos|invoices?|invoiced|invoicing|payments?|billing)\b/],
  ['risk_watch', /\b(risks?|raid|issues?|blockers?|overruns?|delays?|delayed)\b/],
  ['milestone_tracked', /\b(milestones?|sow|contracts?|go[- ]live)\b/],
  ['action_item', /\b(action item|to-?do|next steps?)\b/],
  ['client_feedback', /\b(client feedback|customer feedback)\b/],
  ['data_quality', /\b(data quality|duplicates?|mismatch(es)?)\b/],
];
export function tagsFromText(text) {
  const lower = String(text || '').toLowerCase();
  return RULES.filter(([, re]) => re.test(lower)).map(([k]) => displayTag(k));
}

// The vocabulary as a line for an AI prompt: the model may only choose from it.
export const TAG_PROMPT_LIST = TAGS.map((t) => displayTag(t.key)).join(', ');
