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
      let done = 0;
      for (const item of mine) {
        const text = item.content || item.detail || item.title || '';
        const ai = await processWithAI(text, item.type || kind);
        if (api && api.markProcessed) await api.markProcessed(item.id, ai);
        done++;
      }
      setParkMsg('AI processing complete: ' + done + ' item(s) → processed.');
    } catch (e) { setParkMsg('AI processing failed: ' + String((e && e.message) || e)); }
    setProcessing(false);
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

      </div>
    </aside>
  </div>`;
}
