// js/main.js — ESM entry (local vendor, no CDN)
import { registerServiceWorker } from './core/pwa.js';
import { initRepo, getRaw, setRaw, flushRepo, repoMode } from './core/repo.js';
import { logger, installGlobalHandlers, logEvent } from './core/logger.js';
installGlobalHandlers(logger(), window);
logEvent('app', 'app.start', {});
import { getLayout, applyLayout } from './core/layoutFlag.js';
applyLayout(document, getLayout(window.localStorage));
registerServiceWorker();
const root = window.ReactDOM.createRoot(document.getElementById('root'));
try {
  // The Repo must be ready (state loaded from IndexedDB, or migrated once) before any module reads state.
  const repo = await initRepo();
  window.__continuumRepo = { getRaw, setRaw, flush: flushRepo, mode: repoMode, boot: repo };
  const { App } = await import('./components/App.js');
  root.render(window.React.createElement(App));
} catch (err) {
  logEvent('app', 'app.render_failed', { name: String((err && err.name) || 'error').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 30) || 'error' }, 'error');
  document.getElementById('root').innerHTML =
    '<div style="margin:12px;padding:12px;border:1px solid #fecdd3;background:#FFE4E6;border-radius:10px;font:13px Inter,system-ui">Render failed: ' + String((err && err.message) || err) + '</div>';
  throw err;
}
