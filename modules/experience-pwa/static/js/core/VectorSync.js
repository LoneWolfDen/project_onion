// js/core/VectorSync.js — Dual-Mode Facade for the Vector Service (ChromaDB).
// Failover Repository Pattern: localStorage (FailoverDB) is source of truth.
// Vector pushes are fire-and-forget and MUST NEVER block local writes.
// Offline (or port blocked / air-gapped) => queue in localStorage key
// 'onion_vector_queue' as {op,id,card,at,attempts}. Auto-drain on reconnect.
// Endpoints: POST {base}/ingest (upsert), DELETE|POST {base}/delete.
// Default base :8006 (vector-service). Override: localStorage VECTOR_BASE_URL.
const QUEUE_KEY = 'onion_vector_queue';
const BASE_OVERRIDE_KEY = 'VECTOR_BASE_URL';
const DEFAULT_BASES = ['http://localhost:8006'];
function readQueue() {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch (e) { return []; }
}
function writeQueue(q) {
  try { localStorage.setItem(QUEUE_KEY, JSON.stringify(q)); } catch (e) {}
  try { window.dispatchEvent(new CustomEvent('onion:vector-queue', { detail: { pending: q.length, at: new Date().toISOString() } })); } catch (e) {}
}
function vectorBases() {
  let extra = [];
  try { const o = localStorage.getItem(BASE_OVERRIDE_KEY); if (o && String(o).trim()) extra = [String(o).trim().replace(/\/$/, '')]; } catch (e) {}
  return [...extra, ...DEFAULT_BASES];
}
function toVectorPayload(card) {
  const c = card || {};
  // Fail-Closed: belt-and-suspenders is_private — any private signal anywhere
  // (card.privacy, appended nodes, pendingAppends) forces privacy:'Private' so
  // store.is_private_card() lands is_private=True even if the footer string
  // was mid-upgrade when the mirror fired.
  let priv = String(c.privacy || 'Team Shared');
  try {
    const blob = JSON.stringify([c.nodes, c.pendingAppends, c.timeline]) || '';
    if (/private/i.test(blob) || /my notes/i.test(blob)) priv = 'Private';
  } catch (e) {}
  return {
    id: String(c.id || ''),
    author: String(c.author || c.contributor || 'Walter'),
    client: String(c.client || c.client_name || 'Acme Corp'),
    client_name: String(c.client_name || c.client || 'Acme Corp'),
    project: String(c.project || c.project_name || 'Apollo-123'),
    project_name: String(c.project_name || c.project || 'Apollo-123'),
    projectId: String(c.projectId || c.project_name || c.project || 'apollo-123'),
    Project_ReferenceID: String(c.Project_ReferenceID || c.anchor_id || ''),
    opportunity_id: String(c.opportunity_id || ((c.opportunity_numbers || [])[0]) || ''),
    type: String(c.type || 'Note'),
    title: String(c.title || '').slice(0, 500),
    detail: String(c.detail || c.content || c.synthesizedText || '').slice(0, 2000),
    content: String(c.content || c.detail || c.synthesizedText || '').slice(0, 4000),
    source: String(c.source || c.type || 'PWA'),
    timestamp: String(c.timestamp || 'Just now'),
    piiStatus: String(c.piiStatus || 'Clean'),
    privacy: priv,
    is_private: /private/i.test(priv) || /my notes/i.test(priv),
    isPrivate: /private/i.test(priv) || /my notes/i.test(priv),
    syncStatus: String(c.syncStatus || 'pending_upload'),
    impactScore: (typeof c.impactScore === 'number' ? c.impactScore : 0.5),
    tags: Array.isArray(c.tags) ? c.tags.map(String) : [],
    created_at: String(c.created_at || new Date().toISOString()),
  };
}

async function fetchTimeout(url, options, ms) {
  const ctrl = new AbortController();
  const t = setTimeout(() => { try { ctrl.abort(); } catch (e) {} }, ms || 2500);
  try {
    const res = await fetch(url, { ...(options || {}), signal: ctrl.signal });
    return res;
  } finally { clearTimeout(t); }
}
export async function vectorHealth() {
  for (const base of vectorBases()) {
    try {
      const res = await fetchTimeout(base + '/health', { method: 'GET' }, 2500);
      if (res && res.ok) { const j = await res.json().catch(() => ({})); return { ok: true, base, info: j }; }
    } catch (e) {}
  }
  return { ok: false, base: null };
}
async function postIngest(payload) {
  let lastErr = null;
  for (const base of vectorBases()) {
    try {
      const res = await fetchTimeout(base + '/ingest', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }, 4000);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.json().catch(() => ({ status: 'success' }));
    } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error('vector unreachable');
}
async function postDelete(id) {
  let lastErr = null;
  for (const base of vectorBases()) {
    try {
      let res = null;
      try {
        res = await fetchTimeout(base + '/delete', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: String(id) }) }, 4000);
      } catch (e) { res = null; }
      if (!res || !res.ok) {
        res = await fetchTimeout(base + '/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: String(id) }) }, 4000);
      }
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.json().catch(() => ({ status: 'success' }));
    } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error('vector unreachable');
}
export function queueVectorOp(op, cardOrId) {
  const q = readQueue();
  const at = new Date().toISOString();
  if (op === 'delete') {
    q.push({ op: 'delete', id: String((cardOrId && cardOrId.id) || cardOrId || ''), at, attempts: 0 });
  } else {
    const card = cardOrId || {};
    if (!card.id) return q.length;
    const rest = q.filter((e) => !(e && e.op === 'upsert' && String(e.id) === String(card.id)));
    rest.push({ op: 'upsert', id: String(card.id), card: toVectorPayload(card), at, attempts: 0 });
    writeQueue(rest);
    return rest.length;
  }
  writeQueue(q);
  return q.length;
}
export function pendingVectorCount() { return readQueue().length; }
export async function querySimilarCards(text, project, activePersona, topK) {
  // Semantic overlap check for Harvester "Propose Merge" (Dual-Mode Facade).
  // Live: POST {base}/ask (vector-service Chroma query, privacy-filtered
  // server-side by project + persona). Offline/unreachable: resolves
  // { match: null, engine: 'offline' } so legacy exact-match stays the boss.
  // Match rule: closest retrieved hit with Chroma cosine distance <= 1.2
  // (smaller = closer) counts as contextual overlap. NEVER throws.
  const q = String(text || '').slice(0, 1000);
  if (!q.trim()) return { match: null, engine: 'none' };
  const body = { query: q, project: String(project || ''), activePersona: String(activePersona || ''), privacyMode: 'Both' };
  for (const base of vectorBases()) {
    try {
      const res = await fetchTimeout(base + '/ask', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }, 4000);
      if (!res.ok) continue;
      const j = await res.json().catch(() => null);
      const retrieved = (j && j.retrieved) || [];
      if (!retrieved.length) return { match: null, engine: 'chromadb' };
      const top = retrieved[0] || {};
      const dist = Number(top.distance);
      if (!Number.isFinite(dist) || dist > 1.2) return { match: null, engine: 'chromadb' };
      let title = String(top.id || '');
      try {
        const doc = String(top.document || '');
        const m = doc.match(/Title:\s*([^\n]+)/);
        if (m && m[1].trim()) title = m[1].trim().slice(0, 80);
      } catch (e) {}
      return { match: { id: String(top.id || ''), title, distance: dist, reasons: ['vector similarity (dist ' + dist.toFixed(2) + ')'] }, engine: 'chromadb' };
    } catch (e) {}
  }
  return { match: null, engine: 'offline' };
}
export function vectorScoreForDistance(dist) {
  // Map Chroma cosine distance (0 = identical) to 0..1 merge score for UI parity
  // with legacy matchScore: 0 -> 0.95, 1.2 -> ~0.55. Floor 0.5 (it matched).
  const d = Number(dist);
  if (!Number.isFinite(d)) return 0.55;
  return Math.max(0.5, Math.round((0.95 - d * 0.33) * 100) / 100);
}
export async function flushVectorQueue() {
  const q = readQueue();
  if (!q.length) return { flushed: 0, pending: 0 };
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return { flushed: 0, pending: q.length, offline: true };
  let flushed = 0;
  const remaining = [];
  for (const entry of q) {
    try {
      if (entry.op === 'delete') await postDelete(entry.id);
      else await postIngest(entry.card || toVectorPayload({ id: entry.id }));
      flushed++;
    } catch (e) {
      remaining.push({ ...entry, attempts: (entry.attempts || 0) + 1, error: String((e && e.message) || e).slice(0, 200) });
    }
  }
  writeQueue(remaining);
  try { markQueueMirrored(flushed); } catch (e) {}
  return { flushed, pending: remaining.length };
}
export function mirrorToVector(op, cardOrId) {
  try {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      queueVectorOp(op, cardOrId);
      return Promise.resolve({ queued: true, offline: true });
    }
    const run = (async () => {
      try {
        if (op === 'delete') await postDelete((cardOrId && cardOrId.id) || cardOrId);
        else await postIngest(toVectorPayload(cardOrId));
        return { queued: false, ok: true };
      } catch (e) {
        queueVectorOp(op, cardOrId);
        return { queued: true, ok: false };
      }
    })();
    run.then(() => { try { flushVectorQueue(); } catch (e) {} });
    return run;
  } catch (e) {
    try { queueVectorOp(op, cardOrId); } catch (e2) {}
    return Promise.resolve({ queued: true });
  }
}
function markQueueMirrored(n) {
  if (!n) return;
  try {
    const KEY = 'onion_db_state';
    const raw = localStorage.getItem(KEY);
    if (!raw) return;
    const s = JSON.parse(raw);
    let touched = false;
    ['timeline', 'notes'].forEach((k) => {
      (s[k] || []).forEach((it) => {
        if (it && it.vectorSyncStatus === 'pending') { it.vectorSyncStatus = 'synced'; touched = true; }
      });
    });
    if (touched) {
      localStorage.setItem(KEY, JSON.stringify(s));
      // Task 3: Notes/Timeline UI subscribes to onion:db-update — without this
      // dispatch the cloud icon stays stuck on ☁️ after a background flush.
      try { window.dispatchEvent(new CustomEvent('onion:db-update', { detail: { source: 'vector-sync', at: new Date().toISOString() } })); } catch (e) {}
    }
  } catch (e) {}
}
try {
  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => { try { flushVectorQueue(); } catch (e) {} });
    // SW <-> page bridge: SW Background Sync asks page (queue owner) to flush.
    try {
      if ('serviceWorker' in navigator && navigator.serviceWorker.addEventListener) {
        navigator.serviceWorker.addEventListener('message', (ev) => {
          try { if (ev && ev.data && ev.data.type === 'onion:flush-vector-queue') flushVectorQueue(); } catch (e) {}
        });
      }
    } catch (e) {}
    try {
      // Register SW at root scope (canonical file: modules/experience-pwa/sw.js;
      // dev service.py serves its bytes at /sw.js; prod Nginx serves module root).
      // Failures are silent — localStorage queue still works (Dual-Mode).
      if ('serviceWorker' in navigator && window.isSecureContext !== false) {
        navigator.serviceWorker.register('/sw.js').then((reg) => {
          try { if (reg && reg.sync) reg.sync.register('onion-vector-sync').catch(() => {}); } catch (e) {}
        }).catch(() => {});
      }
    } catch (e) {}
    setInterval(() => { try { flushVectorQueue(); } catch (e) {} }, 60000);
    setTimeout(() => { try { flushVectorQueue(); } catch (e) {} }, 3000);
  }
} catch (e) {}
export default { mirrorToVector, queueVectorOp, flushVectorQueue, pendingVectorCount, vectorHealth };

