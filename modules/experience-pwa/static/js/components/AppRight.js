// AppRight.js — RIGHT Smart Assistant (verbatim v0.18 Tailwind + dynamic Filter Aid from scoped #tags).
const htmlR = window.htm.bind(window.React.createElement);
// Exact-phrase search helper (Smart Assistant hits filtering):
// Respects single/double quotes — e.g. #Risk_Watch + 'Not Signed' treats
// 'Not Signed' as one exact substring, not two words ("Not","Signed").
// Unquoted tokens match via substring; quoted terms require exact contiguous
// substring match on the card's content/synthesized text. All terms ANDed.
function parseSearchTerms(query) {
  const q = String(query || '').trim();
  if (!q) return [];
  const terms = [];
  const re = /"([^"]+)"|'([^']+)'|(\S+)/g;
  let m = null;
  while ((m = re.exec(q)) !== null) {
    const quoted = (m[1] !== undefined ? m[1] : (m[2] !== undefined ? m[2] : null));
    if (quoted !== null && quoted !== undefined) {
      const t = String(quoted).trim().toLowerCase();
      if (t) terms.push({ text: t, exact: true });
    } else {
      const tok = String(m[3] || '').trim();
      if (!tok || tok === '+') continue;
      const low = tok.toLowerCase();
      if (low === 'and' || low === 'or') continue;
      terms.push({ text: low, exact: false });
    }
  }
  return terms;
}
function cardHaystack(c) {
  const tags = Array.isArray(c && c.tags) ? c.tags.join(' ') : '';
  return [(c && c.title) || '', (c && c.detail) || '', (c && c.content) || '', (c && c.synthesizedText) || '', (c && c.source) || '', (c && c.type) || '', tags].join(' ').toLowerCase();
}
function matchesExactPhraseQuery(card, query) {
  const terms = parseSearchTerms(query);
  if (!terms.length) return true;
  const hay = cardHaystack(card);
  return terms.every((t) => hay.indexOf(t.text) !== -1);
}
function filterHitsByQuery(cards, query) {
  const q = String(query || '').trim();
  if (!q) return Array.isArray(cards) ? cards : [];
  return (Array.isArray(cards) ? cards : []).filter((c) => matchesExactPhraseQuery(c, q));
}
function uniqueTagsFromContext(contextCards, keywords) {
  const seen = {};
  const out = [];
  const pushTag = (v) => {
    const t = String(v || '').trim();
    if (!t) return;
    if (t.charAt(0) !== '#') return;
    if (!seen[t]) { seen[t] = 1; out.push(t); }
  };
  (Array.isArray(contextCards) ? contextCards : []).forEach((c) => {
    (Array.isArray(c && c.tags) ? c.tags : []).forEach(pushTag);
    const hay = [(c && c.title) || '', (c && c.detail) || '', (c && c.content) || '', (c && c.synthesizedText) || ''].join(' ');
    const found = String(hay || '').match(/#[A-Za-z0-9_]+/g) || [];
    found.forEach(pushTag);
  });
  if (!out.length) (Array.isArray(keywords) ? keywords : []).forEach((k) => {
    const t = String(k || '').trim();
    if (!t) return;
    const tag = t.charAt(0) === '#' ? t : '#' + t;
    if (!seen[tag]) { seen[tag] = 1; out.push(tag); }
  });
  return out;
}
export function AppRight(p) {
  const aidTags = uniqueTagsFromContext(p.contextCards, p.keywords);
  // Exact-phrase filtering safety net: p.hits arrives pre-filtered from App.js,
  // but re-apply the quote-aware matcher here so pasting a quoted phrase
  // directly into this panel still yields single exact-phrase hits.
  const visibleHits = filterHitsByQuery(p.hits, p.ask);
  return htmlR`<div className="w-full lg:w-[340px] shrink-0 border-l border-[#e5e7eb] bg-white lg:min-h-[calc(100vh-56px)]">
    <div className="p-4 space-y-4">
      <div><div className="font-semibold flex items-center gap-2"><span className="w-4 h-4">✦</span>Smart Assistant</div>
        <div className="mt-2 flex gap-1 bg-[#f9fafb] rounded-full p-1 border">${['My Notes', 'Team Shared', 'Both'].map((v) => htmlR`<button key=${v} onClick=${() => p.setPrivacy(v)} className=${'flex-1 px-2 py-1 rounded-full text-[11px] ' + (p.privacy === v ? 'bg-white border shadow-sm' : '')}>${v}</button>`)}</div>
        <div className="mt-2 flex gap-1 items-center"><div className="relative flex-1"><span className="absolute left-3 top-2.5 w-4 h-4 text-[#9ca3af]">⌕</span><input value=${p.ask} onInput=${(e) => p.setAsk(e.target.value)} onKeyDown=${(e) => { if (e && e.key === 'Enter') { if (e.preventDefault) e.preventDefault(); if (p.onAsk) p.onAsk(); } }} placeholder="Ask: MS3, IT support, PO extension..." className="w-full bg-[#f0f7ff] border border-[#bfdbfe] rounded-[10px] pl-9 pr-3 py-2 text-[12px]" /></div><button onClick=${() => { if (p.onAsk) p.onAsk(); }} className="px-3 py-2 rounded-[10px] bg-black text-white text-[11px] whitespace-nowrap">Ask Assistant</button></div>
        ${p.assistantLoading ? htmlR`<div className="mt-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-[#D6F5E8] to-[#D6E8FF] border border-[#bfdbfe] text-[11px] animate-pulse">Synthesizing across ${typeof p.scopedCount === 'number' ? p.scopedCount : (p.hits || []).length} scoped sources...</div>` : null}
        ${(!p.assistantLoading && p.assistantAnswer) ? htmlR`<div className="mt-2 bg-[#f0f7ff] border border-[#bfdbfe] rounded-[12px] p-3 text-[12px]"><div>${p.assistantAnswer}</div><div className="mt-2 flex flex-wrap gap-1">${(Array.isArray(p.assistantSources) ? p.assistantSources : []).map((s) => htmlR`<span key=${s} className="px-2 py-0.5 rounded-full bg-[#D6F5E8] border border-[#a7f3d0] text-[10px]">${s}</span>`)}</div><div className="mt-1 text-[10px] italic text-[#6b7280]">${p.privacy === 'My Notes' ? '[Scope: My Notes Only]' : '[Scope: Team Shared Knowledge]'}</div></div>` : null}
        <div className="mt-2 space-y-2">${visibleHits.map((d) => htmlR`<div key=${d.id} className="p-2 rounded-[10px] bg-[#f9fafb] border flex justify-between items-center">
          <div><div className="text-[12px] font-medium">${d.title}</div></div>
          <button onClick=${() => p.onView(d.id)} className="px-2 py-0.5 rounded-full bg-[#D6E8FF] border border-[#bfdbfe] text-[11px]">View Card</button>
        </div>`)}</div>
      </div>
      <div className="rounded-[12px] bg-white border p-3"><div className="font-medium text-[12px]">Handover Pack</div>
        <div className="mt-2 flex gap-2"><button className="px-3 py-1.5 rounded-full bg-black text-white text-[11px]">Generate Pack</button></div></div>
      <div className="rounded-[12px] bg-[#D6E8FF] border border-[#bfdbfe] p-3"><div className="font-medium text-[12px]">Client Artefacts</div><div className="mt-2"><button onClick=${p.onClientArtefacts} className="px-3 py-1.5 rounded-full bg-white border text-[11px]">Open Client View</button></div></div>
      <div className="rounded-[12px] bg-[#f0f7ff] border border-[#bfdbfe] p-3"><div className="font-medium text-[12px]">Filter Aid</div><div className="mt-1 text-[10px] italic text-[#6b7280]">Tap a tag to populate the Smart Assistant</div><div className="mt-1 flex flex-wrap gap-1">${aidTags.map((k) => htmlR`<button type="button" key=${k} onClick=${() => p.setAsk(k)} title=${'Filter by ' + k} className="px-2 py-0.5 rounded-full bg-white border text-[11px] hover:border-[#bfdbfe] hover:bg-[#f0f7ff]">${k}</button>`)}</div></div>
    </div>
  </div>`;
}
