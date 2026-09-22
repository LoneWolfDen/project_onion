// js/main.js — ESM entry (local vendor, no CDN)
import { App } from './components/App.js';
try {
  const root = window.ReactDOM.createRoot(document.getElementById('root'));
  root.render(window.React.createElement(App));
} catch (err) {
  document.getElementById('root').innerHTML =
    '<div style="margin:12px;padding:12px;border:1px solid #fecdd3;background:#FFE4E6;border-radius:10px;font:13px Inter,system-ui">Render failed: ' + String((err && err.message) || err) + '</div>';
  throw err;
}
