// SuccessTab.js: "How we measure success" (scope § 8). Outcomes, honest status
// set by the team in data/content.js, and a "Show me" jump to the proof.
import { html } from '../lib/html.js';
import { SUCCESS, SUCCESS_STATUS_LABEL } from '../data/content.js';

export function SuccessTab({ onAction, onTab }) {
  return html`<main className="rm5-page" id="main">
    <section className="rm5-hero">
      <h2>How we measure success</h2>
      <p>Seven outcomes a judge can check on this page. Each one says whether it is demonstrated today and takes you to the proof.</p>
    </section>
    <div className="rm5-grid">
      ${SUCCESS.map((s, i) => html`<article key=${s.title} className="rm5-card rm5-success">
        <span className="rm5-success-num" aria-hidden="true">${i + 1}</span>
        <div>
          <h3>${s.title}</h3>
          <p>${s.detail}</p>
          <div className="rm5-verify"><b>Verify:</b> ${s.verify}</div>
        </div>
        <div className="rm5-success-side">
          <span className=${'rm5-pill rm5-pill-' + s.status}>${SUCCESS_STATUS_LABEL[s.status]}</span>
          <button type="button" className="rm5-btn rm5-btn-small" onClick=${() => onAction(s.action)}>Show me →</button>
        </div>
      </article>`)}
    </div>
    <p className="rm5-source">Engineering acceptance criteria:
      <button type="button" className="rm5-btn rm5-btn-small rm5-btn-quiet" onClick=${() => onTab('eng-check')}>⋯ Engineering → Model check</button></p>
  </main>`;
}
