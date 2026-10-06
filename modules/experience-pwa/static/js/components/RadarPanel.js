// RadarPanel.js — Continuity Radar (RAD-01). Lists where knowledge could be lost, by stated rule.
// Each risk links to the card; the rules are shown in full. It is about knowledge coverage, never about people.
import { radarFor, RULES } from '../core/radar.js';
const html = window.htm.bind(window.React.createElement);
const box = { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center' };
const card = { background: '#fff', borderRadius: '16px', padding: '20px', width: 'min(820px, 94vw)', maxHeight: '88vh', overflow: 'auto', fontSize: '15px', color: '#1f2937' };
const btn = { padding: '6px 14px', borderRadius: '9999px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '14px', cursor: 'pointer' };
const LEVEL = { high: { bg: '#FFE4E6', tx: '#9F1239', label: 'High' }, medium: { bg: '#FFF5D6', tx: '#92400E', label: 'Medium' } };

export function RadarPanel({ cards, project, onView, onClose }) {
  const r = radarFor(cards, project);
  return html`<div style=${box} role="presentation"><div id="radar-panel" role="dialog" aria-modal="true" aria-labelledby="radar-title" style=${card}>
    <div style=${{ display: 'flex', alignItems: 'center', gap: '10px' }}><div id="radar-title" style=${{ fontSize: '18px', fontWeight: 700 }}>Continuity Radar${project ? ': ' + project.project_name : ''}</div><span style=${{ marginLeft: 'auto', fontSize: '14px' }}>${r.counts.high} high, ${r.counts.medium} medium</span><button id="radar-close" type="button" style=${btn} onClick=${onClose}>Close</button></div>
    <div style=${{ fontSize: '13px', color: '#64748b', margin: '6px 0 10px' }}>Shows knowledge likely to be lost. It measures coverage of knowledge, not the performance of any person. Handover coverage: ${r.coverage.covered.length} of ${r.coverage.total} areas.</div>
    ${r.risks.length ? null : html`<div id="radar-empty">No continuity risks found by the rules below.</div>`}
    ${Object.keys(RULES).map((k) => r.byRule[k].length ? html`<section key=${k} className="radar-rule" style=${{ marginBottom: '12px' }}>
      <div style=${{ fontWeight: 700 }}>${RULES[k].label} (${r.byRule[k].length})</div>
      ${r.byRule[k].map((x, i) => html`<div key=${k + i} className="radar-risk" style=${{ display: 'flex', gap: '8px', alignItems: 'baseline', padding: '4px 0', borderBottom: '1px solid #eef2f7' }}>
        <span style=${{ background: LEVEL[x.level].bg, color: LEVEL[x.level].tx, borderRadius: '9999px', padding: '1px 10px', fontSize: '13px', fontWeight: 600 }}>${LEVEL[x.level].label}</span>
        <span style=${{ flex: 1 }}>${x.cardId ? html`<button type="button" className="radar-link" style=${{ textDecoration: 'underline', color: '#1F4A7A', background: 'none', border: 0, cursor: 'pointer', fontSize: '15px', textAlign: 'left' }} onClick=${() => { onView(x.cardId); onClose(); }}>${x.title}</button>` : html`<b>${x.title}</b>`}<span style=${{ display: 'block', fontSize: '13px', color: '#475569' }}>${x.why}${x.evidence ? ' Evidence: ' + (x.evidence.sources.join(' + ') || 'none') + (x.evidence.sourceIds.length ? ' (' + x.evidence.sourceIds.length + ' source record' + (x.evidence.sourceIds.length === 1 ? '' : 's') + ')' : '') + ', strength ' + x.evidence.tier + '.' : ''}</span></span>
      </div>`)}
    </section>` : null)}
    <details style=${{ marginTop: '8px' }}><summary style=${{ cursor: 'pointer' }}>How levels are decided</summary>${Object.keys(RULES).map((k) => html`<div key=${k} style=${{ fontSize: '13px', marginTop: '4px' }}><b>${RULES[k].label}:</b> ${RULES[k].text}</div>`)}</details>
  </div></div>`;
}
