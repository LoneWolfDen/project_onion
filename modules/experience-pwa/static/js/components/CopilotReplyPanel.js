// CopilotReplyPanel.js — paste a Copilot reply back as a Draft (Pattern A, docs/COPILOT_ASSESSMENT.md).
import { buildCopilotNote } from '../core/copilot.js';
import { piiScreen } from '../core/PiiGate.js';
const html = window.htm.bind(window.React.createElement);
const { useState } = window.React;
const btn = { background: '#EAF2FF', border: '1px solid #BFD7FF', color: '#1F4A7A', borderRadius: '9999px', padding: '6px 12px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' };

export function CopilotReplyPanel({ project, persona }) {
  const [text, setText] = useState('');
  const [kind, setKind] = useState('inference');
  const [msg, setMsg] = useState('');
  const save = async () => {
    try {
      const note = buildCopilotNote(text, { kind, project, author: persona, screen: piiScreen });
      await window.OnionDB.saveNote(note);
      setText(''); setMsg('Saved as a private Draft on ' + project.project_name + (note.refs.length ? ', citing ' + note.refs.length + ' statement(s)' : '') + '. It shows under "Needs confirmation" in the handover and never counts as a Fact.');
    } catch (e) { setMsg(String((e && e.message) || e)); }
  };
  return html`<div id="copilot-reply-panel" style=${{ marginTop: '10px', padding: '10px', border: '1px solid #E6EAF2', borderRadius: '12px', background: '#fff' }}>
    <div style=${{ fontWeight: 700, fontSize: '14px' }}>Paste a Copilot reply</div>
    <div style=${{ fontSize: '13px', color: '#475569', marginTop: '4px' }}>Export a handover package, give it to Microsoft 365 Copilot with a prompt from copilot-prompts.md, then paste the answer here. It is saved as a private Draft for ${project ? project.project_name : 'the active project'}.</div>
    <textarea id="copilot-reply-text" rows="4" value=${text} onInput=${(e) => setText(e.target.value)} placeholder="Paste Copilot's reply" style=${{ width: '100%', marginTop: '6px', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '6px', fontSize: '13px' }}></textarea>
    <div style=${{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '6px', flexWrap: 'wrap' }}>
      <select id="copilot-reply-kind" value=${kind} onChange=${(e) => setKind(e.target.value)} style=${{ border: '1px solid #bfdbfe', borderRadius: '8px', padding: '6px', fontSize: '13px' }}><option value="inference">Inference</option><option value="recommendation">Recommendation</option></select>
      <button type="button" id="copilot-reply-save" onClick=${save} disabled=${!project} style=${btn}>Save as Draft</button>
    </div>
    ${msg ? html`<div id="copilot-reply-msg" style=${{ fontSize: '13px', marginTop: '6px' }}>${msg}</div>` : null}
  </div>`;
}
