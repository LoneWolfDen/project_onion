// AppLeft.js — LEFT sidebar (verbatim v0.18 Tailwind).
const htmlL = window.htm.bind(window.React.createElement);
export function AppLeft(p) {
  return htmlL`<div className="w-full lg:w-[280px] shrink-0 border-r border-[#E6EAF2] bg-white lg:min-h-[calc(100vh-56px)] flex flex-col">
    <div className="p-4 flex flex-col gap-4 flex-1 min-h-0">
      <div><div className="text-[11px] font-semibold tracking-widest text-[#64748B] mb-1">CLIENT</div>
        <div className="relative"><select value=${p.client} onChange=${(e) => p.onClient(e.target.value)} className="w-full bg-white border border-[#E6EAF2] rounded-[10px] px-3 py-2 text-[13px] text-[#1E293B] appearance-none">
          <option>ALL Clients</option>${p.clients.map((c) => htmlL`<option key=${c}>${c}</option>`)}
        </select><span className="absolute right-3 top-2.5 text-[#94A3B8] pointer-events-none text-[13px]">▾</span></div></div>
      <div><div className="text-[11px] font-semibold tracking-widest text-[#64748B] mb-1">PROJECTS</div>
        <div className="flex items-center gap-2"><div className="relative flex-1 min-w-0"><span className="absolute left-3 top-2.5 text-[#94A3B8] text-[13px]">⌕</span><input value=${p.q} onInput=${(e) => p.setQ(e.target.value)} placeholder="Search projects..." className="w-full bg-white border border-[#E6EAF2] rounded-[10px] pl-9 pr-3 py-2 text-[13px] text-[#1E293B] placeholder:text-[#94A3B8]" /></div><button onClick=${p.onRegister} title="Add Project" aria-label="Add Project" className="shrink-0 w-9 h-9 rounded-full bg-[#1E293B] text-white text-[18px] leading-none flex items-center justify-center">+</button></div>
        ${p.empty ? htmlL`<div className="mt-2 p-2 rounded-[10px] bg-[#FFFBEB] border border-[#FDE68A] text-[12px] italic text-[#92400E]">If project not found <button onClick=${p.onRegister} className="underline text-[#1F4A7A]">Register/Add new</button></div>` : null}</div>
      <div className="space-y-2 max-h-[50vh] overflow-y-auto no-scrollbar pr-1">
        ${p.projects.map((x) => htmlL`<button key=${x.Project_ReferenceID} onClick=${() => p.onPick(x.Project_ReferenceID)} className=${'w-full text-left rounded-[12px] border p-3 transition ' + (p.isActive(x) ? 'bg-[#EEF6FF] border-[#A8C6F0] shadow-sm' : 'bg-white border-[#E6EAF2] hover:border-[#A8C6F0]')}>
          <div className="flex justify-between items-start gap-2"><div className="font-medium text-[13px] text-[#1E293B]">${x.project_name}</div><span className="px-2 py-0.5 rounded-full border border-[#E6EAF2] text-[10px] bg-white text-[#64748B]">${x.active ? 'Active' : 'Archived'}</span></div>
          <div className="mt-1 flex flex-wrap gap-1"><span className="px-2 py-0.5 rounded-full border border-[#E6EAF2] text-[10px] bg-white text-[#64748B]">${x.client_name}</span>${(x.opportunity_numbers || []).map((o) => htmlL`<span key=${o} className="px-2 py-0.5 rounded-full border border-[#E6EAF2] text-[10px] bg-white text-[#64748B]">${o}</span>`)}${(x.project_ids || []).slice(0, 1).map((id) => htmlL`<span key=${id} className="px-2 py-0.5 rounded-full border border-[#E6EAF2] text-[10px] bg-white text-[#64748B]">${id}</span>`)}</div>
          <div className="mt-1 text-[11px] italic text-[#94A3B8]">${p.fmt(x.created_at)}</div>
        </button>`)}
      </div>
      <div className="mt-auto pt-4 border-t border-[#E6EAF2]"><div><button onClick=${p.onOpenHandover} className="text-[12px] underline underline-offset-2 text-[#1F4A7A] hover:text-[#1E293B] cursor-pointer">Handover Pack [Generate]</button></div>
        <div className="mt-2"><button onClick=${p.onClientArtefacts} className="text-[12px] underline underline-offset-2 text-[#1F4A7A] hover:text-[#1E293B] cursor-pointer">Client 360 [View]</button></div></div>

    </div>
  </div>`;
}
