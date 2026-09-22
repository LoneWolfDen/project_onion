// js/core/schema.js — canonical ID rules per .clinerules id_disambiguation_rule
// Project_ReferenceID: immutable System Anchor ID [Prefix]-[OppID]-[DDMMYY][HHMMSS][-nn]
// ProjectID: mutable financial tag, compare with leading zeros stripped.
export function stripLeadingZeros(v) {
  const s = String(v ?? '').trim();
  if (/^\d+$/.test(s)) {
    const stripped = s.replace(/^0+/, '') || '0';
    return stripped;
  }
  return s;
}
export function projectIdEquals(a, b) {
  // Q4B: project_ids only. Numeric-only → strip zeros both sides. Else exact.
  const sa = String(a ?? '').trim();
  const sb = String(b ?? '').trim();
  if (/^\d+$/.test(sa) && /^\d+$/.test(sb)) {
    return stripLeadingZeros(sa) === stripLeadingZeros(sb);
  }
  return sa === sb;
}
export function matchProjectId(needle, haystackArray) {
  const arr = Array.isArray(haystackArray) ? haystackArray : [];
  return arr.some((h) => projectIdEquals(needle, h));
}
function sanitizePrefix(name) {
  const first = String(name || '').trim().split(/[\s\-_]+/)[0] || 'PRJ';
  return first.replace(/[^A-Za-z0-9]/g, '').slice(0, 12) || 'PRJ';
}
function sanitizeOpp(opp) {
  const s = String(opp || '').trim().replace(/\s+/g, '');
  return s || 'O-0000';
}
export function genProjectReferenceID(projectName, primaryOppId, now = new Date(), existingRefs = []) {
  // Q1B+Q2A: single canonical ID. Format Prefix-Opp-DDMMYY-HHMMSS[-nn]
  // Example: Apollo-O-008891-22092645 was DDMMYY+SS; extended to HHMMSS for collision safety.
  const prefix = sanitizePrefix(projectName);
  const opp = sanitizeOpp(primaryOppId);
  const pad = (n, l = 2) => String(n).padStart(l, '0');
  const dd = pad(now.getDate()), mm = pad(now.getMonth() + 1);
  const yy = String(now.getFullYear()).slice(2);
  const hh = pad(now.getHours()), mi = pad(now.getMinutes()), ss = pad(now.getSeconds());
  const stamp = `${dd}${mm}${yy}${hh}${mi}${ss}`;
  let base = `${prefix}-${opp}-${stamp}`;
  if (!existingRefs.includes(base)) return base;
  let i = 1;
  while (existingRefs.includes(`${base}-${pad(i)}`)) i++;
  return `${base}-${pad(i)}`;
}
