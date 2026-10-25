// VectorSettingsPanel.js — per-device settings for the optional vector search service (#18):
// where it runs, how long a similarity check may take, and how long to pause after it fails.
import { loadVectorSettings, saveVectorSettings, resetVectorBreaker, vectorBreakerOpen, vectorHealth, VECTOR_DEFAULTS, VECTOR_LIMITS } from '../core/VectorSync.js';
const html = window.htm.bind(window.React.createElement);
const { useState } = window.React;
const btn = { background: '#EAF2FF', border: '1px solid #BFD7FF', color: '#1F4A7A', borderRadius: '9999px', padding: '6px 12px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' };
const input = { display: 'block', width: '100%', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '6px 8px', fontSize: '13px' };
const secs = (ms) => String(Math.round(ms / 100) / 10);

export function VectorSettingsPanel() {
  const [s] = useState(() => loadVectorSettings(window.localStorage));
  const [baseUrl, setBaseUrl] = useState(s.baseUrl);
  const [wait, setWait] = useState(secs(s.askTimeoutMs));
  const [pause, setPause] = useState(secs(s.cooldownMs));
  const [msg, setMsg] = useState('');
  const [paused, setPaused] = useState(() => vectorBreakerOpen());
  const toMs = (v) => (String(v).trim() === '' ? '' : Number(v) * 1000);
  const save = () => {
    const r = saveVectorSettings(window.localStorage, { baseUrl, askTimeoutMs: toMs(wait), cooldownMs: toMs(pause) });
    if (!r.ok) { setMsg(r.error); return; }
    setBaseUrl(r.settings.baseUrl); setWait(secs(r.settings.askTimeoutMs)); setPause(secs(r.settings.cooldownMs));
    setMsg('Saved on this device. Applies to the next similarity check.');
  };
  const retry = () => { resetVectorBreaker(); setPaused(false); setMsg('Vector search will be tried again on the next check.'); };
  const test = async () => {
    setMsg('Testing…');
    const h = await vectorHealth();
    setMsg(h && h.ok ? 'Connected: ' + h.base : 'Not reachable. Continuum keeps working with exact matching only.');
  };
  const [wLo, wHi] = VECTOR_LIMITS.askTimeoutMs; const [pLo, pHi] = VECTOR_LIMITS.cooldownMs;
  return html`<div id="vector-settings-panel" style=${{ marginTop: '10px', padding: '10px', border: '1px solid #E6EAF2', borderRadius: '12px', background: '#fff' }}>
    <div style=${{ fontWeight: 700, fontSize: '14px' }}>Vector search (optional)</div>
    <div style=${{ fontSize: '13px', color: '#475569', marginTop: '4px' }}>Used only to suggest "similar card" merges in Run AI. If it is slow or down, Continuum stops waiting and uses exact matching, so nothing is blocked or lost.</div>
    <label style=${{ display: 'block', fontSize: '13px', marginTop: '6px' }}>Service address (empty = http://localhost:8006)
      <input type="url" data-vector-setting="baseUrl" placeholder="http://localhost:8006" value=${baseUrl} onInput=${(e) => setBaseUrl(e.target.value)} style=${input} /></label>
    <label style=${{ display: 'block', fontSize: '13px', marginTop: '6px' }}>Wait for a similarity check, seconds (${secs(wLo)} to ${secs(wHi)}, default ${secs(VECTOR_DEFAULTS.askTimeoutMs)})
      <input type="number" step="0.1" min=${wLo / 1000} max=${wHi / 1000} data-vector-setting="wait" value=${wait} onInput=${(e) => setWait(e.target.value)} style=${input} /></label>
    <label style=${{ display: 'block', fontSize: '13px', marginTop: '6px' }}>Pause after the service fails, seconds (${pLo / 1000} to ${pHi / 1000}, default ${secs(VECTOR_DEFAULTS.cooldownMs)}; 0 = never pause)
      <input type="number" step="1" min=${pLo / 1000} max=${pHi / 1000} data-vector-setting="pause" value=${pause} onInput=${(e) => setPause(e.target.value)} style=${input} /></label>
    <div style=${{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
      <button type="button" id="vector-settings-save" onClick=${save} style=${btn}>Save</button>
      <button type="button" id="vector-settings-test" onClick=${test} style=${btn}>Test connection</button>
      ${paused ? html`<button type="button" id="vector-settings-retry" onClick=${retry} style=${btn}>Paused after a failure: retry now</button>` : null}
    </div>
    ${msg ? html`<div id="vector-settings-msg" style=${{ fontSize: '13px', marginTop: '6px' }}>${msg}</div>` : null}
  </div>`;
}
