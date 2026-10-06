// ContextBanner.js — says which project another app asked for, and what happened (APP_HANDOVER_CONTRACT).
import { describeContext } from '../core/appLink.js';
const html = window.htm.bind(window.React.createElement);
const APP_NAMES = { finance: 'Finance Engine', presales: 'Pre-Sales Accelerator', continuum: 'Continuum' };

export function ContextBanner({ ctx, result, onPick, onRegister, onClose }) {
  if (!ctx || !result) return null;
  const from = APP_NAMES[ctx.from] || ctx.from || 'another app';
  const asked = describeContext(ctx);
  if (result.status === 'matched') {
    return html`<div id="ctx-banner" role="status" data-status="matched" className="banner banner--info"><span>Opened from <b>${from}</b>: showing <b>${result.project.project_name}</b>, matched by ${result.by}.</span><button type="button" className="banner__link" onClick=${onClose}>Dismiss</button></div>`;
  }
  if (result.status === 'ambiguous') {
    return html`<div id="ctx-banner" role="status" data-status="ambiguous" className="banner banner--info"><span><b>${from}</b> asked for ${asked}. ${result.matches.length} projects share that ${result.by}; pick one:</span>${result.matches.map((p) => html`<button key=${p.Project_ReferenceID} type="button" className="banner__btn" onClick=${() => onPick(p.Project_ReferenceID)}>${p.project_name}</button>`)}<button type="button" className="banner__link" onClick=${onClose}>Dismiss</button></div>`;
  }
  return html`<div id="ctx-banner" role="status" data-status="not_found" className="banner banner--danger"><span><b>${from}</b> asked for ${asked}. No project here has those IDs, so nothing was selected.</span><button type="button" className="banner__btn" onClick=${onRegister}>Register a project</button><button type="button" className="banner__link" onClick=${onClose}>Dismiss</button></div>`;
}
