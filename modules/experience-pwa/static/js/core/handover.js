// js/core/handover.js — handover content model (HND-01/02/03).
// Pure functions: no DOM, no storage. Rules:
//  - Only approved cards go into the handover. Staged or unconfirmed items are listed
//    separately as "Needs confirmation" and never mixed in.
//  - Category comes from structured fields only (card.category, then structured tags).
//    No keyword guessing from free text; anything else is "Uncategorised".
//  - Open or closed comes from structured status fields only.
//  - Empty sections say "Not found".
//  - A package hash lets the review gate prove that what was confirmed is what is exported.
import { canonicalJson, sha256Hex } from './backup.js';

export const NOT_FOUND = 'Not found';
export const CATS = [
  { key: 'delivery', label: 'Delivery', icon: '📦', bg: '#D6E8FF', bd: '#A8C6F0', tx: '#1F4A7A', hint: 'Milestones · phases · GDP status' },
  { key: 'feedback', label: 'Client Feedback', icon: '💬', bg: '#F0E6FF', bd: '#D9C7FF', tx: '#5B2EBF', hint: 'CSAT · sign-off · satisfaction' },
  { key: 'finances', label: 'Finances', icon: '💷', bg: '#D6F5E8', bd: '#6EE7B7', tx: '#065F46', hint: 'SoW · PO · invoices · budget' },
  { key: 'ops', label: 'Operations', icon: '⚙️', bg: '#FFF5D6', bd: '#FDE68A', tx: '#92400E', hint: 'Resources · support · capacity' },
  { key: 'internal', label: 'Internal Open Items', icon: '📝', bg: '#F1F5F9', bd: '#CBD5E1', tx: '#334155', hint: 'Actions · follow-ups · backlog' },
  { key: 'raid', label: 'Risks and Issues', icon: '⚠️', bg: '#FFE4E6', bd: '#FDA4AF', tx: '#9F1239', hint: 'RAID log · risk watch' },
  { key: 'uncategorised', label: 'Uncategorised', icon: '❓', bg: '#F8FAFC', bd: '#E2E8F0', tx: '#475569', hint: 'No category set on the card' },
];
const CAT_KEYS = CATS.map((c) => c.key);

// Structured tags the AI/processing steps already attach. A tag is a field, not a keyword in text.
export const TAG_CATEGORY = {
  milestone_tracked: 'delivery', timezone_shift: 'delivery', decision_record: 'delivery',
  invoice_mentioned: 'finances', client_feedback: 'feedback', client_issue: 'feedback',
  resource_change: 'ops', runbook: 'ops', data_quality: 'ops',
  action_item: 'internal', lesson_learned: 'internal', lesson_applied: 'internal',
  risk_watch: 'raid',
};
const tagKey = (t) => String(t || '').replace(/^#/, '').trim().toLowerCase();

export function categoryOf(card) {
  const own = String((card && card.category) || '').trim().toLowerCase();
  if (CAT_KEYS.includes(own)) return own;
  const tags = Array.isArray(card && card.tags) ? card.tags : [];
  for (const t of tags) { const k = TAG_CATEGORY[tagKey(t)]; if (k) return k; }
  return 'uncategorised';
}
export function catMeta(key) { return CATS.find((c) => c.key === key) || CATS[CATS.length - 1]; }

export function isPending(card) {
  return !!card && (card.syncStatus === 'pending_processing' || card.draft === true || (Array.isArray(card.pendingAppends) && card.pendingAppends.length > 0));
}
export function isClosed(card) {
  if (!card) return false;
  const s = String(card.itemStatus || card.status || '').trim().toLowerCase();
  if (['closed', 'resolved', 'done', 'complete', 'completed'].includes(s)) return true;
  if (card.closed_at || card.resolved_at) return true;
  return (Array.isArray(card.tags) ? card.tags : []).some((t) => ['resolved', 'closed'].includes(tagKey(t)));
}

export function cardTime(c) {
  const r = (c && (c.created_at || c.updated_at || c.timestamp)) || 0;
  if (!r) return 0;
  if (typeof r === 'number') return r;
  const t = Date.parse(String(r));
  return Number.isNaN(t) ? 0 : t;
}
const closedTime = (c) => { const r = c.closed_at || c.resolved_at || c.updated_at; const t = r ? Date.parse(String(r)) : NaN; return Number.isNaN(t) ? cardTime(c) : t; };
export function matchesProject(card, proj) {
  if (!card || !proj) return false;
  return card.Project_ReferenceID === proj.Project_ReferenceID || card.project_name === proj.project_name || card.projectId === proj.project_name;
}
export function cutoffFor(timeframe, now = Date.now()) {
  if (timeframe === '3m') return now - 90 * 86400000;
  if (timeframe === '6m') return now - 182 * 86400000;
  return 0;
}
const isPrivate = (c) => ['My Notes', 'Private', 'My Notes (Private)'].includes(String(c.privacy || 'Team Shared'));

// state: { timeline, notes }. opts: { timeframe, persona, now }.
export function buildHandover(state, project, opts = {}) {
  const { timeframe = 'full', persona = '', now = Date.now() } = opts;
  const s = state || {};
  const cut = cutoffFor(timeframe, now);
  const all = (Array.isArray(s.timeline) ? s.timeline : []).concat(Array.isArray(s.notes) ? s.notes : []);
  const visible = all.filter((c) => c && matchesProject(c, project)
    && !(isPrivate(c) && String(c.author || '') !== String(persona || ''))
    && !(cut && cardTime(c) && cardTime(c) < cut));
  const approved = visible.filter((c) => !isPending(c));
  const needsConfirmation = visible.filter(isPending).sort((a, b) => cardTime(b) - cardTime(a));
  const counts = Object.fromEntries(CAT_KEYS.map((k) => [k, 0]));
  approved.forEach((c) => { counts[categoryOf(c)] += 1; });
  const sections = CATS.map((cat) => ({
    key: cat.key, label: cat.label,
    items: approved.filter((c) => categoryOf(c) === cat.key).sort((a, b) => cardTime(b) - cardTime(a)),
  })).map((sec) => ({ ...sec, empty: sec.items.length ? '' : NOT_FOUND }));
  return {
    cards: approved,
    open: approved.filter((c) => !isClosed(c)).sort((a, b) => cardTime(b) - cardTime(a)),
    closed: approved.filter(isClosed).sort((a, b) => closedTime(b) - closedTime(a)),
    risks: approved.filter((c) => categoryOf(c) === 'raid'),
    counts, sections, needsConfirmation,
  };
}

// What the package contains, reduced to what a reader sees. Same content always gives the same hash.
export function packageManifest(entries, options = {}) {
  return {
    timeframe: options.timeframe || 'full',
    coverNotes: String(options.coverNotes || ''),
    includeUnconfirmed: !!options.includeUnconfirmed,
    projects: entries.map((e) => ({
      ref: (e.project && e.project.Project_ReferenceID) || '',
      remark: String(e.perNote || ''),
      items: e.groups.cards.map((c) => ({ id: String(c.id || ''), title: String(c.title || ''), text: String(c.synthesizedText || c.content || c.detail || ''), category: categoryOf(c), closed: isClosed(c) })),
      unconfirmed: options.includeUnconfirmed ? e.groups.needsConfirmation.map((c) => String(c.id || '')) : [],
    })),
  };
}
export async function packageHash(entries, options) { return sha256Hex(canonicalJson(packageManifest(entries, options))); }

// Review gate: exporting needs a confirmation made for exactly this package.
export function makeConfirmation(hash, by, now = new Date()) { return { hash, by: String(by || ''), at: now.toISOString() }; }
export function confirmationValid(conf, hash) { return !!conf && !!hash && conf.hash === hash; }
