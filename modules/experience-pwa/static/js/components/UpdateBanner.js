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
  return html`<div id="update-banner" role="status" className="banner banner--info">
    <strong>Update available.</strong><span>A new version of Continuum is ready. Your data is not affected.</span>
    <button id="update-now" type="button" className="banner__btn" onClick=${() => applyUpdate(window.__onionWaitingWorker)}>Update now</button>
    <button id="update-later" type="button" className="banner__link" onClick=${() => setReady(false)}>Later</button>
  </div>`;
}
