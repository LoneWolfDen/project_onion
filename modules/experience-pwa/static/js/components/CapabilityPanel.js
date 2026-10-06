// CapabilityPanel.js — "What can this app do here?" (capability check). Browser checks run on this device only.
import { detectBrowser, probeEnvironment, SOURCE_ACCESS, DECLARABLE, adviceFor, loadDeclared, saveDeclared } from '../core/capabilities.js';
import { vectorHealth } from '../core/VectorSync.js';
import { resolveRemote } from '../core/aiConfig.js';
const html = window.htm.bind(window.React.createElement);
const { useState, useEffect } = window.React;
const btn = { background: '#EAF2FF', border: '1px solid #BFD7FF', color: '#1F4A7A', borderRadius: '9999px', padding: '6px 12px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' };
const dot = { yes: '#16a34a', no: '#b45309', unknown: '#64748b' };
const word = { yes: 'Yes', no: 'No', unknown: 'Unknown' };

export function CapabilityPanel() {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState([]);
  const [declared, setDeclared] = useState(() => loadDeclared(window.localStorage));
  const run = async () => {
    let ai; try { ai = !!resolveRemote().allowed; } catch (e) {}
    const env = await probeEnvironment(window, async () => { const h = await vectorHealth(); return h && h.ok; }, ai);
    setRows(detectBrowser(env));
  };
  useEffect(() => { if (open) run(); }, [open]);
  const toggle = (id) => { const next = { ...declared, [id]: !declared[id] }; setDeclared(next); saveDeclared(window.localStorage, next); };
  return html`<div id="capability-panel" style=${{ marginTop: '10px', padding: '10px', border: '1px solid #E6EAF2', borderRadius: '12px', background: '#fff' }}>
    <div style=${{ fontWeight: 700, fontSize: '14px' }}>What can this app do here?</div>
    <div style=${{ fontSize: '13px', color: '#475569', marginTop: '4px' }}>Checks this browser and shows what the app can and cannot read. A web page cannot see your Microsoft 365 licences, so tick what applies to you and the advice adapts. Nothing leaves this device.</div>
    <button type="button" id="cap-toggle" onClick=${() => setOpen(!open)} style=${{ ...btn, marginTop: '8px' }}>${open ? 'Hide capability check' : 'Run capability check'}</button>
    ${open ? html`<div id="cap-body">
      <div style=${{ fontWeight: 700, fontSize: '13px', marginTop: '10px' }}>This browser</div>
      <ul style=${{ listStyle: 'none', padding: 0, margin: '4px 0', fontSize: '13px' }}>${rows.map((r) => html`<li key=${r.id} data-cap=${r.id} data-status=${r.status} style=${{ padding: '3px 0' }}><span style=${{ color: dot[r.status], fontWeight: 700 }}>${word[r.status]}</span> · ${r.label}<div style=${{ color: '#64748b', fontSize: '12px' }}>${r.why}</div></li>`)}</ul>
      <div style=${{ fontWeight: 700, fontSize: '13px', marginTop: '10px' }}>What the app can read</div>
      <table style=${{ width: '100%', fontSize: '12px', borderCollapse: 'collapse', marginTop: '4px' }}><tbody>${SOURCE_ACCESS.map((s) => html`<tr key=${s.source} data-source=${s.source} style=${{ borderTop: '1px solid #E6EAF2', verticalAlign: 'top' }}><td style=${{ padding: '4px', fontWeight: 700, width: '28%' }}>${s.source}</td><td style=${{ padding: '4px', width: '16%' }}>${s.direct}</td><td style=${{ padding: '4px' }}>${s.how}<div style=${{ color: '#64748b' }}>${s.needs}</div></td></tr>`)}</tbody></table>
      <div style=${{ fontWeight: 700, fontSize: '13px', marginTop: '10px' }}>Your licences (you tell us; we cannot detect them)</div>
      ${DECLARABLE.map((d) => html`<label key=${d.id} style=${{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '13px', marginTop: '4px' }}><input type="checkbox" data-declare=${d.id} checked=${!!declared[d.id]} onChange=${() => toggle(d.id)} /> ${d.label}</label>`)}
      <ul id="cap-advice" style=${{ margin: '8px 0 0 18px', fontSize: '13px' }}>${adviceFor(declared).map((a) => html`<li key=${a}>${a}</li>`)}</ul>
    </div>` : null}
  </div>`;
}
