// BackupPanel.js — export / restore everything, offline, no AI or network (DAT-01).
import { buildBackup, validateBackup, restoreBackup, PREFERENCE_KEYS } from '../core/backup.js';
import { readLocal, tryWriteLocal } from '../core/FailoverDB.js';
import { requestPersistence, describePersistence } from '../core/persistence.js';
import { logEvent } from '../core/logger.js';
const html = window.htm.bind(window.React.createElement);
const { useState, useEffect } = window.React;
const SNAP_PREFIX = 'onion_preimport_backup_';
const btn = { background: '#EAF2FF', border: '1px solid #BFD7FF', color: '#1F4A7A', borderRadius: '9999px', padding: '6px 12px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' };

function download(name, text) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const stamp = () => new Date().toISOString().replace(/[:.]/g, '-');
function readPrefs() { const p = {}; try { PREFERENCE_KEYS.forEach((k) => { const v = localStorage.getItem(k); if (v != null) p[k] = v; }); } catch (e) {} return p; }

// Safety copy of current data before an import: kept in the browser, or downloaded if the browser is full.
async function saveSnapshot(snapshot) {
  const text = JSON.stringify(snapshot);
  try {
    Object.keys(localStorage).filter((k) => k.indexOf(SNAP_PREFIX) === 0).forEach((k) => localStorage.removeItem(k));
    localStorage.setItem(SNAP_PREFIX + stamp(), text);
    return true;
  } catch (e) {
    try { download('continuum-pre-import-backup-' + stamp() + '.json', text); return true; } catch (e2) { return false; }
  }
}

// Download a backup of the current data. Resolves true only if the file was produced.
export async function downloadBackupNow() {
  try {
    const b = await buildBackup(readLocal(), readPrefs());
    download('continuum-backup-' + stamp() + '.json', JSON.stringify(b, null, 2));
    try { localStorage.setItem('onion_last_backup_at', b.generatedAt); } catch (e) {}
    logEvent('backup', 'backup.exported', {});
    return true;
  } catch (e) { logEvent('backup', 'backup.export_failed', {}, 'error'); return false; }
}

export function BackupPanel() {
  const [msg, setMsg] = useState('');
  const [persist, setPersist] = useState(null);
  useEffect(() => { let live = true; requestPersistence().then((r) => { if (live) setPersist(describePersistence(r)); }); return () => { live = false; }; }, []);
  const [pending, setPending] = useState(null); // { name, backup }
  const [mode, setMode] = useState('merge');
  const lastBackup = (() => { try { return localStorage.getItem('onion_last_backup_at'); } catch (e) { return null; } })();

  const onExport = async () => {
    try {
      const b = await buildBackup(readLocal(), readPrefs());
      download('continuum-backup-' + stamp() + '.json', JSON.stringify(b, null, 2));
      try { localStorage.setItem('onion_last_backup_at', b.generatedAt); } catch (e) {}
      setMsg('Backup saved to your downloads (' + b.counts.timeline + ' cards, ' + b.counts.projects + ' projects).');
    } catch (e) { setMsg('Backup failed: ' + String((e && e.message) || e)); }
  };
  const onPick = async (e) => {
    const f = e.target.files && e.target.files[0]; e.target.value = '';
    setPending(null); if (!f) return;
    let obj = null;
    try { obj = JSON.parse(await f.text()); } catch (err) { setMsg('That file is not valid JSON. Nothing was changed.'); return; }
    const v = await validateBackup(obj);
    if (!v.ok) { setMsg('Cannot restore: ' + v.errors.join(' ') + ' Nothing was changed.'); return; }
    setMsg(''); setPending({ name: f.name, backup: obj });
  };
  const onRestore = async () => {
    const b = pending.backup;
    const ok = window.confirm(mode === 'replace'
      ? 'Replace ALL current data with this backup? A safety copy of your current data is saved first.'
      : 'Merge this backup into your current data? Existing records are kept. A safety copy is saved first.');
    if (!ok) return;
    const r = await restoreBackup(b, mode, { read: readLocal, saveSnapshot, write: (s) => tryWriteLocal(s, { force: true }),
      writePrefs: (p) => Object.keys(p).forEach((k) => { if (PREFERENCE_KEYS.indexOf(k) >= 0) localStorage.setItem(k, p[k]); }) });
    if (!r.ok) { setMsg('Restore failed: ' + r.errors.join(' ')); return; }
    setPending(null);
    setMsg('Restored (' + mode + ')' + (r.stats ? ': ' + r.stats.added + ' added, ' + r.stats.updated + ' updated.' : '.') + ' Reloading…');
    setTimeout(() => { try { window.location.reload(); } catch (e) {} }, 700);
  };
  return html`<div id="backup-panel" style=${{ marginTop: '10px', padding: '10px', border: '1px solid #BFD7FF', borderRadius: '12px', background: '#F5F9FF' }}>
    <div style=${{ fontSize: '14px', fontWeight: 700, marginBottom: '4px' }}>Backup and restore</div>
    <div style=${{ fontSize: '13px', color: '#475569', marginBottom: '8px' }}>Works offline. Last backup: ${lastBackup ? new Date(lastBackup).toLocaleString() : 'never'}. API keys are never included.</div>
    ${persist ? html`<div id="persist-status" style=${{ fontSize: '13px', marginBottom: '8px', color: persist.level === 'ok' ? '#065F46' : '#92400E' }}>${persist.text}</div>` : null}
    <div style=${{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
      <button type="button" id="backup-export" onClick=${onExport} style=${btn}>⬇ Export backup</button>
      <label style=${{ ...btn, display: 'inline-block' }}>⬆ Choose backup file<input id="backup-file" type="file" accept="application/json,.json" onChange=${onPick} style=${{ display: 'none' }} /></label>
    </div>
    ${pending ? html`<div id="backup-preview" style=${{ marginTop: '8px', fontSize: '13px' }}>
      <div><strong>${pending.name}</strong> — made ${new Date(pending.backup.generatedAt).toLocaleString()} · ${pending.backup.counts ? pending.backup.counts.timeline + ' cards, ' + pending.backup.counts.projects + ' projects' : ''}</div>
      <label style=${{ marginRight: '12px' }}><input type="radio" name="backup-mode" checked=${mode === 'merge'} onChange=${() => setMode('merge')} /> Merge (keep what I have)</label>
      <label><input type="radio" name="backup-mode" checked=${mode === 'replace'} onChange=${() => setMode('replace')} /> Replace everything</label>
      <div style=${{ marginTop: '6px' }}><button type="button" id="backup-restore" onClick=${onRestore} style=${btn}>Restore</button></div>
    </div>` : null}
    ${msg ? html`<div id="backup-msg" role="status" style=${{ marginTop: '8px', fontSize: '13px' }}>${msg}</div>` : null}
  </div>`;
}
