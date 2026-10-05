// KnowledgePanel.js — how knowledge strengthens on a card (KNW-03, RAD-02).
// Shows approved contributors, independent sources, reuse (verified vs pending), downstream decisions
// and handovers. "Reuse in another project" makes a Draft copy; the original card is never changed.
import { compounding, loadHandoverUses } from '../core/compounding.js';
const html = window.htm.bind(window.React.createElement);
const { useState } = window.React;

export function KnowledgePanel({ card, allCards, projects, persona, onReuse }) {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState('');
  let uses = []; try { uses = loadHandoverUses(window.localStorage); } catch (e) {}
  const k = compounding(card, allCards, uses);
  const others = (projects || []).filter((p) => p.project_name !== card.projectId && p.project_name !== card.project_name);
  const line = k.contributorCount + ' contributor' + (k.contributorCount === 1 ? '' : 's') + ' · ' + k.independentSources + ' independent source' + (k.independentSources === 1 ? '' : 's') + ' · reused ' + k.verifiedReuse + ' time' + (k.verifiedReuse === 1 ? '' : 's') + (k.pendingReuse ? ' (' + k.pendingReuse + ' draft)' : '');
  return html`<div className="mt-2 text-[11px] text-[#334155]" data-knowledge=${card.id}>
    <button type="button" className="knowledge-toggle cursor-pointer text-[#1F4A7A] underline" aria-expanded=${open} onClick=${() => setOpen(!open)}>Knowledge: ${line}</button>
    ${open ? html`<div className="knowledge-body mt-1 p-2.5 rounded-[10px] bg-[#F8FAFC] border border-[#E6EAF2]">
      <div>Loop: capture, validate, reuse, new evidence, stronger knowledge. Only approved material counts; drafts and AI text add nothing.</div>
      <div className="mt-1"><b>Contributors:</b> ${k.contributors.join(', ') || 'None approved yet'}</div>
      <div><b>Evidence strength:</b> ${k.tier} (${k.independentSources} independent source${k.independentSources === 1 ? '' : 's'}, ${k.entries} approved entr${k.entries === 1 ? 'y' : 'ies'})${k.draftsIgnored ? '; ' + k.draftsIgnored + ' draft update(s) not counted' : ''}</div>
      ${k.reusedFrom ? html`<div><b>Reused from:</b> ${k.reusedFrom.title || k.reusedFrom.cardId} in ${k.reusedFrom.projectId || 'another project'}, by ${k.reusedFrom.by}. Original contributors kept: ${(k.reusedFrom.contributors || []).join(', ') || 'none'}. Strength then: ${k.reusedFrom.strength && k.reusedFrom.strength.tier}.</div>` : null}
      <div><b>Reused in:</b> ${k.reusedIn.length ? k.reusedIn.map((r) => html`<div key=${r.cardId} style=${{ marginLeft: '10px' }}>${r.projectId} · ${r.title} · ${r.verified ? 'approved' : 'draft, not counted yet'} · by ${r.by}${r.newSinceReuse ? ' · ' + r.newSinceReuse + ' new evidence entr' + (r.newSinceReuse === 1 ? 'y' : 'ies') + ' on the original since' : ''}</div>`) : 'Not reused yet'}</div>
      <div><b>Decisions:</b> ${k.decisions.length ? k.decisions.map((d) => d.title + ' (' + d.by + ')').join('; ') : 'None recorded'}</div>
      <div><b>Handovers:</b> ${k.handovers.length ? k.handovers.map((h) => (h.project || 'Handover') + ' ' + String(h.at).slice(0, 10)).join('; ') : 'Not used in a handover yet'}</div>
      ${onReuse && others.length ? html`<div className="mt-2 flex gap-2 items-center flex-wrap"><select aria-label="Reuse in project" value=${target} onChange=${(e) => setTarget(e.target.value)}><option value="">Reuse in another project…</option>${others.map((p) => html`<option key=${p.Project_ReferenceID} value=${p.Project_ReferenceID}>${p.project_name}</option>`)}</select><button type="button" className="knowledge-reuse px-2 py-0.5 rounded-full bg-white border" disabled=${!target} onClick=${() => { const p = others.find((x) => x.Project_ReferenceID === target); if (p) { onReuse(card, p); setTarget(''); } }}>Create draft</button></div>` : null}
    </div>` : null}
  </div>`;
}
