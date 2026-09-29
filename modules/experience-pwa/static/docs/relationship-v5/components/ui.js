// ui.js: small shared pieces (status pill, condition tag, person icon).
import { html } from '../lib/html.js';
import { CONDITIONS } from '../data/conditions.js';

const STATUS_LABEL = { live: 'Live', partial: 'Partial', vision: 'Vision' };

export function StatusPill({ status }) {
  return html`<span className=${'rm5-pill rm5-pill-' + status}>${STATUS_LABEL[status] || status}</span>`;
}

export function ConditionTag({ condition, withName = true }) {
  const c = CONDITIONS[condition];
  if (!c) return html`<span className="rm5-cond">${condition}</span>`;
  return html`<span className="rm5-cond" style=${{ color: c.ink }}>
    <span className="rm5-cond-glyph" style=${{ border: '1px solid ' + c.ink, background: c.fill }} aria-hidden="true">${c.glyph}</span>
    ${withName ? condition : null}
  </span>`;
}

export function PersonIcon() {
  return html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <circle cx="12" cy="8" r="3.6"></circle><path d="M5 20c0-4 3.4-6.2 7-6.2s7 2.2 7 6.2"></path>
  </svg>`;
}

export function Section({ title, children }) {
  return html`<section className="rm5-sec"><h3>${title}</h3>${children}</section>`;
}

export function KeyValues({ rows }) {
  return html`<table className="rm5-kv"><tbody>
    ${rows.map(([k, v]) => html`<tr key=${k}><th scope="row">${k}</th><td>${v}</td></tr>`)}
  </tbody></table>`;
}
