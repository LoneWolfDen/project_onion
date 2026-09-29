// js/core/matchExplain.js — plain-language reason for a Smart Append match (A4).
// Display only: it reads the reasons the matcher already produced and never
// changes which card matched or how it was scored.
//
// Matcher reason formats (HarvesterPanel.findSmartAppendMatch / VectorSync):
//   'Exact ID match: FW-REQ-4471'        'ref:PO-88921,SOW-2024-001'
//   'generic ref:O-008891 (needs topic confirm)'
//   'title/topic overlap'                 '3 shared keywords'
//   'vector similarity (dist 0.21)'

const quote = (words) => words.map((w) => '“' + w + '”').join(', ');

// sa: { matchReasons | reasons, matchScore | score, matchEngine, matchDistance }
// sharedWords: optional list of words both texts contain, for the keyword case.
export function explainMatch(sa, sharedWords) {
  const reasons = ((sa && (sa.matchReasons || sa.reasons)) || []).map(String);
  const score = sa && (typeof sa.matchScore === 'number' ? sa.matchScore : sa.score);
  const find = (re) => reasons.map((r) => r.match(re)).find(Boolean);

  const exact = find(/^Exact ID match:\s*(.+)$/i);
  const refs = find(/^ref:(.+)$/i);
  if (exact || refs) {
    const ids = (exact ? exact[1] : refs[1]).split(',').map((s) => s.trim()).filter(Boolean);
    return { level: 'Strong match', text: 'both mention ' + ids.join(', '), rule: 'Shared reference ID', score };
  }

  let dist = sa && Number(sa.matchDistance);
  if (!Number.isFinite(dist)) {
    const v = find(/vector similarity \(dist ([\d.]+)\)/i);
    dist = v ? Number(v[1]) : NaN;
  }
  if ((sa && sa.matchEngine === 'vector') || Number.isFinite(dist)) {
    // Same distance-to-similarity mapping as the 0.85 gate in VectorSync.querySimilarCards.
    const sim = Number.isFinite(dist) ? Math.round(Math.max(0, Math.min(1, 1 - dist / 2)) * 100) : null;
    return { level: 'Semantic match', text: sim != null ? sim + '% similar in meaning' : 'similar in meaning', rule: 'Vector similarity ≥ 85%', score };
  }

  const bits = [];
  const kw = find(/^(\d+) shared keywords$/i);
  if (sharedWords && sharedWords.length) bits.push('both use ' + quote(sharedWords.slice(0, 4)));
  else if (kw) bits.push('share ' + kw[1] + ' keywords');
  if (reasons.some((r) => /title\/topic overlap/i.test(r))) bits.push('similar title');
  const generic = find(/^generic ref:([^\s(]+)/i);
  if (generic) bits.push('same opportunity ' + generic[1].split(',')[0]);
  return { level: 'Possible match', text: bits.length ? bits.join(' · ') : 'overlapping content', rule: 'Keyword / title overlap', score };
}

// One-line sentence plus a tooltip that keeps the raw rule and score for architects.
export function matchSentence(sa, sharedWords) {
  const e = explainMatch(sa, sharedWords);
  return { sentence: e.level + ': ' + e.text, tooltip: 'Rule: ' + e.rule + (e.score != null ? ' · raw score ' + e.score : '') };
}
