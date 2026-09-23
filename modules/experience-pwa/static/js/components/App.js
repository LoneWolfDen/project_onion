// App orchestrator P1 — imports + state + helpers.
import { OnionDB, readLocal, writeLocal } from '../core/FailoverDB.js';
import { TimelineCard } from './TimelineCard.js';
import { HarvesterPanel, toPayload } from './HarvesterPanel.js';
import { ProjectModal } from './ProjectModal.js';
import { AppLeft } from './AppLeft.js';
import { AppCenter } from './AppCenter.js';
import { AppRight } from './AppRight.js';
import { genProjectReferenceID, projectIdEquals, stripLeadingZeros } from '../core/schema.js';
import { askSmartAssistant } from '../core/AiClient.js';
import { piiScreen } from '../core/PiiGate.js';
const { useState, useEffect, useMemo } = window.React;
const html = window.htm.bind(window.React.createElement);
function fmtDate(iso) { try { const d = new Date(iso); const p = (n) => String(n).padStart(2, '0'); return p(d.getDate()) + '/' + p(d.getMonth() + 1) + '/' + d.getFullYear(); } catch (e) { return ''; } }
function clientKw(clientName, clients) { const c = (clients || []).find((x) => x.account_name === clientName); return (c && c.keywords) || []; }
function projText(p, clients) { return [p.project_name, p.Project_ReferenceID, (p.project_ids || []).join(' '), (p.opportunity_numbers || []).join(' '), (p.connected_record_urls || []).join(' '), (p.salesforceUrls || []).join(' '), p.client_name, (clientKw(p.client_name, clients) || []).join(' ')].join(' ').toLowerCase(); }
function normProjIds(arr) { return [...new Set((Array.isArray(arr) ? arr : [arr]).map((x) => String(x || '').trim()).filter(Boolean).map((x) => (/^\d+$/.test(x) ? stripLeadingZeros(x) : x)))]; }
// Smart Assistant exact-phrase query helpers (quote-aware, shared with AppRight filter):
// #Risk_Watch + 'Not Signed' => terms [#Risk_Watch, "Not Signed"(exact)].
// Bare words => substring tokens; quoted spans => exact contiguous substring.
function parseAssistantTerms(query) {
  const q = String(query || '').trim();
  if (!q) return [];
  const terms = [];
  const re = /"([^"]+)"|'([^']+)'|(\S+)/g;
  let m = null;
  while ((m = re.exec(q)) !== null) {
    const quoted = (m[1] !== undefined ? m[1] : (m[2] !== undefined ? m[2] : null));
    if (quoted !== null && quoted !== undefined) {
      const t = String(quoted).trim().toLowerCase();
      if (t) terms.push(t);
    } else {
      const tok = String(m[3] || '').trim();
      if (!tok || tok === '+') continue;
      const low = tok.toLowerCase();
      if (low === 'and' || low === 'or') continue;
      terms.push(low);
    }
  }
  return terms;
}
function assistantHaystack(t) {
  const tags = Array.isArray(t && t.tags) ? t.tags.join(' ') : '';
  return [t.title, t.detail, t.content, t.synthesizedText, t.source, t.type, tags].join(' ').toLowerCase();
}
function matchesAssistantQuery(t, query) {
  const terms = parseAssistantTerms(query);
  if (!terms.length) return true;
  const hay = assistantHaystack(t);
  return terms.every((term) => hay.indexOf(term) !== -1);
}
export function App() {
  const [db, setDb] = useState(() => readLocal());
  useEffect(() => OnionDB.subscribe(setDb), []);
  const [client, setClient] = useState('ALL Clients');
  const [q, setQ] = useState('');
  const [activeRef, setActiveRef] = useState(null);
  const [mode, setMode] = useState('project');
  const [c360, setC360] = useState('Acme Corp');
  const [privacy, setPrivacy] = useState('Both');
  const [activePersona, setActivePersona] = useState('Brené');
  const [focusId, setFocusId] = useState(null);
  const [ask, setAsk] = useState('');
  const [assistantAnswer, setAssistantAnswer] = useState('');
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [assistantSources, setAssistantSources] = useState([]);
  const [editOpen, setEditOpen] = useState(false);
  const [regOpen, setRegOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [staged, setStaged] = useState([]);
  const [hStatus, setHStatus] = useState('');
  const [clip, setClip] = useState('');
  const [hFrom, setHFrom] = useState('');
  const [hTo, setHTo] = useState('');
  const [hOpen, setHOpen] = useState(false);
  const [mName, setMName] = useState('');
  const [mOpp, setMOpp] = useState(''); const [mOppList, setMOppList] = useState(['']);
  const [mProj, setMProj] = useState(''); const [mProjList, setMProjList] = useState(['']);
  const [mAccount, setMAccount] = useState('Acme Corp');
  const [mJust, setMJust] = useState('');
  const [mErr, setMErr] = useState('');
  const [mGdp, setMGdp] = useState('');
  const [mConnected, setMConnected] = useState(''); const [mConnList, setMConnList] = useState(['']);
  const [mOppConnList, setMOppConnList] = useState([{ oppId: '', connectedUrl: '' }]);
  const [mKeywords, setMKeywords] = useState('');
  const [mContacts, setMContacts] = useState([{ email: '', name: '', role: '' }]);
  const [mSharepoint, setMSharepoint] = useState({ 'Service review folder': '', 'Collaboration Plan': '', 'Risk Log': '', 'ESC File Site': '' });
  const setMSharepointField = (label, val) => setMSharepoint((prev) => Object.assign({}, prev, { [label]: val }));
  const pushField = (setter) => setter((prev) => (Array.isArray(prev) ? prev : ['']).concat(['']));
  const setMContactItem = (idx, field, val) => { setMContacts((prev) => { const a = (Array.isArray(prev) ? prev : [{ email: '', name: '', role: '' }]).slice(); const cur = (a[idx] && typeof a[idx] === 'object') ? Object.assign({}, a[idx]) : { email: '', name: '', role: '' }; if (typeof field === 'string' && val !== undefined) cur[field] = val; else if (typeof field === 'string') cur.email = field; else cur.email = field; a[idx] = cur; return a; }); };
  const setMOppItem = (i, v) => { setMOppList((p) => { const a = (p || ['']).slice(); a[i] = v; return a; }); if (i === 0) setMOpp(v); };
  const setMProjItem = (i, v) => { setMProjList((p) => { const a = (p || ['']).slice(); a[i] = v; return a; }); if (i === 0) setMProj(v); };
  const setMConnItem = (i, v) => { setMConnList((p) => { const a = (p || ['']).slice(); a[i] = v; return a; }); if (i === 0) setMConnected(v); };
  const setMOppConnItem = (i, field, v) => { setMOppConnList((p) => { const a = (Array.isArray(p) && p.length ? p : [{ oppId: '', connectedUrl: '' }]).map((x) => Object.assign({}, x)); while (a.length <= i) a.push({ oppId: '', connectedUrl: '' }); a[i][field] = v; return a; }); if (field === 'oppId') { setMOppList((p) => { const a = (p || ['']).slice(); while (a.length <= i) a.push(''); a[i] = v; return a; }); if (i === 0) setMOpp(v); } if (field === 'connectedUrl') { setMConnList((p) => { const a = (p || ['']).slice(); while (a.length <= i) a.push(''); a[i] = v; return a; }); if (i === 0) setMConnected(v); } };
  const pushOppConn = () => { setMOppConnList((p) => (Array.isArray(p) ? p : []).concat([{ oppId: '', connectedUrl: '' }])); pushField(setMOppList); pushField(setMConnList); };
  const [approved, setApproved] = useState(new Set());
  const setProject = (refId) => {
    setActiveRef(refId);
    setMode('project');
    try {
      const proj = (db.projects || []).find((pp) => pp && pp.Project_ReferenceID === refId);
      if (proj && proj.client_name) { setClient(proj.client_name); setC360(proj.client_name); }
    } catch (e) {}
  };
  const handleApproveCard = async (cardId) => {
    setApproved((prev) => { const n = new Set(prev); n.add(cardId); return n; });
    try {
      const s = readLocal();
      let touched = null;
      (s.timeline || []).forEach((t) => { if (t && String(t.id) === String(cardId)) { t.piiStatus = 'Approved'; if (!t.syncStatus) t.syncStatus = 'pending_upload'; touched = t; } });
      (s.notes || []).forEach((nn) => { if (nn && String(nn.id) === String(cardId)) { nn.piiStatus = 'Approved'; touched = touched || nn; } });
      writeLocal(s);
      try {
        const isNote = (s.notes || []).some((nn) => nn && String(nn.id) === String(cardId));
        if (isNote && touched && OnionDB && OnionDB.saveNote) { await OnionDB.saveNote(Object.assign({}, touched, { piiStatus: 'Approved' })); }
      } catch (e) {}
    } catch (e) {}
  };
  const clients = (db.clients || []).map((c) => c.account_name);
  const projects = useMemo(() => {
    let d = [...(db.projects || [])];
    if (client !== 'ALL Clients') d = d.filter((p) => p.client_name === client);
    const s = q.trim().toLowerCase();
    if (s) d = d.filter((p) => projText(p, db.clients).includes(s));
    return d.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [db, client, q]);
  const active = useMemo(() => (db.projects || []).find((p) => p.Project_ReferenceID === (activeRef || (projects[0] && projects[0].Project_ReferenceID))) || projects[0] || null, [db, activeRef, projects]);
  const archived = db.archived || [];
  const clientMeta = (db.clients || []).find((c) => c.account_name === (active && active.client_name));
  const domains = (clientMeta && clientMeta.domains) || [];
  const keywords = [...new Set(((clientMeta && clientMeta.keywords) || []).concat((active && (active.keywords || active.filter_keywords)) || []))];
  function firstSpUrl(sp, label) {
    if (!sp || typeof sp !== 'object' || Array.isArray(sp)) return '';
    const v = sp[label];
    if (Array.isArray(v)) return String(v[0] || '');
    return v ? String(v) : '';
  }
  function spToState(sp) {
    return { 'Service review folder': firstSpUrl(sp, 'Service review folder'), 'Collaboration Plan': firstSpUrl(sp, 'Collaboration Plan'), 'Risk Log': firstSpUrl(sp, 'Risk Log'), 'ESC File Site': firstSpUrl(sp, 'ESC File Site') };
  }
  function firstGdpUrl(a) {
    if (!a) return '';
    if (a.gdp_url) return String(a.gdp_url);
    if (Array.isArray(a.gdp_urls) && a.gdp_urls[0]) return String(a.gdp_urls[0]);
    if (a.gdpUrl) return String(a.gdpUrl);
    return '';
  }
  function firstConnectedUrl(a) {
    if (!a) return '';
    if (Array.isArray(a.connected_record_urls) && a.connected_record_urls[0]) return String(a.connected_record_urls[0]);
    if (Array.isArray(a.salesforceUrls) && a.salesforceUrls[0]) return String(a.salesforceUrls[0]);
    return '';
  }
  function extractGdpId(url) {
    const m = String(url || '').match(/project-details\/(\d+)/);
    return m ? m[1] : '';
  }
  function extractConnectedId(url) {
    const m = String(url || '').match(/\/([A-Za-z0-9]{15,18})(?:[\/?]|$)/);
    if (m && /^006[A-Za-z0-9]{12,15}$/.test(m[1])) return m[1];
    return '';
  }
  function buildSharepoint(state) {
    const out = {};
    Object.keys(state || {}).forEach((k) => { const v = String((state || {})[k] || '').trim(); if (v) out[k] = [v]; });
    return out;
  }
  const openReg = () => { setMName(''); setMOpp(''); setMOppList(['']); setMProj(''); setMProjList(['']); setMAccount(client !== 'ALL Clients' ? client : (clients[0] || '')); setMJust(''); setMErr(''); setMGdp(''); setMConnected(''); setMConnList(['']); setMOppConnList([{ oppId: '', connectedUrl: '' }]); setMKeywords(''); setMContacts([{ email: '', name: '', role: '', group: 'Client' }]); setMSharepoint({ 'Service review folder': '', 'Collaboration Plan': '', 'Risk Log': '', 'ESC File Site': '' }); setRegOpen(true); };
  const cleanStrs = (arr) => [...new Set((Array.isArray(arr) ? arr : [arr]).map((x) => String(x || '').trim()).filter(Boolean))];
  const contactEmails = (a) => ((a && (a.contacts || a.stakeholders)) || []).map((c) => (typeof c === 'string' ? c : (c.email || c.name || ''))).map((x) => String(x || '').trim()).filter(Boolean);
  const contactsToState = (a) => { const raw = ((a && (a.contacts || a.stakeholders)) || []); const mapped = raw.map((c) => (typeof c === 'string' ? { email: c, name: '', role: '', group: 'Client' } : { email: c.email || '', name: c.name || '', role: c.role || '', group: c.group || 'Client' })).filter((c) => c.email || c.name || c.role); return mapped.length ? mapped : [{ email: '', name: '', role: '', group: 'Client' }]; };
  const oppConnToState = (a) => { const opps = (a && a.opportunity_numbers) || []; const urls = allConnectedUrls(a); const n = Math.max(opps.length, urls.length, 1); const out = []; for (let i = 0; i < n; i++) out.push({ oppId: String(opps[i] || ''), connectedUrl: String(urls[i] || '') }); return out; };
  const allConnectedUrls = (a) => { const u = (Array.isArray(a.connected_record_urls) ? a.connected_record_urls : []).concat(Array.isArray(a.salesforceUrls) ? a.salesforceUrls : []); return [...new Set(u.map(String))].filter(Boolean); };
  const openEdit = () => { if (!active) return; setMName(active.project_name); setMOpp((active.opportunity_numbers || [])[0] || ''); setMOppList(((active.opportunity_numbers || []).length ? active.opportunity_numbers : ['']).map(String)); setMProj(''); setMProjList(['']); setMAccount(active.client_name); setMJust(''); setMErr(''); setMGdp(firstGdpUrl(active)); setMConnected(firstConnectedUrl(active)); setMConnList((allConnectedUrls(active).length ? allConnectedUrls(active) : [''])); setMOppConnList(oppConnToState(active)); setMKeywords(((active.keywords || active.filter_keywords) || []).join(', ')); setMContacts(contactsToState(active)); setMSharepoint(spToState(active.sharepoint_urls || active.sharepoint || null)); setEditOpen(true); };
  const parseWb = async (file, source) => {
    if (!file || !window.XLSX || !active) return;
    const buf = await file.arrayBuffer();
    const wb = window.XLSX.read(new Uint8Array(buf), { type: 'array' });
    const rows = window.XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
    const out = [];
    rows.forEach((r, i) => {
      const pid = String(r['Project ID'] || r['ProjectID'] || '').trim();
      const opp = String(r['Opportunity ID'] || r['Opp ID'] || '').trim();
      const desc = String(r['Description'] || r['Summary'] || r['Title'] || '');
      const hp = pid && (active.project_ids || []).some((h) => projectIdEquals(pid, h));
      const ho = opp && (active.opportunity_numbers || []).includes(opp);
      if (!hp && !ho) return;
      const s = piiScreen(desc);
      out.push(toPayload({ id: 'excel-' + Date.now() + '-' + i, projectId: active.project_name, type: 'Excel', title: 'Excel row ' + (i + 1), source, content: s.text, piiStatus: s.flag }));
    });
    out.forEach((o) => { if (o && !o.privacy) o.privacy = 'Team Shared'; });
    setStaged((p) => p.concat(out));
    setHStatus('Staged ' + out.length + ' hits from ' + source + '.');
  };
  const modalAddProps = { oppList: mOppList, setOppItem: setMOppItem, onAddOpp: () => pushField(setMOppList), projList: mProjList, setProjItem: setMProjItem, onAddProj: () => pushField(setMProjList), connList: mConnList, setConnItem: setMConnItem, onAddConn: () => pushField(setMConnList), oppConnList: mOppConnList, setOppConnItem: setMOppConnItem, onAddOppConn: pushOppConn, keywords: mKeywords, setKeywords: setMKeywords, contactList: mContacts, setContactItem: setMContactItem, onAddContact: () => setMContacts((p) => (Array.isArray(p) ? p : []).concat([{ email: '', name: '', role: '', group: 'Client' }])) };
  const editSlot = editOpen && active ? html`<${ProjectModal} mode="edit" project=${active} clients=${clients} name=${mName} setName=${setMName} opp=${mOpp} setOpp=${setMOpp} oppList=${modalAddProps.oppList} setOppItem=${modalAddProps.setOppItem} onAddOpp=${modalAddProps.onAddOpp} projId=${mProj} setProjId=${setMProj} projList=${modalAddProps.projList} setProjItem=${modalAddProps.setProjItem} onAddProj=${modalAddProps.onAddProj} account=${mAccount} setAccount=${setMAccount} just=${mJust} setJust=${setMJust} err=${mErr} gdp=${mGdp} setGdp=${setMGdp} connected=${mConnected} setConnected=${setMConnected} connList=${modalAddProps.connList} setConnItem=${modalAddProps.setConnItem} onAddConn=${modalAddProps.onAddConn} oppConnList=${modalAddProps.oppConnList} setOppConnItem=${modalAddProps.setOppConnItem} onAddOppConn=${modalAddProps.onAddOppConn} keywords=${modalAddProps.keywords} setKeywords=${modalAddProps.setKeywords} contactList=${modalAddProps.contactList} setContactItem=${modalAddProps.setContactItem} onAddContact=${modalAddProps.onAddContact} sharepoint=${mSharepoint} setSharepoint=${setMSharepointField} onClose=${() => setEditOpen(false)} onSave=${async () => {
    if (!mName.trim()) { setMErr('Project name [Mandatory]'); return; }
    const needOpp = cleanStrs((mOppConnList || []).map((x) => x.oppId).concat(mOppList || []).concat([mOpp]));
    if (!needOpp.length) { setMErr('Opportunity ID [Mandatory]'); return; }
    const mergedIds = normProjIds((active.project_ids || []).concat(mProjList || []).concat([mProj]));
    const uiOppsEdit = cleanStrs((mOppConnList || []).map((x) => x.oppId).concat(mOppList || []).concat([mOpp]));
    const opps = cleanStrs((active.opportunity_numbers || []).concat(uiOppsEdit));
    const gdpUrl = mGdp.trim();
    const gdpId = extractGdpId(gdpUrl) || active.gdp_id || active.gdpId || '';
    const mergedConnUrls = cleanStrs((active.connected_record_urls || active.salesforceUrls || []).concat((mOppConnList || []).map((x) => x.connectedUrl)).concat(mConnList || []).concat([mConnected]));
    const connIds = (active.connected_record_ids || []).slice();
    for (const u of mergedConnUrls) { const cid = extractConnectedId(u); if (cid && !connIds.includes(cid)) connIds.push(cid); }
    const uiContacts = (Array.isArray(mContacts) ? mContacts : []).map((c) => (typeof c === 'string' ? { email: String(c || '').trim(), name: '', role: '', group: 'Client' } : { email: String(c.email || '').trim(), name: String(c.name || '').trim(), role: String(c.role || '').trim(), group: c.group || 'Client' })).filter((c) => c.email || c.name || c.role);
    const mergedContacts = uiContacts.length ? uiContacts : (contactEmails(active).length ? contactEmails(active).map((email) => ({ email, role: '', name: '', group: 'Client' })) : []);
    const keepContacts = (active.contacts && active.contacts.length ? active.contacts : active.stakeholders) || null;
    const sp = buildSharepoint(mSharepoint);
    const kwArr = cleanStrs(String(mKeywords || '').split(',').map((x) => x.trim()).concat((active.keywords || active.filter_keywords) || []));
    await (window.OnionDB || OnionDB).saveProject(Object.assign({}, active, { project_name: mName.trim(), client_name: mAccount || active.client_name, opportunity_numbers: opps, project_ids: mergedIds, gdp_url: gdpUrl, gdp_urls: gdpUrl ? [gdpUrl] : (active.gdp_urls || []), gdp_id: gdpId, gdpId, gdpUrl, connected_record_urls: mergedConnUrls, salesforceUrls: mergedConnUrls, connected_record_ids: connIds, contacts: (mergedContacts.length ? mergedContacts : keepContacts), stakeholders: (mergedContacts.length ? mergedContacts : (active.stakeholders || null)), keywords: kwArr, filter_keywords: kwArr, sharepoint_urls: sp, sharepoint: sp, syncStatus: 'pending_upload' }));
    setEditOpen(false);
  }} onArchive=${async () => {
    if (!mJust.trim()) { setMErr('Archive justification mandatory'); return; }
    await OnionDB.archiveProject(active.Project_ReferenceID, mJust.trim());
    setEditOpen(false);
  }} />` : null;
  const regSlot = regOpen ? html`<${ProjectModal} mode="register" project=${null} clients=${clients} name=${mName} setName=${setMName} opp=${mOpp} setOpp=${setMOpp} oppList=${modalAddProps.oppList} setOppItem=${modalAddProps.setOppItem} onAddOpp=${modalAddProps.onAddOpp} projId=${mProj} setProjId=${setMProj} projList=${modalAddProps.projList} setProjItem=${modalAddProps.setProjItem} onAddProj=${modalAddProps.onAddProj} account=${mAccount} setAccount=${setMAccount} just=${mJust} setJust=${setMJust} err=${mErr} gdp=${mGdp} setGdp=${setMGdp} connected=${mConnected} setConnected=${setMConnected} connList=${modalAddProps.connList} setConnItem=${modalAddProps.setConnItem} onAddConn=${modalAddProps.onAddConn} oppConnList=${modalAddProps.oppConnList} setOppConnItem=${modalAddProps.setOppConnItem} onAddOppConn=${modalAddProps.onAddOppConn} keywords=${modalAddProps.keywords} setKeywords=${modalAddProps.setKeywords} contactList=${modalAddProps.contactList} setContactItem=${modalAddProps.setContactItem} onAddContact=${modalAddProps.onAddContact} sharepoint=${mSharepoint} setSharepoint=${setMSharepointField} onClose=${() => setRegOpen(false)} onSave=${async () => {
    if (!mName.trim()) { setMErr('Project name [Mandatory]'); return; }
    const oppNeed = cleanStrs((mOppConnList || []).map((x) => x.oppId).concat(mOppList || []).concat([mOpp]));
    if (!oppNeed.length) { setMErr('Opportunity ID [Mandatory]'); return; }
    if (!mAccount) { setMErr('Account Name [Mandatory]'); return; }
    const oppList = oppNeed;
    const projIds = normProjIds((mProjList || []).concat([mProj]));
    const gdpUrl = mGdp.trim();
    const gdpId = extractGdpId(gdpUrl);
    const connUrls = cleanStrs((mOppConnList || []).map((x) => x.connectedUrl).concat(mConnList || []).concat([mConnected]));
    const connIds = connUrls.map(extractConnectedId).filter(Boolean);
    const contactObjs = (Array.isArray(mContacts) ? mContacts : []).map((c) => (typeof c === 'string' ? { email: String(c || '').trim(), name: '', role: '', group: 'Client' } : { email: String(c.email || '').trim(), name: String(c.name || '').trim(), role: String(c.role || '').trim(), group: c.group || 'Client' })).filter((c) => c.email || c.name || c.role);
    const sp = buildSharepoint(mSharepoint);
    const kwArrNew = cleanStrs(String(mKeywords || '').split(',').map((x) => x.trim()));
    const existingRefs = (db.projects || []).map((p) => p.Project_ReferenceID);
    const ref = genProjectReferenceID(mName.trim(), oppList[0], new Date(), existingRefs);
    await (window.OnionDB || OnionDB).saveProject({ Project_ReferenceID: ref, anchor_id: ref, project_name: mName.trim(), client_name: mAccount, opportunity_numbers: oppList, project_ids: projIds, gdp_url: gdpUrl, gdp_urls: gdpUrl ? [gdpUrl] : [], gdp_id: gdpId, gdpId, gdpUrl, connected_record_urls: connUrls, salesforceUrls: connUrls, connected_record_ids: connIds, contacts: contactObjs, stakeholders: contactObjs, keywords: kwArrNew, filter_keywords: kwArrNew, sharepoint_urls: sp, sharepoint: sp, active: true, created_at: new Date().toISOString(), syncStatus: 'pending_upload' });
    setActiveRef(ref);
    setRegOpen(false);
  }} />` : null;
  const onAddNote = async (text, pv, reset) => { const v = String(text || '').trim(); if (!v || !active) return; const s = piiScreen(v); await (window.OnionDB || OnionDB).saveNote({ project_name: active.project_name, Project_ReferenceID: active.Project_ReferenceID, projectId: active.project_name, original: s.text, title: v.slice(0, 80), content: s.text, rephrased: s.text, privacy: pv || 'Team Shared', piiStatus: s.flag, syncStatus: 'pending_upload', refs: [], updates: [] }); if (reset) reset(''); };
  const onFlipPrivacy = async (note) => { if (!note || !note.id) return; const explicit = note.__nextPrivacy || null; const cur = String(note.__curPrivacy || 'Team Shared'); const next = explicit || ((cur === 'Private' || cur === 'My Notes (Private)' || cur === 'My Notes') ? 'Team Shared' : 'Private'); await (window.OnionDB || OnionDB).updateNotePrivacy(note.id, next); };
  const onAskAssistant = async (overridePrivacy) => {
    const pMode = String(overridePrivacy || privacy || 'Both');
    const qNow = String(ask || '').trim();
    if (!qNow) return;
    const scopedNow = scopedBaseFor(pMode);
    setAssistantLoading(true);
    try {
      const res = await askSmartAssistant(qNow, scopedNow, pMode);
      setAssistantAnswer(String((res && res.answer) || ''));
      setAssistantSources(Array.isArray(res && res.sources) ? res.sources.map(String) : []);
    } catch (e) {
      setAssistantAnswer('Assistant unavailable offline — showing raw references below.');
      setAssistantSources([]);
    } finally { setAssistantLoading(false); }
  };
  const onPrivacyChange = (v) => {
    setPrivacy(v);
    if (String(ask || '').trim() && assistantAnswer) {
      const scopedNext = scopedBaseFor(v);
      setAssistantLoading(true);
      askSmartAssistant(String(ask).trim(), scopedNext, v).then((res) => {
        setAssistantAnswer(String((res && res.answer) || ''));
        setAssistantSources(Array.isArray(res && res.sources) ? res.sources.map(String) : []);
      }).catch(() => {}).finally(() => setAssistantLoading(false));
    } else if (!String(ask || '').trim()) {
      setAssistantAnswer('');
      setAssistantSources([]);
    }
  };
  const onAskClear = (v) => { setAsk(v); if (!String(v || '').trim()) { setAssistantAnswer(''); setAssistantSources([]); setAssistantLoading(false); } };
  const onViewHit = (id) => { if (id) setFocusId(id); try { const el = document.getElementById('tl-' + id); if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) {} };
  const onApproveNote = (id) => handleApproveCard(id);
  const matchActive = (t) => !!active && !!t && (t.Project_ReferenceID === active.Project_ReferenceID || t.project_name === active.project_name || t.projectId === active.project_name);
  // Data Privacy Filter Matrix (strict, persona-synchronized):
  // - My Notes: ONLY card.privacy === 'My Notes' AND card.author === activePersona
  // - Team Shared: ONLY card.privacy === 'Team Shared' (no private notes)
  // - Both (Default): Team Shared PLUS My Notes where card.author === activePersona (never others' private notes)
  const isTeamSharedCard = (t) => String((t && t.privacy) || 'Team Shared') === 'Team Shared';
  const isMyNotesCard = (t) => { const v = String((t && t.privacy) || ''); return v === 'My Notes' || v === 'Private' || v === 'My Notes (Private)'; };
  const isAuthorMatch = (t) => String((t && t.author) || '') === String(activePersona || '');
  const scopeByPrivacyMode = (arr, pMode) => (Array.isArray(arr) ? arr : []).filter((t) => {
    const mode = String(pMode || privacy || 'Both');
    if (mode === 'My Notes') return isMyNotesCard(t) && isAuthorMatch(t);
    if (mode === 'Team Shared') return isTeamSharedCard(t);
    return isTeamSharedCard(t) || (isMyNotesCard(t) && isAuthorMatch(t));
  });
  const scopedBaseFor = (pMode) => active ? scopeByPrivacyMode((db.timeline || []).filter(matchActive).concat((db.notes || []).filter(matchActive)), pMode || privacy) : [];
  // Re-evaluated on every render: switching activePersona dropdown automatically refreshes timeline + Smart Assistant context.
  const contextCards = scopedBaseFor(privacy);
  const personaTimeline = scopeByPrivacyMode(db.timeline || [], privacy);
  const personaNotes = scopeByPrivacyMode(db.notes || [], privacy);
  const timelineSlot = active ? html`<${TimelineCard} project=${active} timeline=${personaTimeline} notes=${personaNotes} privacyFilter=${privacy} activePersona=${activePersona} focusId=${focusId} approved=${approved} onAddNote=${onAddNote} onFlipPrivacy=${onFlipPrivacy} onApprove=${handleApproveCard} />` : null;
  const askRaw = String(ask || '').trim();
  const hits = (askRaw ? contextCards.filter((t) => matchesAssistantQuery(t, askRaw)) : contextCards).slice(0, 3);
  return html`<div className="min-h-screen bg-[#fbfdfb] text-[13px] font-[Inter,system-ui] antialiased">
    <div className="sticky top-0 z-20 border-b border-[#d6e8ff]" style=${{ background: 'linear-gradient(90deg,#D6F5E8 0%,#D6E8FF 100%)' }}>
      <div className="px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-black text-white flex items-center justify-center font-bold text-[11px]">ON</div>
          <div className="font-semibold tracking-tight">Project Onion</div>
          <div className="text-[11px] text-[#6b7280] italic hidden md:block">Org Intelligence</div>
          <div className="h-4 w-px bg-[#bfdbfe] mx-1 hidden md:block"></div>
          <div className="flex items-center gap-1 bg-white rounded-full px-3 py-1 border border-[#bfdbfe] shadow-sm"><button onClick=${() => { setClient('ALL Clients'); setQ(''); setMode('project'); }} className="font-medium" title="Show all clients">All Clients</button>${active ? html`<span className="text-[#6b7280]">/</span><button onClick=${() => { setClient(active.client_name); setQ(''); setMode('client360'); setC360(active.client_name); }} className="font-medium" title="Filter to this client">${active.client_name}</button><span className="text-[#6b7280]">/</span><span className="font-semibold">${active.project_name}</span>` : (client !== 'ALL Clients' ? html`<span className="text-[#6b7280]">/</span><span className="font-medium">${client}</span>` : null)}</div>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[11px] text-[#6b7280]">Persona</label><select value=${activePersona} onChange=${(e) => setActivePersona(e.target.value)} className="bg-white border border-[#bfdbfe] rounded-full px-3 py-1 text-[11px] font-medium" title="Switch persona view"><option>Brené</option><option>Malcolm</option><option>Walter</option><option>Daniel</option></select>
          <div className="text-[11px] text-[#6b7280] italic flex items-center gap-1"><span className="w-2 h-2 bg-green-400 rounded-full animate-pulse inline-block"></span>Sync latest</div>
          <button onClick=${() => alert('Guide coming soon')} className="px-3 py-1 rounded-full bg-white border border-[#bfdbfe] text-[11px]">Guide</button>
        </div>
      </div>
    </div>
    <div className="flex flex-col lg:flex-row">
      <${AppLeft} client=${client} onClient=${(v) => { setClient(v); setQ(''); setMode('project'); }} clients=${clients} q=${q} setQ=${setQ} empty=${projects.length === 0} onRegister=${openReg} projects=${projects} fmt=${fmtDate} onPick=${(r) => setProject(r)} isActive=${(x) => active && x.Project_ReferenceID === active.Project_ReferenceID} />
      <${AppCenter} mode=${mode} c360=${c360} activePersona=${activePersona} onBack=${() => setMode('project')} onPickProject=${(r) => setProject(r)} allProjects=${db.projects} timeline=${db.timeline} notes=${db.notes} domains=${domains} keywords=${keywords} active=${active} fmt=${fmtDate} onEdit=${openEdit} onDetails=${() => setDetailsOpen((v) => !v)} detailsOpen=${detailsOpen} editSlot=${editSlot} timelineSlot=${timelineSlot} archived=${archived} />
      <${AppRight} privacy=${privacy} setPrivacy=${onPrivacyChange} ask=${ask} setAsk=${onAskClear} hits=${hits} onView=${onViewHit} keywords=${keywords} contextCards=${contextCards} onClientArtefacts=${() => setMode('client360')} onAsk=${onAskAssistant} assistantAnswer=${assistantAnswer} assistantLoading=${assistantLoading} assistantSources=${assistantSources} scopedCount=${contextCards.length} />
    </div>
    <div className="px-4 py-2 text-[10px] italic text-[#9ca3af] border-t bg-white flex flex-wrap gap-3"><span>Project Onion v0.18.0 clean</span></div>
    ${regSlot}
    <${HarvesterPanel} project=${active} clientMeta=${clientMeta} staged=${staged} status=${hStatus} clip=${clip} setClip=${setClip} from=${hFrom} setFrom=${setHFrom} to=${hTo} setTo=${setHTo} open=${hOpen} setOpen=${setHOpen} />
  </div>`;


}
