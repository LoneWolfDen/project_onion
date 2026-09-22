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
export function AppCenter(p) {
  const active = p.active;
  if (p.mode === 'client360') {
    return htmlC`<div className="flex-1 min-w-0 bg-[#fbfdfb]"><div className="p-5 space-y-4"><div className="flex items-center gap-3"><button onClick=${p.onBack} className="px-3 py-1.5 rounded-full bg-white border border-[#bfdbfe] flex items-center gap-1 text-[12px]">Back</button><h2 className="text-[18px] font-semibold">${p.c360} — Client 360</h2></div><div className="rounded-[16px] bg-white border border-[#e5e7eb] p-4"><div className="font-medium">Domains</div><div className="mt-2 flex gap-2 flex-wrap">${(p.domains || []).map((d) => htmlC`<span key=${d} className="px-3 py-1 rounded-full bg-[#f0f7ff] border border-[#bfdbfe] text-[11px]">${d}</span>`)}</div></div></div></div>`;
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
  const detailsBody = p.detailsOpen ? htmlC`<div className="mt-4 border-t pt-4 space-y-4"><div><div className="font-medium">Project overview</div></div>${sectIds}${sectUrls}${sectStake}${sectMeta}</div>` : null;
  const archivedRows = (p.archived || []).map((a) => htmlC`<div key=${a.Project_ReferenceID} className="p-2 rounded-[8px] bg-[#f3f4f6] border text-[11px]">${a.project_name} — ${a.archived_justification || ''}</div>`);
  return htmlC`<div className="flex-1 min-w-0 bg-[#fbfdfb]"><div className="p-4 lg:p-5 space-y-5 relative"><div className="rounded-[16px] bg-white border border-[#e5e7eb] shadow-sm p-4 relative"><div className="flex flex-wrap items-center gap-2"><div className="min-w-0 flex flex-wrap items-center gap-2"><h2 className="text-[16px] font-semibold leading-tight">${active.project_name}</h2>${oppChips}${projChips}</div><div className="ml-auto flex gap-2"><button onClick=${p.onEdit} className="px-3 py-1 rounded-full bg-white border border-[#bfdbfe] text-[11px] font-medium">Edit Project Details</button><button onClick=${p.onDetails} className="px-3 py-1 rounded-full bg-[#f0f7ff] border border-[#bfdbfe] text-[11px]">${p.detailsOpen ? 'Collapse' : 'Expand'}</button></div></div><div className="mt-1 text-[11px] text-[#6b7280]">${active.Project_ReferenceID} • Created ${p.fmt(active.created_at)} • Last updated ${p.fmt(active.updated_at || active.created_at)}</div>${p.editSlot}${detailsBody}${p.timelineSlot}</div><div className="mt-3 p-2 rounded-[8px] bg-[#f3f4f6] border border-dashed text-[11px]">Archived (${(p.archived || []).length})</div><div className="mt-2 space-y-1">${archivedRows}</div></div></div>`;
}
