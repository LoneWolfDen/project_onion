// PiiSettings.js — your own noise words and patterns for screening (PRV-05).
import { loadConfig, saveConfig, screen } from '../core/pii.js';
const html = window.htm.bind(window.React.createElement);
const { useState } = window.React;
export function PiiSettings() {
  const init = loadConfig();
  const [words, setWords] = useState(init.noiseWords.join('\n'));
  const [pats, setPats] = useState(init.patterns.map((p) => p.name + '=' + p.source).join('\n'));
  const [sample, setSample] = useState('');
  const [msg, setMsg] = useState('');
  const parse = () => ({ noiseWords: words.split('\n'), patterns: pats.split('\n').filter((l) => l.trim()).map((l) => { const i = l.indexOf('='); return i > 0 ? { name: l.slice(0, i), source: l.slice(i + 1) } : { name: 'custom', source: l }; }) });
  const save = () => { const c = saveConfig(parse()); setMsg('Saved: ' + c.noiseWords.length + ' words, ' + c.patterns.length + ' patterns.'); };
  const t = sample ? screen(sample, parse()) : null;
  const ta = { width: '100%', fontSize: '13px', marginTop: '4px', border: '1px solid #cbd5e1', borderRadius: '6px' };
  return html`<div id="pii-settings" style=${{ marginTop: '8px', fontSize: '13px' }}>
    <div style=${{ fontWeight: 700 }}>Privacy screening</div>
    <div style=${{ color: '#475569' }}>Phone numbers are always redacted. Email addresses are kept. Add your own below.</div>
    <label>Extra words to filter (one per line)<textarea id="pii-words" rows="3" style=${ta} value=${words} onInput=${(e) => setWords(e.target.value)}></textarea></label>
    <label>Extra patterns (name=regular expression, one per line)<textarea id="pii-patterns" rows="2" style=${ta} placeholder="NI number=\\b[A-Z]{2}\\d{6}[A-D]\\b" value=${pats} onInput=${(e) => setPats(e.target.value)}></textarea></label>
    <label>Try it<input id="pii-sample" style=${ta} value=${sample} onInput=${(e) => setSample(e.target.value)} placeholder="Type or paste a sample" /></label>
    ${t ? html`<div id="pii-sample-out" style=${{ marginTop: '4px' }}>Result: ${t.text}</div>` : null}
    <button id="pii-save" type="button" onClick=${save} style=${{ marginTop: '6px', padding: '4px 12px', borderRadius: '9999px', border: '1px solid #bfdbfe', background: '#fff', cursor: 'pointer' }}>Save screening settings</button>
    ${msg ? html`<span role="status" style=${{ marginLeft: '8px' }}>${msg}</span>` : null}
  </div>`;
}
