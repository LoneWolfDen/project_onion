// js/core/FailoverDB.js part1 — Failover Repository Pattern (mandatory).
import { MOCK_SEED } from '../data/mockSeed.js';
import { buildDemoState } from '../data/demoDataset.js';
import { getDefaultPersona } from '../constants/personas.js';
import { reportStorageError, retainCorruptRaw, safeSetItem, isReadOnly } from './storageGuard.js';
let _vectorMirror = null;
function vectorMirror() {
  if (_vectorMirror) return _vectorMirror;
  _vectorMirror = import('./VectorSync.js').then((m) => (m && m.mirrorToVector) || null).catch(() => null);
  return _vectorMirror;
}
function fireVectorMirror(op, cardOrId) {
  try {
    Promise.resolve(vectorMirror()).then((fn) => {
      if (typeof fn === 'function') { try { fn(op, cardOrId); } catch (e) {} }
    }).catch(() => {});
  } catch (e) {}
}
function stampVectorPending(rec) {
  try { if (rec && typeof rec === 'object' && !rec.vectorSyncStatus) rec.vectorSyncStatus = 'pending'; } catch (e) {}
  return rec;
}
const STORAGE_KEY = 'onion_db_state';
const LEGACY_KEYS = ['onion_db_storage', 'onion_db_state_v2', 'onion_db'];
const API_BASES = ['http://localhost:8000', 'http://localhost:8001'];
function tagPending(entity) {
  try { entity.syncStatus = 'pending_upload'; } catch (e) {}
  return entity;
}
function clone(o) { return JSON.parse(JSON.stringify(o)); }
export function ensureTimelineNodes(card) {
  try {
    if (!card || typeof card !== 'object') return card;
    if (!Array.isArray(card.nodes)) card.nodes = [];
    if (card.nodes.length === 0) {
      const rawText = String(card.content || card.detail || card.synthesizedText || card.title || '');
      const aiText = String(card.synthesizedText || card.content || card.detail || card.title || '');
      card.nodes = [
        { kind: 'AI', text: aiText, author: 'AI', at: card.created_at || card.timestamp },
        { kind: 'RAW', text: rawText, author: card.author || card.contributor || getDefaultPersona(), at: card.created_at || card.timestamp }
      ];
    }
  } catch (e) {}
  return card;
}
export function seedState() { const s = clone(MOCK_SEED); try { (s.timeline || []).forEach(ensureTimelineNodes); } catch (e) {} return s; }
// First boot (empty storage) loads the fictional demo dataset; mockSeed stays
// the test seed behind resetToSeedData(). Set to 'mock' to boot the old seed.
const BOOT_DATASET = 'demo';
export function demoState() { const s = buildDemoState(Date.now()); try { (s.timeline || []).forEach(ensureTimelineNodes); } catch (e) {} return s; }
function bootState() { return BOOT_DATASET === 'demo' ? demoState() : seedState(); }
// Unreadable saved state: keep the raw text under a recovery key, switch to
// read-only so the empty placeholder below can never overwrite it, and tell the user.
function corruptState(raw, err) {
  const recoveryKey = retainCorruptRaw(raw);
  reportStorageError(err, 'parse', { code: 'parse', recoveryKey });
  return { clients: [], projects: [], timeline: [], notes: [], archived: [] };
}
export function readLocal() {
  let raw = null;
  try { raw = localStorage.getItem(STORAGE_KEY); } catch (e) { raw = null; }
  // Compatibility: check legacy keys like onion_db_storage (your Safari shows this)
  if (raw == null || raw === '') {
    try {
      for (const k of LEGACY_KEYS) {
        const legacy = localStorage.getItem(k);
        if (legacy && legacy.length > 10) { raw = legacy; break; }
      }
    } catch (e) {}
  }
  if (raw == null || raw === '') {
    const seed = bootState();
    safeSetItem(STORAGE_KEY, JSON.stringify(seed), 'seed');
    return seed;
  }
  let parsed = null;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    return corruptState(raw, err);
  }
  if (!parsed || typeof parsed !== 'object') {
    return corruptState(raw, null);
  }
    let seededCache = null;
    const seedField = (k) => { try { if (!seededCache) seededCache = bootState(); return clone(seededCache[k]); } catch (e) { return []; } };
    if (parsed.projects == null) parsed.projects = seedField('projects');
    if (parsed.timeline == null) parsed.timeline = [];
    if (parsed.notes == null) parsed.notes = [];
    if (parsed.archived == null) parsed.archived = [];
    if (parsed.clients == null) parsed.clients = seedField('clients');
    try { (parsed.timeline || []).forEach(ensureTimelineNodes); } catch (e) {}
    try {
      const heal = (list) => {
        if (!Array.isArray(list)) return false;
        let touched = false;
        list.forEach((it) => {
          if (it && it.syncStatus === 'processed') { it.syncStatus = 'pending_upload'; touched = true; }
          if (it && Array.isArray(it.nodes)) {
            it.nodes.forEach((n) => {
              if (n && n.stagedAppend && !n.author) {
                n.author = it.author || 'User';
                n.contributor = it.contributor || n.author;
                touched = true;
              }
            });
          }
        });
        return touched;
      };
      const t1 = heal(parsed.timeline);
      const t2 = heal(parsed.notes);
      if (t1 || t2) safeSetItem(STORAGE_KEY, JSON.stringify(parsed), 'heal');
    } catch (e) {}
    return parsed;
}
// Returns the state it was given (existing callers rely on that). Success is
// signalled by the onion:db-update event only; a failed or refused write raises
// onion:storage-error instead, so the UI never shows an unsaved change as saved.
export function writeLocal(state) {
  if (isReadOnly()) { reportStorageError(null, 'write', { code: 'readonly' }); return state; }
  let json;
  try { json = JSON.stringify(state); } catch (err) { reportStorageError(err, 'serialize'); return state; }
  if (!safeSetItem(STORAGE_KEY, json, 'write')) return state;
  try { window.dispatchEvent(new CustomEvent('onion:db-update', { detail: { at: new Date().toISOString() } })); } catch (err) {}
  return state;
}
async function tryFetch(path, options) {
  let lastErr = null;
  for (const base of API_BASES) {
    try {
      const res = await fetch(base + path, options);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.json();
    } catch (err) { lastErr = err; }
  }
  throw lastErr || new Error('all API bases unreachable');
}
class FailoverDB {
  async getClients() { return readLocal().clients; }
  async listProjects() { return readLocal().projects; }
  async saveNote(note) {
    const s = readLocal();
    if (!Array.isArray(s.notes)) s.notes = [];
    const rec = tagPending({ id: 'n-local-' + Date.now(), created_at: new Date().toISOString(), ...note });
    try { rec.syncStatus = 'pending_upload'; } catch (e) {}
    stampVectorPending(rec);
    s.notes.push(rec);
    writeLocal(s);
    fireVectorMirror('upsert', rec);
    return rec;
  }
  async forceSync() {
    const s = readLocal();
    let n = 0;
    ['timeline', 'notes', 'projects'].forEach((k) => {
      (s[k] || []).forEach((it) => { if (it && it.syncStatus === 'pending_upload') { it.syncStatus = 'synced'; n++; } });
    });
    writeLocal(s);
    return { synced: n };
  }
  async saveProject(project) {
    const s = readLocal();
    if (!Array.isArray(s.projects)) s.projects = [];
    const rec = tagPending({ created_at: new Date().toISOString(), ...project });
    const i = s.projects.findIndex((p) => p.Project_ReferenceID === rec.Project_ReferenceID);
    if (i >= 0) s.projects[i] = { ...s.projects[i], ...rec };
    else s.projects.push(rec);
    writeLocal(s);
    return rec;
  }
  async archiveProject(ref, justification) {
    if (!justification || !String(justification).trim()) throw new Error('Archive requires mandatory justification');
    const s = readLocal();
    const i = s.projects.findIndex((p) => p.Project_ReferenceID === ref);
    if (i < 0) throw new Error('Project not found: ' + ref);
    const mv = s.projects.splice(i, 1)[0];
    mv.archived_at = new Date().toISOString();
    mv.archived_justification = justification;
    mv.syncStatus = 'pending_upload';
    s.archived.push(mv);
    writeLocal(s);
    return mv;
  }
  async updateNotePrivacy(id, privacy) {
    const s = readLocal();
    const n = (s.notes || []).find((x) => x.id === id);
    if (n) { n.privacy = privacy; n.syncStatus = 'pending_upload'; stampVectorPending(n); writeLocal(s); fireVectorMirror('upsert', n); }
    try {
      const t = (s.timeline || []).find((x) => x && String(x.id) === String(id));
      if (t && !n) { t.privacy = privacy; t.syncStatus = 'pending_upload'; stampVectorPending(t); writeLocal(s); fireVectorMirror('upsert', t); return t; }
    } catch (e) {}
    return n || { id, privacy };
  }
  async updateCardPrivacy(id, privacy) {
    const s = readLocal();
    let touched = null;
    try {
      const t = (s.timeline || []).find((x) => x && String(x.id) === String(id));
      if (t) { t.privacy = privacy; t.syncStatus = 'pending_upload'; stampVectorPending(t); touched = t; }
      const n2 = (s.notes || []).find((x) => x && String(x.id) === String(id));
      if (n2) { n2.privacy = privacy; n2.syncStatus = 'pending_upload'; stampVectorPending(n2); touched = touched || n2; }
      if (touched) { writeLocal(s); fireVectorMirror('upsert', touched); }
    } catch (e) {}
    return touched || { id, privacy };
  }
  async updateCard(id, patch) {
    const s = readLocal();
    let touched = null;
    try {
      const clean = (patch && typeof patch === 'object') ? { ...patch } : {};
      delete clean.id;
      delete clean.Project_ReferenceID;
      delete clean.projectId;
      delete clean.project_name;
      const nowIso = new Date().toISOString();
      const t = (s.timeline || []).find((x) => x && String(x.id) === String(id));
      if (t) { Object.assign(t, clean); t.updated_at = nowIso; t.syncStatus = 'pending_upload'; stampVectorPending(t); ensureTimelineNodes(t); touched = t; }
      const n2 = (s.notes || []).find((x) => x && String(x.id) === String(id));
      if (n2) { Object.assign(n2, clean); n2.updated_at = nowIso; n2.syncStatus = 'pending_upload'; stampVectorPending(n2); touched = touched || n2; }
      if (touched) { writeLocal(s); fireVectorMirror('upsert', touched); }
    } catch (e) {}
    return touched || { id, ...(patch || {}) };
  }
  async deleteCard(id) {
    const s = readLocal();
    let found = false;
    try {
      ['timeline', 'notes'].forEach((k) => {
        const list = s[k] || [];
        const i = list.findIndex((x) => x && String(x.id) === String(id));
        if (i >= 0) { list.splice(i, 1); found = true; }
      });
      if (found) writeLocal(s);
    } catch (e) {}
    fireVectorMirror('delete', { id: String(id) });
    return found;
  }
  async syncCardToVector(id) {
    const s = readLocal();
    let touched = null;
    try {
      touched = (s.timeline || []).find((x) => x && String(x.id) === String(id))
        || (s.notes || []).find((x) => x && String(x.id) === String(id)) || null;
    } catch (e) {}
    try {
      const vs = await import('./VectorSync.js');
      if (touched && vs && vs.mirrorToVector) await vs.mirrorToVector('upsert', touched);
      if (vs && vs.flushVectorQueue) return await vs.flushVectorQueue();
    } catch (e) {}
    return { flushed: 0, pending: 0 };
  }
  async stageToDataPark(payload) {
    const rec = {
      id: (payload && payload.id) || ('dp-' + Date.now() + '-' + Math.floor(Math.random() * 10000)),
      projectId: (payload && payload.projectId) || '',
      project_name: (payload && (payload.project_name || payload.projectId)) || '',
      Project_ReferenceID: (payload && payload.Project_ReferenceID) || '',
      type: (payload && payload.type) || 'Scrape',
      title: (payload && payload.title) || 'Harvested fragment',
      source: (payload && payload.source) || 'Data Park Dropzone',
      timestamp: (payload && payload.timestamp) || 'Just now',
      content: (payload && (payload.content || payload.detail)) || '',
      piiStatus: (payload && payload.piiStatus) || 'Clean',
      privacy: (payload && typeof payload.privacy === 'string' && payload.privacy.trim()) ? payload.privacy.trim() : 'Team Shared',
      syncStatus: 'pending_processing',
      created_at: new Date().toISOString(),
      contentHash: (payload && payload.contentHash) || '',
      // P0 FIX: HarvesterPanel.onStage() sets payload.author/contributor =
      // getPersona() (the selected persona), but this was previously dropped
      // here, so every staged card silently fell back to 'System'/'Daniel'
      // downstream. Propagate the selected persona through.
      author: (payload && payload.author) || getDefaultPersona(),
      contributor: (payload && (payload.contributor || payload.author)) || getDefaultPersona(),
    };
    const s = readLocal();
    if (!Array.isArray(s.timeline)) s.timeline = [];
    s.timeline.unshift(rec);
    writeLocal(s);
    return rec;
  }
  async listPendingProcessing() {
    const s = readLocal();
    return (s.timeline || []).filter((t) => t && t.syncStatus === 'pending_processing');
  }
  async approveStaged(cardId){
    const s = readLocal();
    const card = (s.timeline||[]).find(c=>String(c.id)===String(cardId));
    if(!card) return;
    (card.nodes||[]).forEach(n=>{ if(n && n.stagedAppend){ n.stagedAppend=false; n.appendSyncStatus='approved'; n.privacy='Team Shared'; n.is_private=false; }});
    card.pendingAppends=[];
    card.updated_at=new Date().toISOString();
    writeLocal(s);
    return card;
  }
  // BUG 5 fix: bulk "Clear all" for the Data Park staged-list UI — removes
  // every row still sitting in 'pending_processing' (optionally scoped to a
  // single project) without touching already-committed cards.
  async clearPendingProcessing(projectName) {
    const s = readLocal();
    const before = Array.isArray(s.timeline) ? s.timeline.length : 0;
    s.timeline = (s.timeline || []).filter((t) => {
      if (!t || t.syncStatus !== 'pending_processing') return true;
      if (projectName && t.project_name !== projectName) return true;
      return false;
    });
    const removed = before - s.timeline.length;
    if (removed > 0) writeLocal(s);
    return { removed };
  }
  async markProcessed(id, aiResult) {
    const s = readLocal();
    const t = (s.timeline || []).find((x) => x && String(x.id) === String(id));
    const patch = {
      title: (aiResult && typeof aiResult.title === 'string' && aiResult.title.trim()) ? aiResult.title : undefined,
      synthesizedText: (aiResult && aiResult.synthesizedText) || '',
      tags: (aiResult && aiResult.tags) || [],
      impactScore: (aiResult && typeof aiResult.impactScore === 'number') ? aiResult.impactScore : 0.7,
      smartAppend: (aiResult && aiResult.smartAppend) || undefined,
      mergeHint: (aiResult && aiResult.mergeHint) || '',
      structured: (aiResult && aiResult.structured && typeof aiResult.structured === 'object') ? aiResult.structured : {},
      privacy: (aiResult && typeof aiResult.privacy === 'string' && aiResult.privacy.trim()) ? aiResult.privacy.trim() : 'Team Shared',
      syncStatus: 'pending_upload',
      processed_at: new Date().toISOString(),
      // P0 FIX: HarvesterPanel.onApproveAll() builds aiResult.author/contributor
      // = card.author (the selected persona from onStage/onProcess), but this
      // was previously dropped here, so the card's author field stayed
      // undefined and every downstream fallback ('Daniel'/'System') took over.
      // Prefer aiResult's author/contributor, else keep the card's existing
      // author/contributor (never blank it), else default persona.
      author: (aiResult && (aiResult.author || aiResult.contributor)) || (t && t.author) || getDefaultPersona(),
      contributor: (aiResult && (aiResult.contributor || aiResult.author)) || (t && t.contributor) || getDefaultPersona(),
      // Which engine wrote synthesizedText ('live' | 'mock' | 'fallback'), shown on the card.
      aiEngine: (aiResult && aiResult.aiEngine) || '',
      aiModel: (aiResult && aiResult.aiModel) || '',
      aiFallbackReason: (aiResult && aiResult.aiFallbackReason) || '',
    };
    if (patch.title === undefined) delete patch.title;
    if (patch.smartAppend === undefined) delete patch.smartAppend;
    if (t) { Object.assign(t, patch); t.syncStatus = 'pending_upload'; stampVectorPending(t); ensureTimelineNodes(t); writeLocal(s); fireVectorMirror('upsert', t); }
    return t || { id, ...patch };
  }
  async smartAppendToCard(targetCardId, stagedRawNode, stagedAiNode, meta) {
    const s = readLocal();
    const tlList = Array.isArray(s.timeline) ? s.timeline : [];
    const nList = Array.isArray(s.notes) ? s.notes : [];
    let target = tlList.find((x) => x && String(x.id) === String(targetCardId));
    if (!target) target = nList.find((x) => x && String(x.id) === String(targetCardId));
    if (!target) return null;
    if (!Array.isArray(target.nodes)) target.nodes = [];
    const nowIso = new Date().toISOString();
    // P0 FIX: last-resort fallback was hardcoded 'Daniel' — replaced with the
    // single source of truth (constants/personas.js) so the append's
    // attributed persona is never a stale literal.
    const metaAuthor = (meta && (meta.author || meta.contributor)) || target.author || target.contributor || getDefaultPersona();
    const metaContrib = (meta && (meta.contributor || meta.author)) || target.contributor || target.author || metaAuthor;
    // FIXED: Allow private pending-review nodes even if parent is Team Shared
    // Old code forced effPrivacy = Team Shared when parent was shared, so amber never showed
    const effPrivacy = (meta && meta.privacy) ? meta.privacy : 'My Notes (Private)';
    // BUG 3 fix: Review & Merge idempotency. Clicking "Review & Merge" twice
    // (or re-processing the same staged item) previously pushed a brand new
    // RAW/AI node pair every time, even when the exact same RAW text was
    // already merged into this card — producing duplicate staged pills
    // (RAW/AI x2, x3...) and an ever-growing "Smart Append: N staged
    // update(s)" banner. Detect an existing node with the same text BEFORE
    // pushing anything; if found, this is a repeat click — just clear the
    // now-redundant staged source row + matching pendingAppends entry (if
    // any) and return the card unchanged, without appending duplicate nodes.
    try {
      const existingTexts = new Set((target.nodes || []).map((n) => String((n && (n.fullText || n.text)) || '').slice(0, 200)));
      const rawTxt = String((stagedRawNode && stagedRawNode.text) || '').slice(0, 200);
      if (rawTxt && existingTexts.has(rawTxt)) {
        const stagedId = meta && meta.stagedId;
        if (stagedId) {
          const si = tlList.findIndex((x) => x && String(x.id) === String(stagedId) && x.syncStatus === 'pending_processing');
          if (si >= 0) tlList.splice(si, 1);
        }
        if (Array.isArray(target.pendingAppends)) {
          target.pendingAppends = target.pendingAppends.filter((p) => String((p && p.stagedId) || '') !== String(stagedId || '') || !stagedId);
        }
        target.updated_at = nowIso;
        writeLocal(s);
        return target;
      }
    } catch (e) {}
    /*
    const pushNode = (n) => {
      if (!n || (!n.text && !n.kind)) return;
      target.nodes.push({
        kind: String((n && n.kind) || 'EV').toUpperCase(),
        text: String((n && n.text) || '').slice(0, 800),
        author: String((n && (n.author || n.contributor)) || metaAuthor || 'User'),
        contributor: String((n && (n.contributor || n.author)) || metaContrib || 'User'),
        stagedAppend: true,
        is_private: effPrivacy === 'My Notes (Private)' || String(effPrivacy).toLowerCase().indexOf('private') >= 0,
        isPrivate: effPrivacy === 'My Notes (Private)' || String(effPrivacy).toLowerCase().indexOf('private') >= 0,
        privacy: effPrivacy,
        appendPrivacy: effPrivacy,
        appendSyncStatus: 'pending_review',
        appended_at: nowIso,
        fullText: n.text
      });
    };
    */
    const pushNode = (n) => {
      if (!n || (!n.text && !n.kind)) return;
      const txt = String((n && n.text) || '').slice(0,800).trim();
      const kind = String((n && n.kind) || 'EV').toUpperCase();
      // dedup: skip if same kind+text already staged
      //if (target.nodes.some(ex => ex && ex.stagedAppend && String(ex.kind).toUpperCase()===kind && String(ex.text||'').trim()===txt)) return;
      const norm = txt.toLowerCase();
      if (target.nodes.some(ex => ex && ex.stagedAppend && String(ex.kind).toUpperCase()===kind && String(ex.text||'').trim().toLowerCase()===norm)) return;
      target.nodes.push({
        kind, text: txt,
        author: String((n && (n.author || n.contributor)) || metaAuthor || 'User'),
        contributor: String((n && (n.contributor || n.author)) || metaContrib || 'User'),
        stagedAppend: true,
        is_private: true, isPrivate: true,
        privacy: effPrivacy, appendPrivacy: effPrivacy,
        appendSyncStatus: 'pending_review',
        appended_at: nowIso, fullText: n.text,
        source: String(n.source || (meta && meta.source) || ''), aiEngine: String(n.aiEngine || ''), aiModel: String(n.aiModel || ''), // PV-2: node keeps its own origin
      });
    };
    pushNode(stagedAiNode);
    pushNode(stagedRawNode);
    if (!Array.isArray(target.pendingAppends)) target.pendingAppends = [];
    target.pendingAppends.push({
      at: nowIso,
      privacy: effPrivacy,
      syncStatus: 'pending_review',
      author: String(metaAuthor || 'User'),
      contributor: String(metaContrib || metaAuthor || 'User'),
      title: (meta && meta.title) || '',
      source: (meta && meta.source) || '',
      reasons: (meta && meta.reasons) || [],
      score: (meta && typeof meta.score === 'number') ? meta.score : 0,
      // BUG 3 fix: carry the source staged-row id so the idempotency guard
      // above can find + drop the matching pendingAppends entry on a repeat
      // Review & Merge click without re-appending duplicate nodes.
      stagedId: (meta && meta.stagedId) || '',
    });
    target.updated_at = nowIso;
    target.syncStatus = 'pending_upload';
    // Title and summary are not changed here: the draft stays private until
    // shared, and sharing (App.handleApproveCard) sets both from the draft.
    // Do NOT contaminate parent to Private - keep parent as is, nodes are private
    stampVectorPending(target);
    ensureTimelineNodes(target);
    const stagedId = meta && meta.stagedId;
    if (stagedId) {
      const si = tlList.findIndex((x) => x && String(x.id) === String(stagedId) && x.syncStatus === 'pending_processing');
      if (si >= 0) tlList.splice(si, 1);
    }
    writeLocal(s);
    fireVectorMirror('upsert', target);
    return target;
  }
  async resetToSeedData() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    const seed = seedState();
    writeLocal(seed);
    return seed;
  }
  async resetToDemoDataset() { return resetToDemoDataset(); }
  subscribe(fn) {
    const h = () => { try { fn(readLocal()); } catch (e) {} };
    window.addEventListener('onion:db-update', h);
    return () => window.removeEventListener('onion:db-update', h);
  }
}
export async function resetToSeedData() {
  try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
  const seed = seedState();
  writeLocal(seed);
  return seed;
}
// Reset Demo Dataset: clears every local key that holds data or in-progress
// work, then writes a fresh demo state. API keys and model settings are kept.
// Callers reload the page so React state (project, filters) starts clean too.
const DEMO_RESET_KEYS = [STORAGE_KEY, ...LEGACY_KEYS, 'onion_projects', 'onion_review_queue', 'onion_vector_queue'];
export async function resetToDemoDataset() {
  try {
    DEMO_RESET_KEYS.forEach((k) => localStorage.removeItem(k));
    Object.keys(localStorage).filter((k) => k.indexOf('onion_review_draft_') === 0).forEach((k) => localStorage.removeItem(k));
  } catch (e) {}
  const state = demoState();
  writeLocal(state);
  try { localStorage.setItem('activePersona', 'Brené'); } catch (e) {}
  return state;
}
export const OnionDB = new FailoverDB();
try {
  const bootRaw = localStorage.getItem(STORAGE_KEY);
  if (bootRaw == null || bootRaw === '') localStorage.setItem(STORAGE_KEY, JSON.stringify(bootState()));
  window.OnionDB = OnionDB;
} catch (err) {}
export default OnionDB;
