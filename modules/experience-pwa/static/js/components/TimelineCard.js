// TimelineCard P1 — Key Moments Last 5 (verbatim shell) + ESM store.
import { calcConfidence } from '../core/confidence.js';
import { piiScreen } from '../core/PiiGate.js';
const html = window.htm.bind(window.React.createElement);
export function matchRef(t, p) {
  if (!t || !p) return false;
  return t.Project_ReferenceID === p.Project_ReferenceID || t.project_name === p.project_name || t.projectId === p.project_name;
}
export function TimelineCard(props) {
  const project = props.project;
  const timeline = props.timeline || [];
  const notes = props.notes || [];
  const privacyFilter = props.privacyFilter || 'Both';
  const [openProv, setOpenProv] = window.React.useState(new Set());
  const [openSt, setOpenSt] = window.React.useState(new Set());
  const [notesOpen, setNotesOpen] = window.React.useState(true);
  const [draft, setDraft] = window.React.useState('');
  const [notePrivacy, setNotePrivacy] = window.React.useState('Team Shared');
  const onAddNote = async (text, privacyVal, reset) => { const v = String(text || '').trim(); if (!v || !project) return; const screened = piiScreen(v); const dbApi = (typeof window !== 'undefined' && window.OnionDB) || null; const payload = { project_name: project.project_name, Project_ReferenceID: project.Project_ReferenceID, projectId: project.project_name, original: screened.text, title: v.slice(0, 80), content: screened.text, rephrased: screened.text, privacy: privacyVal || notePrivacy || 'Team Shared', piiStatus: screened.flag, syncStatus: 'pending_upload', refs: [], updates: [] }; if (dbApi && dbApi.saveNote) { await dbApi.saveNote(payload); } if (reset) reset(''); else setDraft(''); };
  const onFlipPrivacy = async (note) => { if (!note || !note.id) return; const explicit = note.__nextPrivacy || null; const cur = String(note.__curPrivacy || note.privacy || 'Team Shared'); const next = explicit || ((cur === 'Private' || cur === 'My Notes (Private)' || cur === 'My Notes') ? 'Team Shared' : 'Private'); const dbApi = (typeof window !== 'undefined' && window.OnionDB) || null; if (dbApi && dbApi.updateNotePrivacy) { await dbApi.updateNotePrivacy(note.id, next); } };
  const flip = (setter, id) => setter((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const focusId = props.focusId || null;
  const [noiseOn, setNoiseOn] = window.React.useState(true);
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
  const hiddenCount = noiseOn ? allMoments.filter((d) => isNoise(d.raw)).length : 0;
  const moments = (noiseOn ? allMoments.filter((d) => !isNoise(d.raw)) : allMoments).slice(0, 10);
  const projNotes = notes.filter((n) => matchRef(n, project)).filter((n) => !privacyFilter || privacyFilter === 'Both' || n.privacy === privacyFilter);
  const statuses = Array.isArray(project.statuses) ? project.statuses : [];
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
    <div className="rounded-[16px] bg-white border border-[#e5e7eb] shadow-sm p-4">
      <div className="flex items-center justify-between flex-wrap gap-2"><h3 className="font-semibold">Key Moments Last 5</h3><button type="button" onClick=${() => setNoiseOn((v) => !v)} title="Toggle noise filter" className=${'px-3 py-1 rounded-full border text-[11px] font-medium ' + (noiseOn ? 'bg-[#D6F5E8] border-[#6ee7b7] text-[#065F46]' : 'bg-[#f3f4f6] border-[#d1d5db] text-[#4b5563]')}>${noiseOn ? 'Noise Filter: ACTIVE' : 'Noise Filter: OFF'}</button></div>
      ${noiseOn && hiddenCount > 0 ? html`<div className="mt-2 text-[11px] italic text-[#6b7280] px-3 py-1 rounded-full bg-[#f0f7ff] border border-[#bfdbfe] inline-block">${hiddenCount} routine update${hiddenCount === 1 ? '' : 's'} filtered</div>` : null}
      <div className="mt-3 space-y-0" style=${{ position: 'relative', borderLeft: '2px solid #bfdbfe', marginLeft: '8px', paddingLeft: '18px' }}>${moments.map((d) => {
        const m = d.raw;
        return html`<div key=${m.id} id=${'tl-' + m.id} style=${{ position: 'relative' }} className=${'rounded-[12px] border p-3 mb-3 ' + (focusId && String(focusId) === String(m.id) ? 'bg-[#FFF5D6] border-[#f59e0b]' : 'bg-[#f9fafb]')}>
          <span style=${{ position: 'absolute', left: '-25px', top: '16px', width: '12px', height: '12px', borderRadius: '9999px', background: (typeof m.impactScore === 'number' && m.impactScore >= 0.5) || m.impactScore === undefined ? '#10b981' : '#d1d5db', border: '2px solid #fff', boxShadow: '0 0 0 2px #bfdbfe' }}></span>
          <div className="onion-conf-row"><span className=${'onion-conf-pill ' + (d.pct >= 85 ? 'onion-conf-high' : d.pct >= 60 ? 'onion-conf-med' : 'onion-conf-low')}>Confidence: ${d.pct}% ${d.pct >= 85 ? 'High' : d.pct >= 60 ? 'Medium' : 'Low'}</span><span className="onion-prov-row"><span className="onion-prov-chip">${m.source || m.type || 'Timeline'}</span></span></div>
          <div className="flex items-start justify-between gap-2"><div>
            <div className="font-medium flex items-center gap-2 flex-wrap">${m.title} <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#E8D6FF]">Impact ${(typeof m.impactScore === 'number' ? m.impactScore.toFixed(1) : (m.impact || 3))}</span>${(m.tags || []).map((tg) => html`<span key=${tg} className="text-[10px] px-2 py-0.5 rounded-full bg-[#D6E8FF] border border-[#bfdbfe]">${tg}</span>`)}</div>
            <div className="mt-1 text-[12px]">${d.clean}</div>
            <div className="mt-1 text-[11px] italic text-[#6b7280]">${m.timestamp || m.age || ''} • ${m.privacy || 'Team Shared'} • ${m.syncStatus || 'synced'}${d.flag === 'Redacted_Review' ? ' • PII redacted' : ''}</div>
          </div><button onClick=${() => flip(setOpenProv, m.id)} className="px-3 py-1 rounded-full bg-white border border-[#bfdbfe] text-[11px] flex items-center gap-1">${(openProv.has(m.id) || (focusId && String(focusId) === String(m.id))) ? 'Collapse' : 'Expand'}</button></div>
          ${(openProv.has(m.id) || (focusId && String(focusId) === String(m.id))) ? html`<div className="mt-3 border-t pt-3 space-y-2"><div className="text-[11px] font-medium">Provenance</div>
            <div className="flex items-center gap-2 text-[11px] bg-white border rounded-[8px] px-2 py-1"><span className="font-medium">${m.title}</span><span className="text-[#6b7280] italic">${m.source || m.type || 'Timeline'}</span></div>
            <div className="grid grid-cols-2 gap-2 mt-2"><div className="p-2 rounded-[8px] bg-[#D6E8FF] border text-[11px]"><div className="font-medium">STRUCTURED</div><div className="italic">${m.structured || m.title}</div></div><div className="p-2 rounded-[8px] bg-[#D6F5E8] border text-[11px]"><div className="font-medium">Model confidence</div><div>${d.pct}%</div></div></div>
          </div>` : null}
        </div>`;
      })}
      ${moments.length === 0 ? html`<div className="text-[11px] italic text-[#6b7280]">No harvested moments yet — run Harvester Control to ingest.</div>` : null}</div>
    </div>
    <div className="rounded-[16px] bg-white border border-[#e5e7eb] shadow-sm p-4">
      <div className="flex items-center gap-2"><h3 className="font-semibold">Status cards</h3></div>
      <div className="mt-3 space-y-3">${statuses.map((d) => html`<div key=${d.id} className=${'rounded-[12px] border p-3 ' + (d.color === 'green' ? 'bg-[#D6F5E8] border-[#a7f3d0]' : 'bg-[#FFF5D6] border-[#fde68a]')}>
        <div className="flex items-start justify-between gap-2"><div><div className="font-medium flex items-center gap-2">${d.title} <span className=${'text-[10px] px-2 py-0.5 rounded-full border ' + (d.color === 'green' ? 'bg-green-100' : 'bg-yellow-100')}>${d.status}</span></div><div className="mt-1 text-[12px]">${d.detail}</div></div>
        <button onClick=${() => flip(setOpenSt, d.id)} className="px-3 py-1 rounded-full bg-white border text-[11px] flex items-center gap-1">Expand provenance</button></div>
      </div>`)}
      ${statuses.length === 0 ? html`<div className="mt-4 rounded-[12px] bg-[#FFF5D6] border border-[#fde68a] p-3"><div className="font-medium flex items-center gap-2">Excel Weekly Status Handling</div><div className="mt-2 flex gap-2"><div className="px-3 py-1 rounded-full bg-white border text-[11px]">No weekly rows yet</div></div></div>` : null}</div>
    </div>

  </div>`;
}
