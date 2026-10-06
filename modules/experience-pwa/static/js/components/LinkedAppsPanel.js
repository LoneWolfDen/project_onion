// LinkedAppsPanel.js — addresses of the sibling apps on this device (World of Continuum footer).
import { WORLD_OF_CONTINUUM } from '../constants/worldOfContinuum.js';
import { loadAppUrls, saveAppUrls } from '../core/appLink.js';
const html = window.htm.bind(window.React.createElement);
const { useState } = window.React;
const btn = { background: '#EAF2FF', border: '1px solid #BFD7FF', color: '#1F4A7A', borderRadius: '9999px', padding: '6px 12px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' };

export function LinkedAppsPanel() {
  const apps = WORLD_OF_CONTINUUM.filter((w) => !w.current);
  const [urls, setUrls] = useState(() => loadAppUrls(window.localStorage));
  const [msg, setMsg] = useState('');
  const save = () => { const out = saveAppUrls(window.localStorage, urls); setMsg(out ? 'Saved on this device. Footer links now open these addresses with the active project.' : 'Could not save on this device.'); };
  return html`<div id="linked-apps-panel" style=${{ marginTop: '10px', padding: '10px', border: '1px solid #E6EAF2', borderRadius: '12px', background: '#fff' }}>
    <div style=${{ fontWeight: 700, fontSize: '14px' }}>Linked apps</div>
    <div style=${{ fontSize: '13px', color: '#475569', marginTop: '4px' }}>Where each app runs on this device (for example http://localhost:3005). The footer link sends only the active project's IDs (Continuum ref, project ID, opportunity, GDP ID, name, client), never cards or notes. Empty uses the built-in address.</div>
    ${apps.map((w) => html`<label key=${w.id} style=${{ display: 'block', fontSize: '13px', marginTop: '6px' }}>${w.name}<input type="url" data-app-url=${w.id} placeholder=${w.url || 'https://...'} value=${urls[w.id] || ''} onInput=${(e) => setUrls({ ...urls, [w.id]: e.target.value })} style=${{ display: 'block', width: '100%', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '6px 8px', fontSize: '13px' }} /></label>`)}
    <button type="button" id="linked-apps-save" onClick=${save} style=${{ ...btn, marginTop: '8px' }}>Save addresses</button>
    ${msg ? html`<div style=${{ fontSize: '13px', marginTop: '6px' }}>${msg}</div>` : null}
  </div>`;
}
