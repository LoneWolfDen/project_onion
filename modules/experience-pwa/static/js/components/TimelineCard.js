// TimelineCard — Status Cards feed (rich independent blocks) + YOUR NOTES.
// Key Moments compact list lives in AppCenter.js to match high-fidelity design.
import { calcConfidence } from '../core/confidence.js';
import { piiScreen } from '../core/PiiGate.js';
const html = window.htm.bind(window.React.createElement);
export function matchRef(t, p) {
  if (!t || !p) return false;
  return t.Project_ReferenceID === p.Project_ReferenceID || t.project_name === p.project_name || t.projectId === p.project_name;
}
function categoryFor(m) {
  const tags = Array.isArray(m && m.tags) ? m.tags.map((x) => String(x || '').toLowerCase()) : [];
  const hay = [(m && m.title) || '', (m && m.detail) || '', (m && m.synthesizedText) || '', (m && m.content) || '', (m && m.type) || '', (m && m.source) || ''].join(' ').toLowerCase();
  const tagStr = tags.join(' ');
  if (tagStr.indexOf('risk') >= 0 || hay.indexOf('risk') >= 0 || hay.indexOf('blocked') >= 0 || hay.indexOf('blocker') >= 0 || hay.indexOf('depleted') >= 0 || hay.indexOf('delayed') >= 0 || hay.indexOf('failed') >= 0) return 'Risks';
  if (hay.indexOf('health') >= 0 || hay.indexOf('on track') >= 0) return 'Health';
  if (hay.indexOf('decision') >= 0 || hay.indexOf('scope revised') >= 0) return 'Decisions';
  if (hay.indexOf('alignment') >= 0 || hay.indexOf('budget approved') >= 0) return 'Alignments';
  return 'Status';
}
function categoryPill(label) {
  if (label === 'Risks') return 'bg-red-50 text-red-600 border-red-100';
  if (label === 'Health') return 'bg-green-50 text-green-700 border-green-100';
  if (label === 'Decisions') return 'bg-[#FFF2E8] border-[#FFC9A8] text-[#7A3E1F]';
  if (label === 'Alignments') return 'bg-[#F0E6FF] border-[#D9C7FF] text-[#5B2EBF]';
  return 'bg-blue-50 text-blue-600 border-blue-100';
}
function ageDotColor(age) {
  const a = String(age || '').toLowerCase();
  if (a.indexOf('just now') >= 0 || a.indexOf('h ago') >= 0 || a.indexOf('hour') >= 0 || a.indexOf('2 days old') >= 0 || a.indexOf('2d ago') >= 0) return '#22C55E';
  if (a.indexOf('yesterday') >= 0 || a.indexOf('d ago') >= 0 || a.indexOf('day') >= 0 || a.indexOf('week') >= 0) return '#F59E0B';
  if (!a) return '#9CA3AF';
  return '#22C55E';
}
function initialsFor(author) {
  const raw = String(author || '').trim();
  if (!raw) return 'U';
  const parts = raw.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  const w = parts[0];
  if (w.length === 1) return w.toUpperCase();
  return w[0].toUpperCase();
}
function iconForSource(src) {
  var s = String(src || '').toLowerCase();
  if (s.indexOf('outlook') >= 0 || s.indexOf('mail') >= 0 || s.indexOf('email') >= 0) return '✉️';
  if (s.indexOf('raid') >= 0 || s.indexOf('excel') >= 0 || s.indexOf('tracker') >= 0 || s.indexOf('jira') >= 0) return '📊';
  if (s.indexOf('teams') >= 0 || s.indexOf('chat') >= 0) return '💬';
  if (s.indexOf('gdp') >= 0 || s.indexOf('status') >= 0) return '📈';
  return '📄';
}
function miniTimelineFor(m) {
  if (m && Array.isArray(m.timeline) && m.timeline.length) return m.timeline.slice(0, 6).map((t) => ({
    kind: String((t && t.kind) || 'EV').toUpperCase(),
    label: String((t && t.label) || (t && t.kind) || ''),
    stagedAppend: !!(t && t.stagedAppend),
  }));
  if (m && Array.isArray(m.nodes) && m.nodes.length) return m.nodes.slice(0, 6).map((n) => ({
    kind: String((n && n.kind) || 'EV').toUpperCase(),
    label: String((n && n.text) || (n && n.kind) || '').slice(0, 28) || String((n && n.kind) || ''),
    stagedAppend: !!(n && n.stagedAppend),
  }));
  var srcs = [];
  if (m && m.source) srcs.push(String(m.source));
  if (m && m.type && String(m.type) !== String(m.source)) srcs.push(String(m.type));
  var out = srcs.filter(Boolean).slice(0, 3).map((s) => ({ kind: String(s).slice(0, 2).toUpperCase(), label: s }));
  if (m && m.timestamp) out.push({ kind: String(m.timestamp).slice(0, 2).toUpperCase(), label: String(m.timestamp) });
  return out.slice(0, 4);
}
function mockPillDate(idx) {
  // Deterministic mock DDMMYYYY strings rotating per pill index (e.g. 23092026).
  const dates = ['23092026', '24092026', '25092026', '26092026', '27092026', '28092026'];
  return dates[Number(idx || 0) % dates.length];
}
function timelineStrip(m) {
  const items = miniTimelineFor(m);
  if (!items.length) return null;
  return html`<div className="mt-2 relative" title="Timeline"><div className="absolute left-0 right-0" style=${{ top: '22px', height: '2px', background: '#E6EAF2' }}></div><div className="relative flex items-stretch gap-1.5 overflow-x-auto no-scrollbar pb-1">${items.map((t, i) => {
    const ref = String(t.kind || 'EV').slice(0, 3).toUpperCase();
    return html`<span key=${String(t.kind) + '-' + i} className="flex items-stretch shrink-0"><span title=${t.label} className="inline-flex flex-col items-center justify-center rounded-[6px] border px-2 py-1" style=${{ minWidth: '52px', background: t.stagedAppend ? '#fef3c7' : '#E8F2FF', borderColor: t.stagedAppend ? '#f59e0b' : '#A8C6F0', color: '#1F4A7A', lineHeight: '1.1' }}><span className="text-[9px] font-bold">${ref}</span><span className="text-[9px] text-[#64748B]">${mockPillDate(i)}</span>${t.stagedAppend ? html`<span className="text-[9px] font-bold text-[#92400e]">private</span>` : null}</span></span>`;
  })}</div></div>`;
}
function pendingAppendsBanner(m) {
  const n = Array.isArray(m && m.pendingAppends) ? m.pendingAppends.length : 0;
  if (!n) return null;
  return html`<div className="mt-2 px-2 py-1 rounded-[8px] bg-[#fffbeb] border border-[#fcd34d] text-[10px] text-[#92400e]">🔗 Smart Append: ${n} staged update(s) appended as horizontal RAW/AI nodes — private / pending review</div>`;
}
function sourceListFor(m) {
  const out = [];
  if (m && m.source) out.push(String(m.source));
  else if (m && m.type) out.push(String(m.type));
  if (m && m.type && m.source && String(m.type) !== String(m.source)) out.push(String(m.type));
  (Array.isArray(m && m.tags) ? m.tags : []).forEach((t) => { const v = String(t || '').trim(); if (v && out.indexOf(v) < 0) out.push(v); });
  return out.filter(Boolean).slice(0, 6);
}
export function TimelineCard(props) {
  const project = props.project;
  const timeline = props.timeline || [];
  const notes = props.notes || [];
  const privacyFilter = props.privacyFilter || 'Both';
  const collapseAllTrigger = props.collapseAllTrigger || 0;
  const [openProv, setOpenProv] = window.React.useState(new Set());
  const [notesOpen, setNotesOpen] = window.React.useState(true);
  const [draft, setDraft] = window.React.useState('');
  const [noteMsg, setNoteMsg] = window.React.useState('');
  const onAddNote = async (text, privacyVal, reset) => { const v = String(text || '').trim(); if (!v || !project) return; const screened = piiScreen(v); const dbApi = (typeof window !== 'undefined' && window.OnionDB) || null; const payload = { project_name: project.project_name, Project_ReferenceID: project.Project_ReferenceID, projectId: project.project_name, original: screened.text, title: v.slice(0, 80), content: screened.text, rephrased: screened.text, privacy: privacyVal || 'Team Shared', piiStatus: screened.flag, syncStatus: 'pending_upload', author: props.activePersona || activePersona || 'Brené', refs: [], updates: [] }; try { if (!dbApi || !dbApi.saveNote) { setNoteMsg('Save failed — kept as draft'); return; } await dbApi.saveNote(payload); setNoteMsg('Saved locally (pending_upload)'); } catch (e2) { setNoteMsg('Save failed — kept as draft'); return; } if (reset) reset(''); else setDraft(''); };
  const onFlipPrivacy = async (note) => { if (!note || !note.id) return; const explicit = note.__nextPrivacy || null; const cur = String(note.__curPrivacy || note.privacy || 'Team Shared'); const next = explicit || ((cur === 'Private' || cur === 'My Notes (Private)' || cur === 'My Notes') ? 'Team Shared' : 'Private'); const dbApi = (typeof window !== 'undefined' && window.OnionDB) || null; if (dbApi && dbApi.updateNotePrivacy) { await dbApi.updateNotePrivacy(note.id, next); } };
  const onForceSyncTc = async () => { try { const a = (typeof window !== 'undefined' && window.OnionDB) || null; if (a && a.forceSync) { const r = await a.forceSync(); setNoteMsg('Force Sync: ' + (r.synced || 0) + ' item(s) synced'); } } catch (e) {} };
  const isPrivTc = (d) => { const v = String((d && d.privacy) || ''); return v === 'Private' || v === 'My Notes' || v === 'My Notes (Private)'; };
  const onEditTcNote = (d) => { try { setDraft(String(d.original || d.title || d.content || '')); } catch (e) {} };
  const tcNoteRow = (d, priv) => html`<button key=${d.id} onClick=${() => onEditTcNote(d)} title=${'Click to edit: ' + String(d.original || d.title || d.content || '')} className="w-full text-left py-1.5 border-b border-[#E6EAF2]"><div className="flex items-center gap-1 text-[12px] text-[#1E293B] truncate" style=${{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}><span className="flex-1 min-w-0 truncate">${d.original || d.title || d.content || ''}</span><span className="shrink-0 text-[#94A3B8]" title=${d.syncStatus || 'synced'}>☁️</span></div></button>`;
  const flip = (setter, id) => setter((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  // Collapse All: force-close every expanded card whenever AppCenter bumps the trigger.
  window.React.useEffect(() => { if (collapseAllTrigger) setOpenProv(new Set()); }, [collapseAllTrigger]);
  const activePersona = props.activePersona || '';
  const onProvenanceClick = () => alert('That interest to review AI optimised content for the actual source is the definition of Human in the loop! (This is test data)');
  const onMergeClick = () => alert('Merged cards — duplicates removed.');
  const focusId = props.focusId || null;
  const impactOf = (m) => {
    if (m && typeof m.impactScore === 'number') return m.impactScore;
    if (m && typeof m.impact === 'number') return m.impact > 1 ? Math.max(0, Math.min(1, m.impact / 5)) : m.impact;
    return 0.7;
  };
  const isNoise = (m) => impactOf(m) < 0.5 || String((m && m.type) || '') === 'generic_chatter';
  const allMoments = timeline.filter((t) => matchRef(t, project)).map((m) => {
    const s = piiScreen(m.synthesizedText || m.content || m.detail || '');
    const pct = calcConfidence([{ origin: m.source || m.type || 'Timeline' }], 1);
    return { raw: m, clean: s.text, flag: s.flag, pct };
  });
  const moments = allMoments.filter((d) => !isNoise(d.raw)).slice(0, 10);
  const projNotes = notes.filter((n) => matchRef(n, project)).filter((n) => {
    const pv = String(n.privacy || 'Team Shared');
    const mine = String(n.author || '') === String(activePersona || '');
    const isTeam = pv === 'Team Shared';
    const isMine = (pv === 'My Notes' || pv === 'Private' || pv === 'My Notes (Private)') && mine;
    if (!privacyFilter || privacyFilter === 'Both') return isTeam || isMine;
    if (privacyFilter === 'My Notes') return isMine;
    if (privacyFilter === 'Team Shared') return isTeam;
    return true;
  });
  const tcPrivRows = projNotes.filter((d) => isPrivTc(d)).map((d) => tcNoteRow(d, true));
  const tcTeamRows = projNotes.filter((d) => !isPrivTc(d)).map((d) => tcNoteRow(d, false));
  const renderYourNotesFallback = () => {
    if (props.hideYourNotes) return null;
    return html`<div className="rounded-[16px] bg-white border border-[#E6EAF2] shadow-sm p-4">
      <div className="flex items-center justify-between"><h3 className="font-semibold text-[13px] flex items-center gap-2">YOUR NOTES<button onClick=${onForceSyncTc} title="Flip pending_upload to synced" className="text-[10px] underline text-[#1F4A7A] font-normal">Force Sync ☁️</button></h3></div>

      ${notesOpen ? html`<div className="mt-3 space-y-3">
        <div className="flex gap-2 flex-wrap"><input value=${draft} onInput=${(e) => setDraft(e.target.value)} placeholder="Add a note..." className="flex-1 bg-white border border-[#E6EAF2] rounded-[10px] px-3 py-2 text-[12px] text-[#1E293B]" />
        <button onClick=${() => (props.onAddNote || onAddNote)(draft, 'Private', setDraft)} className="px-3 py-2 rounded-full bg-white border border-[#111827] text-[11px] font-bold" style=${{ borderRadius: '9999px', padding: '5px 12px', fontSize: '11px', fontWeight: 700, background: '#fff', color: '#111827', border: '1px solid #111827' }}>🔒 Add as Private (Only Me)</button><button onClick=${() => (props.onAddNote || onAddNote)(draft, 'Team Shared', setDraft)} className="px-3 py-2 rounded-full bg-black text-white text-[11px] font-bold" style=${{ borderRadius: '9999px', padding: '5px 12px', fontSize: '11px', fontWeight: 700, background: '#111827', color: '#fff', border: '1px solid #111827' }}>👥 Add as Team Shared</button></div>
        ${noteMsg ? html`<div className="text-[11px] italic text-[#64748B]">${noteMsg}</div>` : null}
        ${projNotes.length >= 0 ? html`<div className="mt-3 flex flex-row gap-4"><div className="flex-1 min-w-0"><div className="text-[11px] font-bold text-[#1E293B]">Private Notes (${projNotes.filter((d) => isPrivTc(d)).length})</div><div className="mt-1 max-h-[132px] overflow-y-auto no-scrollbar">${tcPrivRows.length ? tcPrivRows : html`<div className="py-1.5 text-[11px] italic text-[#64748B]">No private notes.</div>`}</div></div><div className="flex-1 min-w-0"><div className="text-[11px] font-bold text-[#1F4A7A]">Team Shared Notes (${projNotes.filter((d) => !isPrivTc(d)).length})</div><div className="mt-1 max-h-[132px] overflow-y-auto no-scrollbar">${tcTeamRows.length ? tcTeamRows : html`<div className="py-1.5 text-[11px] italic text-[#64748B]">No team notes.</div>`}</div></div></div>` : null}
        ${projNotes.length >= 0 && false ? html`<div></div>` : null}
      </div>` : null}
    </div>`;
  };
  // Rich Status Cards feed: the full privacy-filtered timeline rendered as independent
  // blocks (no vertical left-border timeline line). Key Moments stays compact in AppCenter.
  const feedCards = moments.map((d) => {
    const m = d.raw;
    const label = categoryFor(m);
    const pill = categoryPill(label);
    const age = String(m.timestamp || m.age || '');
    const dot = ageDotColor(age);
    const privacy = String(m.privacy || 'Team Shared');
    const isPrivate = privacy === 'Private' || privacy === 'My Notes (Private)' || privacy === 'My Notes';
    const author = String(m.author || '');
    const initials = initialsFor(author);
    const body = String(m.synthesizedText || m.content || m.detail || d.clean || '');
    const chips = sourceListFor(m);
    const structEntries = (m && m.structured && typeof m.structured === 'object') ? Object.keys(m.structured).map(function (k) { return [k, String(m.structured[k])]; }) : [];
    const effPii = String(m.piiStatus || d.flag || 'Clean');
    const isApproved = effPii === 'Approved' || effPii === 'Clean' || (props.approved && props.approved.has && props.approved.has(m.id));
    const open = openProv.has(m.id) || (focusId && String(focusId) === String(m.id));
    const key = String(m.id || m.title || label);
    return html`<div key=${key} id=${'tl-' + String(m.id || '')} className="bg-white border border-[#E6EAF2] rounded-[16px] p-4 mb-6 shadow-sm relative">
      <button onClick=${() => flip(setOpenProv, m.id)} title=${open ? 'Collapse' : 'Expand'} aria-label=${open ? 'Collapse' : 'Expand'} className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white border border-[#E6EAF2] text-[14px] text-[#1F4A7A] flex items-center justify-center">${open ? '-' : '+'}</button>
      <div className="flex items-start gap-2 flex-wrap pr-10">
        <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
          <span className="text-[13px] font-semibold text-[#1E293B]">${m.title}</span>
          ${age ? html`<span className="inline-flex items-center gap-1 text-[11px] italic px-2 py-0.5 rounded-full bg-[#F8FAFC] border border-[#E6EAF2] text-[#64748B]"><span style=${{ width: '6px', height: '6px', borderRadius: '999px', background: dot, display: 'inline-block' }}></span>${age}</span>` : null}
          <span className="text-[10px] italic text-[#94A3B8]">${d.pct}% confidence</span>
        </div>
      </div>
      <div className="mt-2 text-[13px] leading-relaxed text-[#1E293B]" style=${open ? null : { display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>${body}</div>
      ${timelineStrip(m)}
      ${pendingAppendsBanner(m)}
      ${!open && chips.length ? html`<div className="mt-2 flex flex-wrap gap-1.5">${chips.map((c) => html`<button type="button" key=${c} onClick=${onProvenanceClick} title="Review source" className="text-[10px] italic px-2 py-0.5 rounded-full bg-[#F8FAFC] border border-[#E6EAF2] text-[#64748B] underline cursor-pointer">${c}</button>`)}</div>` : null}
      <div className="mt-2 flex items-center gap-1 text-[10px] italic text-[#94A3B8]"><span>Extracted</span><span className="w-6 h-px bg-[#E6EAF2] mx-1 inline-block"></span><span>AI Fused</span></div>
      ${open ? html`<div className="mt-3 bg-[#f8fafc] rounded-[12px] p-3 space-y-2">
        ${m.mergeHint ? html`<div className="flex items-center gap-2 p-2 rounded-[10px] bg-[#FFF7ED] border border-[#fed7aa] text-[11px]"><span>⚡ ${m.mergeHint}</span><button type="button" onClick=${onMergeClick} className="ml-auto px-2 py-0.5 rounded-full bg-white border text-[11px]">Merge</button></div>` : null}
        ${structEntries.length ? html`<div className="p-2 rounded-[10px] bg-white border"><div className="text-[11px] font-semibold mb-1">Structured data</div><div className="grid grid-cols-2 gap-1">${structEntries.map((kv) => html`<div key=${kv[0]} className="p-1.5 rounded-[8px] bg-[#f8fafc] border"><div className="text-[10px] font-semibold text-[#64748B]">${kv[0]}</div><div className="text-[12px] text-[#1E293B]">${kv[1]}</div></div>`)}</div></div>` : null}
        <div className="p-2 rounded-[10px] bg-white border"><div className="text-[11px] font-semibold mb-1">Provenance</div><div className="max-h-32 overflow-y-auto no-scrollbar space-y-1">${chips.slice().reverse().map((c) => html`<div key=${c} className="flex items-center gap-2 text-[11px]"><span className="inline-flex items-center justify-center rounded-full bg-[#F8FAFC] border border-[#E6EAF2]" style=${{ width: '22px', height: '22px', fontSize: '12px' }}>${iconForSource(c)}</span><button type="button" onClick=${onProvenanceClick} className="font-medium text-[#1F4A7A] underline cursor-pointer text-left">${c}</button><span className="text-[#64748B] truncate">${m.title} • ${m.syncStatus || 'synced'}</span></div>`)}</div></div>
      </div>` : null}
      <div className="mt-3 pt-2 border-t border-[#E6EAF2] flex items-center justify-between gap-2">
        <span className="text-[10px] italic text-[#94A3B8]">${isPrivate ? 'Private' : 'Team Shared'}</span>
        <span className="text-[10px] italic text-[#94A3B8]">${m.source || m.type || 'Timeline'} • ${effPii}${d.flag === 'Redacted_Review' ? ' • PII redacted' : ''} • ${m.syncStatus || 'synced'}</span>
      </div>
    </div>`;
  });
  return html`<div className="space-y-5">
    ${renderYourNotesFallback()}
    <div>${feedCards}
      ${moments.length === 0 ? html`<div className="rounded-[16px] bg-white border border-[#e5e7eb] shadow-sm p-4"><div className="text-[11px] italic text-[#6b7280]">No harvested moments yet — run Harvester Control to ingest.</div></div>` : null}
    </div>
  </div>`;
}
