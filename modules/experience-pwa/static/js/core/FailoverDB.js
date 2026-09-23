// js/core/FailoverDB.js part1 — Failover Repository Pattern (mandatory).
import { MOCK_SEED } from '../data/mockSeed.js';
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
    if (!Array.isArray(card.nodes) || card.nodes.length < 2) {
      const rawText = String(card.content || card.detail || card.synthesizedText || card.title || '');
      const aiText = String(card.synthesizedText || card.content || card.detail || card.title || '');
      card.nodes = [{ kind: 'RAW', text: rawText }, { kind: 'AI', text: aiText }];
    } else {
      const kinds = card.nodes.map((n) => n && n.kind);
      if (kinds.indexOf('RAW') < 0) card.nodes.unshift({ kind: 'RAW', text: String(card.content || card.detail || '') });
      if (kinds.indexOf('AI') < 0) card.nodes.push({ kind: 'AI', text: String(card.synthesizedText || card.content || '') });
    }
  } catch (e) {}
  return card;
}
export function seedState() { const s = clone(MOCK_SEED); try { (s.timeline || []).forEach(ensureTimelineNodes); } catch (e) {} return s; }
export function readLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seed = seedState();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.projects)) parsed.projects = seedState().projects;
    if (!Array.isArray(parsed.timeline)) parsed.timeline = [];
    if (!Array.isArray(parsed.notes)) parsed.notes = [];
    if (!Array.isArray(parsed.archived)) parsed.archived = [];
    if (!Array.isArray(parsed.clients)) parsed.clients = seedState().clients;
    try { (parsed.timeline || []).forEach(ensureTimelineNodes); } catch (e) {}
    return parsed;
  } catch (err) {
    const s2 = seedState();
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s2)); } catch (e) {}
    return s2;
  }
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
    try { return await tryFetch('/clients'); }
    catch (err) { return readLocal().clients; }
  }
  async listProjects() {
    try { return await tryFetch('/projects'); }
    catch (err) { return readLocal().projects; }
  }
  async saveNote(note) {
    // Pure-offline: NEVER fetch localhost:8000 (CORS in air-gapped PWA).
    // Direct localStorage write via Failover Repository Pattern.
    const s = readLocal();
    if (!Array.isArray(s.notes)) s.notes = [];
    const rec = tagPending({ id: 'n-local-' + Date.now(), created_at: new Date().toISOString(), ...note });
    try { rec.syncStatus = 'pending_upload'; } catch (e) {}
    s.notes.push(rec);
    writeLocal(s);
    return rec;
  }
  // Mock Sync Toggle: flip all pending_upload -> synced for offline/online UI testing.
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
    try {
      const saved = await tryFetch('/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(project) });
      // Reactivity fix: mirror cloud success into local + notify subscribers so App re-renders instantly.
      try {
        const s = readLocal();
        if (!Array.isArray(s.projects)) s.projects = [];
        const rec = { created_at: new Date().toISOString(), syncStatus: 'synced', ...project, ...(saved || {}) };
        const i = s.projects.findIndex((p) => p.Project_ReferenceID === rec.Project_ReferenceID);
        if (i >= 0) s.projects[i] = { ...s.projects[i], ...rec };
        else s.projects.push(rec);
        writeLocal(s);
      } catch (e) {}
      return saved;
    }
    catch (err) {
      const s = readLocal();
      if (!Array.isArray(s.projects)) s.projects = [];
      const rec = tagPending({ created_at: new Date().toISOString(), ...project });
      const i = s.projects.findIndex((p) => p.Project_ReferenceID === rec.Project_ReferenceID);
      if (i >= 0) s.projects[i] = { ...s.projects[i], ...rec };
      else s.projects.push(rec);
      writeLocal(s);
      return rec;
    }
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
    try {
      await tryFetch('/notes/' + encodeURIComponent(id), { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ privacy }) });
      try {
        const s = readLocal();
        const n = (s.notes || []).find((x) => x.id === id);
        if (n) { n.privacy = privacy; n.syncStatus = 'synced'; writeLocal(s); }
      } catch (e) {}
      return { id, privacy };
    } catch (err) {
      const s = readLocal();
      const n = (s.notes || []).find((x) => x.id === id);
      if (n) { n.privacy = privacy; n.syncStatus = 'pending_upload'; writeLocal(s); }
      return n || { id, privacy };
    }
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
      syncStatus: 'pending_processing',
      created_at: new Date().toISOString(),
    };
    // Pure offline: write directly to local storage, no network fetch.
    const s = readLocal();
    if (!Array.isArray(s.timeline)) s.timeline = [];
    s.timeline.unshift(rec);
    writeLocal(s);
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
      // Rich UI persistence: keep horizontal timeline, merge banners, and
      // structured grids visible after reload. Default privacy Fail Closed
      // to 'Team Shared' when the AI result carries no explicit value.
      mergeHint: (aiResult && aiResult.mergeHint) || '',
      structured: (aiResult && aiResult.structured && typeof aiResult.structured === 'object') ? aiResult.structured : {},
      privacy: (aiResult && aiResult.privacy) ? aiResult.privacy : 'Team Shared',
      syncStatus: 'processed',
      processed_at: new Date().toISOString(),
    };
    if (patch.title === undefined) delete patch.title;
    // Pure offline: bypass PATCH /harvest/:id fetch (CORS risk).
    // Write directly to local storage via readLocal()/writeLocal().
    const s = readLocal();
    const t = (s.timeline || []).find((x) => x && String(x.id) === String(id));
    if (t) { Object.assign(t, patch); t.syncStatus = 'processed'; ensureTimelineNodes(t); writeLocal(s); }
    return t || { id, ...patch };
  }
  // Harvester Smart Append — pure-offline entity-resolution commit.
  // Appends reviewer-approved RAW/AI nodes to an EXISTING matched Status Card's
  // horizontal timeline strip (no new standalone card). Staged update is marked
  // private/pending review. Removes the now-consumed staged item. Zero network fetch.
  async smartAppendToCard(targetCardId, stagedRawNode, stagedAiNode, meta) {
    const s = readLocal();
    const list = Array.isArray(s.timeline) ? s.timeline : [];
    const target = list.find((x) => x && String(x.id) === String(targetCardId));
    if (!target) return null;
    if (!Array.isArray(target.nodes)) target.nodes = [];
    const nowIso = new Date().toISOString();
    const pushNode = (n) => {
      if (!n || (!n.text && !n.kind)) return;
      target.nodes.push({
        kind: String((n && n.kind) || 'EV').toUpperCase(),
        text: String((n && n.text) || '').slice(0, 800),
        stagedAppend: true,
        appendPrivacy: 'My Notes (Private)',
        appendSyncStatus: 'pending_review',
        appended_at: nowIso,
      });
    };
    pushNode(stagedRawNode);
    pushNode(stagedAiNode);
    if (!Array.isArray(target.pendingAppends)) target.pendingAppends = [];
    target.pendingAppends.push({
      at: nowIso,
      privacy: 'My Notes (Private)',
      syncStatus: 'pending_review',
      title: (meta && meta.title) || '',
      source: (meta && meta.source) || '',
      reasons: (meta && meta.reasons) || [],
      score: (meta && typeof meta.score === 'number') ? meta.score : 0,
    });
    target.updated_at = nowIso;
    ensureTimelineNodes(target);
    // Remove the consumed staged (pending_processing) item so no duplicate standalone card remains.
    const stagedId = meta && meta.stagedId;
    if (stagedId) {
      const si = list.findIndex((x) => x && String(x.id) === String(stagedId) && x.syncStatus === 'pending_processing');
      if (si >= 0) list.splice(si, 1);
    }
    writeLocal(s);
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
  if (!localStorage.getItem(STORAGE_KEY)) localStorage.setItem(STORAGE_KEY, JSON.stringify(seedState()));
  window.OnionDB = OnionDB;
} catch (err) {}
export default OnionDB;
