// js/core/radar.js — Continuity Radar (RAD-01). Pure: no DOM, no storage.
// Finds knowledge likely to be lost. Every risk comes from a stated rule (RULES), links to the card and
// its evidence, and is about knowledge coverage only: no person is scored, ranked or named.
import { contributorsOf } from './compounding.js';
import { evidenceStrength } from './confidence.js';
import { kindOf, sourceIdsOf, isRecordedDecision } from './knowledge.js';
import { categoryOf, isClosed, isPending } from './handover.js';
import { cardDate, toDate } from './timeAgo.js';

export const RULES = {
  single_contributor: { label: 'Single contributor', text: 'An open, approved card has one approved contributor. High for decisions and risks, otherwise medium.' },
  stale: { label: 'Stale card', text: 'An open, approved card has had no approved activity for 30 days (medium) or 90 days (high).', mediumDays: 30, highDays: 90 },
  missing_evidence: { label: 'Missing evidence', text: 'An approved card has no source recorded (high), or a decision or risk rests on one source only (medium).' },
  unreviewed_decision: { label: 'Unreviewed decision', text: 'Something looks like a decision (decision tag or "Proposed decision") but no person has recorded it as one. Medium.' },
  thin_handover: { label: 'Thin handover coverage', text: 'Fewer than half of the six handover areas have an approved item (medium); fewer than a third (high).', areas: ['delivery', 'finances', 'raid', 'ops', 'feedback', 'internal'] },
};
const ORDER = { high: 0, medium: 1 };
const tagKey = (t) => String(t || '').replace(/^#/, '').trim().toLowerCase();

function lastActivity(card) {
  const times = [cardDate(card)];
  (Array.isArray(card.nodes) ? card.nodes : []).filter((n) => n && !n.stagedAppend).forEach((n) => times.push(toDate(n.at || n.appended_at || n.timestamp)));
  const t = times.filter(Boolean).map((d) => d.getTime());
  return t.length ? Math.max(...t) : null;
}
const evidenceOf = (c) => { const ev = evidenceStrength(c); return { sources: ev.origins, sourceIds: sourceIdsOf(c), tier: ev.tier }; };
const risk = (rule, level, c, why, extra = {}) => ({ rule, level, cardId: c ? String(c.id) : '', title: c ? String(c.title || c.id) : '', why, evidence: c ? evidenceOf(c) : null, ...extra });

// cards: all cards of one project (any state). Drafts are only used for the unreviewed-decision rule.
export function cardRisks(cards, now = Date.now()) {
  const out = [];
  (Array.isArray(cards) ? cards : []).forEach((c) => {
    if (!c) return;
    const tags = (Array.isArray(c.tags) ? c.tags : []).map(tagKey);
    const looksLikeDecision = tags.includes('decision_record') || /^proposed decision:/i.test(String(c.title || ''));
    if (looksLikeDecision && !isRecordedDecision(c)) out.push(risk('unreviewed_decision', 'medium', c, isPending(c) ? 'A proposed decision is still a draft and nobody has recorded it.' : 'This looks like a decision but no person has recorded it as one.'));
    if (isPending(c) || isClosed(c)) return;
    const kind = kindOf(c);
    const people = contributorsOf(c);
    if (people.length === 1) out.push(risk('single_contributor', (kind === 'decision' || kind === 'risk') ? 'high' : 'medium', c, 'Only one approved contributor holds this knowledge.', { contributors: 1 }));
    const last = lastActivity(c);
    if (last != null) {
      const days = Math.floor((now - last) / 86400000);
      if (days >= RULES.stale.highDays) out.push(risk('stale', 'high', c, 'No approved activity for ' + days + ' days.', { days }));
      else if (days >= RULES.stale.mediumDays) out.push(risk('stale', 'medium', c, 'No approved activity for ' + days + ' days.', { days }));
    }
    const noSource = !sourceIdsOf(c).length && !String(c.source || '').trim() && !(Array.isArray(c.nodes) && c.nodes.some((n) => n && String(n.kind).toUpperCase() === 'RAW'));
    if (noSource) out.push(risk('missing_evidence', 'high', c, 'No source is recorded for this card.'));
    else if ((kind === 'decision' || kind === 'risk') && evidenceStrength(c).origins.length < 2) out.push(risk('missing_evidence', 'medium', c, 'This ' + (kind === 'risk' ? 'risk' : 'decision') + ' rests on a single source.'));
  });
  return out;
}

// Coverage of the six handover areas by approved cards.
export function handoverCoverage(cards) {
  const areas = RULES.thin_handover.areas;
  const have = new Set((Array.isArray(cards) ? cards : []).filter((c) => c && !isPending(c)).map(categoryOf).filter((k) => areas.includes(k)));
  return { covered: areas.filter((a) => have.has(a)), missing: areas.filter((a) => !have.has(a)), total: areas.length };
}
export function coverageRisk(cards, project) {
  const cov = handoverCoverage(cards);
  const share = cov.covered.length / cov.total;
  if (share >= 0.5) return null;
  return risk('thin_handover', share < 1 / 3 ? 'high' : 'medium', null, cov.covered.length + ' of ' + cov.total + ' handover areas have an approved item. Missing: ' + cov.missing.join(', ') + '.', { projectRef: (project && project.Project_ReferenceID) || '', title: (project && project.project_name) || 'Project', missing: cov.missing });
}

export function radarFor(cards, project, now = Date.now()) {
  const list = (Array.isArray(cards) ? cards : []).filter(Boolean);
  const risks = cardRisks(list, now);
  const cr = coverageRisk(list, project);
  if (cr) risks.push(cr);
  risks.sort((a, b) => ORDER[a.level] - ORDER[b.level] || a.rule.localeCompare(b.rule));
  const byRule = {};
  Object.keys(RULES).forEach((k) => { byRule[k] = risks.filter((r) => r.rule === k); });
  return { risks, byRule, coverage: handoverCoverage(list), counts: { high: risks.filter((r) => r.level === 'high').length, medium: risks.filter((r) => r.level === 'medium').length } };
}
