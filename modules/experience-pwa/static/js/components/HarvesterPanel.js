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
export function toPayload(o) {
  return { id: o.id, projectId: o.projectId, type: o.type, title: o.title, source: o.source, timestamp: o.timestamp || 'Just now', content: o.content, piiStatus: o.piiStatus || 'Clean', syncStatus: 'pending_upload' };
}
function dbApi() {
  try { if (typeof window !== 'undefined' && window.OnionDB) return window.OnionDB; } catch (e) {}
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
  const metaClient = (project && project.client_name) || (clientMeta && clientMeta.account_name) || '—';
  const metaProject = (project && project.project_name) || '—';
  const metaOpp = (project && (project.opportunity_numbers || [])[0]) || '—';
  const metaKw = ((clientMeta && clientMeta.keywords) || []).join(', ') || '—';
  const canonicalProjectId = project ? String(project.project_name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-') : '';
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
      const pending = api && api.listPendingProcessing ? await api.listPendingProcessing() : [];
      const mine = (pending || []).filter((t) => !project || t.project_name === project.project_name || t.projectId === canonicalProjectId);
      if (!mine.length) { setParkMsg('No pending_processing items for this project.'); setProcessing(false); return; }
      const out = [];
      for (const item of mine) {
        const text = item.content || item.detail || item.title || '';
        const ai = await processWithAI(text, item.type || kind);
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
          title: item.title || (text || '').slice(0, 80) || ((item.type || kind) + ' fragment'),
          synthesizedText: (ai && ai.synthesizedText) || '',
          tags: (ai && ai.tags) || [],
          impactScore: (ai && typeof ai.impactScore === 'number') ? ai.impactScore : 0.7,
          mergeHint: (ai && ai.mergeHint) || '',
          structured: (ai && ai.structured && typeof ai.structured === 'object') ? ai.structured : {},
          privacy: (ai && ai.privacy) ? ai.privacy : 'Team Shared',
        });
      }
      setParsedReviewQueue(out);
      setParkMsg('AI parsing complete: ' + out.length + ' card(s) ready for review below.');
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
      let done = 0;
      for (const card of queue) {
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
      setParkMsg('Approved & added ' + done + ' card(s) to project ✅');
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
        <div className="hcp-card"><div className="hcp-label">Paste Bookmarklet Clipboard String</div><textarea id="harvester-clipboard" rows="4" value=${clip} onInput=${(e) => setClip(e.target.value)} placeholder="Paste Bookmarklet JSON string"></textarea><div style=${{ fontSize: '10px', fontStyle: 'italic', color: '#6b7280' }}>Click the Continuum Bookmarklet button on a live Salesforce or GDP tab, then paste the string here.</div><button onClick=${props.onClip} className="px-3 py-1 rounded-full bg-white border text-[11px]">Stage clipboard</button></div>
        <div className="hcp-card"><div className="hcp-label">Staged (${staged.length})</div>${staged.map((s) => html`<div key=${s.id} className="text-[11px]">${s.title} [${s.piiStatus}]</div>`)}</div>
        <button id="harvester-run-btn" type="button" onClick=${props.onRun}>🔥 Run Harvest &amp; Refine</button>
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
            <button type="button" disabled=${processing} onClick=${onProcess} className="px-3 py-1.5 rounded-full bg-black text-white text-[12px] font-medium">${processing ? 'AI engine running…' : '⚡ Run AI Processing Engine'}</button>
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
