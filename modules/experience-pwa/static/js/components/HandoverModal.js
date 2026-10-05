// HandoverModal.js — Handover Pack Generator (HTML + PDF + memory).
// M365 Fluent parity: pastels, rounded-xl, backdrop blur. Offline-first via FailoverDB.
import { OnionDB, readLocal } from '../core/FailoverDB.js';
import { piiScreen } from '../core/PiiGate.js';
import { kindOf, kindMeta, statementId } from '../core/knowledge.js';
import { buildPackage } from '../core/exportPackage.js';
import { logEvent } from '../core/logger.js';
import { recordHandoverUse } from '../core/compounding.js';
import { makeZip } from '../core/zip.js';
import { CATS, catMeta, categoryOf, buildHandover, packageHash, makeConfirmation, confirmationValid, NOT_FOUND } from '../core/handover.js';
const htmlH = window.htm.bind(window.React.createElement);
const ReactH = window.React;
function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function fmtD(iso){try{const d=new Date(iso);if(Number.isNaN(d.getTime()))return String(iso||'');const p=(n)=>String(n).padStart(2,'0');return p(d.getDate())+'/'+p(d.getMonth()+1)+'/'+d.getFullYear();}catch(e){return String(iso||'');}}
function matchProject(card,proj){if(!card||!proj)return false;return card.Project_ReferenceID===proj.Project_ReferenceID||card.project_name===proj.project_name||card.projectId===proj.project_name;}
function cutoffFor(tf){const n=Date.now();if(tf==='3m')return n-90*86400000;if(tf==='6m')return n-182*86400000;return 0;}
function cardTime(c){const r=(c&&(c.created_at||c.updated_at||c.timestamp))||0;if(!r)return 0;if(typeof r==='number')return r;const t=Date.parse(String(r));if(!Number.isNaN(t))return t;if(/just now/i.test(String(r)))return Date.now();return 0;}
function shortHash(id){const s=String(id||'n/a');return s.length>8?s.slice(-8):s;}
function hayOf(c){try{return [c&&c.title,c&&c.detail,c&&c.content,c&&c.synthesizedText,c&&c.type,c&&c.source].join(' ').toLowerCase();}catch(e){return '';}}
function tagHay(c){try{return Array.isArray(c&&c.tags)?c.tags.map((x)=>String(x||'').toLowerCase()).join(' '):'';}catch(e){return '';}}
function hasAny(hay,words){for(let i=0;i<words.length;i++){if(hay.indexOf(words[i])>=0)return true;}return false;}
function closedTime(c){const r=(c&&(c.closed_at||c.resolved_at||c.updated_at||c.created_at||c.timestamp))||0;if(!r)return cardTime(c);if(typeof r==='number')return r;const t=Date.parse(String(r));if(!Number.isNaN(t))return t;return cardTime(c);}
function fmtDT(iso){const d=fmtD(iso);return d||'—';}
function categoryFor(c){return categoryOf(c);}
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
const [includeUnconfirmed,setIncludeUnconfirmed]=ReactH.useState(false);
const [confirmation,setConfirmation]=ReactH.useState(null);
const [pkgHash,setPkgHash]=ReactH.useState('');
const [reviewTick,setReviewTick]=ReactH.useState(0);
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
ReactH.useEffect(()=>{
if(!isOpen)return;let dead=false;
(async()=>{try{
const ch=projects.filter((p)=>selected[p.Project_ReferenceID]);
const entries=ch.map((pj)=>({project:pj,perNote:String((perNotes||{})[pj.Project_ReferenceID]||''),groups:groupFor(pj)}));
const h=await packageHash(entries,{timeframe,coverNotes,includeUnconfirmed});
if(!dead)setPkgHash(h);}catch(e){}})();
return ()=>{dead=true;};
},[isOpen,projects,selected,perNotes,coverNotes,timeframe,includeUnconfirmed,reviewTick]);
if(!isOpen)return null;
const chosen=projects.filter((p)=>selected[p.Project_ReferenceID]);
const onPickProject=(props&&props.onPickProject)||null;
const onViewCard=(props&&props.onViewCard)||null;
const activeProj=(projects.find((p)=>p.Project_ReferenceID===activeTab))||chosen[0]||projects[0]||null;
const EMPTY_GROUP={cards:[],risks:[],closed:[],open:[],needsConfirmation:[],sections:[],counts:{}};
function groupFor(proj){
let st={};try{st=readLocal();}catch(e){st={};}
return buildHandover(st,proj,{timeframe,persona:activePersona});
}
function activeGroups(){if(!activeProj)return EMPTY_GROUP;return groupFor(activeProj);}
function buildReportModel(){
return {generatedAt:new Date().toISOString(),generatedBy:activePersona,includeUnconfirmed,confirmation,packageHash:pkgHash,timeframe:(timeframe==='3m'?'Last 3 Months':(timeframe==='6m'?'Last 6 Months':'Full Lifecycle')),coverNotes:String(coverNotes||''),projects:chosen.map((pj)=>({project:pj,perNote:String((perNotes||{})[pj.Project_ReferenceID]||''),groups:groupFor(pj)}))};
}
function metaBadge(c){const k=categoryFor(c);const m=catMeta(k);return m;}
function pillFor(cat){const m=catMeta(cat);return m;}
function cardRow(c){
const ref=shortHash(c.id);
const pill=pillFor(categoryFor(c));
const when=fmtDT(c.created_at||c.updated_at||c.timestamp);
return '<li class="ho-card"><div class="ho-card-t">'+esc(c.title||'(untitled)')+' <a class="ho-hash" href="#card-'+esc(String(c.id||''))+'" title="Reference '+esc(String(c.id||''))+'">#'+esc(ref)+'</a> <span class="ho-hash" title="Statement id, same in handover.md, handover.json and sources.csv">'+esc(statementId(c))+'</span></div><div class="ho-card-m"><span class="ho-pill" style="background:'+pill.bg+';border-color:'+pill.bd+';color:'+pill.tx+'">'+esc(pill.label)+'</span>'+(function(){const k=kindMeta(kindOf(c));return '<span class="ho-pill ho-kind" title="'+esc(k.hint)+'" style="background:'+k.bg+';color:'+k.tx+'">'+esc(k.label)+'</span>';})()+'<span>'+esc(c.source||c.type||'Timeline')+' | '+esc(when)+' | '+esc(c.syncStatus||'synced')+' | '+esc(c.privacy||'Team Shared')+'</span></div><div class="ho-card-b">'+esc(String(c.synthesizedText||c.content||c.detail||'').slice(0,600))+'</div></li>';
}
function exportHandoverHtml(model){
const css='*{box-sizing:border-box}body{font-family:Inter,system-ui,-apple-system,sans-serif;background:#fbfdfb;color:#1E293B;margin:0;padding:24px;letter-spacing:-0.01em}'
+'.ho-wrap{max-width:1020px;margin:0 auto;background:#fff;border:1px solid #E6EAF2;border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(31,74,122,.08)}'
+'.ho-hero{background:linear-gradient(90deg,#D6F5E8 0%,#D6E8FF 100%);padding:20px 24px;border-bottom:1px solid #A8C6F0;display:flex;gap:12px;align-items:center;flex-wrap:wrap}'
+'.ho-brand{display:inline-flex;align-items:center;gap:8px;background:#1F4A7A;color:#fff;font-weight:700;font-size:12px;letter-spacing:.08em;text-transform:uppercase;border-radius:9999px;padding:6px 12px}'
+'.ho-hero h1{margin:6px 0 0;font-size:22px;letter-spacing:-0.02em}.ho-hero p{margin:4px 0 0;font-size:12px;color:#475569;font-style:italic}'
+'.ho-cover{margin:16px 24px;padding:12px 14px;background:#FFFBEB;border:1px solid #FDE68A;border-radius:12px;font-size:13px}'
+'.ho-proj{margin:16px 24px;border:1px solid #E6EAF2;border-radius:14px;overflow:hidden;background:#fff}'
+'.ho-proj-h{background:#EEF6FF;border-bottom:1px solid #A8C6F0;padding:12px 14px;display:flex;gap:8px;align-items:center;flex-wrap:wrap}'
+'.ho-proj-h b{font-size:14px}.ho-badge{display:inline-block;background:#1F4A7A;color:#fff;border-radius:9999px;padding:2px 10px;font-size:12px;font-weight:700}'
+'.ho-proj-m{padding:8px 14px;font-size:12px;color:#64748B}.ho-note{background:#F0F7FF;border:1px solid #A8C6F0;border-radius:10px;padding:8px 10px;margin:8px 14px;font-size:12px}'
+'.ho-tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;padding:10px 14px 2px}'
+'.ho-tile{border-radius:12px;padding:10px;border:1px solid #E6EAF2}.ho-tile b{display:block;font-size:12px}.ho-tile span{font-size:18px;font-weight:800}'
+'.ho-cols{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:10px 14px 14px}'
+'.ho-col{border:1px solid #E6EAF2;border-radius:12px;background:#F8FAFC;overflow:hidden}.ho-col h4{margin:0;padding:8px 10px;font-size:12px;background:#fff;border-bottom:1px solid #E6EAF2}'
+'.ho-col ul{list-style:none;margin:0;padding:8px;max-height:380px;overflow:auto}'
+'.ho-card{background:#fff;border:1px solid #E6EAF2;border-radius:10px;padding:8px 10px;margin:0 0 8px;list-style:none}'
+'.ho-card-t{font-weight:600;font-size:13px}.ho-hash{display:inline-block;margin-left:6px;font-size:12px;font-weight:700;color:#1F4A7A;background:#D6E8FF;border:1px solid #A8C6F0;border-radius:9999px;padding:0 8px;text-decoration:none}'
+'.ho-card-m{font-size:12px;color:#64748B;font-style:italic;margin:4px 0;display:flex;gap:6px;align-items:center;flex-wrap:wrap}'
+'.ho-pill{display:inline-block;border:1px solid #E6EAF2;border-radius:9999px;padding:1px 8px;font-size:12px;font-weight:700;font-style:normal}'
+'.ho-card-b{font-size:12px;color:#1E293B}'
+'.ho-foot{padding:12px 24px;font-size:12px;color:#9ca3af;font-style:italic;border-top:1px solid #E6EAF2;background:#F8FAFC}'
+'@media(max-width:760px){.ho-tiles{grid-template-columns:repeat(2,minmax(0,1fr))}.ho-cols{grid-template-columns:1fr}body{padding:12px}}'
+'@media print{.ho-wrap{box-shadow:none}body{padding:0;background:#fff}.no-print{display:none!important}.ho-col ul{max-height:none;overflow:visible}}';
let body='<div class="ho-hero"><div><span class="ho-brand">Project Continuum · Handover</span><h1>Executive Handover Pack</h1><p>Generated '+esc(model.generatedAt)+' | By '+esc(model.generatedBy)+' | Window: '+esc(model.timeframe)+' | Projects: '+model.projects.length+'</p>'+(model.confirmation?'<p>Reviewed and confirmed by '+esc(model.confirmation.by||'—')+' at '+esc(model.confirmation.at)+' | Package hash '+esc(String(model.confirmation.hash).slice(0,16))+'</p>':'')+'</div></div>';
if(model.coverNotes)body+='<div class="ho-cover"><strong>Transition notes —</strong> '+esc(model.coverNotes)+'</div>';
if(!model.projects.length)body+='<div style="padding:14px 24px"><p><em>No projects selected.</em></p></div>';
model.projects.forEach((entry)=>{
const pj=entry.project||{};const g=entry.groups||{open:[],closed:[],risks:[],counts:{}};
const tiles=CATS.map((t)=>'<div class="ho-tile" style="background:'+t.bg+';border-color:'+t.bd+';color:'+t.tx+'"><b>'+t.icon+' '+esc(t.label)+'</b><span>'+Number((g.counts||{})[t.key]||0)+'</span><div style="font-size:12px;font-style:italic">'+esc(t.hint)+'</div></div>').join('');
body+='<section class="ho-proj"><div class="ho-proj-h"><b>'+esc(pj.project_name||pj.Project_ReferenceID||'Project')+'</b><span class="ho-badge">'+esc(pj.client_name||'Client')+'</span><span style="font-size:12px;color:#64748B">'+esc(pj.Project_ReferenceID||'')+'</span></div><div class="ho-proj-m">'+esc((pj.opportunity_numbers||[]).join(', ')||'No Opp ID')+' | '+esc((pj.project_ids||[]).join(', ')||'No Project ID')+'</div>';
if(entry.perNote)body+='<div class="ho-note"><strong>Handover remark —</strong> '+esc(entry.perNote)+'</div>';
body+='<div class="ho-tiles">'+tiles+'</div>';
body+=(g.sections||[]).map((sec)=>'<div class="ho-col" style="margin:8px 14px"><h4>'+esc(sec.label)+' ('+sec.items.length+')</h4><ul>'+(sec.items.length?sec.items.map(cardRow).join(''):'<li class="ho-card"><em>'+NOT_FOUND+'</em></li>')+'</ul></div>').join('');
if(model.includeUnconfirmed)body+='<div class="ho-col" style="margin:8px 14px;border-color:#FDA4AF"><h4>Needs confirmation ('+(g.needsConfirmation||[]).length+') — not part of the approved handover</h4><ul>'+((g.needsConfirmation||[]).length?g.needsConfirmation.map(cardRow).join(''):'<li class="ho-card"><em>'+NOT_FOUND+'</em></li>')+'</ul></div>';
body+='<div class="ho-cols"><div class="ho-col"><h4>Active Open Topics ('+g.open.length+')</h4><ul>'+(g.open.length?g.open.map(cardRow).join(''):'<li class="ho-card"><em>No open threads in window.</em></li>')+'</ul></div>';
body+='<div class="ho-col"><h4>Recently Closed ('+g.closed.length+')</h4><ul>'+(g.closed.length?g.closed.map(cardRow).join(''):'<li class="ho-card"><em>Nothing closed in window.</em></li>')+'</ul></div></div></section>';
});
body+='<div class="ho-foot">Continuum v0.18.0 · Continuum Handover Pack · Offline standalone report · Continuum Home aesthetic (#1E293B / #1F4A7A / M365 pastels) · Clickable #hashes.</div>';
return '<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Handover Pack</title><style>'+css+'</style></head><body><div class="ho-wrap">'+body+'</div></body></html>';
}
async function gateOk(){
try{
const ch=projects.filter((p)=>selected[p.Project_ReferenceID]);
const entries=ch.map((pj)=>({project:pj,perNote:String((perNotes||{})[pj.Project_ReferenceID]||''),groups:groupFor(pj)}));
const h=await packageHash(entries,{timeframe,coverNotes,includeUnconfirmed});
if(!confirmationValid(confirmation,h)){setConfirmation(null);setStatus('The content changed since you confirmed it. Review and confirm again before exporting.');return false;}
try{entries.forEach((en)=>recordHandoverUse(window.localStorage,{hash:h,by:activePersona,project:(en.project&&en.project.project_name)||'',cardIds:en.groups.cards.map((c)=>c.id)}));}catch(e){}
return true;}catch(e){setStatus('Could not verify the review: '+String((e&&e.message)||e));return false;}
}
async function downloadHtml(){
try{
if(!chosen.length){setStatus('Select at least one project first.');return;}
setBusy(true);
if(!(await gateOk())){setBusy(false);return;}
const model=buildReportModel();
const doc=exportHandoverHtml(model);
const blob=new Blob([doc],{type:'text/html;charset=utf-8'});
const url=URL.createObjectURL(blob);
const a=document.createElement('a');
a.href=url;a.download='handover-pack-'+new Date().toISOString().slice(0,10)+'.html';
document.body.appendChild(a);a.click();
setTimeout(()=>{try{document.body.removeChild(a);URL.revokeObjectURL(url);}catch(e){}},400);
logEvent('handover','handover.html_exported',{projects:model.projects.length});setStatus('Interactive HTML report downloaded ('+model.projects.length+' project(s)).');
}catch(e){setStatus('HTML export failed: '+String((e&&e.message)||e));}
setBusy(false);
}
async function downloadPackage(){
try{
if(!chosen.length){setStatus('Select at least one project first.');return;}
setBusy(true);
if(!(await gateOk())){setBusy(false);return;}
const entries=chosen.map((pj)=>({project:pj,perNote:String((perNotes||{})[pj.Project_ReferenceID]||''),groups:groupFor(pj)}));
const model=buildReportModel();
let sources=[];try{sources=JSON.parse(localStorage.getItem('continuum_import_sources')||'[]');}catch(e){sources=[];}
const files=await buildPackage(entries,{generatedAt:model.generatedAt,generatedBy:model.generatedBy,timeframe:model.timeframe,packageHash:pkgHash,confirmation,coverNotes},sources,[{name:'handover.html',content:exportHandoverHtml(model)}]);
const blob=new Blob([makeZip(files)],{type:'application/zip'});
const url=URL.createObjectURL(blob);const a=document.createElement('a');
a.href=url;a.download='handover-package-'+new Date().toISOString().slice(0,10)+'.zip';
document.body.appendChild(a);a.click();
setTimeout(()=>{try{document.body.removeChild(a);URL.revokeObjectURL(url);}catch(e){}},400);
logEvent('handover','handover.package_exported',{projects:chosen.length,files:files.length});setStatus('Package downloaded: handover.md, handover.html, handover.json, sources.csv, manifest.json.');
}catch(e){setStatus('Package export failed: '+String((e&&e.message)||e));}
setBusy(false);
}
async function exportPdf(){
try{
if(!chosen.length){setStatus('Select at least one project first.');return;}
if(!(await gateOk()))return;
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
const feedRow=(c,closed)=>{const pill=metaBadge(c);const when=closed?fmtDT(c.closed_at||c.resolved_at||c.updated_at||c.created_at||c.timestamp):fmtDT(c.created_at||c.updated_at||c.timestamp);const snippet=String(c.synthesizedText||c.content||c.detail||'').slice(0,220);return htmlH`<div key=${String(c.id||c.title||Math.random())} className="ho-card"><div className="flex items-start gap-2"><div className="min-w-0 flex-1"><h5>${c.title||'(untitled)'}</h5><div className="mt-1 flex flex-wrap items-center gap-1"><span style=${{background:pill.bg,borderColor:pill.bd,color:pill.tx}} className="px-2 py-0.5 rounded-full border text-[11px] font-semibold">${pill.label}</span><span title=${kindMeta(kindOf(c)).hint} style=${{background:kindMeta(kindOf(c)).bg,color:kindMeta(kindOf(c)).tx}} className="px-2 py-0.5 rounded-full text-[11px] font-semibold">${kindMeta(kindOf(c)).label}</span><span className="px-2 py-0.5 rounded-full border border-[#E6EAF2] bg-[#F8FAFC] text-[11px] text-[#64748B]">${c.source||c.type||'Timeline'} · ${when}</span>${(categoryOf(c)==='raid')?htmlH`<span className="px-2 py-0.5 rounded-full border border-[#FECACA] bg-[#FEF2F2] text-[11px] font-semibold text-[#991B1B]">Risk</span>`:null}</div>${snippet?htmlH`<p>${snippet}${String(c.synthesizedText||c.content||c.detail||'').length>220?'…':''}</p>`:null}</div><button onClick=${()=>handleView(c)} title=${'Open '+(c.title||'card')+' in main app'} className="shrink-0 px-2.5 py-1 rounded-full bg-[#1F4A7A] text-white text-[12px] font-semibold">View</button></div></div>`;};
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
const exportOk=confirmationValid(confirmation,pkgHash);
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
<section className="ho-sect" id="ho-review"><div style=${{fontWeight:700,fontSize:'14px'}}>Review before export</div>
<div id="ho-review-summary" style=${{marginTop:'6px',fontSize:'13px'}}>${chosen.map((pj)=>{const g=groupFor(pj);return htmlH`<div key=${pj.Project_ReferenceID}><b>${pj.project_name}</b>: ${g.cards.length} approved items (${g.open.length} open, ${g.closed.length} closed). ${g.needsConfirmation.length?g.needsConfirmation.length+' item(s) need confirmation and are not included.':'Nothing waiting for confirmation.'}</div>`;})}</div>
<label style=${{display:'flex',gap:'8px',alignItems:'center',marginTop:'8px',fontSize:'13px'}}><input id="ho-include-unconfirmed" type="checkbox" checked=${includeUnconfirmed} onChange=${(e)=>setIncludeUnconfirmed(e.target.checked)} /> Also list items that need confirmation, in a separate section</label>
<label style=${{display:'flex',gap:'8px',alignItems:'center',marginTop:'8px',fontSize:'14px',fontWeight:600}}><input id="ho-confirm" type="checkbox" checked=${confirmationValid(confirmation,pkgHash)} disabled=${!chosen.length||!pkgHash} onChange=${(e)=>setConfirmation(e.target.checked?makeConfirmation(pkgHash,activePersona):null)} /> I have reviewed this handover and confirm it is ready to share</label>
${confirmationValid(confirmation,pkgHash)?htmlH`<div id="ho-confirmed-at" style=${{fontSize:'12px',color:'#065F46',marginTop:'4px'}}>Confirmed ${confirmation.at} · package ${String(confirmation.hash).slice(0,12)}</div>`:null}</section>
<div className="ho-foot">
<button onClick=${downloadHtml} disabled=${busy||!chosen.length||!exportOk} title=${!chosen.length?'Select at least one project to enable export':(!exportOk?'Review and confirm first':'Download full handover as HTML')} className="ho-btn ho-btn-primary">Generate Interactive HTML Report</button>
<button onClick=${exportPdf} disabled=${busy||!chosen.length||!exportOk} title=${!chosen.length?'Select at least one project to enable export':(!exportOk?'Review and confirm first':'Open print-ready handover, then use Print → Save as PDF')} className="ho-btn ho-btn-dark">Export Clean PDF</button>
<button id="ho-package" onClick=${downloadPackage} disabled=${busy||!chosen.length||!exportOk} title=${!chosen.length?'Select at least one project to enable export':(!exportOk?'Review and confirm first':'Download a .zip with handover.md, .html, .json, sources.csv and a hash manifest')} className="ho-btn ho-btn-dark">Download package (.zip)</button>
<button onClick=${saveToMemory} disabled=${busy||!chosen.length} title=${!chosen.length?'Select at least one project to enable save':'Save handover card into project memory'} className="ho-btn ho-btn-green">Save Handover to Project Memory</button>
</div></div></div></div></div>`;
}




