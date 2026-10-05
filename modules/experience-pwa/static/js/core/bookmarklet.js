// js/core/bookmarklet.js — IMP-05 gate for bookmarklet captures. Pure: no DOM, no storage.
// The bookmarklet is off until the person approves the source system (its host name). Anything pasted
// from a source that is not approved is refused, and only a fixed set of fields is ever kept.
export const APPROVED_KEY = 'continuum_bookmarklet_sources';
const ALLOWED = ['type', 'title', 'source', 'page', 'capturedAt', 'partial', 'truncated', 'content'];

export const normalizeHost = (h) => String(h || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/[/:?#].*$/, '');

export function parseApproved(raw) {
  try {
    const v = JSON.parse(raw || '[]');
    return Array.isArray(v) ? [...new Set(v.map(normalizeHost).filter(Boolean))] : [];
  } catch (e) { return []; }
}
export const loadApproved = (store) => { try { return parseApproved(store && store.getItem(APPROVED_KEY)); } catch (e) { return []; } };
export function saveApproved(store, hosts) {
  const list = [...new Set((hosts || []).map(normalizeHost).filter(Boolean))];
  try { store.setItem(APPROVED_KEY, JSON.stringify(list)); } catch (e) { /* blocked: applies for this visit only */ }
  return list;
}
export const isEnabled = (approved) => Array.isArray(approved) && approved.length > 0;

// Returns { ok, items, refused, reason }. Only fields in ALLOWED survive; a capture whose source host
// is not approved is refused. Plain (non-JSON) text is refused too: it has no source to approve.
export function checkClipboard(raw, approved) {
  if (!isEnabled(approved)) return { ok: false, items: [], refused: 0, reason: 'Bookmarklet capture is off. Approve a source system first.' };
  let parsed;
  try { parsed = JSON.parse(String(raw || '')); } catch (e) { return { ok: false, items: [], refused: 0, reason: 'This is not a Continuum capture. Use the capture bookmarklet on an approved page.' }; }
  const arr = (Array.isArray(parsed) ? parsed : [parsed]).filter((o) => o && typeof o === 'object');
  const items = [];
  let refused = 0;
  arr.forEach((o) => {
    const host = normalizeHost(o.source);
    if (!host || !approved.includes(host)) { refused++; return; }
    const keep = {};
    ALLOWED.forEach((k) => { if (o[k] !== undefined) keep[k] = o[k]; });
    keep.source = host;
    keep.content = String(keep.content || '');
    items.push(keep);
  });
  if (!items.length) return { ok: false, items, refused, reason: refused ? 'The capture came from a source that is not approved.' : 'Nothing to import.' };
  return { ok: true, items, refused, reason: '' };
}
