// js/core/compounding.js — knowledge compounding and reuse (KNW-03, RAD-02). Pure: no DOM, no storage.
// The loop: capture -> validate -> reuse -> new evidence -> stronger knowledge.
//  - Only approved material counts: draft (staged) updates, AI text and pending reuses add nothing.
//  - Reuse never edits the original card. It creates a new Draft in the target project that keeps the
//    original contributors, sources and strength as a snapshot (`reusedFrom`), so provenance travels.
//  - Contribution count and verified reuse are reported separately. There is no combined score.
import { evidenceStrength } from './confidence.js';
import { sourceIdsOf, isRecordedDecision } from './knowledge.js';
import { isPending } from './handover.js';

const MACHINE = /^(ai|system|unknown author|unknown|)$/i;
const sharedRaw = (n) => n && String(n.kind || '').toUpperCase() === 'RAW' && !n.stagedAppend;

// Distinct people who contributed approved material. AI and blank authors are not contributors.
export function contributorsOf(card) {
  const c = card || {};
  const names = [];
  if (!isPending(c)) names.push(c.author || c.contributor);
  (Array.isArray(c.nodes) ? c.nodes : []).filter(sharedRaw).forEach((n) => names.push(n.author || n.contributor));
  const seen = new Set(); const out = [];
  names.map((x) => String(x || '').trim()).filter((x) => !MACHINE.test(x)).forEach((x) => { const k = x.toLowerCase(); if (!seen.has(k)) { seen.add(k); out.push(x); } });
  return out;
}
// Approved evidence entries: the card's own record plus shared RAW updates (what evidenceStrength counts).
export const contributionCount = (card) => evidenceStrength(card).entries;
const sharedNodeCount = (card) => (Array.isArray(card && card.nodes) ? card.nodes.filter(sharedRaw).length : 0);

// Reuse = a card that carries `reusedFrom`. A reuse is verified once the reusing card itself is approved.
export const isReuse = (c) => !!(c && c.reusedFrom && c.reusedFrom.cardId);
export const isVerifiedReuse = (c) => isReuse(c) && !isPending(c);

export function makeReuse(original, target, { by, now = new Date(), id } = {}) {
  const who = String(by || '').trim();
  if (!who) throw new Error('A reuse needs the name of the person reusing it');
  if (!original || !original.id) throw new Error('No card to reuse');
  if (!target || !target.project_name) throw new Error('Choose a project to reuse it in');
  const ev = evidenceStrength(original);
  const at = new Date(now).toISOString();
  return {
    id: id || 'reuse-' + original.id + '-' + at.replace(/\D/g, '').slice(0, 14),
    projectId: target.project_name,
    Project_ReferenceID: target.Project_ReferenceID || '',
    type: original.type || 'Reuse',
    title: String(original.title || ''),
    source: String(original.source || original.type || ''),
    content: String(original.synthesizedText || original.content || original.detail || ''),
    category: original.category || undefined,
    tags: Array.isArray(original.tags) ? original.tags.slice() : [],
    privacy: 'My Notes (Private)',
    syncStatus: 'pending_processing',
    draft: true,
    author: who, contributor: who,
    sourceIds: sourceIdsOf(original),
    reusedFrom: {
      cardId: String(original.id), projectId: String(original.projectId || original.project || ''), title: String(original.title || ''),
      contributors: contributorsOf(original), sourceIds: sourceIdsOf(original),
      strength: { tier: ev.tier, sources: ev.origins.length, entries: ev.entries },
      sharedNodes: sharedNodeCount(original), at, by: who,
    },
  };
}

// handoverUses: [{ at, by, project, cardIds: [] }] recorded when a reviewed handover is exported.
export function compounding(card, allCards, handoverUses) {
  const id = String((card && card.id) || '');
  const cards = Array.isArray(allCards) ? allCards : [];
  const ev = evidenceStrength(card);
  const reuses = cards.filter((c) => isReuse(c) && String(c.reusedFrom.cardId) === id);
  const reusedIn = reuses.map((c) => ({
    cardId: String(c.id), projectId: String(c.projectId || ''), title: String(c.title || ''), by: c.reusedFrom.by, at: c.reusedFrom.at, verified: isVerifiedReuse(c),
    // What changed since: shared evidence added to the original after this reuse took its snapshot.
    newSinceReuse: Math.max(0, sharedNodeCount(card) - (c.reusedFrom.sharedNodes || 0)),
    contributorsKept: Array.isArray(c.reusedFrom.contributors) && c.reusedFrom.contributors.length > 0,
  }));
  const decisions = cards.filter((c) => isRecordedDecision(c) && (String(c.decision.sourceCardId) === id || (isReuse(c) && String(c.reusedFrom.cardId) === id)))
    .map((c) => ({ cardId: String(c.id), title: String(c.title || ''), by: c.decision.by, at: c.decision.at }));
  const handovers = (Array.isArray(handoverUses) ? handoverUses : []).filter((h) => h && Array.isArray(h.cardIds) && h.cardIds.map(String).includes(id))
    .map((h) => ({ at: h.at, by: h.by, project: h.project || '' }));
  return {
    contributors: contributorsOf(card), contributorCount: contributorsOf(card).length,
    independentSources: ev.origins.length, entries: ev.entries, tier: ev.tier, draftsIgnored: ev.drafts,
    reusedIn, verifiedReuse: reusedIn.filter((r) => r.verified).length, pendingReuse: reusedIn.filter((r) => !r.verified).length,
    decisions, handovers,
    reusedFrom: isReuse(card) ? card.reusedFrom : null,
  };
}

// Project-level counts. Contribution (approved evidence entries) and verified reuse stay separate numbers.
export function knowledgeMetrics(cards) {
  const list = (Array.isArray(cards) ? cards : []).filter((c) => c && !isPending(c));
  return {
    cards: list.length,
    contributions: list.reduce((n, c) => n + contributionCount(c), 0),
    verifiedReuse: list.filter(isReuse).length,
  };
}

// ---- where a handover used knowledge ------------------------------------------------
export const HANDOVER_USES_KEY = 'continuum_handover_uses';
export function loadHandoverUses(store) {
  try { const v = JSON.parse((store && store.getItem(HANDOVER_USES_KEY)) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; }
}
// One entry per confirmed export. Only ids, who and when are kept, never card text. Bounded to 200.
export function recordHandoverUse(store, { hash = '', by = '', project = '', cardIds = [], at = new Date() } = {}) {
  const next = loadHandoverUses(store).concat([{ hash: String(hash).slice(0, 16), by: String(by), project: String(project), cardIds: cardIds.map(String), at: new Date(at).toISOString() }]).slice(-200);
  try { store.setItem(HANDOVER_USES_KEY, JSON.stringify(next)); } catch (e) { /* not remembered */ }
  return next;
}
