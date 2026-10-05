// MailImportDialog.js — preview and stage a .eml or .vtt file (IMP-06).
// Shows what was read (message id, date, subject, file hash, attachments NOT imported, drafts found).
// Nothing is staged until the user confirms. Extracted decisions and actions are staged as Drafts.
import { makeSource, findDuplicate } from '../core/source.js';
import * as M from '../core/mailImport.js';
import { piiScreen } from '../core/pii.js';
const html = window.htm.bind(window.React.createElement);
const { useState, useEffect } = window.React;
const box = { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center' };
const card = { background: '#fff', borderRadius: '16px', padding: '20px', width: 'min(760px, 94vw)', maxHeight: '88vh', overflow: 'auto', fontSize: '15px', color: '#1f2937' };
const btn = { padding: '8px 16px', borderRadius: '9999px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '15px', cursor: 'pointer' };
const go = { ...btn, border: '1px solid #F5C2D8', background: '#FDE8F0', color: '#831843', fontWeight: 700 };

// props: file, knownSources[], onStage({ source, items }), onCancel
// items: [{ type, title, source, content, kind?, category?, tags?, inference?, draftRef? }]
export function buildItems({ file, parsed, isVtt, source, recap }) {
  const items = [];
  const label = recap ? 'Inference (machine-written recap), not confirmed' : '';
  if (isVtt) {
    const text = M.vttContent(parsed.cues);
    items.push({ type: 'Transcript', title: 'Meeting transcript: ' + file.name, source: 'Transcript ' + file.name + ', cues ' + M.cueRange(parsed.cues), content: text, ...(recap ? { kind: 'ai_suggestion', inference: true } : {}) });
    M.extractDrafts(M.vttDraftItems(parsed.cues)).forEach((d) => items.push({ type: 'Transcript', title: (d.type === 'decision' ? 'Proposed decision: ' : 'Proposed action: ') + d.text.slice(0, 70), source: 'Transcript ' + file.name + ', ' + d.ref, content: d.text, kind: d.type === 'action' ? 'action' : 'assumption', category: d.type === 'action' ? 'internal' : 'delivery', draftRef: d.ref, ...(recap ? { inference: true } : {}) }));
  } else {
    const head = 'Email: ' + (parsed.subject || '(no subject)') + '\nFrom: ' + parsed.from + '\nTo: ' + parsed.to + '\nSent: ' + (parsed.sentAt || 'Not found') + '\nMessage ID: ' + (parsed.messageId || 'Not found') + (parsed.attachments.length ? '\nAttachments (not imported): ' + parsed.attachments.map((a) => a.name).join(', ') : '') + '\n\n' + parsed.body;
    const ref = 'Email ' + (parsed.messageId || file.name) + ' sent ' + (parsed.sentAt ? parsed.sentAt.slice(0, 10) : 'Not found');
    items.push({ type: 'Email', title: parsed.subject || file.name, source: ref, content: head, ...(recap ? { kind: 'ai_suggestion', inference: true } : {}) });
    M.extractDrafts(M.emlDraftItems(parsed.body)).forEach((d) => items.push({ type: 'Email', title: (d.type === 'decision' ? 'Proposed decision: ' : 'Proposed action: ') + d.text.slice(0, 70), source: ref + ', ' + d.ref, content: d.text, kind: d.type === 'action' ? 'action' : 'assumption', category: d.type === 'action' ? 'internal' : 'delivery', draftRef: d.ref, ...(recap ? { inference: true } : {}) }));
  }
  return { items, label };
}

export function MailImportDialog({ file, knownSources, onStage, onCancel }) {
  const [st, setSt] = useState({ loading: true });
  useEffect(() => {
    (async () => {
      try {
        const buf = new Uint8Array(await file.arrayBuffer());
        const text = new TextDecoder().decode(buf);
        const isVtt = /\.vtt$/i.test(file.name);
        const parsed = isVtt ? { cues: M.parseVtt(text) } : M.parseEml(text);
        if (isVtt && !parsed.cues.length) throw new Error('No cues found. Is this a WebVTT file?');
        if (!isVtt && !parsed.body && !parsed.subject) throw new Error('No message found. Is this an .eml file?');
        const recap = M.isMachineRecap({ name: file.name, subject: parsed.subject, text: isVtt ? M.vttContent(parsed.cues) : parsed.body });
        const meta = isVtt ? { cueRange: M.cueRange(parsed.cues), cues: parsed.cues.length, recap } : { messageId: parsed.messageId, sentAt: parsed.sentAt, subject: parsed.subject, attachments: parsed.attachments.length, recap };
        const source = await makeSource({ name: file.name, kind: isVtt ? 'transcript' : 'email', content: buf, adapter: isVtt ? 'vtt' : 'eml', asOf: isVtt ? null : parsed.sentAt || null, meta });
        const built = buildItems({ file, parsed, isVtt, source, recap });
        setSt({ parsed, isVtt, source, recap, items: built.items, dup: findDuplicate(knownSources, source) });
      } catch (e) { setSt({ error: String((e && e.message) || e) }); }
    })();
  }, [file]);
  if (st.loading || st.error) return html`<div style=${box}><div id="mail-import" style=${card}>${st.error ? html`<div role="alert" style=${{ color: '#7F1D1D' }}>Could not read this file: ${st.error}</div>` : 'Reading file…'}<div style=${{ marginTop: '12px', textAlign: 'right' }}><button type="button" style=${btn} onClick=${onCancel}>Close</button></div></div></div>`;
  const { parsed, isVtt, source, recap, items, dup } = st;
  const drafts = items.length - 1;
  return html`<div style=${box} role="presentation"><div id="mail-import" role="dialog" aria-modal="true" aria-labelledby="mail-title" style=${card}>
    <div id="mail-title" style=${{ fontSize: '18px', fontWeight: 700 }}>Import ${isVtt ? 'meeting transcript' : 'email'}: ${file.name}</div>
    ${dup ? html`<div role="alert" style=${{ background: '#FEF3C7', padding: '8px', borderRadius: '8px', margin: '8px 0' }}>This exact file was already imported on ${String(dup.importedAt).slice(0, 10)}. Importing it again adds the same content twice.</div>` : null}
    ${recap ? html`<div id="mail-recap" style=${{ background: '#F0E6FF', padding: '8px', borderRadius: '8px', margin: '8px 0' }}>This looks like a Copilot or Teams recap. It is machine-written, so it is shown as an <b>Inference</b> until you confirm it.</div>` : null}
    <table style=${{ fontSize: '14px', margin: '8px 0' }}><tbody>
      ${isVtt ? html`<tr><td>Cues</td><td>${parsed.cues.length} (${M.cueRange(parsed.cues)})</td></tr>` : html`<tr><td>Subject</td><td>${parsed.subject || 'Not found'}</td></tr><tr><td>Sent</td><td>${parsed.sentAt || 'Not found'}</td></tr><tr><td>Message ID</td><td>${parsed.messageId || 'Not found'}</td></tr>`}
      <tr><td style=${{ paddingRight: '12px' }}>File hash</td><td style=${{ fontFamily: 'monospace', fontSize: '12px' }}>${source.hash.slice(0, 24)}…</td></tr>
    </tbody></table>
    ${!isVtt && parsed.attachments.length ? html`<div id="mail-attachments">Attachments listed, not imported: ${parsed.attachments.map((a) => a.name).join(', ')}</div>` : null}
    ${!isVtt && parsed.htmlOnly ? html`<div style=${{ fontSize: '13px' }}>Only an HTML body was found. It was reduced to plain text; nothing was loaded from the web.</div>` : null}
    <div id="mail-drafts" style=${{ margin: '8px 0' }}>${drafts ? drafts + ' decision or action line(s) found (marked "Decision:" or "Action:"). They are staged as Drafts for you to review, never as confirmed decisions.' : 'No lines marked "Decision:" or "Action:" were found.'}</div>
    <div style=${{ fontSize: '13px', color: '#64748b' }}>Privacy screening runs on the text before it is staged: ${piiScreen(items[0].content).flag}. Emails stay as written.</div>
    <div style=${{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '12px' }}>
      <button id="mail-cancel" type="button" style=${btn} onClick=${onCancel}>Cancel</button>
      <button id="mail-confirm" type="button" style=${go} onClick=${() => onStage({ source, items })}>Stage ${items.length} item${items.length === 1 ? '' : 's'}</button>
    </div></div></div>`;
}
