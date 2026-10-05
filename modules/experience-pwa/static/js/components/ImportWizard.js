// ImportWizard.js — file import with mapping preview (IMP-02).
// Steps: pick sheet -> confirm column mapping (with optional header-only AI paste-in) -> preview rows -> stage.
// Nothing is staged until the user confirms; a single bad row blocks the whole import.
import * as E from '../core/importEngine.js';
import { makeSource, findDuplicate } from '../core/source.js';
import { loadSavedMap, saveMap } from '../core/importTemplates.js';
const html = window.htm.bind(window.React.createElement);
const { useState, useEffect, useMemo } = window.React;

const box = { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center' };
const card = { background: '#fff', borderRadius: '16px', padding: '20px', width: 'min(860px, 94vw)', maxHeight: '88vh', overflow: 'auto', fontSize: '15px', color: '#1f2937' };
const btn = { padding: '8px 16px', borderRadius: '9999px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '15px', cursor: 'pointer' };
const go = { ...btn, border: '1px solid #F5C2D8', background: '#FDE8F0', color: '#831843', fontWeight: 700 };

// props: file, adapter { name, label, fields, validate, strict?, select?(records, project) }, project, knownSources[], onStage({records, source, warnings}), onCancel
// strict adapters (fixed tool exports) match headers exactly, lock the mapping and skip the AI step.
export function ImportWizard({ file, adapter, project, knownSources, onStage, onCancel }) {
  const [state, setState] = useState({ loading: true });
  const [sheetIdx, setSheetIdx] = useState(0);
  const [columns, setColumns] = useState([]);
  const [fp, setFp] = useState('');
  const [aiOpen, setAiOpen] = useState(false);
  const [aiAnswer, setAiAnswer] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const buf = new Uint8Array(await file.arrayBuffer());
        let sheets;
        if (/\.csv$|\.tsv$/i.test(file.name)) sheets = [{ name: 'CSV', rows: E.parseCsv(new TextDecoder().decode(buf)) }];
        else {
          if (!window.XLSX) throw new Error('Spreadsheet reader is not loaded');
          const wb = window.XLSX.read(buf, { type: 'array', cellDates: true });
          sheets = wb.SheetNames.map((n) => ({ name: n, rows: window.XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, defval: '', raw: true }) }));
        }
        const source = await makeSource({ name: file.name, content: buf, adapter: adapter.name });
        setState({ sheets, source, dup: findDuplicate(knownSources, source), info: E.describeSheets(sheets) });
      } catch (e) { setState({ error: String((e && e.message) || e) }); }
    })();
  }, [file]);

  const sheet = state.sheets && state.sheets[sheetIdx];
  const headerRow = sheet ? E.detectHeaderRow(sheet.rows) : 0;
  const headers = sheet ? (sheet.rows[headerRow] || []).map((h) => String(h == null ? '' : h).trim()) : [];

  useEffect(() => {
    if (!sheet) return;
    (async () => {
      const f = await E.headerFingerprint(headers);
      setFp(f);
      setColumns(E.matchHeaders(headers, adapter.fields, adapter.strict ? {} : loadSavedMap(f), { exactOnly: !!adapter.strict }).columns);
    })();
  }, [state.sheets, sheetIdx]);

  const used = new Set(columns.map((c) => c.field).filter(Boolean));
  const missing = adapter.fields.filter((f) => f.required && !used.has(f.key));
  const mapped = useMemo(() => (sheet ? E.mapRows(sheet.rows, headerRow, columns, adapter.fields, file.name, sheet.name) : { records: [], warnings: [] }), [columns, sheet]);
  const picked = useMemo(() => (adapter.select ? adapter.select(mapped.records, project) : { staged: mapped.records, notes: [] }), [mapped]);
  const staging = useMemo(() => E.stageAll(picked.staged, adapter.validate), [picked]);

  const setField = (idx, key) => setColumns((cs) => cs.map((c) => {
    if (c.index === idx) return { ...c, field: key || null, how: key ? 'manual' : null };
    return key && c.field === key ? { ...c, field: null, how: null } : c;
  }));
  const applyAi = () => {
    const s = E.parseAiSuggestions(aiAnswer, headers, adapter.fields, [...used]);
    const n = Object.keys(s).length;
    setColumns((cs) => cs.map((c) => (!c.field && s[c.header] ? { ...c, field: s[c.header], how: 'suggested' } : c)));
    setErr(n ? '' : 'No usable suggestions found in that answer.');
  };
  const confirm = () => {
    saveMap(fp, columns, E.normHeader);
    onStage({ records: staging.staged, source: state.source, warnings: mapped.warnings });
  };

  if (state.loading || state.error) {
    return html`<div style=${box}><div id="import-wizard" style=${card}>${state.error ? html`<div role="alert" style=${{ color: '#7F1D1D' }}>Could not read this file: ${state.error}</div>` : 'Reading file…'}<div style=${{ marginTop: '12px', textAlign: 'right' }}><button id="import-cancel" type="button" style=${btn} onClick=${onCancel}>Close</button></div></div></div>`;
  }
  const how = (c) => (c.how === 'suggested' ? 'Suggested' : c.how === 'manual' ? 'You chose' : c.how === 'saved' ? 'Remembered' : c.how === 'fuzzy' ? 'Close match' : c.how === 'alias' ? 'Known variant' : c.how === 'exact' ? 'Exact' : '');
  const canGo = !missing.length && staging.ok && picked.staged.length > 0;
  return html`<div style=${box} role="presentation"><div id="import-wizard" role="dialog" aria-modal="true" aria-labelledby="import-title" style=${card}>
    <div id="import-title" style=${{ fontSize: '18px', fontWeight: 700, marginBottom: '6px' }}>Import ${adapter.label}: ${file.name}</div>
    ${state.dup ? html`<div id="import-dup" role="alert" style=${{ background: '#FEF3C7', padding: '8px', borderRadius: '8px', marginBottom: '8px' }}>This exact file was already imported on ${String(state.dup.importedAt).slice(0, 10)}. Importing again will add the same rows a second time.</div>` : null}
    ${state.sheets.length > 1 ? html`<label>Sheet: <select id="import-sheet" value=${sheetIdx} onChange=${(e) => setSheetIdx(Number(e.target.value))}>${state.info.map((s, i) => html`<option key=${i} value=${i}>${s.name} (${s.rowCount} rows)</option>`)}</select></label>` : null}
    <div style=${{ fontWeight: 700, margin: '10px 0 4px' }}>1. Check the column mapping</div>
    <table id="import-mapping" style=${{ width: '100%', borderCollapse: 'collapse' }}><tbody>
      ${columns.filter((c) => c.header).map((c) => html`<tr key=${c.index} style=${{ borderBottom: '1px solid #e5e7eb' }}>
        <td style=${{ padding: '4px 8px' }}>${c.header}</td>
        <td style=${{ padding: '4px 8px' }}><select disabled=${!!adapter.strict} value=${c.field || ''} onChange=${(e) => setField(c.index, e.target.value)} aria-label=${'Field for ' + c.header}><option value="">Not imported</option>${adapter.fields.map((f) => html`<option key=${f.key} value=${f.key}>${f.label}${f.required ? ' *' : ''}</option>`)}</select></td>
        <td style=${{ padding: '4px 8px', color: c.how === 'suggested' ? '#9A3412' : '#64748b' }}>${how(c)}</td></tr>`)}
    </tbody></table>
    ${missing.length ? html`<div id="import-missing" role="alert" style=${{ color: '#7F1D1D', marginTop: '6px' }}>${adapter.strict ? 'This is not the expected export. These columns are missing or renamed: ' : 'Still needed: '}${missing.map((f) => f.label).join(', ')}</div>` : null}
    ${adapter.strict ? null : html`<div style=${{ marginTop: '8px' }}><button id="import-ai-toggle" type="button" style=${btn} onClick=${() => setAiOpen(!aiOpen)}>Ask an assistant to match the rest (optional)</button></div>`}
    ${aiOpen && !adapter.strict ? html`<div id="import-ai" style=${{ marginTop: '8px' }}>
      <div style=${{ fontSize: '13px', marginBottom: '4px' }}>Copy this into Copilot or any assistant. It contains only the column names, no data from your rows. Paste the JSON answer below.</div>
      <textarea id="import-ai-prompt" readOnly rows="5" style=${{ width: '100%', fontSize: '13px' }} value=${E.buildAiPrompt(headers, adapter.fields)}></textarea>
      <textarea id="import-ai-answer" rows="3" placeholder="Paste the assistant's JSON answer" style=${{ width: '100%', fontSize: '13px', marginTop: '4px' }} value=${aiAnswer} onInput=${(e) => setAiAnswer(e.target.value)}></textarea>
      <button id="import-ai-apply" type="button" style=${btn} onClick=${applyAi}>Apply suggestions</button>${err ? html`<span role="alert" style=${{ color: '#7F1D1D', marginLeft: '8px' }}>${err}</span>` : null}
    </div>` : null}
    <div style=${{ fontWeight: 700, margin: '12px 0 4px' }}>2. Preview (${picked.staged.length} rows${mapped.warnings.length ? ', ' + mapped.warnings.length + ' warnings' : ''})</div>
    <div id="import-preview" style=${{ overflowX: 'auto' }}><table style=${{ borderCollapse: 'collapse', fontSize: '13px' }}>
      <thead><tr>${adapter.fields.filter((f) => used.has(f.key)).map((f) => html`<th key=${f.key} style=${{ textAlign: 'left', padding: '3px 8px' }}>${f.label}</th>`)}</tr></thead>
      <tbody>${picked.staged.slice(0, 5).map((r, i) => html`<tr key=${i}>${adapter.fields.filter((f) => used.has(f.key)).map((f) => html`<td key=${f.key} style=${{ padding: '3px 8px', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>${r.values[f.key] === '' ? E.NOT_FOUND : String(r.values[f.key])}</td>`)}</tr>`)}</tbody>
    </table></div>
    ${picked.notes.map((n, i) => html`<div key=${'n' + i} id=${'import-note-' + i} style=${{ fontSize: '13px' }}>${n}</div>`)}
    ${mapped.warnings.slice(0, 5).map((w, i) => html`<div key=${i} style=${{ fontSize: '13px', color: '#9A3412' }}>Row ${w.row}, ${w.column}: ${w.message}</div>`)}
    ${!staging.ok ? html`<div id="import-errors" role="alert" style=${{ color: '#7F1D1D', marginTop: '8px' }}>Nothing will be imported until these are fixed in the file (${staging.errors.length} rows):${staging.errors.slice(0, 5).map((e, i) => html`<div key=${i}>Row ${picked.staged[e.index].row}: ${e.message}</div>`)}</div>` : null}
    <div style=${{ fontSize: '13px', color: '#64748b', marginTop: '8px' }}>Imported rows stay private until you approve them. Scores are kept exactly as in the file.</div>
    <div style=${{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '12px' }}>
      <button id="import-cancel" type="button" style=${btn} onClick=${onCancel}>Cancel</button>
      <button id="import-confirm" type="button" disabled=${!canGo} style=${{ ...go, opacity: canGo ? 1 : 0.5, cursor: canGo ? 'pointer' : 'not-allowed' }} onClick=${confirm}>Stage ${picked.staged.length} rows</button>
    </div></div></div>`;
}
