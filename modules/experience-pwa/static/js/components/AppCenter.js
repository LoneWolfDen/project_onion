// AppCenter.js — CENTER column (UX polish; htm-safe: child VNodes precomputed in JS, templates stay flat).
const htmlC = window.htm.bind(window.React.createElement);
function getGdpId(a) {
  if (!a) return '';
  if (a.gdp_id) return String(a.gdp_id);
  if (a.gdpId) return String(a.gdpId);
  const urls = [];
  if (a.gdp_url) urls.push(String(a.gdp_url));
  if (Array.isArray(a.gdp_urls)) urls.push(...a.gdp_urls.map(String));
  if (a.gdpUrl) urls.push(String(a.gdpUrl));
  for (const u of urls) { const m = String(u).match(/project-details\/(\d+)/); if (m) return m[1]; }
  return '';
}
function getConnectedUrls(a) {
  if (!a) return [];
  if (Array.isArray(a.connected_record_urls) && a.connected_record_urls.length) return a.connected_record_urls.map(String);
  if (Array.isArray(a.salesforceUrls) && a.salesforceUrls.length) return a.salesforceUrls.map(String);
  return [];
}
function getConnectedIds(a) {
  if (!a) return [];
  if (Array.isArray(a.connected_record_ids) && a.connected_record_ids.length) return a.connected_record_ids.map(String);
  return [];
}
function getSpEntries(a) {
  const raw = (a && (a.sharepoint_urls || a.sharepoint)) || null;
  if (!raw) return [];
  if (Array.isArray(raw)) return [['SharePoint URLs', raw.map(String)]];
  if (typeof raw === 'object') return Object.keys(raw).map((k) => [k, Array.isArray(raw[k]) ? raw[k].map(String) : (raw[k] ? [String(raw[k])] : [])]);
  return [];
}
function getGdpUrl(a) {
  if (!a) return '';
  if (a.gdp_url) return String(a.gdp_url);
  if (Array.isArray(a.gdp_urls) && a.gdp_urls[0]) return String(a.gdp_urls[0]);
  if (a.gdpUrl) return String(a.gdpUrl);
  return '';
}
function getContacts(a) {
  if (!a) return [];
  const raw = a.contacts || a.stakeholders || [];
  if (!Array.isArray(raw)) return [];
  return raw.map((c) => (typeof c === 'string' ? { email: c, role: '', name: '', group: 'Client' } : { email: c.email || '', role: c.role || '', name: c.name || '', group: c.group || 'Client' })).filter((c) => c.email || c.role || c.name);
}
function copyText(t) { try { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(String(t || '')); } catch (e) {} }
function copyBtn(val, label) {
  return htmlC`<button onClick=${() => copyText(val)} title=${label} className="p-0.5 rounded border bg-white leading-none"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button>`;
}
function c360Match(t, proj) { if (!t || !proj) return false; return t.Project_ReferenceID === proj.Project_ReferenceID || t.project_name === proj.project_name || t.projectId === proj.project_name; }
function c360Count(tl, nt, proj) { var n = 0; var i; var a = Array.isArray(tl) ? tl : []; var b = Array.isArray(nt) ? nt : []; for (i = 0; i < a.length; i++) if (c360Match(a[i], proj)) n++; for (i = 0; i < b.length; i++) if (c360Match(b[i], proj)) n++; return n; }
function c360Projects(p, clientName) { var all = Array.isArray(p.allProjects) ? p.allProjects : (p.active ? [p.active] : []); return all.filter(function (x) { return x && x.client_name === clientName; }); }
function c360Directory(projs) { var by = {}; projs.forEach(function (pr) { getContacts(pr).forEach(function (c) { var ek = String(c.email || '').trim().toLowerCase(); var k = ek || ('name:' + String(c.name || '').trim().toLowerCase()); if (!k || k === 'name:') return; if (!by[k]) by[k] = { email: c.email || '', name: c.name || '', role: c.role || '', projects: [] }; var r = by[k]; if (c.name && !r.name) r.name = c.name; if (c.role && (!r.role || r.role.indexOf(c.role) < 0)) r.role = r.role ? (r.role + ' / ' + c.role) : c.role; if (pr.project_name && r.projects.indexOf(pr.project_name) < 0) r.projects.push(pr.project_name); }); }); return Object.keys(by).map(function (k) { return by[k]; }).sort(function (a, b) { return String(a.email || a.name).localeCompare(String(b.email || b.name)); }); }
function c360Themes(projs, tl) { var counts = {}; var all = Array.isArray(tl) ? tl : []; projs.forEach(function (pr) { all.forEach(function (t) { if (!c360Match(t, pr)) return; (Array.isArray(t.tags) ? t.tags : []).forEach(function (g) { var tag = String(g || '').trim(); if (!tag) return; counts[tag] = (counts[tag] || 0) + 1; }); }); }); return Object.keys(counts).map(function (tag) { return { tag: tag, n: counts[tag] }; }).sort(function (a, b) { return b.n - a.n || String(a.tag).localeCompare(String(b.tag)); }); }
function c360Artefacts(clientName) { return [{ title: clientName + ' VDI Access Guide', desc: 'Remote access + MFA setup for delivery team' }, { title: 'Global Invoicing Process & Escalation Matrix', desc: 'PO / invoice flow + finance contacts' }, { title: 'Salesforce Linking SOP', desc: 'Opp to Connected record linking standard' }]; }
function centerImpactOf(m) {
  if (m && typeof m.impactScore === 'number') return m.impactScore;
  if (m && typeof m.impact === 'number') return m.impact > 1 ? Math.max(0, Math.min(1, m.impact / 5)) : m.impact;
  return 0.7;
}
function centerIsNoise(m) {
  return centerImpactOf(m) < 0.5 || String((m && m.type) || '') === 'generic_chatter';
}
function centerMatch(t, proj) {
  if (!t || !proj) return false;
  return t.Project_ReferenceID === proj.Project_ReferenceID || t.project_name === proj.project_name || t.projectId === proj.project_name;
}
function centerAge(m) { return String((m && (m.timestamp || m.age)) || ''); }
function centerTitle(m) { return String((m && (m.title || m.synthesizedText || m.content || m.detail)) || 'Untitled'); }
function centerKeyIcon(m) {
  const hay = [centerTitle(m), String((m && m.type) || ''), String((m && m.source) || '')].join(' ').toLowerCase();
  if (hay.indexOf('risk') >= 0 || hay.indexOf('blocked') >= 0 || hay.indexOf('depleted') >= 0) return '⚑';
  if (hay.indexOf('extension') >= 0 || hay.indexOf('approv') >= 0) return '↗';
  if (hay.indexOf('stakeholder') >= 0 || hay.indexOf('joined') >= 0 || hay.indexOf('resource') >= 0) return '＋';
  if (hay.indexOf('expansion') >= 0 || hay.indexOf('new po') >= 0 || hay.indexOf('po-') >= 0) return '◍';
  return '↗';
}
function scrollToTimelineCard(id) {
  try {
    const el = document.getElementById('tl-' + String(id || ''));
    if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } catch (e) {}
}
export function AppCenter(p) {
  const active = p.active;
  if (p.mode === 'client360') {
    const c360Name = p.c360 || (active && active.client_name) || '';
    const c360Projs = c360Projects(p, c360Name);
    const c360Dir = c360Directory(c360Projs);
    const c360ThemeArr = c360Themes(c360Projs, p.timeline);
    const c360Back = active && active.project_name ? ('Back to ' + active.project_name) : 'Back to project';
    const c360Domains = (p.domains || []).map((d) => htmlC`<span key=${d} className="px-3 py-1 rounded-full bg-[#f0f7ff] border border-[#bfdbfe] text-[11px]">${d}</span>`);
    const c360Cards = c360Projs.map((pr) => htmlC`<button key=${pr.Project_ReferenceID} onClick=${() => { if (p.onPickProject) p.onPickProject(pr.Project_ReferenceID); }} className="text-left rounded-[16px] bg-white border border-[#e5e7eb] p-4 shadow-sm hover:shadow-md transition"><div className="font-semibold text-[13px]">${pr.project_name}</div><div className="mt-1 text-[11px] text-[#6b7280] break-all">${pr.Project_ReferenceID}</div><div className="mt-2 text-[11px]">${c360Count(p.timeline, p.notes, pr)} timeline / Data Park assets</div><div className="mt-2 text-[11px] text-[#1e40af] underline">Open project</div></button>`);
    const c360Grid = c360Cards.length ? c360Cards : [htmlC`<div className="rounded-[16px] bg-white border border-dashed p-4 text-[12px]">No projects found for this client.</div>`];
    const c360DirRows = c360Dir.map((c) => htmlC`<div key=${c.email || c.name} className="p-2 rounded-[12px] bg-[#f9fafb] border"><div className="text-[12px]"><a href=${'mailto:' + c.email} className="font-medium text-[#1e40af] underline">${c.email || c.name}</a><span className="ml-2 text-[11px]">${c.role}</span></div><div className="mt-1 text-[11px] text-[#6b7280]">${c.name}</div><div className="mt-1 flex flex-wrap gap-1">${c.projects.map((pn) => htmlC`<span key=${pn} className="px-2 py-0.5 rounded-full bg-[#D6E8FF] border text-[10px]">${pn}</span>`)}</div></div>`);
    const c360DirBody = c360DirRows.length ? c360DirRows : [htmlC`<div className="text-[11px] italic">No contacts yet.</div>`];
    const c360ThemeChips = c360ThemeArr.map((t) => htmlC`<span key=${t.tag} className="px-3 py-1 rounded-full bg-[#FFF5D6] border text-[11px]">${t.tag}<span className="ml-1">x${t.n}</span></span>`);
    const c360ThemeBody = c360ThemeChips.length ? c360ThemeChips : [htmlC`<div className="text-[11px] italic">No AI tags yet.</div>`];
    const c360Arts = c360Artefacts(c360Name).map((a) => htmlC`<a key=${a.title} href="#" onClick=${(e) => { if (e && e.preventDefault) e.preventDefault(); }} className="flex gap-2 p-2 rounded-[12px] bg-[#f9fafb] border"><span className="text-[#1e40af]">↗</span><span><span className="block text-[12px] text-[#1e40af] underline">${a.title}</span><span className="block text-[11px] text-[#6b7280]">${a.desc}</span></span></a>`);
    return htmlC`<div className="flex-1 min-w-0 bg-[#fbfdfb]"><div className="p-4 lg:p-5 space-y-4"><div className="flex flex-wrap items-center gap-3"><button onClick=${p.onBack} className="px-3 py-1.5 rounded-full bg-white border border-[#bfdbfe] text-[12px]">← ${c360Back}</button><div><h2 className="text-[18px] font-semibold">${c360Name} — Client 360</h2><div className="text-[11px] text-[#6b7280]">${c360Projs.length} projects • ${c360Dir.length} contacts • ${c360ThemeArr.length} themes</div></div></div><div className="rounded-[16px] bg-white border border-[#e5e7eb] p-4"><div className="font-medium text-[13px]">Client Domains</div><div className="mt-2 flex gap-2 flex-wrap">${c360Domains}</div></div><div className="rounded-[16px] bg-white border border-[#e5e7eb] p-4"><div className="font-semibold text-[13px]">Active Projects</div><div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">${c360Grid}</div></div><div className="grid grid-cols-1 xl:grid-cols-2 gap-4"><div className="rounded-[16px] bg-white border border-[#e5e7eb] p-4"><div className="font-semibold text-[13px]">Global Client Directory</div><div className="mt-3 space-y-2">${c360DirBody}</div></div><div className="space-y-4"><div className="rounded-[16px] bg-white border border-[#e5e7eb] p-4"><div className="font-semibold text-[13px]">Trending Client Themes</div><div className="mt-3 flex flex-wrap gap-2">${c360ThemeBody}</div></div><div className="rounded-[16px] bg-white border border-[#e5e7eb] p-4"><div className="font-semibold text-[13px]">Global Client Artefacts</div><div className="mt-3 space-y-2">${c360Arts}</div></div></div></div></div></div>`;
  }
  if (!active) return htmlC`<div className="flex-1 min-w-0 bg-[#fbfdfb]"><div className="p-4 text-[12px]">No project selected</div></div>`;
  const gdpId = getGdpId(active);
  const connectedUrls = getConnectedUrls(active);
  const connectedIds = getConnectedIds(active);
  const spEntries = getSpEntries(active);
  const contacts = getContacts(active);
  const groups = ['Client', 'Internal', 'Support'];
  const gdpUrl = getGdpUrl(active);
  const oppChips = (active.opportunity_numbers || []).map((o) => htmlC`<span key=${o} className="text-[11px] px-2 py-0.5 rounded-full bg-[#E8D6FF] border">${o}</span>`);
  const projChips = (active.project_ids || []).map((id) => htmlC`<span key=${id} className="text-[11px] px-2 py-0.5 rounded-full bg-[#D6F5E8] border">${id}</span>`);
  const gdpLink = gdpUrl ? htmlC`<a href=${gdpUrl} target="_blank" rel="noopener noreferrer" className="text-[#1e40af] underline">${gdpUrl}</a>` : '—';
  const domainChips = (p.domains || []).map((d) => htmlC`<span key=${d} className="px-2 py-0.5 rounded-full bg-[#f0f7ff] border border-[#bfdbfe] text-[11px]">${d}</span>`);
  const kwChips = (p.keywords || []).map((k) => htmlC`<span key=${k} className="px-2 py-0.5 rounded-full bg-[#FFF5D6] border text-[11px]">${k}</span>`);
  const connRows = connectedUrls.length ? connectedUrls.map((u) => htmlC`<div key=${u} className="flex items-center gap-2 text-[11px] bg-white border rounded-[8px] px-2 py-1"><a href=${u} target="_blank" rel="noopener noreferrer" className="text-[#1e40af] underline">${u}</a><a href=${u} target="_blank" rel="noopener noreferrer" className="ml-auto text-[#1e40af] underline shrink-0">Open</a></div>`) : [htmlC`<div className="text-[11px]">No connected URL yet</div>`];
  const spLabels = ['Service review folder', 'Collaboration Plan', 'Risk Log', 'ESC File Site'];
  const spCards = spEntries.length ? spEntries.map((e) => htmlC`<div key=${e[0]} className="p-2 rounded-[8px] bg-[#f9fafb] border"><div className="text-[11px] font-medium">${e[0]}</div>${(e[1] || []).map((u) => htmlC`<div key=${u} className="mt-1 text-[11px]"><a href=${u} target="_blank" rel="noopener noreferrer" className="text-[#1e40af] underline">${u}</a></div>`)}</div>`) : spLabels.map((label) => htmlC`<div key=${label} className="p-2 rounded-[8px] bg-[#f9fafb] border"><div className="text-[11px] font-medium">${label}</div><div className="mt-1 text-[11px]">— no link yet</div></div>`);
  const contactRow = (c) => htmlC`<div key=${c.email || c.name} className="flex items-center gap-2 p-1.5 rounded-[8px] bg-[#f0f7ff] border border-[#bfdbfe] text-[11px]"><a href=${'mailto:' + c.email} className="font-medium text-[#1e40af] underline">${c.email}</a>${copyBtn(c.email, 'Copy email')}<span>${c.role}</span>${copyBtn(c.role, 'Copy role')}<span className="text-[#6b7280]">${c.name}</span>${copyBtn(c.name, 'Copy name')}</div>`;
  const stakeGroups = groups.map((g) => htmlC`<div key=${g} className="mt-3"><div className="text-[11px] font-semibold text-[#6b7280]">${g}</div><div className="mt-1 space-y-1">${contacts.filter((c) => (c.group || 'Client') === g).map(contactRow)}</div></div>`);
  const stakeEmpty = contacts.length === 0 ? htmlC`<div className="mt-2 text-[11px] text-[#6b7280]">No stakeholders yet</div>` : null;
  const sectIds = htmlC`<div className="rounded-[12px] bg-white border p-3"><div className="text-[11px] font-medium">IDs</div><div className="mt-2 flex flex-wrap gap-1">${projChips}${oppChips}<span className="px-2 py-0.5 rounded-full bg-[#D6E8FF] border text-[11px]">GDP ${gdpId || '—'}</span></div></div>`;
  const sectUrls = htmlC`<div className="rounded-[12px] bg-white border p-3"><div className="text-[11px] font-medium">URLs</div><div className="mt-1 text-[11px]">GDP: ${gdpLink}</div><div className="mt-2"><div className="text-[11px] font-medium">Connected Record URLs</div><div className="mt-2 space-y-1">${connRows}</div></div><div className="mt-2"><div className="text-[11px] font-medium">SharePoint URLs</div><div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">${spCards}</div></div></div>`;
  const sectStake = htmlC`<div className="rounded-[12px] bg-white border p-3"><div className="text-[11px] font-medium">Stakeholders</div>${stakeGroups}${stakeEmpty}</div>`;
  const sectMeta = htmlC`<div className="grid grid-cols-1 md:grid-cols-2 gap-3"><div className="rounded-[12px] bg-white border p-3"><div className="text-[11px] font-medium">Client Domains</div><div className="mt-2 flex flex-wrap gap-1">${domainChips}</div></div><div className="rounded-[12px] bg-white border p-3"><div className="text-[11px] font-medium">Filter Keywords</div><div className="mt-2 flex flex-wrap gap-1">${kwChips}</div></div></div>`;
  const personaBadge = p.activePersona ? htmlC`<span className="text-[11px] px-2 py-0.5 rounded-full bg-white border">Viewing as ${p.activePersona}</span>` : null;
  const detailsBody = p.detailsOpen ? htmlC`<div className="mt-4 border-t pt-4 space-y-4"><div><div className="font-medium">Project overview</div></div>${sectIds}${sectUrls}${sectStake}${sectMeta}</div>` : null;
  // Two-tier Center Panel: compact Key Moments (top 5 privacy-filtered timelineSlot cards)
  // above the full rich Status Cards feed. Uses raw timeline/notes props so App.js stays untouched;
  // falls back to timelineSlot props when the raw arrays are unavailable.
  const slotProps = (p.timelineSlot && p.timelineSlot.props) ? p.timelineSlot.props : {};
  const slotTimeline = Array.isArray(slotProps.timeline) ? slotProps.timeline : (Array.isArray(p.timeline) ? p.timeline : []);
  const slotNotes = Array.isArray(slotProps.notes) ? slotProps.notes : (Array.isArray(p.notes) ? p.notes : []);
  const centerProject = slotProps.project || active;
  const centerScoped = slotTimeline.filter((t) => centerMatch(t, centerProject));
  const centerFiltered = centerScoped.filter((t) => !centerIsNoise(t));
  const centerTop5 = centerFiltered.slice().sort((a, b) => centerImpactOf(b) - centerImpactOf(a)).slice(0, 5);
  const keyRows = centerTop5.length ? centerTop5.map((m) => {
    const age = centerAge(m);
    const title = centerTitle(m);
    const icon = centerKeyIcon(m);
    const key = String(m.id || m.title || title);
    return htmlC`<button key=${key} onClick=${() => scrollToTimelineCard(m.id)} className="w-full text-left flex items-center gap-3 p-2.5 rounded-[12px] bg-white border border-[#E6EAF2] hover:border-[#A8C6F0] hover:shadow-sm transition"><span className="w-7 h-7 rounded-full bg-[#E8F2FF] border border-[#A8C6F0] flex items-center justify-center text-[12px] font-bold text-[#1F4A7A] shrink-0">${icon}</span><span className="text-[11px] font-semibold text-[#64748B] min-w-[52px] shrink-0">${age}</span><span className="text-[13px] text-[#1E293B] flex-1 min-w-0 truncate" title=${title}>${title}</span><span className="text-[11px] text-[#1F4A7A] font-medium shrink-0">→ View Card</span></button>`;
  }) : [htmlC`<div className="p-2.5 rounded-[12px] bg-white border border-[#E6EAF2] text-[12px] text-[#64748B]">No key moments yet — run Harvester Control to ingest.</div>`];
  const keyMoments = htmlC`<div className="mt-4 rounded-[16px] bg-[#EEF6FF] border border-[#dbeafe] p-4"><div className="flex items-center justify-between gap-2 flex-wrap"><h3 className="text-[13px] font-semibold">Key Moments — Last 5</h3><span className="text-[11px] px-2 py-0.5 rounded-full bg-white border border-[#A8C6F0] text-[#1F4A7A]">Top 5 by impact — noise filtered</span></div><div className="mt-3 space-y-2.5">${keyRows}</div></div>`;
  const statusFeed = slotNotes.length || centerScoped.length ? p.timelineSlot : null;
  const archivedRows = (p.archived || []).map((a) => htmlC`<div key=${a.Project_ReferenceID} className="p-2 rounded-[8px] bg-[#f3f4f6] border text-[11px]">${a.project_name} — ${a.archived_justification || ''}</div>`);
  return htmlC`<div className="flex-1 min-w-0 bg-[#fbfdfb]"><div className="p-4 lg:p-5 space-y-5 relative"><div className="rounded-[16px] bg-white border border-[#e5e7eb] shadow-sm p-4 relative"><div className="flex flex-wrap items-center gap-2"><div className="min-w-0 flex flex-wrap items-center gap-2"><h2 className="text-[16px] font-semibold leading-tight">${active.project_name}</h2>${oppChips}${projChips}${personaBadge}</div><div className="ml-auto flex gap-2"><button onClick=${p.onEdit} className="px-3 py-1 rounded-full bg-white border border-[#bfdbfe] text-[11px] font-medium">Edit Project Details</button><button onClick=${p.onDetails} className="px-3 py-1 rounded-full bg-[#f0f7ff] border border-[#bfdbfe] text-[11px]">${p.detailsOpen ? 'Collapse' : 'Expand'}</button></div></div><div className="mt-1 text-[11px] text-[#6b7280]">${active.Project_ReferenceID} • Created ${p.fmt(active.created_at)} • Last updated ${p.fmt(active.updated_at || active.created_at)}</div>${p.editSlot}${detailsBody}${keyMoments}<div className="mt-4"><div className="text-[13px] font-semibold">Status Cards</div><div className="mt-2">${statusFeed}</div></div></div><div className="mt-3 p-2 rounded-[8px] bg-[#f3f4f6] border border-dashed text-[11px]">Archived (${(p.archived || []).length})</div><div className="mt-2 space-y-1">${archivedRows}</div></div></div>`;
}
