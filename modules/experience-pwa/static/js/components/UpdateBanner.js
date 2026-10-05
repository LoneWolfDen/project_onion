// UpdateBanner.js — "Update available" prompt for a waiting service worker (PWA-02).
import { UPDATE_EVENT, applyUpdate } from '../core/pwa.js';
const html = window.htm.bind(window.React.createElement);
const { useState, useEffect } = window.React;
export function UpdateBanner() {
  const [ready, setReady] = useState(() => !!window.__onionWaitingWorker);
  useEffect(() => {
    const h = () => setReady(true);
    window.addEventListener(UPDATE_EVENT, h);
    return () => window.removeEventListener(UPDATE_EVENT, h);
  }, []);
  if (!ready) return null;
  return html`<div id="update-banner" role="status" style=${{ background: '#E0F2FE', color: '#0C4A6E', border: '1px solid #7DD3FC', padding: '10px 16px', fontSize: '15px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
    <strong>Update available.</strong><span>A new version of Continuum is ready. Your data is not affected.</span>
    <button id="update-now" type="button" onClick=${() => applyUpdate(window.__onionWaitingWorker)} style=${{ background: '#fff', border: '1px solid #7DD3FC', borderRadius: '999px', padding: '4px 14px', fontSize: '14px', cursor: 'pointer' }}>Update now</button>
    <button id="update-later" type="button" onClick=${() => setReady(false)} style=${{ background: 'transparent', border: 'none', textDecoration: 'underline', fontSize: '14px', cursor: 'pointer' }}>Later</button>
  </div>`;
}
