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
export function calcConfidence(evidence = [], sourceRowCount = 1) {
  const origins = new Set((evidence || []).map((e) => (e && e.origin) || 'Unknown'));
  const base = 55;
  const originBoost = Math.min(origins.size * 8, 32); // max +32
  const rowBoost = Math.min(Math.max(sourceRowCount - 1, 0) * 3, 9); // max +9
  return Math.min(base + originBoost + rowBoost, 97);
}
