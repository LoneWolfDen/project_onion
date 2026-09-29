// EngineeringPages.js: the ⋯ Engineering corner menu pages (scope S10–S14).
// Kept off the Map on purpose; each page has a "← Back to map" link.
import { html, useMemo, useState } from '../lib/html.js';
import { VIEWS } from '../lib/views.js';
import { runIntegrityChecks } from '../lib/integrity.js';
import { VALIDATION_SCRIPTS, GUIDE } from '../data/content.js';
import { DOMAIN_MODEL } from '../data/domainModel.js';
import { STORY_STEPS } from '../data/story.js';
import { StatusPill, KeyValues, Section } from './ui.js';

function Page({ title, intro, onBack, children }) {
  return html`<main className="rm5-page" id="main">
    <button type="button" className="rm5-btn rm5-btn-small rm5-back" onClick=${onBack}>← Back to map</button>
    <div><h2 style=${{ margin: 0, fontSize: '22px', color: 'var(--accent)' }}>${title}</h2>
      ${intro && html`<p style=${{ margin: '6px 0 0', color: 'var(--muted)' }}>${intro}</p>`}</div>
    ${children}
  </main>`;
}

function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text).then(() => true, () => false);
  } catch (e) { /* fall through to the textarea fallback */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return Promise.resolve(ok);
  } catch (e) { return Promise.resolve(false); }
}

function Inventory({ onBack, onShow }) {
  const [viewId, setViewId] = useState('runtime');
  const view = VIEWS[viewId];
  const ids = Object.keys(view.nodes);
  const [picked, setPicked] = useState(null);
  const node = view.nodes[picked && view.nodes[picked] ? picked : ids[0]];
  return html`<${Page} title="Inventory" intro="Every card in both views, with what it does and where it is built." onBack=${onBack}>
    <div className="rm5-switch" role="group" aria-label="View">
      ${['runtime', 'domain'].map((v) => html`<button type="button" key=${v} aria-pressed=${viewId === v} onClick=${() => { setViewId(v); setPicked(null); }}>
        ${VIEWS[v].title} · ${Object.keys(VIEWS[v].nodes).length}</button>`)}
    </div>
    <div className="rm5-inv">
      <div className="rm5-inv-list">${ids.map((id) => {
        const n = view.nodes[id];
        return html`<button type="button" key=${id} className="rm5-link" aria-pressed=${node.id === id}
          style=${node.id === id ? { borderColor: 'var(--accent)', background: '#fff' } : null} onClick=${() => setPicked(id)}>
          <span>${n.parent ? '↳ ' : ''}${n.label}</span><${StatusPill} status=${n.status} /></button>`;
      })}</div>
      <article className="rm5-card" style=${{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div><h3 style=${{ fontSize: '18px' }}>${node.label}</h3><${StatusPill} status=${node.status} />
          <span className="rm5-source rm5-mono" style=${{ marginLeft: '8px' }}>${node.id}</span></div>
        <p style=${{ margin: 0 }}>${node.desc}</p>
        <${Section} title="Built in"><ul className="rm5-list">${(node.evidence || []).map((e) => html`<li key=${e} className="rm5-evidence">${e}</li>`)}</ul><//>
        <${Section} title="Links">
          <${KeyValues} rows=${view.edges.filter((e) => e.from === node.id || e.to === node.id).map((e) => [
            (e.from === node.id ? '→ ' + view.nodes[e.to].label : '← ' + view.nodes[e.from].label), e.condition || e.label])} />
        <//>
        <div><button type="button" className="rm5-btn rm5-btn-small" onClick=${() => onShow(viewId, node.id)}>Show on map →</button></div>
      </article>
    </div>
  <//>`;
}

function Validation({ onBack }) {
  const [copied, setCopied] = useState(null);
  return html`<${Page} title="Validation scripts"
      intro="Display-only. Copy a script into the DevTools console of the Continuum PWA (localhost:8002). They only read localStorage and never write." onBack=${onBack}>
    ${VALIDATION_SCRIPTS.map((s) => html`<article key=${s.id} className="rm5-card" style=${{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style=${{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div><h3>${s.title}</h3><span className="rm5-source">Reads <code>${s.reads}</code></span></div>
        <button type="button" className="rm5-btn rm5-btn-small"
          onClick=${() => copyText(s.script).then((ok) => { setCopied(ok ? s.id : 'fail:' + s.id); setTimeout(() => setCopied(null), 1600); })}>
          ${copied === s.id ? 'Copied ✓' : copied === 'fail:' + s.id ? 'Select and copy manually' : 'Copy'}</button>
      </div>
      <pre className="rm5-code">${s.script}</pre>
      <p style=${{ margin: 0, fontSize: '13px', color: 'var(--ink-2)' }}><b>How to read it:</b> ${s.howToRead}</p>
    </article>`)}
  <//>`;
}

function ModelCheck({ onBack }) {
  const results = useMemo(() => runIntegrityChecks(), []);
  const failed = results.filter((r) => !r.ok).length;
  return html`<${Page} title="Model check"
      intro="Checks the page's own data against the accuracy rules in RELATIONSHIP_MODEL_V5_Scope.md § 11. Read-only." onBack=${onBack}>
    <article className="rm5-card">
      <h3>${failed ? failed + ' of ' + results.length + ' checks failed' : 'All ' + results.length + ' checks pass'}</h3>
      <div>${results.map((r) => html`<div key=${r.title} className="rm5-check-row">
        <span className=${'rm5-pill ' + (r.ok ? 'rm5-pill-pass' : 'rm5-pill-fail')}>${r.ok ? 'Pass' : 'Fail'}</span>
        <div>${r.title}${r.failures.length ? html`<div className="rm5-source">${r.failures.join(' · ')}</div>` : null}</div>
      </div>`)}</div>
    </article>
  <//>`;
}

function Guide({ onBack }) {
  return html`<${Page} title="Guide & setup" intro="How to run this page and read it." onBack=${onBack}>
    <article className="rm5-card"><h3>Run it</h3>
      <${KeyValues} rows=${GUIDE.run.map(([k, v]) => [k, html`<code className="rm5-mono">${v}</code>`])} />
      <p className="rm5-source" style=${{ marginTop: '8px' }}>No build step, no npm, no CDN. React and htm load from <code>static/js/vendor/</code>.</p>
    </article>
    <article className="rm5-card"><h3>How to read the map</h3><${KeyValues} rows=${GUIDE.reading} /></article>
    <article className="rm5-card"><h3>Keep the Domain view in sync</h3>
      <p style=${{ margin: '0 0 8px' }}>The Domain view is generated from <code>data/seed/relationship_model.json</code>. After editing that file, run:</p>
      <pre className="rm5-code">${GUIDE.regenerate}</pre>
      <p className="rm5-source" style=${{ marginTop: '8px' }}>Then open Model check to confirm the Domain view still matches the generated model.</p>
    </article>
  <//>`;
}

function download(name, text, type) {
  try {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch (e) { return false; }
}

function toMarkdown() {
  const lines = ['# Continuum · Relationship Model v5', ''];
  ['runtime', 'domain'].forEach((v) => {
    const view = VIEWS[v];
    lines.push('## ' + view.title + ' view', '');
    Object.values(view.nodes).forEach((n) => lines.push('- **' + n.label + '** (' + n.status + ')' + (n.parent ? ' · in ' + view.nodes[n.parent].label : '') + ': ' + n.desc));
    lines.push('', '### Links', '');
    view.edges.forEach((e) => lines.push('- ' + view.nodes[e.from].label + ' → ' + view.nodes[e.to].label + ' · ' + (e.condition || e.label)));
    lines.push('');
  });
  lines.push('## Story', '');
  STORY_STEPS.forEach((s, i) => lines.push((i + 1) + '. ' + s.caption + ' _(source: ' + s.detail.source + ')_'));
  return lines.join('\n') + '\n';
}

function Export({ onBack }) {
  const [msg, setMsg] = useState('');
  const json = () => JSON.stringify({ runtime: { nodes: VIEWS.runtime.nodes, edges: VIEWS.runtime.edges }, domain: DOMAIN_MODEL, story: STORY_STEPS }, null, 2);
  return html`<${Page} title="Export" intro="Download the model behind this page." onBack=${onBack}>
    <article className="rm5-card" style=${{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
      <button type="button" className="rm5-btn" onClick=${() => setMsg(download('continuum-relationship-v5.json', json(), 'application/json') ? 'JSON downloaded.' : 'Download blocked by the browser.')}>Export JSON</button>
      <button type="button" className="rm5-btn" onClick=${() => setMsg(download('continuum-relationship-v5.md', toMarkdown(), 'text/markdown') ? 'Markdown downloaded.' : 'Download blocked by the browser.')}>Export Markdown</button>
      <span className="rm5-source" role="status">${msg}</span>
    </article>
  <//>`;
}

export function EngineeringPage({ tab, onBack, onShow }) {
  if (tab === 'eng-inventory') return html`<${Inventory} onBack=${onBack} onShow=${onShow} />`;
  if (tab === 'eng-validation') return html`<${Validation} onBack=${onBack} />`;
  if (tab === 'eng-check') return html`<${ModelCheck} onBack=${onBack} />`;
  if (tab === 'eng-guide') return html`<${Guide} onBack=${onBack} />`;
  return html`<${Export} onBack=${onBack} />`;
}
