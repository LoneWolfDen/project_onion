// AppRight.js — RIGHT Smart Assistant (verbatim v0.18 Tailwind).
const htmlR = window.htm.bind(window.React.createElement);
export function AppRight(p) {
  return htmlR`<div className="w-full lg:w-[340px] shrink-0 border-l border-[#e5e7eb] bg-white lg:min-h-[calc(100vh-56px)]">
    <div className="p-4 space-y-4">
      <div><div className="font-semibold flex items-center gap-2"><span className="w-4 h-4">✦</span>Smart Assistant</div>
        <div className="mt-2 flex gap-1 bg-[#f9fafb] rounded-full p-1 border">${['My Notes', 'Team Shared', 'Both'].map((v) => htmlR`<button key=${v} onClick=${() => p.setPrivacy(v)} className=${'flex-1 px-2 py-1 rounded-full text-[11px] ' + (p.privacy === v ? 'bg-white border shadow-sm' : '')}>${v}</button>`)}</div>
        <div className="mt-2 flex gap-1 items-center"><div className="relative flex-1"><span className="absolute left-3 top-2.5 w-4 h-4 text-[#9ca3af]">⌕</span><input value=${p.ask} onInput=${(e) => p.setAsk(e.target.value)} onKeyDown=${(e) => { if (e && e.key === 'Enter') { if (e.preventDefault) e.preventDefault(); if (p.onAsk) p.onAsk(); } }} placeholder="Ask: MS3, IT support, PO extension..." className="w-full bg-[#f0f7ff] border border-[#bfdbfe] rounded-[10px] pl-9 pr-3 py-2 text-[12px]" /></div><button onClick=${() => { if (p.onAsk) p.onAsk(); }} className="px-3 py-2 rounded-[10px] bg-black text-white text-[11px] whitespace-nowrap">Ask Assistant</button></div>
        ${p.assistantLoading ? htmlR`<div className="mt-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-[#D6F5E8] to-[#D6E8FF] border border-[#bfdbfe] text-[11px] animate-pulse">Synthesizing across ${typeof p.scopedCount === 'number' ? p.scopedCount : (p.hits || []).length} scoped sources...</div>` : null}
        ${(!p.assistantLoading && p.assistantAnswer) ? htmlR`<div className="mt-2 bg-[#f0f7ff] border border-[#bfdbfe] rounded-[12px] p-3 text-[12px]"><div>${p.assistantAnswer}</div><div className="mt-2 flex flex-wrap gap-1">${(Array.isArray(p.assistantSources) ? p.assistantSources : []).map((s) => htmlR`<span key=${s} className="px-2 py-0.5 rounded-full bg-[#D6F5E8] border border-[#a7f3d0] text-[10px]">${s}</span>`)}</div><div className="mt-1 text-[10px] italic text-[#6b7280]">${p.privacy === 'My Notes' ? '[Scope: My Notes Only]' : '[Scope: Team Shared Knowledge]'}</div></div>` : null}
        <div className="mt-2 space-y-2">${p.hits.map((d) => htmlR`<div key=${d.id} className="p-2 rounded-[10px] bg-[#f9fafb] border flex justify-between items-center">
          <div><div className="text-[12px] font-medium">${d.title}</div></div>
          <button onClick=${() => p.onView(d.id)} className="px-2 py-0.5 rounded-full bg-[#D6E8FF] border border-[#bfdbfe] text-[11px]">View Card</button>
        </div>`)}</div>
      </div>
      <div className="rounded-[12px] bg-white border p-3"><div className="font-medium text-[12px]">Handover Pack</div>
        <div className="mt-2 flex gap-2"><button className="px-3 py-1.5 rounded-full bg-black text-white text-[11px]">Generate Pack</button></div></div>
      <div className="rounded-[12px] bg-[#D6E8FF] border border-[#bfdbfe] p-3"><div className="font-medium text-[12px]">Client Artefacts</div><div className="mt-2"><button onClick=${p.onClientArtefacts} className="px-3 py-1.5 rounded-full bg-white border text-[11px]">Open Client View</button></div></div>
      <div className="rounded-[12px] bg-[#f0f7ff] border border-[#bfdbfe] p-3"><div className="font-medium text-[12px]">Filter Aid</div><div className="mt-1 flex flex-wrap gap-1">${p.keywords.map((k) => htmlR`<span key=${k} className="px-2 py-0.5 rounded-full bg-white border text-[11px]">${k}</span>`)}</div></div>
    </div>
  </div>`;
}
