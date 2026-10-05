// OriginalsPanel.js — see and delete the protected originals kept on this device (PRV-05).
import { listOriginals, deleteOriginal, clearOriginals } from '../core/pii.js';
import { readLocal } from '../core/FailoverDB.js';
const html = window.htm.bind(window.React.createElement);
const { useState } = window.React;
const btn = { background: '#EAF2FF', border: '1px solid #BFD7FF', color: '#1F4A7A', borderRadius: '9999px', padding: '6px 12px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' };

function titleFor(id) {
  try { const s = readLocal(); const c = (s.timeline || []).concat(s.notes || []).find((x) => x && String(x.id) === String(id)); return c ? String(c.title || '') : ''; } catch (e) { return ''; }
}

export function OriginalsPanel() {
  const [rows, setRows] = useState(null);
  const [count, setCount] = useState(() => listOriginals().length);
  const show = () => { const r = listOriginals(); setRows(r); setCount(r.length); };
  const del = (id) => { deleteOriginal(id); show(); };
  const wipe = () => { if (window.confirm('Delete all ' + count + ' protected originals from this device? The redacted text on your cards stays.')) { clearOriginals(); show(); } };
  return html`<div id="originals-panel" style=${{ marginTop: '10px', padding: '10px', border: '1px solid #E6EAF2', borderRadius: '12px', background: '#fff' }}>
    <div style=${{ fontWeight: 700, fontSize: '14px' }}>Protected originals</div>
    <div style=${{ fontSize: '13px', color: '#475569', marginTop: '4px' }}>When screening redacts text, the original is kept on this device only. It is never in backups, exports or sync. ${count} stored.</div>
    <div style=${{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
      <button type="button" id="originals-show" onClick=${show} style=${btn}>Show originals</button>
      ${count ? html`<button type="button" id="originals-clear" onClick=${wipe} style=${btn}>Delete all</button>` : null}
    </div>
    ${rows ? (rows.length ? html`<ul id="originals-list" style=${{ listStyle: 'none', margin: '8px 0 0', padding: 0 }}>${rows.map((r) => html`<li key=${r.id} style=${{ borderTop: '1px solid #E6EAF2', padding: '6px 0', fontSize: '13px' }}>
      <div style=${{ color: '#64748B' }}>${titleFor(r.id) || r.id} · ${r.at.slice(0, 10)}</div>
      <div style=${{ whiteSpace: 'pre-wrap' }}>${r.text}</div>
      <button type="button" onClick=${() => del(r.id)} style=${{ ...btn, marginTop: '4px' }}>Delete this original</button></li>`)}</ul>` : html`<div id="originals-empty" style=${{ marginTop: '8px', fontSize: '13px' }}>Nothing stored.</div>`) : null}
  </div>`;
}
