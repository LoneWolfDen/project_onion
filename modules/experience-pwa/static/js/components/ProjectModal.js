// ProjectModal A — shared body (verbatim Tailwind + Phase3 wired Archive/repeatables).
// Phase3: Archive section (Edit only) + repeatable +Add for Opp/Project/Connected/Contacts.
const htmlA = window.htm.bind(window.React.createElement);
const SP_LABELS = ['Service review folder', 'Collaboration Plan', 'Risk Log', 'ESC File Site'];
function spVal(sp, label) {
  if (!sp) return '';
  if (typeof sp === 'object' && !Array.isArray(sp)) {
    const v = sp[label];
    if (Array.isArray(v)) return String(v[0] || '');
    if (v) return String(v);
  }
  return '';
}
function arr(v) { if (Array.isArray(v)) return v.map((x) => String(x ?? '')); if (typeof v === 'string' && v) return [String(v)]; return []; }
function contactVal(c, field) { if (!c) return ''; if (typeof c === 'string') return field === 'email' ? c : ''; return String(c[field] || ''); }
export function ModalBody(props) {
  const project = props.project || null;
  const projList = Array.isArray(props.projList) ? props.projList : arr(props.projId);
  const contactList = Array.isArray(props.contactList) ? props.contactList : [];
  const setPi = props.setProjItem || null;
  const setTi = props.setContactItem || null;
  const setOppConn = props.setOppConnItem || null;
  const oppConnList = Array.isArray(props.oppConnList) ? props.oppConnList : [{ oppId: String(props.opp || ''), connectedUrl: String(props.connected || '') }];
  return htmlA`<div className="p-4 space-y-3 text-[12px]">
    ${props.err ? htmlA`<div className="p-2 rounded-[8px] bg-[#fecaca] border border-[#fca5a5] text-[11px]">${props.err}</div>` : null}
    <div><div className="font-medium">Account Name <span className="text-red-500">[Mandatory]</span></div>
      <select value=${props.account} onChange=${(e) => props.setAccount(e.target.value)} className="w-full mt-1 bg-[#f0f7ff] border border-[#bfdbfe] rounded-[8px] px-2 py-1.5">${(props.clients || []).map((c) => htmlA`<option key=${c}>${c}</option>`)}</select></div>
    <div><div className="font-medium">Project name <span className="text-red-500">[Mandatory]</span></div><input value=${props.name} onInput=${(e) => props.setName(e.target.value)} placeholder="e.g. Apollo-123" className="w-full mt-1 bg-[#f0f7ff] border border-[#bfdbfe] rounded-[8px] px-2 py-1.5" /></div>
    <div><div className="font-medium">Opportunity ID <span className="text-red-500">[Mandatory]</span> + Connected URL (1:1 per row)</div>
      <div className="mt-1 space-y-1">${(oppConnList.length ? oppConnList : [{ oppId: '', connectedUrl: '' }]).map((row, i) => htmlA`<div key=${'oc-' + i} className="flex gap-2"><input value=${row.oppId || ''} onInput=${(e) => setOppConn ? setOppConn(i, 'oppId', e.target.value) : null} placeholder="e.g. O-008891" className="flex-1 bg-[#f0f7ff] border border-red-300 rounded-[8px] px-2 py-1.5" /><input value=${row.connectedUrl || ''} onInput=${(e) => setOppConn ? setOppConn(i, 'connectedUrl', e.target.value) : null} placeholder="https://.../lightning/r/Opportunity/006.../view" className="flex-1 bg-[#f0f7ff] border border-[#bfdbfe] rounded-[8px] px-2 py-1.5" />${i === 0 ? htmlA`<button type="button" onClick=${props.onAddOppConn} className="px-2 py-1 rounded-full bg-white border text-[11px]">+ Add</button>` : null}</div>`)}</div></div>
    <div><div className="font-medium">Project IDs</div>
      <div className="mt-1 space-y-1">${(projList.length ? projList : ['']).map((v, i) => htmlA`<div key=${'prj-' + i} className="flex gap-2"><input value=${v} onInput=${(e) => setPi ? setPi(i, e.target.value) : (i === 0 && props.setProjId ? props.setProjId(e.target.value) : null)} placeholder="e.g. 899808" className="flex-1 bg-[#f9fafb] border border-dashed rounded-[8px] px-2 py-1.5 text-[12px] italic" /><button type="button" onClick=${props.onAddProj} className="px-2 py-1 rounded-full bg-white border text-[11px]">+ Add</button></div>`)}</div></div>
    <div><div className="font-medium">GDP URL (Extracts GDP ID)</div><input value=${props.gdp} onInput=${(e) => props.setGdp(e.target.value)} placeholder="https://gdp.internal/project-details/..." className="w-full mt-1 bg-[#f0f7ff] border border-[#bfdbfe] rounded-[8px] px-2 py-1.5" /></div>
    <div><div className="font-medium">Keywords (comma separated)</div><input value=${props.keywords || ''} onInput=${(e) => props.setKeywords && props.setKeywords(e.target.value)} placeholder="e.g. SoW-2024-001, PO-88921" className="w-full mt-1 bg-white border rounded-[8px] px-2 py-1.5" /></div>
    <div><div className="font-medium">Stakeholders / Contacts</div><div className="mt-1 space-y-1">${(contactList.length ? contactList : [{ email: '', name: '', role: '' }]).map((c, i) => htmlA`<div key=${'ct-' + i} className="grid grid-cols-3 gap-2"><input value=${contactVal(c, 'email')} onInput=${(e) => setTi && setTi(i, 'email', e.target.value)} placeholder="name@example.com" className="bg-white border rounded-[8px] px-2 py-1.5" /><input value=${contactVal(c, 'name')} onInput=${(e) => setTi && setTi(i, 'name', e.target.value)} placeholder="Name" className="bg-white border rounded-[8px] px-2 py-1.5" /><input value=${contactVal(c, 'role')} onInput=${(e) => setTi && setTi(i, 'role', e.target.value)} placeholder="Role" className="bg-white border rounded-[8px] px-2 py-1.5" /></div>`)}</div><div className="mt-1"><button type="button" onClick=${props.onAddContact} className="px-2 py-1 rounded-full bg-white border text-[11px]">+ Add</button></div></div>
    <div><div className="font-medium">SharePoint URLs per artefact</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-1">${SP_LABELS.map((label) => htmlA`<div key=${label} className="p-2 rounded-[8px] bg-[#f9fafb] border"><div className="text-[11px]">${label}</div><input value=${spVal(props.sharepoint, label)} onInput=${(e) => props.setSharepoint(label, e.target.value)} placeholder="Paste link" className="w-full mt-1 bg-white border rounded-[6px] px-2 py-1 text-[11px]" /></div>`)}</div></div>
    ${props.isEdit ? htmlA`<div className="mt-2 p-3 rounded-[12px] bg-[#f9fafb] border"><div className="font-medium">Archive Project <span className="text-red-500">[Mandatory]</span></div><textarea value=${props.just || ''} onInput=${(e) => props.setJust && props.setJust(e.target.value)} placeholder="e.g. Closed — PO fulfilled" rows="3" className="w-full mt-2 bg-white border border-[#fca5a5] rounded-[8px] px-2 py-1.5 text-[12px]"></textarea><div className="mt-2 flex justify-end"><button type="button" onClick=${props.onArchive} className="px-4 py-1.5 rounded-full bg-[#991b1b] text-white text-[12px]">Archive Project</button></div></div>` : null}
  </div>`;
}
const htmlB = window.htm.bind(window.React.createElement);
export function ProjectModal(props) {
  const foot = htmlB`<div className="sticky bottom-0 bg-white border-t p-3 flex justify-end gap-2"><button onClick=${props.onClose} className="px-4 py-1.5 rounded-full bg-[#f9fafb] border text-[12px]">Cancel</button><button onClick=${props.onSave} className="px-4 py-1.5 rounded-full bg-[#1e40af] text-white text-[12px]">${props.mode === 'edit' ? 'Save Edit' : 'Save'}</button></div>`;
  const body = htmlB`<${ModalBody} name=${props.name} setName=${props.setName} opp=${props.opp} setOpp=${props.setOpp} oppList=${props.oppList} setOppItem=${props.setOppItem} onAddOpp=${props.onAddOpp} projId=${props.projId} setProjId=${props.setProjId} projList=${props.projList} setProjItem=${props.setProjItem} onAddProj=${props.onAddProj} account=${props.account} setAccount=${props.setAccount} just=${props.just} setJust=${props.setJust} err=${props.err} clients=${props.clients} project=${props.project} isEdit=${props.mode === 'edit'} onArchive=${props.onArchive} gdp=${props.gdp} setGdp=${props.setGdp} connected=${props.connected} setConnected=${props.setConnected} connList=${props.connList} setConnItem=${props.setConnItem} onAddConn=${props.onAddConn} oppConnList=${props.oppConnList} setOppConnItem=${props.setOppConnItem} onAddOppConn=${props.onAddOppConn} keywords=${props.keywords} setKeywords=${props.setKeywords} contactList=${props.contactList} setContactItem=${props.setContactItem} onAddContact=${props.onAddContact} sharepoint=${props.sharepoint} setSharepoint=${props.setSharepoint} />`;
  if (props.mode === 'edit') {
    return htmlB`<div className="absolute left-0 right-0 top-[60px] rounded-[16px] shadow-xl border bg-white z-10 max-h-[80vh] overflow-y-auto">
      <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center rounded-t-[16px]"><div className="font-semibold">Edit Project Details</div><button onClick=${props.onClose} className="p-1 rounded-full bg-[#f9fafb] border"><span className="w-4 h-4">✕</span></button></div>
      ${body}${foot}
    </div>`;
  }
  return htmlB`<div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
    <div className="w-full max-w-2xl rounded-[16px] bg-white shadow-xl border max-h-[90vh] overflow-y-auto">
      <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center"><div className="font-semibold">Add Project</div><button onClick=${props.onClose} className="p-1 rounded-full bg-[#f9fafb] border"><span className="w-4 h-4">✕</span></button></div>
      <div className="p-3 rounded-[12px] bg-[#f0f7ff] border border-[#bfdbfe] m-4 mb-0 text-[11px]">Project_ReferenceID is system auto-generated under an Account Name.</div>
      ${body}${foot}
    </div>
  </div>`;
}

