// AppLeft.js — LEFT sidebar (verbatim v0.18 Tailwind).
const htmlL = window.htm.bind(window.React.createElement);
export function AppLeft(p) {
  return htmlL`<div className="w-full lg:w-[280px] shrink-0 border-r border-[#e5e7eb] bg-white lg:min-h-[calc(100vh-56px)]">
    <div className="p-4 space-y-4">
      <div><div className="text-[11px] font-semibold tracking-widest text-[#6b7280] mb-1">CLIENT</div>
        <div className="relative"><select value=${p.client} onChange=${(e) => p.onClient(e.target.value)} className="w-full bg-[#f0f7ff] border border-[#bfdbfe] rounded-[10px] px-3 py-2 text-[13px] appearance-none">
          <option>ALL Clients</option>${p.clients.map((c) => htmlL`<option key=${c}>${c}</option>`)}
        </select><span className="absolute right-3 top-2.5 w-4 h-4 text-[#6b7280] pointer-events-none">▾</span></div></div>
      <div><div className="text-[11px] font-semibold tracking-widest text-[#6b7280] mb-1">PROJECTS</div>
        <div className="relative"><span className="absolute left-3 top-2.5 w-4 h-4 text-[#9ca3af]">⌕</span><input value=${p.q} onInput=${(e) => p.setQ(e.target.value)} placeholder="Search projects..." className="w-full bg-[#f0f7ff] border border-[#bfdbfe] rounded-[10px] pl-9 pr-3 py-2 text-[13px] placeholder:text-[#9ca3af]" /></div>
        ${p.empty ? htmlL`<div className="mt-2 p-2 rounded-[10px] bg-[#FFF5D6] border border-[#fde68a] text-[12px]">If project not found <button onClick=${p.onRegister} className="underline text-[#1e40af]">Register/Add new</button></div>` : null}</div>
      <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
        ${p.projects.map((x) => htmlL`<button key=${x.Project_ReferenceID} onClick=${() => p.onPick(x.Project_ReferenceID)} className=${'w-full text-left rounded-[16px] border p-3 transition ' + (p.isActive(x) ? 'bg-[#D6E8FF] border-[#bfdbfe] shadow-sm' : 'bg-[#f9fafb] border-[#e5e7eb] hover:bg-white')}>
          <div className="flex justify-between items-start gap-2"><div className="font-medium">${x.project_name}</div><span className="text-[10px] px-2 py-0.5 rounded-full bg-white border">${x.active ? 'Active' : 'Archived'}</span></div>
          <div className="mt-1 flex flex-wrap gap-1"><span className="text-[10px] px-2 py-0.5 rounded-full bg-white border border-[#bfdbfe]">${x.client_name}</span>${(x.opportunity_numbers || []).map((o) => htmlL`<span key=${o} className="text-[10px] px-2 py-0.5 rounded-full bg-[#E8D6FF]">${o}</span>`)}${(x.project_ids || []).slice(0, 1).map((id) => htmlL`<span key=${id} className="text-[10px] px-2 py-0.5 rounded-full bg-[#D6F5E8]">${id}</span>`)}</div>
          <div className="mt-1 text-[11px] text-[#6b7280]">${p.fmt(x.created_at)}</div>
        </button>`)}
        <div className="mt-3"><button onClick=${p.onRegister} className="w-full px-3 py-2 rounded-full bg-white border border-[#bfdbfe] text-[12px] font-medium text-[#1e40af]">+ Add Project</button></div>
      </div>
      <div className="p-3 rounded-[12px] bg-[#E8D6FF] border border-[#d8b4fe] flex gap-2"><span className="w-4 h-4 shrink-0 mt-0.5">◈</span><div className="text-[11px]"><div className="font-medium">Similar to #c4 Apollo-123 92% match</div><div className="italic text-[#6b7280]">Extension details overlap</div><button className="mt-1 px-2 py-0.5 rounded-full bg-white border text-[11px]">Merge</button></div></div>
    </div>
  </div>`;
}
