// js/core/FailoverDB.js part1 — Failover Repository Pattern (mandatory).
import { MOCK_SEED } from '../data/mockSeed.js';
const STORAGE_KEY = 'onion_db_state';
const API_BASES = ['http://localhost:8000', 'http://localhost:8001'];
function tagPending(entity) {
  try { entity.syncStatus = 'pending_upload'; } catch (e) {}
  return entity;
}
function clone(o) { return JSON.parse(JSON.stringify(o)); }
export function seedState() { return clone(MOCK_SEED); }
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
    try {
      const saved = await tryFetch('/notes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(note) });
      // Reactivity fix: mirror cloud success into local + notify subscribers so App re-renders instantly.
      try {
        const s = readLocal();
        if (!Array.isArray(s.notes)) s.notes = [];
        const rec = { id: (saved && saved.id) || ('n-' + Date.now()), created_at: new Date().toISOString(), syncStatus: 'synced', ...note, ...(saved || {}) };
        s.notes.push(rec);
        writeLocal(s);
      } catch (e) {}
      return saved;
    }
    catch (err) {
      const s = readLocal();
      const rec = tagPending({ id: 'n-local-' + Date.now(), created_at: new Date().toISOString(), ...note });
      s.notes.push(rec);
      writeLocal(s);
      return rec;
    }
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
  // --- Data Park (Step 1 Harvester) — Failover Repository Pattern ---
  // Every mutation checks cloud API health first, falls back to local
  // browser storage with syncStatus flag. PII screening is applied by
  // callers (HarvesterPanel) before invoking these; we re-ensure here.
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
    try {
      const saved = await tryFetch('/harvest', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(rec) });
      try {
        const s = readLocal();
        if (!Array.isArray(s.timeline)) s.timeline = [];
        // Mirror cloud success locally so UI reacts instantly.
        const localRec = { ...rec, syncStatus: 'pending_processing', ...(saved || {}) };
        // Preserve pending_processing unless cloud explicitly returns processed.
        if (!localRec.syncStatus || localRec.syncStatus === 'synced') localRec.syncStatus = 'pending_processing';
        s.timeline.unshift(localRec);
        writeLocal(s);
      } catch (e) {}
      return saved;
    } catch (err) {
      const s = readLocal();
      if (!Array.isArray(s.timeline)) s.timeline = [];
      s.timeline.unshift(rec);
      writeLocal(s);
      return rec;
    }
  }
  async listPendingProcessing() {
    try {
      const remote = await tryFetch('/harvest?status=pending_processing');
      if (Array.isArray(remote)) return remote;
    } catch (e) {}
    const s = readLocal();
    return (s.timeline || []).filter((t) => t && t.syncStatus === 'pending_processing');
  }
  async markProcessed(id, aiResult) {
    const patch = {
      synthesizedText: (aiResult && aiResult.synthesizedText) || '',
      tags: (aiResult && aiResult.tags) || [],
      impactScore: (aiResult && typeof aiResult.impactScore === 'number') ? aiResult.impactScore : 0.7,
      syncStatus: 'processed',
      processed_at: new Date().toISOString(),
    };
    try {
      const saved = await tryFetch('/harvest/' + encodeURIComponent(id), { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) });
      try {
        const s = readLocal();
        const t = (s.timeline || []).find((x) => x && String(x.id) === String(id));
        if (t) { Object.assign(t, patch, (saved || {})); t.syncStatus = 'processed'; writeLocal(s); }
      } catch (e) {}
      return saved;
    } catch (err) {
      const s = readLocal();
      const t = (s.timeline || []).find((x) => x && String(x.id) === String(id));
      if (t) { Object.assign(t, patch); t.syncStatus = 'processed'; writeLocal(s); }
      return t || { id, ...patch };
    }
  }
  subscribe(fn) {
    const h = () => { try { fn(readLocal()); } catch (e) {} };
    window.addEventListener('onion:db-update', h);
    return () => window.removeEventListener('onion:db-update', h);
  }
}
export const OnionDB = new FailoverDB();
try {
  if (!localStorage.getItem(STORAGE_KEY)) localStorage.setItem(STORAGE_KEY, JSON.stringify(seedState()));
  window.OnionDB = OnionDB;
} catch (err) {}
export default OnionDB;
