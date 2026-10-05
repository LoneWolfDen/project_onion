// js/core/confidence.js — Model Confidence % from cross-referenced source evidence.
// No invented GDP significance formula (rule_4). Confidence only, from evidence diversity.
export function confidenceTier(pct) {
  if (pct >= 85) return 'High';
  if (pct >= 60) return 'Medium';
  return 'Low';
}
export function confidenceClass(pct) {
  if (pct >= 85) return 'onion-conf-high';
  if (pct >= 60) return 'onion-conf-med';
  return 'onion-conf-low';
}
// evidence: array of {origin, label}. More distinct origins + rows → higher confidence.
// The rule is a corroboration count, not a model output. confidenceBreakdown
// returns each term so the card can show exactly how the number was reached.
export const CONFIDENCE_RULE = { base: 55, perSource: 8, maxSources: 32, perExtraRow: 3, maxRows: 9, cap: 97 };
export function confidenceBreakdown(evidence = [], sourceRowCount = 1) {
  const R = CONFIDENCE_RULE;
  const origins = [...new Set((evidence || []).map((e) => (e && e.origin) || 'Unknown'))];
  const extraRows = Math.max(sourceRowCount - 1, 0);
  const originBoost = Math.min(origins.length * R.perSource, R.maxSources);
  const rowBoost = Math.min(extraRows * R.perExtraRow, R.maxRows);
  const pct = Math.min(R.base + originBoost + rowBoost, R.cap);
  return { pct, base: R.base, origins, originBoost, extraRows, rowBoost, capped: R.base + originBoost + rowBoost > R.cap };
}
export function calcConfidence(evidence = [], sourceRowCount = 1) {
  return confidenceBreakdown(evidence, sourceRowCount).pct;
}
// Plain-language confidence sentence (backlog #7), built only from the breakdown:
//   "Model confidence: High — 3 sources fused, validated via Salesforce. Sources: Email + Teams Chat + Salesforce"
// "N sources fused" needs 2+ distinct sources; one source is reported as not yet
// corroborated. "validated via X" names a system-of-record source (Salesforce,
// GDP, SharePoint, RAID log, Excel) that is among the fused sources — never invented.
const SYSTEM_OF_RECORD = /salesforce|gdp|sharepoint|raid|excel/i;
export function buildConfidenceText(breakdown, tier, name = 'Model confidence') {
  const origins = (breakdown && breakdown.origins) || [];
  const n = origins.length;
  const label = name + ': ' + tier;
  if (n <= 1) return { lead: label + ' — ' + (n ? '1 source (' + origins[0] + '), not yet corroborated' : 'no sources recorded'), sources: '' };
  const validator = origins.find((o) => SYSTEM_OF_RECORD.test(String(o)));
  return { lead: label + ' — ' + n + ' sources fused' + (validator ? ', validated via ' + validator : ''), sources: origins.join(' + ') };
}

// KNW-04 Evidence Strength. Counts only what a reviewer can check: the card's own source plus RAW
// updates already approved onto it. Draft (staged) updates, AI summaries and hashtags add nothing,
// and several entries from one origin count as one independent source.
//   Tier (docs/EVIDENCE_STRENGTH.md): Low = one source only (not corroborated, whatever the score);
//   Medium = 2+ independent sources; High = 3+ independent sources and a score of 85 or more.
export function evidenceStrength(card) {
  const m = card || {};
  const cardSource = String(m.source || m.type || 'Timeline');
  const nodes = Array.isArray(m.nodes) ? m.nodes : [];
  const isRaw = (n) => n && String(n.kind || '').toUpperCase() === 'RAW';
  const shared = nodes.filter((n) => isRaw(n) && !n.stagedAppend);
  const drafts = nodes.filter((n) => isRaw(n) && n.stagedAppend).length;
  const aiNodes = nodes.filter((n) => n && String(n.kind || '').toUpperCase() === 'AI').length;
  const origins = [cardSource].concat(shared.map((n) => String(n.source || cardSource)));
  const entries = Math.max(1, shared.length);
  const b = confidenceBreakdown(origins.map((o) => ({ origin: o })), entries);
  const tier = b.origins.length < 2 ? 'Low' : (b.origins.length >= 3 && b.pct >= 85 ? 'High' : 'Medium');
  return { ...b, tier, entries, drafts, ignored: { drafts, aiNodes } };
}
