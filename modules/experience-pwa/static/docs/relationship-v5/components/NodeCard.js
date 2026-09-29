// NodeCard.js: one card on the canvas. The card body selects; the chevron
// expands a group; a gate's avatar opens the "what the person decides" popover.
import { html } from '../lib/html.js';
import { StatusPill, PersonIcon } from './ui.js';
import { GATE_TASKS } from '../data/runtimeModel.js';

export function NodeCard({ box, node, state, expanded, popoverOpen, gatePulse, arrive, onSelect, onToggle, onHover, onAvatar }) {
  const isGroup = Boolean(node.children);
  const isGate = node.kind === 'gate';
  const cls = ['rm5-node', 'kind-' + node.kind, 'status-' + node.status, box.child ? 'rm5-child' : '', arrive ? 'rm5-arrive' : ''].join(' ');
  const stop = (e) => e.stopPropagation();

  return html`<div className=${cls} data-state=${state} data-node=${node.id}
      style=${{ left: box.x + 'px', top: box.y + 'px', width: box.w + 'px', height: box.h + 'px', zIndex: popoverOpen ? 25 : undefined }}
      onClick=${stop}>
    <button type="button" className="rm5-node-main" title=${node.label}
        aria-pressed=${state === 'selected'}
        aria-label=${node.label + ', ' + node.status + (isGate ? ', human gate' : '')}
        onClick=${() => onSelect(node.id)}
        onMouseEnter=${() => onHover(node.id)} onMouseLeave=${() => onHover(null)}>
      <span className="rm5-node-title">${node.label}</span>
      <span className="rm5-node-sub">${node.sub}</span>
      <span className="rm5-node-foot"><${StatusPill} status=${node.status} /></span>
    </button>
    ${isGroup && html`<button type="button" className="rm5-chevron" aria-expanded=${expanded}
        aria-label=${(expanded ? 'Collapse ' : 'Expand ') + node.label}
        onClick=${() => onToggle(node.id)}>▸</button>`}
    ${isGate && html`<button type="button" className="rm5-avatar" aria-haspopup="dialog" aria-expanded=${popoverOpen}
        aria-label=${'What the person decides at ' + node.label}
        onClick=${() => onAvatar(popoverOpen ? null : node.id)}>
      <${PersonIcon} /><span className=${'rm5-avatar-dot' + (gatePulse ? ' rm5-live' : '')}></span>
    </button>`}
    ${isGate && popoverOpen && html`<div className="rm5-popover" role="dialog" aria-label=${node.label}>
      <h4>A person decides</h4>
      <ul>${(GATE_TASKS[node.id] || []).map((t) => html`<li key=${t}>${t}</li>`)}</ul>
    </div>`}
  </div>`;
}
