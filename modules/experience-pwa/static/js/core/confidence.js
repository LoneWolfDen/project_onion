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
export function buildConfidenceText(breakdown, tier) {
  const origins = (breakdown && breakdown.origins) || [];
  const n = origins.length;
  const label = 'Model confidence: ' + tier;
  if (n <= 1) return { lead: label + ' — ' + (n ? '1 source (' + origins[0] + '), not yet corroborated' : 'no sources recorded'), sources: '' };
  const validator = origins.find((o) => SYSTEM_OF_RECORD.test(String(o)));
  return { lead: label + ' — ' + n + ' sources fused' + (validator ? ', validated via ' + validator : ''), sources: origins.join(' + ') };
}
