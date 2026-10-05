// AiSettings.js — choose an AI provider, give consent, set a session-only key (PRV-01, PRV-02).
import { PROVIDERS, getProvider, setProvider, isAcknowledged, setAcknowledged, hasKey, setKey, clearKey, resolveRemote, reasonText, migrateLegacyKeys, getModel } from '../core/aiConfig.js';
const html = window.htm.bind(window.React.createElement);
const { useState, useEffect } = window.React;
migrateLegacyKeys();

// Current AI status for indicators; re-renders when the config changes.
export function useAiStatus() {
  const read = () => { const r = resolveRemote(); return { allowed: r.allowed, provider: r.provider, reason: r.reason }; };
  const [st, setSt] = useState(read);
  useEffect(() => {
    const h = () => setSt(read());
    window.addEventListener('onion:ai-config', h);
    return () => window.removeEventListener('onion:ai-config', h);
  }, []);
  return st;
}

const box = { marginTop: '8px', padding: '10px', background: '#fff', border: '1px solid #bfdbfe', borderRadius: '8px', fontSize: '13px' };
const input = { width: '100%', marginTop: '6px', background: '#f9fafb', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '6px 8px', fontSize: '13px' };
const btn = { padding: '4px 12px', borderRadius: '9999px', background: '#fff', border: '1px solid #bfdbfe', fontSize: '13px', cursor: 'pointer' };

export function AiSettings() {
  const st = useAiStatus();
  const [draft, setDraft] = useState('');
  const [msg, setMsg] = useState('');
  const provider = getProvider();
  const meta = PROVIDERS[provider];
  const remote = provider !== 'none';
  const onSaveKey = () => {
    if (!draft.trim()) { setMsg('Enter a key first.'); return; }
    if (setKey(provider, draft)) { setDraft(''); setMsg('Key kept for this browser session only. It is not saved to disk.'); }
    else setMsg('This browser would not keep the key, so remote AI stays off.');
  };
  return html`<div id="ai-settings" style=${box}>
    <div style=${{ fontWeight: 700 }}>AI provider</div>
    <select id="ai-provider" value=${provider} onChange=${(e) => { setProvider(e.target.value); setMsg(''); }} style=${input}>
      ${Object.entries(PROVIDERS).map(([k, v]) => html`<option key=${k} value=${k}>${v.label}</option>`)}
    </select>
    ${remote ? html`<div id="ai-disclosure" style=${{ marginTop: '8px', padding: '8px', background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: '8px' }}>
      <div><strong>Content leaves this device.</strong> Destination: <strong>${meta.destination}</strong>.</div>
      <div>What is sent: ${meta.sends.join('; ')}.</div>
      <label style=${{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginTop: '6px' }}>
        <input id="ai-ack" type="checkbox" checked=${isAcknowledged(provider)} onChange=${(e) => setAcknowledged(provider, e.target.checked)} />
        <span>I understand my content will be sent to ${meta.label} and agree.</span>
      </label>
      ${hasKey(provider)
        ? html`<div style=${{ marginTop: '6px' }}>🔑 A key is set for this session. <button type="button" id="ai-key-clear" onClick=${() => { clearKey(provider); setMsg('Key removed.'); }} style=${btn}>Remove key</button></div>`
        : html`<div style=${{ marginTop: '6px' }}>
            <input id="ai-key" type="password" autoComplete="off" value=${draft} onInput=${(e) => setDraft(e.target.value)} placeholder=${provider === 'anthropic' ? 'Anthropic API key (this session only)' : 'OpenRouter API key (this session only)'} style=${input} />
            <button type="button" id="ai-key-save" onClick=${onSaveKey} style=${{ ...btn, marginTop: '6px' }}>Use key for this session</button>
          </div>`}
      ${provider === 'openrouter' ? html`<div style=${{ marginTop: '6px' }}>Model: <code>${getModel()}</code></div>` : null}
    </div>` : null}
    <div id="ai-status" role="status" style=${{ marginTop: '8px', color: st.allowed ? '#065F46' : '#475569' }}>${st.allowed ? '● ' + meta.label + ' is on' : '● ' + reasonText(st.reason)}</div>
    ${msg ? html`<div style=${{ marginTop: '4px' }}>${msg}</div>` : null}
    <div style=${{ marginTop: '6px', fontSize: '12px', color: '#6b7280' }}>Keys are never stored on disk, exported, or shown again. Everything works without AI; results are then labelled "No AI".</div>
  </div>`;
}
