// Header.js: brand, the three primary tabs, and the ⋯ Engineering corner menu.
import { html, useEffect, useRef, useState } from '../lib/html.js';

export const PRIMARY_TABS = [
  { id: 'map', label: 'Map' },
  { id: 'why', label: 'Why it matters' },
  { id: 'success', label: 'How we measure success' },
];

export const ENGINEERING_PAGES = [
  { id: 'eng-inventory', label: 'Inventory' },
  { id: 'eng-validation', label: 'Validation' },
  { id: 'eng-check', label: 'Model check' },
  { id: 'eng-guide', label: 'Guide & setup' },
  { id: 'eng-export', label: 'Export' },
];

function EngineeringMenu({ tab, onTab }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [open]);
  const onEng = tab.startsWith('eng-');
  return html`<div className="rm5-menu" ref=${ref}>
    <button type="button" className=${'rm5-btn rm5-btn-small' + (onEng ? '' : ' rm5-btn-quiet')} aria-haspopup="menu" aria-expanded=${open}
      onClick=${() => setOpen(!open)}>⋯ Engineering ▾</button>
    ${open && html`<div className="rm5-menu-list" role="menu">
      <div className="rm5-menu-note">For architects and engineers</div>
      ${ENGINEERING_PAGES.map((p) => html`<button type="button" role="menuitem" key=${p.id}
        onClick=${() => { setOpen(false); onTab(p.id); }}>${p.label}</button>`)}
    </div>`}
  </div>`;
}

export function Header({ tab, onTab }) {
  return html`<header className="rm5-header">
    <div className="rm5-brand">
      <span className="rm5-brand-mark" aria-hidden="true">◎</span>
      <div><h1>Continuum</h1><small>Relationship Model v5</small></div>
    </div>
    <nav className="rm5-tabs" aria-label="Primary">
      ${PRIMARY_TABS.map((t) => html`<button type="button" key=${t.id} className="rm5-tab"
        aria-current=${tab === t.id ? 'page' : undefined} onClick=${() => onTab(t.id)}>${t.label}</button>`)}
    </nav>
    <span className="rm5-spacer"></span>
    <${EngineeringMenu} tab=${tab} onTab=${onTab} />
  </header>`;
}
