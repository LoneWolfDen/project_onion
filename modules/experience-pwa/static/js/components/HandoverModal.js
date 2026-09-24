// HandoverModal.js — Handover Pack Generator (HTML + PDF + memory).
// M365 Fluent parity: pastels, rounded-xl, backdrop blur. Offline-first via FailoverDB.
import { OnionDB, readLocal } from '../core/FailoverDB.js';
import { piiScreen } from '../core/PiiGate.js';
const htmlH = window.htm.bind(window.React.createElement);
const ReactH = window.React;
function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function fmtD(iso){try{const d=new Date(iso);if(Number.isNaN(d.getTime()))return String(iso||'');const p=(n)=>String(n).padStart(2,'0');return p(d.getDate())+'/'+p(d.getMonth()+1)+'/'+d.getFullYear();}catch(e){return String(iso||'');}}
function matchProject(card,proj){if(!card||!proj)return false;return card.Project_ReferenceID===proj.Project_ReferenceID||card.project_name===proj.project_name||card.projectId===proj.project_name;}
function cutoffFor(tf){const n=Date.now();if(tf==='3m')return n-90*86400000;if(tf==='6m')return n-182*86400000;return 0;}
function cardTime(c){const r=(c&&(c.created_at||c.updated_at||c.timestamp))||0;if(!r)return 0;if(typeof r==='number')return r;const t=Date.parse(String(r));if(!Number.isNaN(t))return t;if(/just now/i.test(String(r)))return Date.now();return 0;}
function isRiskCard(c){const tg=Array.isArray(c&&c.tags)?c.tags.map((x)=>String(x||'').toLowerCase()):[];const hay=[c&&c.title,c&&c.detail,c&&c.content,c&&c.synthesizedText,c&&c.type,c&&c.source].join(' ').toLowerCase();const ts=tg.join(' ');return ts.indexOf('risk')>=0||hay.indexOf('risk')>=0||hay.indexOf('blocked')>=0||hay.indexOf('blocker')>=0||hay.indexOf('depleted')>=0||hay.indexOf('delayed')>=0||hay.indexOf('failed')>=0;}
function isClosedCard(c){const hay=[c&&c.title,c&&c.detail,c&&c.content,c&&c.synthesizedText].join(' ').toLowerCase();const tg=Array.isArray(c&&c.tags)?c.tags.map((x)=>String(x||'').toLowerCase()).join(' '):'';return hay.indexOf('closed')>=0||hay.indexOf('resolved')>=0||hay.indexOf('signed')>=0||hay.indexOf('approved')>=0||hay.indexOf('fulfilled')>=0||tg.indexOf('resolved')>=0||tg.indexOf('closed')>=0;}
function shortHash(id){const s=String(id||'n/a');return s.length>8?s.slice(-8):s;}
function hayOf(c){try{return [c&&c.title,c&&c.detail,c&&c.content,c&&c.synthesizedText,c&&c.type,c&&c.source].join(' ').toLowerCase();}catch(e){return '';}}
function tagHay(c){try{return Array.isArray(c&&c.tags)?c.tags.map((x)=>String(x||'').toLowerCase()).join(' '):'';}catch(e){return '';}}
function hasAny(hay,words){for(let i=0;i<words.length;i++){if(hay.indexOf(words[i])>=0)return true;}return false;}
function closedTime(c){const r=(c&&(c.closed_at||c.resolved_at||c.updated_at||c.created_at||c.timestamp))||0;if(!r)return cardTime(c);if(typeof r==='number')return r;const t=Date.parse(String(r));if(!Number.isNaN(t))return t;return cardTime(c);}
function fmtDT(iso){const d=fmtD(iso);return d||'—';}
function categoryFor(c){
const hay=hayOf(c)+' '+tagHay(c);
if(hasAny(hay,['budget','invoice',' po ','po-','purchase order','payment','cost ','overrun','billing','financial','finance','payroll','sow-','sow ','contract value','\u00a3','$']))return 'finances';
if(hasAny(hay,['csat','nps','satisfaction','client feedback','sign-off','signoff','testimonial','feedback']))return 'feedback';
if(hasAny(hay,['resource','allocation','rota','capacity','staffing','on-call','oncall','incident','support rota','operations','operational']))return 'ops';
if(hasAny(hay,['retro','retrospective','internal','action item','follow-up','followup','todo','to-do','backlog','standup','stand-up']))return 'internal';
if(hasAny(hay,['milestone','phase','schedule','timeline','gdp','deployment','release','go-live','go live','delivery','sprint','status']))return 'delivery';
if(isRiskCard(c))return 'delivery';
if(isClosedCard(c)&&hasAny(hay,['signed','approved']))return 'feedback';
return 'delivery';
}
const CATS=[
{key:'delivery',label:'Delivery',icon:'\uD83D\uDCE6',bg:'#D6E8FF',bd:'#A8C6F0',tx:'#1F4A7A',hint:'Milestones · phases · GDP status'},
{key:'feedback',label:'Client Feedback',icon:'\uD83D\uDCAC',bg:'#F0E6FF',bd:'#D9C7FF',tx:'#5B2EBF',hint:'CSAT · sign-off · satisfaction'},
{key:'finances',label:'Finances',icon:'\uD83D\uDCB7',bg:'#D6F5E8',bd:'#6EE7B7',tx:'#065F46',hint:'SoW · PO · invoices · budget'},
{key:'ops',label:'Operations',icon:'\u2699\uFE0F',bg:'#FFF5D6',bd:'#FDE68A',tx:'#92400E',hint:'Resources · support · capacity'},
{key:'internal',label:'Internal Open Items',icon:'\uD83D\uDCDD',bg:'#F1F5F9',bd:'#CBD5E1',tx:'#334155',hint:'Actions · follow-ups · backlog'}
];
function catMeta(key){for(let i=0;i<CATS.length;i++){if(CATS[i].key===key)return CATS[i];}return CATS[0];}
export function HandoverModal(props){
const isOpen=!!(props&&props.isOpen);
const onClose=(props&&props.onClose)||(()=>{});
const activePersona=(props&&props.activePersona)||'Brene';
const [projects,setProjects]=ReactH.useState([]);
const [selected,setSelected]=ReactH.useState({});
const [timeframe,setTimeframe]=ReactH.useState('full');
const [coverNotes,setCoverNotes]=ReactH.useState('');
const [perNotes,setPerNotes]=ReactH.useState({});
const [activeTab,setActiveTab]=ReactH.useState(null);
const [activeCat,setActiveCat]=ReactH.useState(null);
const [feedQuery,setFeedQuery]=ReactH.useState('');
const [feedTab,setFeedTab]=ReactH.useState('open');
const [status,setStatus]=ReactH.useState('');
const [busy,setBusy]=ReactH.useState(false);
const catAnchorRef=ReactH.useRef(null);
ReactH.useEffect(()=>{if(!isOpen)return;const h=(e)=>{if(e&&e.key==='Escape')onClose();};window.addEventListener('keydown',h);return ()=>window.removeEventListener('keydown',h);},[isOpen,onClose]);
ReactH.useEffect(()=>{
if(!isOpen)return;
const preferredRef=(props&&(props.activeRef||props.activeProjectRef||props.activeId))||null;
const applyRows=(rows)=>{
const list=Array.isArray(rows)?rows:[];
setProjects(list);
const n={};list.forEach((r)=>{n[r.Project_ReferenceID]=true;});setSelected(n);
setActiveTab((prev)=>{if(prev&&list.some((r)=>r.Project_ReferenceID===prev))return prev;if(preferredRef&&list.some((r)=>r.Project_ReferenceID===preferredRef))return preferredRef;return list.length?list[0].Project_ReferenceID:null;});
};
try{
const db=(window.OnionDB||OnionDB)||null;
if(db&&typeof db.listProjects==='function'){
const maybe=db.listProjects();
if(maybe&&typeof maybe.then==='function'){maybe.then((a)=>applyRows(Array.isArray(a)?a:[])).catch(()=>{try{applyRows(readLocal().projects||[]);}catch(e){}});return;}
if(Array.isArray(maybe)){applyRows(maybe);return;}
}
}catch(e){}
try{applyRows(readLocal().projects||[]);}catch(e){}
setStatus('');
},[isOpen]);
if(!isOpen)return null;
const chosen=projects.filter((p)=>selected[p.Project_ReferenceID]);
const onPickProject=(props&&props.onPickProject)||null;
const onViewCard=(props&&props.onViewCard)||null;
const activeProj=(projects.find((p)=>p.Project_ReferenceID===activeTab))||chosen[0]||projects[0]||null;
function scopedCards(){
let all=[];
try{const s=readLocal();all=(Array.isArray(s.timeline)?s.timeline:[]).concat(Array.isArray(s.notes)?s.notes:[]);}catch(e){all=[];}
const cut=cutoffFor(timeframe);
return all.filter((c)=>{
if(!c)return false;
const priv=String(c.privacy||'Team Shared');
const isPriv=(priv==='My Notes'||priv==='Private'||priv==='My Notes (Private)');
if(isPriv&&String(c.author||'')!==String(activePersona||''))return false;
if(cut&&cardTime(c)&&cardTime(c)<cut)return false;
return chosen.some((pj)=>matchProject(c,pj));
});
}
function groupFor(proj){
const cards=scopedCards().filter((c)=>matchProject(c,proj));
const withCat=cards.map((c)=>({c,cat:categoryFor(c)}));
const closed=cards.filter((c)=>isClosedCard(c)).sort((a,b)=>closedTime(b)-closedTime(a));
const open=cards.filter((c)=>!isClosedCard(c)).sort((a,b)=>cardTime(b)-cardTime(a));
const risks=cards.filter(isRiskCard);
const counts={delivery:0,feedback:0,finances:0,ops:0,internal:0};
withCat.forEach((x)=>{if(counts[x.cat]==null)counts[x.cat]=0;counts[x.cat]+=1;});
return {cards,risks,closed,open,counts};
}
function activeGroups(){if(!activeProj)return {cards:[],risks:[],closed:[],open:[],counts:{delivery:0,feedback:0,finances:0,ops:0,internal:0}};return groupFor(activeProj);}
function buildReportModel(){
return {generatedAt:new Date().toISOString(),generatedBy:activePersona,timeframe:(timeframe==='3m'?'Last 3 Months':(timeframe==='6m'?'Last 6 Months':'Full Lifecycle')),coverNotes:String(coverNotes||''),projects:chosen.map((pj)=>({project:pj,perNote:String((perNotes||{})[pj.Project_ReferenceID]||''),groups:groupFor(pj)}))};
}
function metaBadge(c){const k=categoryFor(c);const m=catMeta(k);return m;}
function pillFor(cat){const m=catMeta(cat);return m;}
function cardRow(c){
const ref=shortHash(c.id);
const pill=pillFor(categoryFor(c));
const when=fmtDT(c.created_at||c.updated_at||c.timestamp);
return '<li class="ho-card"><div class="ho-card-t">'+esc(c.title||'(untitled)')+' <a class="ho-hash" href="#card-'+esc(String(c.id||''))+'" title="Reference '+esc(String(c.id||''))+'">#'+esc(ref)+'</a></div><div class="ho-card-m"><span class="ho-pill" style="background:'+pill.bg+';border-color:'+pill.bd+';color:'+pill.tx+'">'+esc(pill.label)+'</span><span>'+esc(c.source||c.type||'Timeline')+' | '+esc(when)+' | '+esc(c.syncStatus||'synced')+' | '+esc(c.privacy||'Team Shared')+'</span></div><div class="ho-card-b">'+esc(String(c.synthesizedText||c.content||c.detail||'').slice(0,600))+'</div></li>';
}
function exportHandoverHtml(model){
const css='*{box-sizing:border-box}body{font-family:Inter,system-ui,-apple-system,sans-serif;background:#fbfdfb;color:#1E293B;margin:0;padding:24px;letter-spacing:-0.01em}'
+'.ho-wrap{max-width:1020px;margin:0 auto;background:#fff;border:1px solid #E6EAF2;border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(31,74,122,.08)}'
+'.ho-hero{background:linear-gradient(90deg,#D6F5E8 0%,#D6E8FF 100%);padding:20px 24px;border-bottom:1px solid #A8C6F0;display:flex;gap:12px;align-items:center;flex-wrap:wrap}'
+'.ho-brand{display:inline-flex;align-items:center;gap:8px;background:#1F4A7A;color:#fff;font-weight:700;font-size:11px;letter-spacing:.08em;text-transform:uppercase;border-radius:9999px;padding:6px 12px}'
+'.ho-hero h1{margin:6px 0 0;font-size:22px;letter-spacing:-0.02em}.ho-hero p{margin:4px 0 0;font-size:12px;color:#475569;font-style:italic}'
+'.ho-cover{margin:16px 24px;padding:12px 14px;background:#FFFBEB;border:1px solid #FDE68A;border-radius:12px;font-size:13px}'
+'.ho-proj{margin:16px 24px;border:1px solid #E6EAF2;border-radius:14px;overflow:hidden;background:#fff}'
+'.ho-proj-h{background:#EEF6FF;border-bottom:1px solid #A8C6F0;padding:12px 14px;display:flex;gap:8px;align-items:center;flex-wrap:wrap}'
+'.ho-proj-h b{font-size:14px}.ho-badge{display:inline-block;background:#1F4A7A;color:#fff;border-radius:9999px;padding:2px 10px;font-size:10px;font-weight:700}'
+'.ho-proj-m{padding:8px 14px;font-size:11px;color:#64748B}.ho-note{background:#F0F7FF;border:1px solid #A8C6F0;border-radius:10px;padding:8px 10px;margin:8px 14px;font-size:12px}'
+'.ho-tiles{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;padding:10px 14px 2px}'
+'.ho-tile{border-radius:12px;padding:10px;border:1px solid #E6EAF2}.ho-tile b{display:block;font-size:11px}.ho-tile span{font-size:18px;font-weight:800}'
+'.ho-cols{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:10px 14px 14px}'
+'.ho-col{border:1px solid #E6EAF2;border-radius:12px;background:#F8FAFC;overflow:hidden}.ho-col h4{margin:0;padding:8px 10px;font-size:12px;background:#fff;border-bottom:1px solid #E6EAF2}'
+'.ho-col ul{list-style:none;margin:0;padding:8px;max-height:380px;overflow:auto}'
+'.ho-card{background:#fff;border:1px solid #E6EAF2;border-radius:10px;padding:8px 10px;margin:0 0 8px;list-style:none}'
+'.ho-card-t{font-weight:600;font-size:13px}.ho-hash{display:inline-block;margin-left:6px;font-size:10px;font-weight:700;color:#1F4A7A;background:#D6E8FF;border:1px solid #A8C6F0;border-radius:9999px;padding:0 8px;text-decoration:none}'
+'.ho-card-m{font-size:10px;color:#64748B;font-style:italic;margin:4px 0;display:flex;gap:6px;align-items:center;flex-wrap:wrap}'
+'.ho-pill{display:inline-block;border:1px solid #E6EAF2;border-radius:9999px;padding:1px 8px;font-size:10px;font-weight:700;font-style:normal}'
+'.ho-card-b{font-size:12px;color:#1E293B}'
+'.ho-foot{padding:12px 24px;font-size:10px;color:#9ca3af;font-style:italic;border-top:1px solid #E6EAF2;background:#F8FAFC}'
+'@media(max-width:760px){.ho-tiles{grid-template-columns:repeat(2,minmax(0,1fr))}.ho-cols{grid-template-columns:1fr}body{padding:12px}}'
+'@media print{.ho-wrap{box-shadow:none}body{padding:0;background:#fff}.no-print{display:none!important}.ho-col ul{max-height:none;overflow:visible}}';
let body='<div class="ho-hero"><div><span class="ho-brand">Project Continuum · Handover</span><h1>Executive Handover Pack</h1><p>Generated '+esc(model.generatedAt)+' | By '+esc(model.generatedBy)+' | Window: '+esc(model.timeframe)+' | Projects: '+model.projects.length+'</p></div></div>';
if(model.coverNotes)body+='<div class="ho-cover"><strong>Transition notes —</strong> '+esc(model.coverNotes)+'</div>';
if(!model.projects.length)body+='<div style="padding:14px 24px"><p><em>No projects selected.</em></p></div>';
model.projects.forEach((entry)=>{
const pj=entry.project||{};const g=entry.groups||{open:[],closed:[],risks:[],counts:{}};
const tiles=CATS.map((t)=>'<div class="ho-tile" style="background:'+t.bg+';border-color:'+t.bd+';color:'+t.tx+'"><b>'+t.icon+' '+esc(t.label)+'</b><span>'+Number((g.counts||{})[t.key]||0)+'</span><div style="font-size:10px;font-style:italic">'+esc(t.hint)+'</div></div>').join('');
body+='<section class="ho-proj"><div class="ho-proj-h"><b>'+esc(pj.project_name||pj.Project_ReferenceID||'Project')+'</b><span class="ho-badge">'+esc(pj.client_name||'Client')+'</span><span style="font-size:11px;color:#64748B">'+esc(pj.Project_ReferenceID||'')+'</span></div><div class="ho-proj-m">'+esc((pj.opportunity_numbers||[]).join(', ')||'No Opp ID')+' | '+esc((pj.project_ids||[]).join(', ')||'No Project ID')+'</div>';
if(entry.perNote)body+='<div class="ho-note"><strong>Handover remark —</strong> '+esc(entry.perNote)+'</div>';
body+='<div class="ho-tiles">'+tiles+'</div>';
body+='<div class="ho-cols"><div class="ho-col"><h4>Active Open Topics ('+g.open.length+')</h4><ul>'+(g.open.length?g.open.map(cardRow).join(''):'<li class="ho-card"><em>No open threads in window.</em></li>')+'</ul></div>';
body+='<div class="ho-col"><h4>Recently Closed ('+g.closed.length+')</h4><ul>'+(g.closed.length?g.closed.map(cardRow).join(''):'<li class="ho-card"><em>Nothing closed in window.</em></li>')+'</ul></div></div></section>';
});
body+='<div class="ho-foot">Project Onion v0.18.0 · Project Continuum Handover Pack · Offline standalone report · Onion Home aesthetic (#1E293B / #1F4A7A / M365 pastels) · Clickable #hashes.</div>';
return '<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Handover Pack</title><style>'+css+'</style></head><body><div class="ho-wrap">'+body+'</div></body></html>';
}
function downloadHtml(){
try{
if(!chosen.length){setStatus('Select at least one project first.');return;}
setBusy(true);
const model=buildReportModel();
const doc=exportHandoverHtml(model);
const blob=new Blob([doc],{type:'text/html;charset=utf-8'});
const url=URL.createObjectURL(blob);
const a=document.createElement('a');
a.href=url;a.download='handover-pack-'+new Date().toISOString().slice(0,10)+'.html';
document.body.appendChild(a);a.click();
setTimeout(()=>{try{document.body.removeChild(a);URL.revokeObjectURL(url);}catch(e){}},400);
setStatus('Interactive HTML report downloaded ('+model.projects.length+' project(s)).');
}catch(e){setStatus('HTML export failed: '+String((e&&e.message)||e));}
setBusy(false);
}
function exportPdf(){
try{
if(!chosen.length){setStatus('Select at least one project first.');return;}
const model=buildReportModel();
const doc=exportHandoverHtml(model);
let w=null;try{w=window.open('','_blank','width=1024,height=768');}catch(e){w=null;}
if(!w){try{downloadHtml();setStatus('Popup blocked — downloaded HTML instead. Open it and use Print → Save as PDF.');}catch(e2){setStatus('Popup blocked — allow popups to export PDF, or use Generate HTML instead.');}return;}
w.document.open();w.document.write(doc);w.document.close();
const go=()=>{try{w.focus();w.print();}catch(e){}};
if(w.document.readyState==='complete')setTimeout(go,350);
else if(w.addEventListener)w.addEventListener('load',()=>setTimeout(go,350));
else setTimeout(go,600);
setStatus('Print view opened — use Save as PDF in the print dialog.');
}catch(e){setStatus('PDF export failed: '+String((e&&e.message)||e));}
}
async function saveToMemory(){
try{
if(!chosen.length){setStatus('Select at least one project first.');return;}
const cover=String(coverNotes||'').trim();
let hasPer=false;
try{hasPer=Object.values(perNotes||{}).some((v)=>String(v||'').trim());}catch(e){}
if(!cover&&!hasPer){setStatus('Write cover notes or a per-project remark first.');return;}
setBusy(true);
const db=(window.OnionDB||OnionDB);
let saved=0;
for(const pj of chosen){
const per=String((perNotes||{})[pj.Project_ReferenceID]||'').trim();
const combined=['HANDOVER PACK — '+(pj.project_name||pj.Project_ReferenceID),cover?('Cover: '+cover):'',per?('Project remark: '+per):''].filter(Boolean).join('\n');
if(!combined.trim())continue;
const s=piiScreen(combined);
await db.saveNote({project_name:pj.project_name,Project_ReferenceID:pj.Project_ReferenceID,projectId:pj.project_name,original:s.text,title:('Handover: '+(pj.project_name||'')).slice(0,80),content:s.text,rephrased:s.text,detail:s.text,type:'Chat',source:'Handover Pack',privacy:'Team Shared',piiStatus:s.flag,syncStatus:'pending_upload',author:activePersona||'Brene',contributor:activePersona||'Brene',refs:[],updates:[]});
saved+=1;
}
setStatus(saved?('Saved '+saved+' handover note(s) to Project Memory (pending_upload).'):'Nothing saved.');
}catch(e){setStatus('Save failed: '+String((e&&e.message)||e));}
setBusy(false);
}
const toggleOne=(ref)=>setSelected((prev)=>Object.assign({},prev,{[ref]:!prev[ref]}));
const allOn=()=>{const n={};projects.forEach((p)=>{n[p.Project_ReferenceID]=true;});setSelected(n);};
const allOff=()=>setSelected({});
const timeOpts=[['3m','Last 3 Months'],['6m','Last 6 Months'],['full','Full Lifecycle']];
const agroup=activeGroups();
const feedQ=String(feedQuery||'').trim().toLowerCase();
const matchFeed=(c)=>{if(activeCat&&categoryFor(c)!==activeCat)return false;if(!feedQ)return true;const hay=(hayOf(c)+' '+tagHay(c)+' '+String((c&&c.source)||'')+' '+String((c&&c.type)||'')).toLowerCase();return feedQ.split(/\s+/).filter(Boolean).every((t)=>hay.indexOf(t)>=0);};
const openFiltered=agroup.open.filter(matchFeed);
const closedFiltered=agroup.closed.filter(matchFeed);
const handleTile=(k)=>{setActiveCat((prev)=>(prev===k?null:k));try{const el=catAnchorRef&&catAnchorRef.current;if(el&&el.scrollIntoView)setTimeout(()=>{try{el.scrollIntoView({behavior:'smooth',block:'nearest'});}catch(e){}},40);}catch(e){}};
const handleView=(c)=>{const proj=activeProj;const cid=c&&(c.id||c.cardId||c.card_id);try{if(onClose)onClose();}catch(e){}const run=()=>{try{if(onPickProject&&proj&&proj.Project_ReferenceID)onPickProject(proj.Project_ReferenceID);}catch(e){}try{if(onViewCard&&cid)onViewCard(cid);}catch(e){}try{window.dispatchEvent(new CustomEvent('onion:handover-view',{detail:{projectRef:proj&&proj.Project_ReferenceID,projectName:proj&&proj.project_name,cardId:cid}}));}catch(e){}try{if(cid){const el=document.getElementById('tl-'+String(cid));if(el&&el.scrollIntoView)el.scrollIntoView({behavior:'smooth',block:'center'});}}catch(e){}};setTimeout(run,80);};
const feedRow=(c,closed)=>{const pill=metaBadge(c);const when=closed?fmtDT(c.closed_at||c.resolved_at||c.updated_at||c.created_at||c.timestamp):fmtDT(c.created_at||c.updated_at||c.timestamp);const snippet=String(c.synthesizedText||c.content||c.detail||'').slice(0,220);return htmlH`<div key=${String(c.id||c.title||Math.random())} className="ho-card"><div className="flex items-start gap-2"><div className="min-w-0 flex-1"><h5>${c.title||'(untitled)'}</h5><div className="mt-1 flex flex-wrap items-center gap-1"><span style=${{background:pill.bg,borderColor:pill.bd,color:pill.tx}} className="px-2 py-0.5 rounded-full border text-[11px] font-semibold">${pill.label}</span><span className="px-2 py-0.5 rounded-full border border-[#E6EAF2] bg-[#F8FAFC] text-[11px] text-[#64748B]">${c.source||c.type||'Timeline'} · ${when}</span>${isRiskCard(c)?htmlH`<span className="px-2 py-0.5 rounded-full border border-[#FECACA] bg-[#FEF2F2] text-[11px] font-semibold text-[#991B1B]">Risk</span>`:null}</div>${snippet?htmlH`<p>${snippet}${String(c.synthesizedText||c.content||c.detail||'').length>220?'…':''}</p>`:null}</div><button onClick=${()=>handleView(c)} title=${'Open '+(c.title||'card')+' in main app'} className="shrink-0 px-2.5 py-1 rounded-full bg-[#1F4A7A] text-white text-[12px] font-semibold">View</button></div></div>`;};
const tabRow=projects.map((pj)=>{
const ref=pj.Project_ReferenceID;
const isActiveTab=activeTab===ref||(!activeTab&&activeProj&&activeProj.Project_ReferenceID===ref);
const isSelTab=!!selected[ref];
const g=groupFor(pj);
const total=g.cards.length;
const tabTip=(isSelTab?'Exclude ':'Include ')+pj.project_name+(isSelTab?' from':' in')+' handover package';
const tabTogLabel=isSelTab?'✓ In package':'+ Add';
const onTabClick=()=>{setActiveTab(ref);setActiveCat(null);setFeedTab('open');setFeedQuery('');};
const onTogClick=(e)=>{if(e&&e.stopPropagation)e.stopPropagation();toggleOne(ref);};
return htmlH`<div key=${ref} onClick=${onTabClick} title=${'View '+pj.project_name+' breakdown'} role="button" tabIndex="0" onKeyDown=${(e)=>{if(e&&(e.key==='Enter'||e.key===' ')){if(e.preventDefault)e.preventDefault();onTabClick();}}} aria-pressed=${isActiveTab?'true':'false'} className=${'ho-proj-tab'+(isActiveTab?' is-active':'')+(isSelTab?' is-selected':'')}><span>${pj.project_name}</span><span className="ho-count">${total}</span><button onClick=${onTogClick} title=${tabTip} aria-pressed=${isSelTab?'true':'false'} className=${'ho-add-btn'+(isSelTab?' is-in':'')}>${tabTogLabel}</button></div>`;
});
const timeRow=timeOpts.map((opt)=>htmlH`<label key=${opt[0]} className=${'ho-radio '+(timeframe===opt[0]?'on':'')}><input type="radio" name="ho-timeframe" checked=${timeframe===opt[0]} onChange=${()=>setTimeframe(opt[0])} />${opt[1]}</label>`);
const tileRow=CATS.map((t)=>{const n=Number((agroup.counts||{})[t.key]||0);const on=activeCat===t.key;return htmlH`<button key=${t.key} onClick=${()=>handleTile(t.key)} title=${t.hint+' — click to focus feed'} aria-pressed=${on?'true':'false'} style=${{background:t.bg,borderColor:on?'#1E293B':t.bd,color:t.tx}} className=${'ho-tile-btn'+(on?' is-on':'')}><div style=${{display:'flex',alignItems:'center',gap:'6px'}}><span style=${{fontSize:'15px'}}>${t.icon}</span><span style=${{fontWeight:700,fontSize:'11px'}}>${t.label}</span>${on?htmlH`<span style=${{marginLeft:'auto',fontSize:'10px',fontWeight:800}}>✓</span>`:null}</div><div style=${{marginTop:'4px',fontSize:'22px',fontWeight:800,lineHeight:1}}>${n}</div><div style=${{fontSize:'10px',fontStyle:'italic',opacity:.8}}>${t.hint}</div><div style=${{marginTop:'2px',fontSize:'10px',fontWeight:700,textDecoration:'underline'}}>${on?'Clear filter':'Focus feed ↓'}</div></button>`;});
const activePerNote=activeProj?String((perNotes||{})[activeProj.Project_ReferenceID]||''):'';
return htmlH`<div onClick=${onClose} className="ho-backdrop">
<div onClick=${(e)=>{if(e&&e.stopPropagation)e.stopPropagation();}} role="dialog" aria-label="Executive Handover Dashboard" className="ho-shell">
<div className="ho-head">
<div><div className="ho-head-title"><span className="ho-brand-pill">PROJECT CONTINUUM</span><span style=${{fontWeight:700,fontSize:'15px',color:'#1E293B'}}>Executive Handover Dashboard</span></div></div>
<button onClick=${onClose} title="Close (Esc)" className="ho-tab on">Close</button></div>
<div className="ho-body"><div className="ho-col">
<section className="ho-sect"><div style=${{fontWeight:700,fontSize:'14px'}}>${'Timeframe'}</div><div style=${{marginTop:'8px',display:'flex',flexWrap:'wrap',gap:'8px'}}>${timeRow}</div></section>
<section className="ho-sect">
<div style=${{fontWeight:700,fontSize:'14px',display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap'}}><span>${'Projects'}</span><span style=${{fontWeight:400,fontSize:'12px',color:'#64748B'}}>${chosen.length} of ${projects.length} in package</span><span style=${{marginLeft:'auto',display:'inline-flex',gap:'6px'}}><button onClick=${allOn} className="ho-tab">Select all</button><button onClick=${allOff} className="ho-tab">Clear</button></span></div>
<div className="ho-tabs" style=${{marginTop:'8px'}}>${tabRow}${!projects.length?htmlH`<div style=${{fontSize:'12px',fontStyle:'italic',color:'#64748B'}}>No projects in FailoverDB.</div>`:null}</div>
${activeProj?htmlH`<div className="ho-meta-line"><span style=${{padding:'2px 8px',borderRadius:'9999px',background:'#1F4A7A',color:'#fff',fontWeight:700}}>${activeProj.client_name||'Client'}</span><span>${(activeProj.opportunity_numbers||[]).join(', ')||'No Opp'} · ${(activeProj.project_ids||[]).slice(0,3).join(', ')||'No PID'}</span></div>`:null}</section>
${activeProj?htmlH`<section className="ho-sect"><div style=${{fontWeight:700,fontSize:'14px',display:'flex',alignItems:'center',gap:'8px'}}><span>${activeProj.project_name} Summary</span>${activeCat?htmlH`<button onClick=${()=>setActiveCat(null)} style=${{marginLeft:'auto',padding:'2px 8px',borderRadius:'9999px',background:'#1E293B',color:'#fff',fontSize:'11px'}}>Clear filter ✕</button>`:null}</div><div className="ho-tiles-grid">${tileRow}</div></section>`:null}
<div ref=${catAnchorRef}></div>
${activeProj?htmlH`<section className="ho-sect"><div style=${{fontWeight:700,fontSize:'14px'}}>${'Open vs Closed'}</div><div style=${{marginTop:'8px',display:'flex',flexWrap:'wrap',alignItems:'center',gap:'8px'}}><button onClick=${()=>setFeedTab('open')} className=${'ho-tab '+(feedTab==='open'?'on':'')}>${'Open ('+openFiltered.length+')'}</button><button onClick=${()=>setFeedTab('closed')} className=${'ho-tab '+(feedTab==='closed'?'on':'')}>${'Recently Closed ('+closedFiltered.length+')'}</button><input value=${feedQuery} onInput=${(e)=>setFeedQuery(e.target.value)} placeholder="Filter feed..." style=${{marginLeft:'auto',background:'#fff',border:'1px solid #E6EAF2',borderRadius:'9999px',padding:'6px 12px',fontSize:'13px',width:'200px'}} /></div>${feedTab==='open'?htmlH`<div style=${{marginTop:'8px',fontWeight:600,fontSize:'13px'}}>${'Active Open ('+openFiltered.length+')'}</div><div className="ho-feed">${openFiltered.length?openFiltered.map((c)=>feedRow(c,false)):htmlH`<div> No open topics. </div>`}</div>`:htmlH`<div style=${{marginTop:'8px',fontWeight:600,fontSize:'13px'}}>${'Recently Closed ('+closedFiltered.length+')'}</div><div className="ho-feed">${closedFiltered.length?closedFiltered.map((c)=>feedRow(c,true)):htmlH`<div> Nothing closed. </div>`}</div>`}</section>`:null}
<section className="ho-sect">
<div style=${{fontWeight:700,fontSize:'14px'}}>${'Handover Notes'}</div>
<div className="ho-notes-grid">
<div><div style=${{fontSize:'12px',fontWeight:600}}>${'Project remark — '+(activeProj?activeProj.project_name:'—')}</div>
<textarea value=${activePerNote} onInput=${(e)=>{const v=e.target.value;const ref=activeProj&&activeProj.Project_ReferenceID;if(ref)setPerNotes((prev)=>Object.assign({},prev,{[ref]:v}));}} rows="4" placeholder="Project-specific handover remark..." className="ho-textarea"></textarea></div>
<div><div style=${{fontSize:'12px',fontWeight:600}}>Global cover notes</div>
<textarea value=${coverNotes} onInput=${(e)=>setCoverNotes(e.target.value)} rows="4" placeholder="Transition notes, warnings, instructions..." className="ho-textarea"></textarea></div>
</div>
<div style=${{marginTop:'4px',fontSize:'11px',fontStyle:'italic',color:'#64748B'}}>Screened by local PII gate before save.</div></section>
${status?htmlH`<div className="ho-status">${status}</div>`:null}
<div className="ho-foot">
<button onClick=${downloadHtml} disabled=${busy||!chosen.length} title=${!chosen.length?'Select at least one project to enable export':'Download full handover as HTML'} className="ho-btn ho-btn-primary">Generate Interactive HTML Report</button>
<button onClick=${exportPdf} disabled=${busy||!chosen.length} title=${!chosen.length?'Select at least one project to enable export':'Open print-ready handover, then use Print → Save as PDF'} className="ho-btn ho-btn-dark">Export Clean PDF</button>
<button onClick=${saveToMemory} disabled=${busy||!chosen.length} title=${!chosen.length?'Select at least one project to enable save':'Save handover card into project memory'} className="ho-btn ho-btn-green">Save Handover to Project Memory</button>
</div></div></div></div></div>`;
}




