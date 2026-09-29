// WhyTab.js: "Why it matters" (scope § 7.2). Before/after rows, each linked to
// the moment in the demo that proves it. Impact figures render only with a source.
import { html } from '../lib/html.js';
import { WHY } from '../data/content.js';

export function WhyTab({ onAction }) {
  return html`<main className="rm5-page" id="main">
    <section className="rm5-hero">
      <h2><span>Without Continuum, ${WHY.without}</span><span className="rm5-with">With Continuum, ${WHY.with}</span></h2>
      <p>Project knowledge is captured from the places work already happens, checked by people at three gates, and kept with the project, not with whoever leaves.</p>
    </section>
    <div className="rm5-grid">
      ${WHY.rows.map((r) => html`<article key=${r.topic} className="rm5-card">
        <h3>${r.topic}</h3>
        <div className="rm5-ba">
          <div className="rm5-ba-without"><b>Without Continuum</b>${r.without}</div>
          <div className="rm5-ba-with"><b>With Continuum</b>${r.with}</div>
        </div>
        <button type="button" className="rm5-btn rm5-btn-small" onClick=${() => onAction(r.action)}>See it in the demo · ${r.demo} →</button>
      </article>`)}
    </div>
    ${WHY.measuredImpact.length > 0 && html`<section className="rm5-card"><h3>Measured impact</h3>
      <ul>${WHY.measuredImpact.map((m) => html`<li key=${m.figure}><b>${m.figure}</b> ${m.claim} <span className="rm5-source">Source: ${m.source}</span></li>`)}</ul>
    </section>`}
  </main>`;
}
