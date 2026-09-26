// js/core/FailoverDB.js part1 — Failover Repository Pattern (mandatory).
import { MOCK_SEED } from '../data/mockSeed.js';
// Vector mirror facade (Dual-Mode: offline-first, fire-and-forget).
// Dynamic import avoids a hard ESM cycle (VectorSync never imports FailoverDB).
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
  // Separate from syncStatus so existing Sync Now / pending_upload gates keep working.
  try { if (rec && typeof rec === 'object' && !rec.vectorSyncStatus) rec.vectorSyncStatus = 'pending'; } catch (e) {}
  return rec;
}
const STORAGE_KEY = 'onion_db_state';
const API_BASES = ['http://localhost:8000', 'http://localhost:8001'];
function tagPending(entity) {
  try { entity.syncStatus = 'pending_upload'; } catch (e) {}
  return entity;
}
function clone(o) { return JSON.parse(JSON.stringify(o)); }
// Ensure every timeline card carries RAW+AI nodes so the horizontal
// timeline strip renders reliably after seed load / reload / reset.
export function ensureTimelineNodes(card) {
  try {
    if (!card || typeof card !== 'object') return card;
    if (!Array.isArray(card.nodes)) card.nodes = [];
    if (card.nodes.length === 0) {
      const rawText = String(card.content || card.detail || card.synthesizedText || card.title || '');
      const aiText = String(card.synthesizedText || card.content || card.detail || card.title || '');
      card.nodes = [
        { kind: 'RAW', text: rawText, author: card.author || 'System', at: card.created_at || card.timestamp },
        { kind: 'AI', text: aiText, author: 'Onion AI', at: card.created_at || card.timestamp }
      ];
    }
  } catch (e) {}
  return card;
}
export function seedState() { const s = clone(MOCK_SEED); try { (s.timeline || []).forEach(ensureTimelineNodes); } catch (e) {} return s; }
export function readLocal() {
  // PERSISTENCE FIX (wipe bug): strictly preserve existing localStorage data.
  // Seed from mockSeed ONLY when the storage key is completely absent/empty.
  // Never overwrite existing user data on load; corrupt payloads return an
  // in-memory shell WITHOUT writing, so a reload can never wipe the vault.
  let raw = null;
  try { raw = localStorage.getItem(STORAGE_KEY); } catch (e) { raw = null; }
  if (raw == null || raw === '') {
    const seed = seedState();
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(seed)); } catch (e) {}
    return seed;
  }
  let parsed = null;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    // Corrupt JSON: do NOT overwrite storage (previous code seeded here = wipe).
    // Return a safe in-memory shell; storage stays untouched for recovery.
    return { clients: [], projects: [], timeline: [], notes: [], archived: [] };
  }
  if (!parsed || typeof parsed !== 'object') {
    // Valid JSON but not a state object (e.g. "null", number): same rule —
    // never wipe storage on a read path.
    return { clients: [], projects: [], timeline: [], notes: [], archived: [] };
  }
    // Backfill ONLY missing (null/undefined) sub-keys. Existing arrays —
    // including intentionally-empty [] — are never overwritten.
    let seededCache = null;
    const seedField = (k) => { try { if (!seededCache) seededCache = seedState(); return clone(seededCache[k]); } catch (e) { return []; } };
    if (parsed.projects == null) parsed.projects = seedField('projects');
    if (parsed.timeline == null) parsed.timeline = [];
    if (parsed.notes == null) parsed.notes = [];
    if (parsed.archived == null) parsed.archived = [];
    if (parsed.clients == null) parsed.clients = seedField('clients');
    try { (parsed.timeline || []).forEach(ensureTimelineNodes); } catch (e) {}
    // Heal orphaned 'processed' statuses (pre-fix markProcessed rows) back to
    // 'pending_upload' so Phase-4 Sync gate (Sync Now CTA) renders correctly.
    // Failover Repository Pattern: silent local repair on load, no network.
    try {
      const heal = (list) => {
        if (!Array.isArray(list)) return false;
        let touched = false;
        list.forEach((it) => {
          if (it && it.syncStatus === 'processed') { it.syncStatus = 'pending_upload'; touched = true; }
          // Backfill appended-node author fields so Phase-3 isOwner checks work
          // for rows written before the author-propagation fix.
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
      if (t1 || t2) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed)); } catch (e) {} }
    } catch (e) {}
    return parsed;
}
export function writeLocal(state) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (err) {}
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
  async getClients() {
    // Pure-offline: immediate local read, zero network fetch (air-gapped PWA).
    return readLocal().clients;
  }
  async listProjects() {
    // Pure-offline: immediate local read, zero network fetch (air-gapped PWA).
    return readLocal().projects;
  }
  async saveNote(note) {
    // Pure-offline: NEVER fetch localhost:8000 (CORS in air-gapped PWA).
    // Direct localStorage write via Failover Repository Pattern.
    const s = readLocal();
    if (!Array.isArray(s.notes)) s.notes = [];
    const rec = tagPending({ id: 'n-local-' + Date.now(), created_at: new Date().toISOString(), ...note });
    try { rec.syncStatus = 'pending_upload'; } catch (e) {}
    stampVectorPending(rec);
    s.notes.push(rec);
    writeLocal(s);
    // Dynamic ingestion: mirror create to Vector Service (queued offline).
    fireVectorMirror('upsert', rec);
    return rec;
  }
  // Mock Sync Toggle: flip all pending_upload -> synced for offline/online UI testing.
  // NOTE: vector queue is drained separately via VectorSync.flushVectorQueue()
  // so Force Sync never fakes a vector upload.
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
    // Pure-offline: immediate local write via readLocal()/writeLocal(), zero network fetch.
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
    // Pure-offline: immediate local write via readLocal()/writeLocal(), zero network fetch.
    const s = readLocal();
    const n = (s.notes || []).find((x) => x.id === id);
    if (n) { n.privacy = privacy; n.syncStatus = 'pending_upload'; stampVectorPending(n); writeLocal(s); fireVectorMirror('upsert', n); }
    // Privacy toggle on a timeline card also re-ingests (is_private flip).
    try {
      const t = (s.timeline || []).find((x) => x && String(x.id) === String(id));
      if (t && !n) { t.privacy = privacy; t.syncStatus = 'pending_upload'; stampVectorPending(t); writeLocal(s); fireVectorMirror('upsert', t); return t; }
      else if (t && n) { /* note already mirrored */ }
    } catch (e) {}
    return n || { id, privacy };
  }
  async updateCardPrivacy(id, privacy) {
    // Generic privacy toggle for timeline OR notes (TimelineCard flip path).
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
    // Generic content edit for timeline OR notes (completes CRUD cycle).
    // Failover Repository Pattern: local-first write, then fire-and-forget
    // vector upsert (POST /ingest) via queue. Never blocks local write.
    const s = readLocal();
    let touched = null;
    try {
      const clean = (patch && typeof patch === 'object') ? { ...patch } : {};
      // Guard rails: never allow id/project-anchor rewrites via card edit.
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
    // Local-first delete + vector propagation (queued offline). Returns true if found.
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
    // Manual "Sync Now" for a single card: push current local state to vector.
    // Local syncStatus flip is handled by callers; here we only mirror + flush.
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
  // --- Data Park (Step 1 Harvester) — Failover Repository Pattern (PURE OFFLINE MODE) ---
  // Hackathon demo: NEVER attempt fetch('http://localhost:8000/harvest') here.
  // CORS / port mismatch broke the Harvester, so these three methods write
  // directly to localStorage via readLocal()/writeLocal() with 100% offline fallback.
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
      // PRIVACY FIX (Task 2): persist caller-selected privacy on the staged row
      // so onProcess -> review queue -> onApproveAll can inherit it. Default
      // Fail Closed to Team Shared.
      privacy: (payload && typeof payload.privacy === 'string' && payload.privacy.trim()) ? payload.privacy.trim() : 'Team Shared',
      syncStatus: 'pending_processing',
      created_at: new Date().toISOString(),
      contentHash: (payload && payload.contentHash) || '',
    };
    // Pure offline: write directly to local storage, no network fetch.
    const s = readLocal();
    if (!Array.isArray(s.timeline)) s.timeline = [];
    s.timeline.unshift(rec);
    writeLocal(s);
    // Harvest approval creates the real timeline card below via saveHarvestedCard;
    // staging itself is NOT vector-mirrored (avoids indexing raw unapproved drops).
    return rec;
  }
  async listPendingProcessing() {
    // Pure offline: bypass GET /harvest?status=pending_processing fetch (CORS risk).
    const s = readLocal();
    return (s.timeline || []).filter((t) => t && t.syncStatus === 'pending_processing');
  }
  async markProcessed(id, aiResult) {
    const patch = {
      title: (aiResult && typeof aiResult.title === 'string' && aiResult.title.trim()) ? aiResult.title : undefined,
      synthesizedText: (aiResult && aiResult.synthesizedText) || '',
      tags: (aiResult && aiResult.tags) || [],
      impactScore: (aiResult && typeof aiResult.impactScore === 'number') ? aiResult.impactScore : 0.7,
      // Smart Append survival (Failover-safe): if legacy exact-match already found
      // a target, keep it so approve appends instead of creating a duplicate card.
      smartAppend: (aiResult && aiResult.smartAppend) || undefined,
      // Rich UI persistence: keep horizontal timeline, merge banners, and
      // structured grids visible after reload. Preserve caller-selected privacy
      // (Harvester review-queue "Private (Only Me)" toggle) — only default to
      // 'Team Shared' when neither the AI result nor the staged item carries one.
      mergeHint: (aiResult && aiResult.mergeHint) || '',
      structured: (aiResult && aiResult.structured && typeof aiResult.structured === 'object') ? aiResult.structured : {},
      privacy: (aiResult && typeof aiResult.privacy === 'string' && aiResult.privacy.trim()) ? aiResult.privacy.trim() : 'Team Shared',
      syncStatus: 'pending_upload',
      processed_at: new Date().toISOString(),
    };
    if (patch.title === undefined) delete patch.title;
    if (patch.smartAppend === undefined) delete patch.smartAppend;
    // Pure offline: bypass PATCH /harvest/:id fetch (CORS risk).
    // Write directly to local storage via readLocal()/writeLocal().
    const s = readLocal();
    const t = (s.timeline || []).find((x) => x && String(x.id) === String(id));
    if (t) { Object.assign(t, patch); t.syncStatus = 'pending_upload'; stampVectorPending(t); ensureTimelineNodes(t); writeLocal(s); fireVectorMirror('upsert', t); }
    return t || { id, ...patch };
  }
  // Harvester Smart Append — pure-offline entity-resolution commit.
  // Appends reviewer-approved RAW/AI nodes to an EXISTING matched Status Card's
  // horizontal timeline strip (no new standalone card). Privacy contract:
  // meta.privacy decides contamination — Team Shared appends leave the parent
  // shared (visible to all); Private appends upgrade one-way to Private.
  // Missing meta.privacy fails OPEN to shared so public merges can never hide
  // the parent card from the feed (previous default-to-Private did exactly that).
  async smartAppendToCard(targetCardId, stagedRawNode, stagedAiNode, meta) {
    // Pure-offline: immediate local state via readLocal()/writeLocal(), zero network fetch.
    const s = readLocal();
    const tlList = Array.isArray(s.timeline) ? s.timeline : [];
    const nList = Array.isArray(s.notes) ? s.notes : [];
    let target = tlList.find((x) => x && String(x.id) === String(targetCardId));
    if (!target) target = nList.find((x) => x && String(x.id) === String(targetCardId));
    if (!target) return null;
    if (!Array.isArray(target.nodes)) target.nodes = [];
    const nowIso = new Date().toISOString();
    // Phase-3 leak-prevention: appended nodes must carry author/contributor so
    // TimelineCard isOwner (activePersona) checks can render them for the owner
    // and strip them for other personas. Fall back to target author / 'User'.
    const metaAuthor = (meta && (meta.author || meta.contributor)) || target.author || target.contributor || 'User';
    const metaContrib = (meta && (meta.contributor || meta.author)) || target.contributor || target.author || metaAuthor;
    // ONE-WAY PUBLIC DOOR: If the target parent is already Team Shared, 
    // the append MUST be public. Contamination (upgrading parent to Private)
    // is FORBIDDEN for Team Shared parents.
    const parentIsShared = String(target.privacy || 'Team Shared') === 'Team Shared';
    const effPrivacy = parentIsShared ? 'Team Shared' : ((meta && meta.privacy) || 'Team Shared');

    const pushNode = (n) => {
      if (!n || (!n.text && !n.kind)) return;
      target.nodes.push({
        kind: String((n && n.kind) || 'EV').toUpperCase(),
        text: String((n && n.text) || '').slice(0, 800),
        author: String((n && (n.author || n.contributor)) || metaAuthor || 'User'),
        contributor: String((n && (n.contributor || n.author)) || metaContrib || 'User'),
        stagedAppend: true,
        appendPrivacy: effPrivacy,
        appendSyncStatus: 'pending_review',
        appended_at: nowIso,
      });
    };
    pushNode(stagedRawNode);
    pushNode(stagedAiNode);
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
    });
    target.updated_at = nowIso;
    target.syncStatus = 'pending_upload';
    
    // Task Fix: Update parent card surface with latest reviewed content
    if (meta && meta.title) target.title = meta.title;
    if (meta && meta.synthesizedText) target.synthesizedText = meta.synthesizedText;

    // Contamination logic: Only upgrade to Private if parent was NOT already shared
    // AND the append itself is private.
    if (!parentIsShared) {
      try {
        const v = String(effPrivacy).trim().toLowerCase();
        const isPrivNode = v.indexOf('private') >= 0 || v === 'my notes' || v === 'my_notes' || v === 'my-notes' || v === 'mynotes' || v === 'only me';
        if (isPrivNode) {
          target.privacy = 'Private';
          try { target.is_private = true; target.isPrivate = true; } catch (e2) {}
        }
      } catch (e) {}
    }
    stampVectorPending(target);
    ensureTimelineNodes(target);
    // Remove the consumed staged (pending_processing) item so no duplicate standalone card remains.
    const stagedId = meta && meta.stagedId;
    if (stagedId) {
      const si = tlList.findIndex((x) => x && String(x.id) === String(stagedId) && x.syncStatus === 'pending_processing');
      if (si >= 0) tlList.splice(si, 1);
    }
    writeLocal(s);
    // Appends change card content/privacy surface — mirror edit to vector.
    fireVectorMirror('upsert', target);
    return target;
  }
  async resetToSeedData() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    const seed = seedState();
    writeLocal(seed);
    return seed;
  }
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
export const OnionDB = new FailoverDB();
try {
  // PERSISTENCE FIX: seed ONLY when the key is completely absent/empty.
  // Previous `if (!getItem(...))` also seeded on corrupt-but-present data;
  // readLocal() now owns that decision (returns a shell without wiping).
  // This boot block stays append-only: never overwrite existing storage here.
  const bootRaw = localStorage.getItem(STORAGE_KEY);
  if (bootRaw == null || bootRaw === '') localStorage.setItem(STORAGE_KEY, JSON.stringify(seedState()));
  window.OnionDB = OnionDB;
} catch (err) {}
export default OnionDB;
