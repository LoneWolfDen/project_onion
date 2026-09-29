// main.js: entry point. React, ReactDOM and htm are repository-local UMD
// scripts loaded by index.html (../../js/vendor/); nothing comes from a CDN.
import { App } from './components/App.js';

const rootEl = document.getElementById('rm5-root');
try {
  window.ReactDOM.createRoot(rootEl).render(window.React.createElement(App));
} catch (err) {
  // Show the failure on the page instead of a blank screen during a demo.
  rootEl.textContent = '';
  const box = document.createElement('div');
  box.className = 'rm5-note';
  box.style.margin = '16px';
  box.textContent = 'Relationship Model v5 failed to start: ' + String((err && err.message) || err);
  rootEl.appendChild(box);
  throw err;
}
