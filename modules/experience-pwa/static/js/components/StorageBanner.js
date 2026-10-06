// StorageBanner.js — persistent, plain-language message when browser storage fails (DAT-02).
import { getStorageStatus, readRecovery } from '../core/storageGuard.js';
const html = window.htm.bind(window.React.createElement);
const { useState, useEffect } = window.React;
function downloadRecovery(key) {
  const raw = readRecovery(key);
  if (raw == null) return;
  const url = URL.createObjectURL(new Blob([raw], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url; a.download = 'continuum-recovery-' + String(key).replace('onion_db_corrupt_', '') + '.json';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function StorageBanner() {
  const [status, setStatus] = useState(() => getStorageStatus());
  useEffect(() => {
    const h = (e) => setStatus(e && e.detail ? { ...e.detail } : getStorageStatus());
    window.addEventListener('onion:storage-error', h);
    return () => window.removeEventListener('onion:storage-error', h);
  }, []);
  if (!status) return null;
  return html`<div role="alert" className="banner banner--danger storage-banner">
    <strong>Storage problem:</strong><span>${status.message}</span>
    ${status.recoveryKey ? html`<button type="button" className="banner__btn" onClick=${() => downloadRecovery(status.recoveryKey)}>Download recovery file</button>` : null}
  </div>`;
}
