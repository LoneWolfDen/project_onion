// HarvesterPanel — Step 1 "Data Park" Harvester (Failover-safe, offline-resilient).
// Data Park Dropzone: large textarea + type selector + API-key gear + stage/process buttons.
// Legacy controls (GDP/RAID file drops, bookmarklet clipboard, delta window, staged list,
// Run Harvest & Refine via props.onRun) are preserved so App.js wiring keeps working.
// New flow: Stage to Data Park → syncStatus pending_processing → Run AI Processing Engine
// → processWithAI() → mark processed + dispatch onion:db-update.
import { projectIdEquals } from '../core/schema.js';
import { piiScreen } from '../core/PiiGate.js';
import { processWithAI } from '../core/AiClient.js';
const html = window.htm.bind(window.React.createElement);
export function toPayload(o, persona) {
  const p = (typeof persona === 'string' && persona) || (o && (o.author || o.contributor)) || 'Brené';
  return { id: o.id, projectId: o.projectId, type: o.type, title: o.title, source: o.source, timestamp: o.timestamp || 'Just now', content: o.content, piiStatus: o.piiStatus || 'Clean', syncStatus: 'pending_upload', author: o.author || p, contributor: o.contributor || p };
}
function dbApi() {
  try { if (typeof window !== 'undefined' && window.OnionDB) return window.OnionDB; } catch (e) {}
  return null;
}
// --- Smart Append entity resolution (pure-offline string-matching heuristic) ---
// Returns { card, score, reasons } for the best existing Status Card overlap, or null.
// Heuristics: (1) reference-ID exact overlap (O-xxxxxx, PO-xxxxx, SoW-xxxx, AP-xxx, MS\d, R-\d+),
// (2) title/topic token overlap (stop-word stripped), (3) tag/keyword overlap.
function extractRefTokens(text) {
  const out = [];
  try {
    const t = String(text || '');
    const pats = [/\bO-\d{4,8}\b/gi, /\bPO-\d{2,8}\b/gi, /\bSoW-[\w-]+\b/gi, /\bAP-\d{2,6}\b/gi, /\bMS\d\b/gi, /\bR-\d{1,4}\b/gi, /\bFW-REQ-\d+\b/gi, /\bOPP-\d+\b/gi];
    pats.forEach((re) => { const m = String(t).match(re) || []; m.forEach((x) => out.push(String(x).toUpperCase())); });
  } catch (e) {}
  return [...new Set(out)];
}
function topicTokens(text) {
  const stop = { the: 1, a: 1, an: 1, and: 1, or: 1, of: 1, to: 1, for: 1, in: 1, on: 1, is: 1, are: 1, was: 1, were: 1, be: 1, with: 1, by: 1, from: 1, as: 1, at: 1, it: 1, this: 1, that: 1, re: 1, fw: 1, fwd: 1, subject: 1 };
  return String(text || '').toLowerCase().replace(/[^a-z0-9#\- ]/g, ' ').split(/\s+/).filter((w) => w && w.length > 2 && !stop[w]).slice(0, 60);
}
function readAllTimelineCards() {
  try {
    const raw = localStorage.getItem('onion_db_state');
    if (!raw) return [];
    const s = JSON.parse(raw);
    return Array.isArray(s.timeline) ? s.timeline : [];
  } catch (e) { return []; }
}
export function findSmartAppendMatch(stagedText, stagedTitle) {
  const hay = String(stagedText || '') + ' ' + String(stagedTitle || '');
  const stagedRefs = extractRefTokens(hay);
  const stagedToks = new Set(topicTokens(hay));
  const cards = readAllTimelineCards().filter((c) => c && c.syncStatus !== 'pending_processing');
  let best = null; let bestScore = 0; let bestReasons = [];
  cards.forEach((c) => {
    const cHay = [c.title, c.detail, c.content, c.synthesizedText, c.opportunity_id, (c.opportunity_numbers || []).join(' '), (c.project_ids || []).join(' '), (c.tags || []).join(' ')].join(' ');
    const cRefs = extractRefTokens(cHay);
    const refOverlap = stagedRefs.filter((r) => cRefs.indexOf(r) >= 0);
    const cToks = new Set(topicTokens(cHay));
    let tokOverlap = 0;
    stagedToks.forEach((t) => { if (cToks.has(t)) tokOverlap++; });
    // Title/ID direct substring check (case-insensitive) — cheapest strong signal.
    const lowStaged = String(hay).toLowerCase();
    const lowTitle = String(c.title || '').toLowerCase();
    const titleHit = lowTitle && lowTitle.length > 4 && (lowStaged.indexOf(lowTitle) >= 0 || (lowStaged.length > 4 && String(cHay).toLowerCase().indexOf(String(stagedTitle || '').toLowerCase()) >= 0 && String(stagedTitle || '').length > 4));
    let score = refOverlap.length * 3 + tokOverlap * 1 + (titleHit ? 4 : 0);
    const reasons = [];
    if (refOverlap.length) reasons.push('ref:' + refOverlap.slice(0, 3).join(','));
    if (titleHit) reasons.push('title/topic overlap');
    if (tokOverlap >= 3) reasons.push(tokOverlap + ' shared keywords');
    if (score > bestScore && (refOverlap.length > 0 || titleHit || tokOverlap >= 3)) { bestScore = score; best = c; bestReasons = reasons; }
  });
  if (!best) return null;
  return { card: best, score: bestScore, reasons: bestReasons };
}
export function buildSmartAppendFor(fullText, stagedTitle, ai, fallbackText) {
  try {
    const hit = findSmartAppendMatch(String(fullText || '') + ' ' + String(stagedTitle || ''), stagedTitle);
    if (hit && hit.card) {
      return {
        targetCardId: String(hit.card.id),
        targetCardTitle: String(hit.card.title || hit.card.id),
        matchScore: hit.score,
        matchReasons: Array.isArray(hit.reasons) ? hit.reasons : [],
        stagedRawNode: { kind: 'RAW', text: String(fallbackText || fullText || '').slice(0, 500) },
        stagedAiNode: { kind: 'AI', text: String((ai && ai.synthesizedText) || '').slice(0, 500) },
        appendPrivacy: 'My Notes (Private)',
        appendSyncStatus: 'pending_review',
      };
    }
  } catch (e) {}
  return null;
}
export function HarvesterPanel(props) {
  const project = props.project;
  const clientMeta = props.clientMeta;
  const staged = props.staged || [];
  const status = props.status || '';
  const clip = props.clip || '';
  const setClip = props.setClip || (() => {});
  const from = props.from || '';
  const setFrom = props.setFrom || (() => {});
  const to = props.to || '';
  const setTo = props.setTo || (() => {});
  const open = !!props.open;
  const setOpen = props.setOpen || (() => {});
  const [rawText, setRawText] = window.React.useState('');
  const [kind, setKind] = window.React.useState('Email');
  const [showGear, setShowGear] = window.React.useState(false);
  const [apiKey, setApiKey] = window.React.useState(() => { try { return localStorage.getItem('OPENROUTER_API_KEY') || ''; } catch (e) { return ''; } });
  const [model, setModel] = window.React.useState(() => { try { return localStorage.getItem('OPENROUTER_MODEL') || 'anthropic/claude-3-haiku'; } catch (e) { return 'anthropic/claude-3-haiku'; } });
  const [parkMsg, setParkMsg] = window.React.useState('');
  const [processing, setProcessing] = window.React.useState(false);
  const [parsedReviewQueue, setParsedReviewQueue] = window.React.useState([]);
  const [approving, setApproving] = window.React.useState(false);
  // Black-hole fix: App.js passes staged items via props but never wires onRun.
  // Mirror any incoming staged prop into the contributor review queue so
  // "Staged N clipboard item(s)" always renders in CONTRIBUTOR PARSER REVIEW.
  const queueHas = (id) => (Array.isArray(parsedReviewQueue) ? parsedReviewQueue.some((c) => c && String(c.sourceId || c.id || '') === String(id || '')) : false);
  window.React.useEffect(() => {
    try {
      const incoming = Array.isArray(staged) ? staged : [];
      if (!incoming.length) return;
      const mapped = incoming.filter((s) => s && !queueHas(s.id)).map((s) => ({
        sourceId: s.id, projectId: s.projectId || canonicalProjectId,
        project_name: s.project_name || (project && project.project_name) || '',
        Project_ReferenceID: s.Project_ReferenceID || (project && project.Project_ReferenceID) || '',
        type: s.type || 'Scrape', source: s.source || 'Staged Clipboard',
        timestamp: s.timestamp || 'Just now', content: s.content || s.detail || '',
        piiStatus: s.piiStatus || 'Clean', title: s.title || String(s.content || '').slice(0, 80) || 'Staged fragment',
        synthesizedText: s.synthesizedText || s.content || '', tags: s.tags || [],
        impactScore: (typeof s.impactScore === 'number') ? s.impactScore : 0.7,
        mergeHint: s.mergeHint || '', structured: (s.structured && typeof s.structured === 'object') ? s.structured : {},
        privacy: s.privacy || 'Team Shared', smartAppend: s.smartAppend || null,
      }));
      if (mapped.length) { setParsedReviewQueue((prev) => (Array.isArray(prev) ? prev : []).concat(mapped)); setParkMsg('Staged ' + mapped.length + ' item(s) ready for review below.'); }
    } catch (e) {}
  }, [staged && staged.length]);
  const metaClient = (project && project.client_name) || (clientMeta && clientMeta.account_name) || '—';
  const metaProject = (project && project.project_name) || '—';
  const metaOpp = (project && (project.opportunity_numbers || [])[0]) || '—';
  const metaKw = ((clientMeta && clientMeta.keywords) || []).join(', ') || '—';
  const canonicalProjectId = project ? String(project.project_name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-') : '';
  // Bookmarklet clipboard wiring (offline-resilient, same pending_processing flow as Data Park):
  // - Stage clipboard: push parsed clipboard JSON (or raw text) into pending_processing
  // - Run Harvester & Refine: processWithAI(clipboardText) -> parsedReviewQueue
  const parseClipboardItems = () => {
    const raw = String(clip || '').trim();
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      return arr.filter((o) => o && typeof o === 'object');
    } catch (e) {
      return [{ content: raw }];
    }
  };
  const buildClipboardPayload = (o, idx) => {
    const src = (o && typeof o === 'object') ? o : {};
    const text = String(src.content || src.detail || src.synthesizedText || src.title || clip || '').trim();
    const screened = piiScreen(text);
    const persona = props.activePersona || 'Brené';
    return {
      id: String(src.id || ('clip-' + Date.now() + '-' + idx + '-' + Math.floor(Math.random() * 10000))),
      projectId: String(src.projectId || canonicalProjectId || ''),
      project_name: String(src.project_name || (project && project.project_name) || ''),
      Project_ReferenceID: String(src.Project_ReferenceID || (project && project.Project_ReferenceID) || ''),
      type: String(src.type || 'Scrape'),
      title: String(src.title || text.slice(0, 80) || 'Bookmarklet scrape'),
      source: String(src.source || 'Bookmarklet Clipboard'),
      timestamp: String(src.timestamp || 'Just now'),
      content: screened.text,
      piiStatus: String(src.piiStatus || screened.flag || 'Clean'),
      syncStatus: 'pending_processing',
      author: src.author || persona,
      contributor: src.contributor || persona,
    };
  };
  const onStageClipboard = async () => {
    const raw = String(clip || '').trim();
    if (!raw) { setParkMsg('Paste the bookmarklet clipboard string first.'); return; }
    if (!project) { setParkMsg('Select a project first so the clipboard knows the anchor.'); return; }
    try {
      const items = parseClipboardItems();
      if (!items.length) { setParkMsg('Clipboard is empty — nothing to stage.'); return; }
      const api = dbApi();
      let n = 0;
      for (let i = 0; i < items.length; i++) {
        const payload = buildClipboardPayload(items[i], i);
        if (api && api.stageToDataPark) await api.stageToDataPark(payload);
        n++;
      }
      setParkMsg('Staged ' + n + ' clipboard item(s) to Data Park (pending_processing).');
    } catch (e) { setParkMsg('Clipboard stage failed locally: ' + String((e && e.message) || e)); }
  };
  const onRunClipboardHarvest = async () => {
    const raw = String(clip || '').trim();
    if (!raw) { setParkMsg('Paste the bookmarklet clipboard string first.'); return; }
    if (processing) return;
    setProcessing(true);
    setParkMsg('Harvester running on clipboard…');
    try {
      const items = parseClipboardItems();
      if (!items.length) { setParkMsg('Clipboard is empty — nothing to refine.'); setProcessing(false); return; }
      const out = [];
      for (let i = 0; i < items.length; i++) {
        const payload = buildClipboardPayload(items[i], i);
        const text = payload.content || payload.title || '';
        const ai = await processWithAI(text, payload.type || 'Scrape');
        const clipStagedTitle = payload.title || (text || '').slice(0, 80) || 'Bookmarklet scrape';
        const clipSmartAppend = buildSmartAppendFor(text + ' ' + clipStagedTitle, clipStagedTitle, ai, text);
        out.push({
          sourceId: payload.id,
          projectId: payload.projectId || canonicalProjectId,
          project_name: payload.project_name || (project && project.project_name) || '',
          Project_ReferenceID: payload.Project_ReferenceID || (project && project.Project_ReferenceID) || '',
          type: payload.type || 'Scrape',
          source: payload.source || 'Bookmarklet Clipboard',
          timestamp: payload.timestamp || 'Just now',
          content: payload.content || '',
          piiStatus: payload.piiStatus || 'Clean',
          title: clipStagedTitle,
          synthesizedText: (ai && ai.synthesizedText) || '',
          tags: (ai && ai.tags) || [],
          impactScore: (ai && typeof ai.impactScore === 'number') ? ai.impactScore : 0.7,
          mergeHint: (ai && ai.mergeHint) || '',
          structured: (ai && ai.structured && typeof ai.structured === 'object') ? ai.structured : {},
          privacy: clipSmartAppend ? 'My Notes (Private)' : ((ai && ai.privacy) ? ai.privacy : 'Team Shared'),
          smartAppend: clipSmartAppend,
          author: payload.author || props.activePersona || 'Brené',
          contributor: payload.contributor || props.activePersona || 'Brené',
        });
        try {
          const api = dbApi();
          if (api && api.stageToDataPark) await api.stageToDataPark(payload);
        } catch (e2) {}
      }
      setParsedReviewQueue((prev) => (Array.isArray(prev) ? prev : []).concat(out));
      setParkMsg('Harvester refined ' + out.length + ' clipboard card(s) — ready for review below.');
    } catch (e) { setParkMsg('Harvester failed: ' + String((e && e.message) || e)); }
    setProcessing(false);
  };
  const saveKey = () => {
    try {
      localStorage.setItem('OPENROUTER_API_KEY', String(apiKey || '').trim());
      localStorage.setItem('OPENROUTER_MODEL', String(model || 'anthropic/claude-3-haiku').trim() || 'anthropic/claude-3-haiku');
      setParkMsg('API key saved locally. Live AI mode enabled.');
    } catch (e) { setParkMsg('Could not save key (storage blocked). Mock mode continues.'); }
  };
  const onStage = async () => {
    const v = String(rawText || '').trim();
    if (!v) { setParkMsg('Paste or type raw text first.'); return; }
    if (!project) { setParkMsg('Select a project first so Data Park knows the anchor.'); return; }
    const screened = piiScreen(v);
    const payload = {
      id: 'dp-' + Date.now() + '-' + Math.floor(Math.random() * 10000),
      projectId: canonicalProjectId,
      project_name: project.project_name,
      Project_ReferenceID: project.Project_ReferenceID,
      type: kind,
      title: v.slice(0, 80) || (kind + ' fragment'),
      source: 'Data Park Dropzone',
      timestamp: 'Just now',
      content: screened.text,
      piiStatus: screened.flag,
      syncStatus: 'pending_processing',
      author: props.activePersona || 'Brené',
      contributor: props.activePersona || 'Brené',
    };
    try {
      const api = dbApi();
      if (api && api.stageToDataPark) await api.stageToDataPark(payload);
      setRawText('');
      setParkMsg('Staged to Data Park (pending_processing).');
    } catch (e) { setParkMsg('Stage failed locally: ' + String((e && e.message) || e)); }
  };
  const onProcess = async () => {
    if (processing) return;
    setProcessing(true);
    setParkMsg('AI engine running…');
    try {
      const api = dbApi();
      let pending = [];
      try { pending = api && api.listPendingProcessing ? await api.listPendingProcessing() : []; } catch (e) { pending = []; }
      let mine = (pending || []).filter((t) => !project || t.project_name === project.project_name || t.projectId === canonicalProjectId);
      // FIX: never leave review queue empty — if filter removed everything (projectId mismatch),
      // fall back to ANY pending, then to staged prop, then to rawText so the review box always populates.
      if (!mine.length && (pending || []).length) mine = pending.slice();
      if (!mine.length && Array.isArray(staged) && staged.length) mine = staged.slice();
      if (!mine.length && String(rawText || '').trim()) {
        mine = [{ id: 'dp-direct-' + Date.now(), projectId: canonicalProjectId, project_name: (project && project.project_name) || '', Project_ReferenceID: (project && project.Project_ReferenceID) || '', type: kind, title: String(rawText).slice(0, 80), source: 'Data Park Dropzone', timestamp: 'Just now', content: String(rawText), piiStatus: 'Clean', syncStatus: 'pending_processing' }];
      }
      if (!mine.length) { setParkMsg('No pending_processing items — stage text to Data Park first.'); setProcessing(false); return; }
      const out = [];
      for (const item of mine) {
        const text = item.content || item.detail || item.title || '';
        const ai = await processWithAI(text, item.type || kind);
        const stagedTitle = item.title || (text || '').slice(0, 80) || ((item.type || kind) + ' fragment');
        // --- Harvester Smart Append (Entity Resolution, pure-offline heuristic) ---
        // Evaluate existing Status Cards for contextual overlap (ref IDs, identical
        // entities/topics). Match -> stage an UPDATE to the matched card (append as
        // horizontal RAW/AI nodes on its timeline strip, private/pending review).
        // No match -> stage as a new card in the review queue as usual.
        const smartAppend = buildSmartAppendFor(text + ' ' + stagedTitle, stagedTitle, ai, text);
        // Contributor Parser Review: stage AI output for human review/edit
        // instead of directly committing via markProcessed.
        out.push({
          sourceId: item.id,
          projectId: item.projectId || canonicalProjectId,
          project_name: item.project_name || (project && project.project_name) || '',
          Project_ReferenceID: item.Project_ReferenceID || (project && project.Project_ReferenceID) || '',
          type: item.type || kind,
          source: item.source || 'Data Park Dropzone',
          timestamp: item.timestamp || 'Just now',
          content: item.content || item.detail || '',
          piiStatus: item.piiStatus || 'Clean',
          title: stagedTitle,
          synthesizedText: (ai && ai.synthesizedText) || '',
          tags: (ai && ai.tags) || [],
          impactScore: (ai && typeof ai.impactScore === 'number') ? ai.impactScore : 0.7,
          mergeHint: (ai && ai.mergeHint) || '',
          structured: (ai && ai.structured && typeof ai.structured === 'object') ? ai.structured : {},
          privacy: smartAppend ? 'My Notes (Private)' : ((ai && ai.privacy) ? ai.privacy : 'Team Shared'),
          smartAppend: smartAppend,
          author: item.author || props.activePersona || 'Brené',
          contributor: item.contributor || props.activePersona || 'Brené',
        });
      }
      setParsedReviewQueue(out);
      const nAppend = out.filter((c) => c && c.smartAppend).length;
      const nNew = out.length - nAppend;
      setParkMsg('AI parsing complete: ' + out.length + ' card(s) ready for review below.' + (nAppend ? ' Smart Append: ' + nAppend + ' matched existing card(s) — will append as private pending-review nodes; ' + nNew + ' new.' : ''));
    } catch (e) { setParkMsg('AI processing failed: ' + String((e && e.message) || e)); }
    setProcessing(false);
  };
  const updateReviewCard = (idx, patch) => {
    setParsedReviewQueue((prev) => (Array.isArray(prev) ? prev : []).map((c, i) => (i === idx ? Object.assign({}, c, patch) : c)));
  };
  const discardReviewCard = (idx) => {
    setParsedReviewQueue((prev) => (Array.isArray(prev) ? prev : []).filter((_, i) => i !== idx));
    setParkMsg('Discarded noisy card from review queue.');
  };
  const setReviewPrivacyAndSave = (idx, nextPrivacy) => {
    // Automatic save on toggle: Fail Closed default is Team Shared; flipping
    // to My Notes (Private) caches instantly to browser local space so the
    // reviewed payload is never lost before Approve. Final persistence to
    // FailoverDB happens in onApproveAll (offline-safe via Failover Repository).
    const cur = Array.isArray(parsedReviewQueue) ? parsedReviewQueue.slice() : [];
    const next = cur.map((c, i) => (i === idx ? Object.assign({}, c, { privacy: nextPrivacy }) : c));
    setParsedReviewQueue(next);
    try {
      const saved = next[idx];
      if (saved) {
        try { localStorage.setItem('onion_review_draft_' + String(saved.sourceId || idx), JSON.stringify(saved)); } catch (e2) {}
        try { localStorage.setItem('onion_review_queue', JSON.stringify(next)); } catch (e3) {}
      }
    } catch (e) {}
    setParkMsg(nextPrivacy === 'My Notes (Private)' ? 'Saved to My Notes (Private) — local draft updated.' : 'Visibility set to Team Shared — local draft updated.');
  };
  const onApproveAll = async () => {
    if (approving) return;
    const queue = Array.isArray(parsedReviewQueue) ? parsedReviewQueue : [];
    if (!queue.length) { setParkMsg('Review queue is empty — nothing to approve.'); return; }
    setApproving(true);
    setParkMsg('Approving reviewed cards…');
    try {
      const api = dbApi();
      let done = 0; let appended = 0;
      for (const card of queue) {
        // Smart Append path: do NOT create a new standalone card. Stage an update
        // to the existing matched card by appending RAW/AI nodes on its timeline
        // strip (marked private/pending review) via pure-offline FailoverDB.
        if (card && card.smartAppend && card.smartAppend.targetCardId) {
          let ok = false;
          if (api && api.smartAppendToCard) {
            const updated = await api.smartAppendToCard(
              card.smartAppend.targetCardId,
              { kind: 'RAW', text: String(card.content || card.synthesizedText || card.title || '') },
              { kind: 'AI', text: String(card.synthesizedText || card.content || card.title || '') },
              { title: card.title, source: card.source, reasons: card.smartAppend.matchReasons, score: card.smartAppend.matchScore, stagedId: card.sourceId }
            );
            ok = !!updated;
          }
          if (ok) { appended++; done++; continue; }
          // Fall through to normal new-card path if append target is missing.
        }
        const aiResult = {
          title: card.title,
          synthesizedText: card.synthesizedText,
          tags: card.tags,
          impactScore: card.impactScore,
          mergeHint: card.mergeHint,
          structured: card.structured,
          privacy: card.privacy || 'Team Shared',
        };
        if (api && api.markProcessed) await api.markProcessed(card.sourceId, aiResult);
        done++;
      }
      setParsedReviewQueue([]);
      setParkMsg('Approved ' + done + ' card(s) ✅' + (appended ? ' — Smart Append merged ' + appended + ' update(s) into existing card timeline(s) as private pending-review nodes.' : ' — added to project.'));
      try { window.dispatchEvent(new CustomEvent('onion:db-update', { detail: { at: new Date().toISOString() } })); } catch (e) {}
    } catch (e) { setParkMsg('Approve failed: ' + String((e && e.message) || e)); }
    setApproving(false);
  };
  const onResetSeed = async () => {
    setParkMsg('Resetting to hackathon demo data…');
    try {
      const api = dbApi();
      if (api && api.resetToSeedData) await api.resetToSeedData();
      else {
        try {
          const mod = await import('../core/FailoverDB.js');
          if (mod && mod.resetToSeedData) await mod.resetToSeedData();
        } catch (e2) {}
      }
      setParsedReviewQueue([]);
      setParkMsg('Demo data restored ✅ — fresh test data loaded.');
    } catch (e) { setParkMsg('Reset failed: ' + String((e && e.message) || e)); }
  };
  return html`<div>
    <button id="harvester-open-btn" type="button" onClick=${() => setOpen(true)}>🛸 Open Harvester Control</button>
    <div id="harvester-backdrop" className=${open ? 'open' : ''} onClick=${() => setOpen(false)}></div>
    <aside id="harvester-control-panel" aria-label="Harvester Control Center" className=${open ? 'open' : ''}>
      <div style=${{ display: 'flex', alignItems: 'center', gap: '8px', padding: '14px', borderBottom: '1px solid #E5E7EB' }}><div style=${{ fontWeight: 800, fontSize: '15px' }}>Harvester Control Center</div><button id="harvester-close-btn" type="button" onClick=${() => setOpen(false)} style=${{ marginLeft: 'auto', background: '#fff', border: '1px solid #CBD5E1', borderRadius: '9999px', width: '30px', height: '30px', cursor: 'pointer' }}>✕</button></div>
      <div className="hcp-scroll"><div id="harvester-target-headline" style=${{ fontSize: '12px', fontWeight: 700 }}>Targeting Ingestion for: ${metaProject}</div>
        <div className="hcp-card"><div className="hcp-label">Scope Monitor L1/L2</div><div style=${{ fontSize: '12px' }}>Client: <b>${metaClient}</b> | Project: <b>${metaProject}</b></div><div style=${{ fontSize: '12px' }}>Opp: <b>${metaOpp}</b></div><div style=${{ fontSize: '11px' }}>Keywords: <span>${metaKw}</span></div></div>
        <div className="hcp-card"><div className="hcp-label">API Delta Scan Window (Outlook/Teams/GDP Status)</div><div style=${{ display: 'flex', gap: '8px' }}><input type="date" id="harvester-delta-from" value=${from} onInput=${(e) => setFrom(e.target.value)} /><input type="date" id="harvester-delta-to" value=${to} onInput=${(e) => setTo(e.target.value)} /></div></div>
        <div className="hcp-card"><div className="hcp-label">Drop Weekly GDP Tracker Spreadsheet</div><div className="hcp-drop">Drop Weekly GDP Tracker Spreadsheet here or click to browse<input type="file" accept=".xlsx,.xls,.csv" style=${{ display: 'none' }} onChange=${props.onGdpFile} /></div></div>
        <div className="hcp-card"><div className="hcp-label">Drop Project RAID Log Spreadsheet</div><div className="hcp-drop">Drop Project RAID Log Spreadsheet here or click to browse<input type="file" accept=".xlsx,.xls,.csv" style=${{ display: 'none' }} onChange=${props.onRaidFile} /></div></div>
        <div className="hcp-card"><div className="hcp-label">Paste Bookmarklet Clipboard String</div><textarea id="harvester-clipboard" rows="4" value=${clip} onInput=${(e) => setClip(e.target.value)} placeholder="Paste Bookmarklet JSON string"></textarea><div style=${{ fontSize: '10px', fontStyle: 'italic', color: '#6b7280' }}>Click the Continuum Bookmarklet button on a live Salesforce or GDP tab, then paste the string here.</div><div style=${{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}><button type="button" onClick=${(e) => { if (props.onClip) props.onClip(e); return onStageClipboard(); }} className="px-3 py-1 rounded-full bg-white border text-[11px]">Stage clipboard</button><button type="button" disabled=${processing} onClick=${(e) => { if (props.onRun) props.onRun(e); return onRunClipboardHarvest(); }} className="px-3 py-1 rounded-full bg-black text-white text-[11px]">${processing ? 'Harvester running…' : 'Run Harvester & Refine'}</button></div></div>
        <div className="hcp-card"><div className="hcp-label">Staged (${staged.length})</div>${staged.map((s) => html`<div key=${s.id} className="text-[11px] italic text-[#64748B]">${s.title} [${s.piiStatus}]</div>`)}</div>
        <button id="harvester-run-btn" type="button" onClick=${(e) => { if (props.onRun) return props.onRun(e); return onProcess(); }}>Run Harvest and Refine</button>
        <div id="harvester-status" style=${{ fontSize: '11px', minHeight: '16px' }}>${status}</div>
        <div className="hcp-card" style=${{ borderColor: '#bfdbfe', background: '#f0f7ff' }}>
          <div className="hcp-label" style=${{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>🅿️ Data Park Dropzone — Step 1</span>
            <button type="button" onClick=${() => setShowGear((v) => !v)} title="AI configuration" style=${{ marginLeft: 'auto', background: '#fff', border: '1px solid #bfdbfe', borderRadius: '9999px', width: '26px', height: '26px', cursor: 'pointer' }}>⚙️</button>
          </div>
          ${showGear ? html`<div style=${{ marginTop: '8px', padding: '8px', background: '#fff', border: '1px solid #bfdbfe', borderRadius: '8px' }}>
            <div style=${{ fontSize: '11px', fontWeight: 700 }}>OpenRouter API Key (stored in localStorage only)</div>
            <input type="password" value=${apiKey} onInput=${(e) => setApiKey(e.target.value)} placeholder="sk-or-v1-…" style=${{ width: '100%', marginTop: '6px', background: '#f9fafb', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '6px 8px', fontSize: '12px' }} />
            <input value=${model} onInput=${(e) => setModel(e.target.value)} placeholder="anthropic/claude-3-haiku" style=${{ width: '100%', marginTop: '6px', background: '#f9fafb', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '6px 8px', fontSize: '12px' }} />
            <div style=${{ marginTop: '6px', display: 'flex', gap: '6px' }}>
              <button type="button" onClick=${saveKey} className="px-3 py-1 rounded-full bg-white border text-[11px]">Save key</button>
              <button type="button" onClick=${() => { try { localStorage.removeItem('OPENROUTER_API_KEY'); } catch (e) {} setApiKey(''); setParkMsg('Key cleared — Mock mode active.'); }} className="px-3 py-1 rounded-full bg-white border text-[11px]">Clear (use Mock)</button>
            </div>
            <div style=${{ fontSize: '10px', fontStyle: 'italic', color: '#6b7280', marginTop: '4px' }}>No key → 1.2s simulated latency + mock JSON so the demo never fails.</div>
            <button type="button" onClick=${onResetSeed} title="Clear local cache and reload hackathon seed" style=${{ marginTop: '8px', width: '100%', background: '#FDE8F0', border: '1px solid #F5C2D8', color: '#831843', borderRadius: '9999px', padding: '6px 10px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>↺ Reset to Hackathon Demo Data</button>
          </div>` : null}
          <div style=${{ display: 'flex', gap: '6px', marginTop: '8px' }}>
            <select value=${kind} onChange=${(e) => setKind(e.target.value)} style=${{ background: '#fff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '6px 8px', fontSize: '12px' }}>
              ${['Email', 'Excel', 'Scrape', 'Chat'].map((t) => html`<option key=${t} value=${t}>${t}</option>`)}
            </select>
            <span style=${{ fontSize: '11px', color: apiKey && String(apiKey).trim() ? '#065F46' : '#92400E', alignSelf: 'center' }}>${apiKey && String(apiKey).trim() ? '● Live AI' : '● Mock AI'}</span>
          </div>
          <textarea id="datapark-raw" rows="6" value=${rawText} onInput=${(e) => setRawText(e.target.value)} placeholder="Paste raw harvest text here (emails, RAID rows, chat excerpts)…" style=${{ width: '100%', marginTop: '8px', background: '#fff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '8px', fontSize: '12px' }}></textarea>
          <div style=${{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
            <button type="button" onClick=${onStage} className="px-3 py-1.5 rounded-full bg-white border border-[#bfdbfe] text-[12px] font-medium">Stage to Data Park</button>
            <button type="button" disabled=${processing} onClick=${onProcess} className="px-3 py-1.5 rounded-full bg-black text-white text-[12px] font-medium">${processing ? 'AI engine running...' : 'Run AI Processing Engine'}</button>
          </div>
          <div style=${{ fontSize: '11px', minHeight: '16px', marginTop: '6px', fontStyle: 'italic', color: '#1e40af' }}>${parkMsg}</div>
        </div>
        ${Array.isArray(parsedReviewQueue) && parsedReviewQueue.length ? html`<div className="hcp-card" style=${{ borderColor: '#c4b5fd', background: '#f5f3ff' }}>
          <div className="hcp-label">Contributor Parser Review (${parsedReviewQueue.length}) — review, edit, set privacy, then approve</div>
          <div style=${{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
            ${parsedReviewQueue.map((c, idx) => html`<div key=${String(c.sourceId || '') + '-' + idx} style=${{ background: '#fff', border: '1px solid #ddd6fe', borderRadius: '10px', padding: '8px' }}>
              <div style=${{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style=${{ fontSize: '10px', fontWeight: 800, background: '#ede9fe', border: '1px solid #c4b5fd', color: '#5b21b6', borderRadius: '9999px', padding: '1px 8px' }}>impact ${(typeof c.impactScore === 'number' ? c.impactScore.toFixed(2) : '0.70')}</span>
                <span style=${{ fontSize: '10px', color: '#6b7280' }}>${(Array.isArray(c.tags) ? c.tags : []).join(' ') || '#Auto_Tagged'}</span>
                <button type="button" title="Discard noisy card" onClick=${() => discardReviewCard(idx)} style=${{ marginLeft: 'auto', background: '#fff', border: '1px solid #fecaca', borderRadius: '9999px', width: '24px', height: '24px', cursor: 'pointer', fontSize: '12px' }}>🗑️</button>
              </div>
              ${c.smartAppend ? html`<div style=${{ marginTop: '6px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '8px', padding: '6px 8px', fontSize: '10px', color: '#92400e' }}>🔗 <b>Smart Append match</b> → “${String(c.smartAppend.targetCardTitle || '').slice(0, 60)}” <span style=${{ color: '#6b7280' }}>(${(c.smartAppend.matchReasons || []).join(' · ') || 'contextual overlap'} · score ${c.smartAppend.matchScore})</span><br/>On approve: appends as horizontal <b>RAW/AI</b> nodes on that card’s timeline strip — staged <b>private / pending review</b>, no new standalone card.</div>` : html`<div style=${{ marginTop: '6px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '6px 8px', fontSize: '10px', color: '#065f46' }}>✨ <b>New card</b> — no contextual overlap found; will stage as a new card on approve.</div>`}
              <div style=${{ fontSize: '10px', fontWeight: 700, marginTop: '6px', color: '#4c1d95' }}>Title</div>
              <input value=${c.title} onInput=${(e) => updateReviewCard(idx, { title: e.target.value })} style=${{ width: '100%', marginTop: '2px', background: '#f9fafb', border: '1px solid #c4b5fd', borderRadius: '8px', padding: '6px 8px', fontSize: '12px' }} />
              <div style=${{ fontSize: '10px', fontWeight: 700, marginTop: '6px', color: '#4c1d95' }}>Synthesized text</div>
              <textarea rows="3" value=${c.synthesizedText} onInput=${(e) => updateReviewCard(idx, { synthesizedText: e.target.value })} style=${{ width: '100%', marginTop: '2px', background: '#f9fafb', border: '1px solid #c4b5fd', borderRadius: '8px', padding: '6px 8px', fontSize: '12px' }}></textarea>
              <div style=${{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                <button type="button" onClick=${() => setReviewPrivacyAndSave(idx, 'My Notes (Private)')} style=${{ flex: 1, borderRadius: '9999px', padding: '5px 8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', background: c.privacy === 'My Notes (Private)' ? '#111827' : '#fff', color: c.privacy === 'My Notes (Private)' ? '#fff' : '#111827', border: '1px solid #111827' }}>🔒 Private (Only Me)</button>
                <button type="button" onClick=${() => setReviewPrivacyAndSave(idx, 'Team Shared')} style=${{ flex: 1, borderRadius: '9999px', padding: '5px 8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', background: c.privacy === 'Team Shared' ? '#111827' : '#fff', color: c.privacy === 'Team Shared' ? '#fff' : '#111827', border: '1px solid #111827' }}>👥 Team Shared</button>
              </div>
            </div>`)}
          </div>
          <button type="button" disabled=${approving} onClick=${onApproveAll} style=${{ marginTop: '10px', width: '100%', background: '#111827', color: '#fff', borderRadius: '9999px', padding: '8px 10px', fontSize: '12px', fontWeight: 800, cursor: 'pointer' }}>${approving ? 'Approving…' : '✅ Approve & Add to Project (' + parsedReviewQueue.length + ')'}</button>
        </div>` : null}

      </div>
    </aside>
  </div>`;
}
