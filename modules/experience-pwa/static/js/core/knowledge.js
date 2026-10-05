// js/core/knowledge.js — statement kinds and decisions (KNW-01, KNW-02). Pure: no DOM, no storage.
// Every handover statement has exactly one kind. Rules:
//  - A Fact must carry at least one source id. Without one it is shown as an Assumption.
//  - Text written by the mock or fallback AI engine can never be a Fact: it is an AI suggestion.
//  - A Decision exists only when a person recorded it (card.decision.by). AI never creates one.
//  - Kind comes from structured fields only (card.kind, RAID type, structured tags), never from text.
import { sha256Hex } from './backup.js';
import { categoryOf, isClosed } from './handover.js';

export const KINDS = [
  { key: 'fact', label: 'Fact', bg: '#D6F5E8', tx: '#065F46', hint: 'Backed by a source you can open' },
  { key: 'decision', label: 'Decision', bg: '#D6E8FF', tx: '#1F4A7A', hint: 'Recorded by a person' },
  { key: 'risk', label: 'Risk or issue', bg: '#FFE4E6', tx: '#9F1239', hint: 'From the RAID log or a risk tag' },
  { key: 'assumption', label: 'Assumption', bg: '#FFF5D6', tx: '#92400E', hint: 'Not backed by a source yet' },
  { key: 'action', label: 'Action', bg: '#F1F5F9', tx: '#334155', hint: 'Something someone has to do' },
  { key: 'ai_suggestion', label: 'AI suggestion', bg: '#F0E6FF', tx: '#5B2EBF', hint: 'Written by the mock or fallback AI; needs a person to confirm' },
];
const KIND_KEYS = KINDS.map((k) => k.key);
export const kindMeta = (key) => KINDS.find((k) => k.key === key) || KINDS[3];

const RAID_KIND = { risk: 'risk', issue: 'risk', dependency: 'risk', assumption: 'assumption' };
const tagKey = (t) => String(t || '').replace(/^#/, '').trim().toLowerCase();

export function sourceIdsOf(card) {
  const c = card || {};
  const ids = [];
  if (Array.isArray(c.sourceIds)) ids.push(...c.sourceIds);
  if (c.importSourceId) ids.push(c.importSourceId);
  (Array.isArray(c.nodes) ? c.nodes : []).forEach((n) => {
    if (n && String(n.kind || '').toUpperCase() === 'RAW' && !n.stagedAppend && n.sourceId) ids.push(n.sourceId);
  });
  return [...new Set(ids.map((x) => String(x || '').trim()).filter(Boolean))];
}

// Text produced by the offline mock or the fallback path. Live AI output is a suggestion too, but a
// person approved it; only mock and fallback output is blocked from being a Fact.
export function isMachineText(card) {
  const e = String((card && card.aiEngine) || '').toLowerCase();
  return e === 'mock' || e === 'fallback';
}

export function isRecordedDecision(card) {
  const d = card && card.decision;
  return !!(d && typeof d === 'object' && String(d.by || '').trim() && String(d.at || '').trim());
}

export function kindOf(card) {
  const c = card || {};
  if (isRecordedDecision(c)) return 'decision';
  let k = KIND_KEYS.includes(c.kind) && c.kind !== 'decision' ? c.kind : '';
  if (!k) {
    const raid = RAID_KIND[String(c.raidType || '').trim().toLowerCase()];
    const tags = (Array.isArray(c.tags) ? c.tags : []).map(tagKey);
    if (raid) k = raid;
    else if (categoryOf(c) === 'raid') k = 'risk';
    else if (tags.includes('action_item')) k = 'action';
    else k = 'fact';
  }
  if (isMachineText(c)) return 'ai_suggestion';
  if (k === 'fact' && !sourceIdsOf(c).length) return 'assumption';
  return k;
}

// Stable short id so the same statement carries the same id in the app, the export and sources.csv.
export async function statementId(card) {
  return 'S-' + (await sha256Hex(String((card && card.id) || '') + '|' + kindOf(card))).slice(0, 10);
}

export async function statementOf(card) {
  return {
    id: await statementId(card),
    cardId: String((card && card.id) || ''),
    kind: kindOf(card),
    text: String((card && (card.synthesizedText || card.content || card.detail || card.title)) || ''),
    title: String((card && card.title) || ''),
    category: categoryOf(card),
    closed: isClosed(card),
    sourceIds: sourceIdsOf(card),
  };
}

// KNW-02. A decision is recorded by a person from an existing card. Returns a new card object;
// the caller persists it. `by` is required, so nothing automatic can call this by accident.
export function recordDecision(card, { by, rationale = '', at = new Date() } = {}) {
  const who = String(by || '').trim();
  if (!who) throw new Error('A decision needs the name of the person recording it');
  if (!card) throw new Error('No card to record a decision from');
  return { ...card, kind: 'decision', decision: { by: who, at: new Date(at).toISOString(), rationale: String(rationale || '').trim(), sourceCardId: String(card.id || '') } };
}
export function clearDecision(card) {
  const next = { ...card }; delete next.decision; if (next.kind === 'decision') delete next.kind; return next;
}
