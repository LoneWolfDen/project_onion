// DiagnosticsPanel.js — view, preview and download the safe local log (OPS-02).
import { logger } from '../core/logger.js';
import { getLayout, setLayout, applyLayout } from '../core/layoutFlag.js';
import { APP_VERSION } from '../core/backup.js';
import { repoMode } from '../core/repo.js';
const html = window.htm.bind(window.React.createElement);
const { useState } = window.React;
const btn = { background: '#EAF2FF', border: '1px solid #BFD7FF', color: '#1F4A7A', borderRadius: '9999px', padding: '6px 12px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' };

export function DisplayPanel() {
  const [layout, setL] = useState(() => getLayout(window.localStorage));
  const flip = (e) => { const v = setLayout(window.localStorage, e.target.checked ? 'hierarchy' : 'classic'); applyLayout(document, v); setL(v); };
  return html`<label id="layout-flag" style=${{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '10px', fontSize: '13px' }}><input type="checkbox" checked=${layout === 'hierarchy'} onChange=${flip} /> New card layout (clearer title, quieter details)</label>`;
}

export function DiagnosticsPanel() {
  const [text, setText] = useState('');
  const [count, setCount] = useState(() => logger().events().length);
  const meta = () => { let storageMode = ''; try { storageMode = repoMode(); } catch (e) {} return { appVersion: APP_VERSION, swVersion: 'continuum-sw', storageMode }; };
  const preview = () => { setText(logger().exportText(meta())); setCount(logger().events().length); };
  const download = () => {
    const t = text || logger().exportText(meta());
    const url = URL.createObjectURL(new Blob([t], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = 'continuum-diagnostics-' + new Date().toISOString().replace(/[:.]/g, '-') + '.json';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const clear = () => { logger().clear(); setText(''); setCount(0); };
  return html`<div id="diagnostics-panel" style=${{ marginTop: '10px', padding: '10px', border: '1px solid #E6EAF2', borderRadius: '12px', background: '#fff' }}>
    <div style=${{ fontWeight: 700, fontSize: '14px' }}>Diagnostics</div>
    <div style=${{ fontSize: '13px', color: '#475569', marginTop: '4px' }}>A short log of what the app did (event codes and counts only, never your cards, names or file contents). It stays on this device. Preview it, then download it if you want to share it. ${count} event${count === 1 ? '' : 's'} stored.</div>
    <div style=${{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
      <button type="button" id="diag-preview" onClick=${preview} style=${btn}>Preview log</button>
      <button type="button" id="diag-download" onClick=${download} style=${btn}>Download log</button>
      <button type="button" id="diag-clear" onClick=${clear} style=${btn}>Clear log</button>
    </div>
    ${text ? html`<textarea id="diag-text" readOnly rows="8" value=${text} style=${{ width: '100%', marginTop: '8px', fontFamily: 'ui-monospace, monospace', fontSize: '12px', border: '1px solid #E6EAF2', borderRadius: '8px', padding: '6px' }}></textarea>` : null}
  </div>`;
}
