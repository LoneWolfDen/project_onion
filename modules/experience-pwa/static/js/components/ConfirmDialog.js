// ConfirmDialog.js — explicit confirmation for destructive actions (DAT-05).
const html = window.htm.bind(window.React.createElement);
const { useState, useEffect } = window.React;
// props: title, lines[], confirmLabel, phrase (optional typed phrase), onConfirm({ wantBackup, input }), onCancel
export function ConfirmDialog({ title, lines, confirmLabel, phrase, onConfirm, onCancel, busy, error }) {
  const [input, setInput] = useState('');
  const [wantBackup, setWantBackup] = useState(true);
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onCancel]);
  const ready = !phrase || String(input).trim() === phrase;
  return html`<div id="confirm-backdrop" role="presentation" style=${{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div id="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" style=${{ background: '#fff', borderRadius: '16px', padding: '20px', width: 'min(520px, 92vw)', boxShadow: '0 20px 50px rgba(0,0,0,0.25)', fontSize: '15px', color: '#1f2937' }}>
      <div id="confirm-title" style=${{ fontSize: '18px', fontWeight: 700, marginBottom: '8px', color: '#7F1D1D' }}>${title}</div>
      ${lines.map((l, i) => html`<div key=${i} style=${{ marginBottom: '6px' }}>${l}</div>`)}
      <label style=${{ display: 'flex', gap: '8px', alignItems: 'center', margin: '10px 0' }}><input id="confirm-backup" type="checkbox" checked=${wantBackup} onChange=${(e) => setWantBackup(e.target.checked)} /> Download a backup file first (recommended)</label>
      ${phrase ? html`<div style=${{ margin: '8px 0' }}>Type <strong>${phrase}</strong> to continue:<input id="confirm-phrase" value=${input} onInput=${(e) => setInput(e.target.value)} autoComplete="off" style=${{ display: 'block', width: '100%', marginTop: '6px', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '15px' }} /></div>` : null}
      ${error ? html`<div role="alert" style=${{ color: '#7F1D1D', marginBottom: '8px' }}>${error}</div>` : null}
      <div style=${{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '12px' }}>
        <button id="confirm-cancel" type="button" onClick=${onCancel} style=${{ padding: '8px 16px', borderRadius: '9999px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '15px', cursor: 'pointer' }}>Cancel</button>
        <button id="confirm-go" type="button" disabled=${!ready || busy} onClick=${() => onConfirm({ wantBackup, input })} style=${{ padding: '8px 16px', borderRadius: '9999px', border: '1px solid #F5C2D8', background: ready && !busy ? '#FDE8F0' : '#f1f5f9', color: '#831843', fontWeight: 700, fontSize: '15px', cursor: ready && !busy ? 'pointer' : 'not-allowed' }}>${busy ? 'Working…' : confirmLabel}</button>
      </div>
    </div>
  </div>`;
}
