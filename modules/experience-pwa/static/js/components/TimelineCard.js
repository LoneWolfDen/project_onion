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
  var srcs = [];
  if (m && m.source) srcs.push(String(m.source));
  if (m && m.type && String(m.type) !== String(m.source)) srcs.push(String(m.type));
  return srcs.filter(Boolean).slice(0, 3);
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
  const [openProv, setOpenProv] = window.React.useState(new Set());
  const [notesOpen, setNotesOpen] = window.React.useState(true);
  const [draft, setDraft] = window.React.useState('');
  const [notePrivacy, setNotePrivacy] = window.React.useState('Team Shared');
  const onAddNote = async (text, privacyVal, reset) => { const v = String(text || '').trim(); if (!v || !project) return; const screened = piiScreen(v); const dbApi = (typeof window !== 'undefined' && window.OnionDB) || null; const payload = { project_name: project.project_name, Project_ReferenceID: project.Project_ReferenceID, projectId: project.project_name, original: screened.text, title: v.slice(0, 80), content: screened.text, rephrased: screened.text, privacy: privacyVal || notePrivacy || 'Team Shared', piiStatus: screened.flag, syncStatus: 'pending_upload', refs: [], updates: [] }; if (dbApi && dbApi.saveNote) { await dbApi.saveNote(payload); } if (reset) reset(''); else setDraft(''); };
  const onFlipPrivacy = async (note) => { if (!note || !note.id) return; const explicit = note.__nextPrivacy || null; const cur = String(note.__curPrivacy || note.privacy || 'Team Shared'); const next = explicit || ((cur === 'Private' || cur === 'My Notes (Private)' || cur === 'My Notes') ? 'Team Shared' : 'Private'); const dbApi = (typeof window !== 'undefined' && window.OnionDB) || null; if (dbApi && dbApi.updateNotePrivacy) { await dbApi.updateNotePrivacy(note.id, next); } };
  const flip = (setter, id) => setter((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
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
    const mini = miniTimelineFor(m);
    const structEntries = (m && m.structured && typeof m.structured === 'object') ? Object.keys(m.structured).map(function (k) { return [k, String(m.structured[k])]; }) : [];
    const effPii = String(m.piiStatus || d.flag || 'Clean');
    const isApproved = effPii === 'Approved' || effPii === 'Clean' || (props.approved && props.approved.has && props.approved.has(m.id));
    const open = openProv.has(m.id) || (focusId && String(focusId) === String(m.id));
    const key = String(m.id || m.title || label);
    return html`<div key=${key} id=${'tl-' + String(m.id || '')} className="bg-white border border-[#e5e7eb] rounded-[16px] p-4 mb-4 shadow-sm">
      <div className="flex items-start gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
          <span className=${'text-[11px] px-2 py-0.5 rounded-full border font-semibold ' + pill}>${label}</span>
          <span className="text-[13px] font-semibold text-[#1E293B]">${m.title}</span>
          ${age ? html`<span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-[#f8fafc] border border-[#e5e7eb] text-[#475569]"><span style=${{ width: '6px', height: '6px', borderRadius: '999px', background: dot, display: 'inline-block' }}></span>${age}</span>` : null}
          <span className=${isPrivate ? 'text-[11px] px-2 py-0.5 rounded-full bg-[#F1F5F9] border border-[#E2E8F0] text-[#64748B]' : 'text-[11px] px-2 py-0.5 rounded-full bg-[#E8F2FF] border border-[#A8C6F0] text-[#1F4A7A]'}>${isPrivate ? '🔒 Private' : '🔓 Team Shared'}</span>
        </div>
        <span title=${author || 'User'} className="bg-gray-200 text-gray-700 rounded-full h-8 w-8 flex items-center justify-center text-[11px] font-bold shrink-0">${initials}</span>
      </div>
      <div className="mt-2 text-[13px] leading-relaxed text-[#1E293B]" style=${open ? null : { display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>${body}</div>
      ${!open && mini.length ? html`<div className="mt-2 flex items-center gap-1">${mini.map(function (s, i) { return html`<span key=${s + i} className="flex items-center gap-1">${i > 0 ? html`<span className="inline-block h-px w-6 bg-[#cbd5e1]"></span>` : null}<span title=${s} className="inline-flex items-center justify-center rounded-full border border-[#e2e8f0] bg-white" style=${{ width: '18px', height: '18px', fontSize: '10px' }}>${iconForSource(s)}</span></span>`; })}</div>` : null}
      ${!open && chips.length ? html`<div className="mt-2 flex flex-wrap gap-1.5">${chips.map((c) => html`<button type="button" key=${c} onClick=${onProvenanceClick} title="Review source" className="text-[10px] px-2 py-0.5 rounded-full bg-[#f1f5f9] border border-[#e2e8f0] text-[#1F4A7A] underline cursor-pointer">${c}</button>`)}</div>` : null}
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-[11px] text-[#64748B]">${d.pct}% confidence${d.flag === 'Redacted_Review' ? ' • PII redacted' : ''}</span>
        <button onClick=${() => flip(setOpenProv, m.id)} className="px-3 py-1 rounded-full bg-white border border-[#bfdbfe] text-[11px]">${open ? 'Collapse' : 'Review'}</button>
      </div>
      ${!open ? html`<div className="mt-2 flex items-center gap-1 text-[10px] italic text-[#6b7280]"><span className="w-5 h-5 rounded-full bg-[#E8F2FF] text-[#1F4A7A] inline-flex items-center justify-center not-italic font-semibold text-[9px]">RAW</span><span className="w-6 h-px bg-[#E6EAF2] mx-1 inline-block"></span><span className="w-5 h-5 rounded-full bg-[#D4EFDF] text-[#1E5631] inline-flex items-center justify-center not-italic font-semibold text-[9px]">AI</span><span className="ml-1">Extracted • AI Fused</span></div>` : null}
      ${open ? html`<div className="mt-3 bg-[#f8fafc] rounded-[12px] p-3 space-y-2">
        ${m.mergeHint ? html`<div className="flex items-center gap-2 p-2 rounded-[10px] bg-[#FFF7ED] border border-[#fed7aa] text-[11px]"><span>⚡ ${m.mergeHint}</span><button type="button" onClick=${onMergeClick} className="ml-auto px-2 py-0.5 rounded-full bg-white border text-[11px]">Merge</button></div>` : null}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div className="p-2 rounded-[10px] bg-white border">
            <div className="text-[11px] font-semibold">Model Confidence — ${d.pct}% (${d.pct >= 85 ? 'High' : d.pct >= 60 ? 'Medium' : 'Low'})</div>
            <div className="text-[11px] text-[#475569]">Fused from ${m.source || m.type || 'Timeline'} • Impact ${(typeof m.impactScore === 'number' ? m.impactScore.toFixed(1) : (m.impact || 3))}</div>
            <div className="text-[11px] font-semibold">PII Gate — ${d.flag === 'Redacted_Review' ? 'Redacted_Review: personal detail screened before sharing' : 'Clean: safe for Team Shared'}</div>
            ${isApproved ? html`<button type="button" disabled className="mt-2 px-3 py-1 rounded-full bg-green-50 text-green-700 border border-green-200 text-[11px] font-medium">Approved for Team Share</button>` : html`<button type="button" onClick=${() => props.onApprove && props.onApprove(m.id)} className="mt-2 px-3 py-1 rounded-full bg-[#FFF0F0] text-[#7A1F1F] border border-[#FFB3B3] text-[11px] font-medium">Approve redacted share</button>`}
          </div>
          ${structEntries.length ? html`<div className="p-2 rounded-[10px] bg-white border"><div className="text-[11px] font-semibold mb-1">Structured data</div><div className="grid grid-cols-2 gap-1">${structEntries.map((kv) => html`<div key=${kv[0]} className="p-1.5 rounded-[8px] bg-[#f8fafc] border"><div className="text-[10px] font-semibold text-[#64748B]">${kv[0]}</div><div className="text-[12px] text-[#1E293B]">${kv[1]}</div></div>`)}</div></div>` : null}
        </div>
        <div className="p-2 rounded-[10px] bg-white border"><div className="text-[11px] font-semibold mb-1">Provenance</div><div className="space-y-1">${chips.map((c) => html`<div key=${c} className="flex items-center gap-2 text-[11px]"><span className="inline-flex items-center justify-center rounded-full bg-[#f1f5f9] border" style=${{ width: '22px', height: '22px', fontSize: '12px' }}>${iconForSource(c)}</span><button type="button" onClick=${onProvenanceClick} className="font-medium text-[#1F4A7A] underline cursor-pointer text-left">${c}</button><span className="text-[#64748B] truncate">${m.title} • ${m.syncStatus || 'synced'}</span></div>`)}</div></div>
      </div>` : null}
    </div>`;
  });
  return html`<div className="space-y-5">
    <div className="rounded-[16px] bg-white border border-[#e5e7eb] shadow-sm p-4">
      <div className="flex items-center justify-between"><h3 className="font-semibold flex items-center gap-2">YOUR NOTES</h3><button onClick=${() => setNotesOpen((v) => !v)} className="px-3 py-1 rounded-full bg-[#f0f7ff] border border-[#bfdbfe] text-[11px]">${notesOpen ? 'Collapse' : 'Expand'}</button></div>
      
      ${notesOpen ? html`<div className="mt-3 space-y-3">
        <div className="flex gap-2 flex-wrap"><input value=${draft} onInput=${(e) => setDraft(e.target.value)} placeholder="Add a note..." className="flex-1 bg-[#f0f7ff] border border-[#bfdbfe] rounded-[10px] px-3 py-2 text-[12px]" />
        <div className="flex gap-1 items-center">${["Private","Team Shared"].map((v) => html`<button type="button" key=${v} onClick=${() => setNotePrivacy(v)} className=${"px-2 py-1 rounded-full border text-[11px] " + (notePrivacy === v ? "bg-black text-white" : "bg-white")}>${v}</button>`)}</div><button onClick=${() => (props.onAddNote || onAddNote)(draft, notePrivacy, setDraft)} className="px-3 py-2 rounded-full bg-black text-white text-[11px]">Add update</button></div>
        ${projNotes.map((d) => html`<div key=${d.id} className="rounded-[12px] bg-[#f9fafb] border p-3">
          <div className="flex items-center gap-2"><span className=${'text-[10px] px-2 py-0.5 rounded-full border ' + (d.privacy === 'My Notes (Private)' || d.privacy === 'Private' ? 'bg-[#fecaca]' : 'bg-[#D6F5E8]')}>${d.privacy}</span><span className="text-[11px] italic text-[#6b7280]">refs: ${(d.refs || []).join(', ') || 'none'}</span><div className="ml-auto flex gap-1">${["Private","Team Shared"].map((v) => html`<button type="button" key=${v} onClick=${() => (props.onFlipPrivacy || onFlipPrivacy)(Object.assign({}, d, { __curPrivacy: d.privacy, __nextPrivacy: v }))} className=${"px-2 py-0.5 rounded-full border text-[10px] " + ((d.privacy === v || (v === "Private" && (d.privacy === "My Notes" || d.privacy === "My Notes (Private)"))) ? "bg-black text-white" : "bg-white")}>${v}</button>`)}</div></div>
          <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2"><div className="p-2 rounded-[8px] bg-white border"><div className="text-[10px] font-semibold text-[#6b7280]">Original</div><div className="text-[12px]">${d.original || d.title || d.content || ''}</div></div>
          <div className="p-2 rounded-[8px] bg-[#D6E8FF] border border-[#bfdbfe]"><div className="text-[10px] font-semibold">Rephrased — Copilot</div><div className="text-[12px]">${d.rephrased || '—'}</div></div></div>
          ${(d.updates || []).length > 0 ? html`<div className="mt-2 text-[11px]"><div className="font-medium">Threaded updates append only — latest at top</div>${(d.updates || []).map((u, i) => html`<div key=${i} className="mt-1 p-1.5 rounded-[6px] bg-white border text-[11px]">${u}</div>`)}</div>` : null}
          
          ${d.piiStatus === 'Redacted_Review' && props.approved && !props.approved.has(d.id) ? html`<div className="p-2 rounded-[8px] bg-[#fecaca] border border-[#fca5a5] flex items-center gap-2 text-[11px]">PII redacted — Email detected — Approve redacted share <button onClick=${() => props.onApprove && props.onApprove(d.id)} className="ml-auto px-2 py-0.5 rounded-full bg-white border">Approve</button></div>` : null}
        </div>`)}
      </div>` : null}
    </div>
    <div>${feedCards}
      ${moments.length === 0 ? html`<div className="rounded-[16px] bg-white border border-[#e5e7eb] shadow-sm p-4"><div className="text-[11px] italic text-[#6b7280]">No harvested moments yet — run Harvester Control to ingest.</div></div>` : null}
    </div>
  </div>`;
}
