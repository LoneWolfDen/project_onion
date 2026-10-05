// js/core/importEngine.js — generic spreadsheet/CSV import engine (IMP-02).
// Pure functions. The caller reads the file (SheetJS or text) into rows of cells;
// everything else — header detection, smart column matching, row mapping,
// dates, atomic staging, provenance — happens here and is unit tested.
//
// Column matching has three layers, each ending in the user's confirmation:
//   1 exact header   2 alias table + fuzzy   3 optional AI suggestions (headers only).
import { sha256Hex } from './backup.js';

export const NOT_FOUND = 'Not found';

// ---- reading -------------------------------------------------------------

// Minimal RFC-4180 CSV parser (quotes, doubled quotes, CRLF). Delimiter auto: , ; or tab.
export function parseCsv(text, delimiter) {
  const src = String(text == null ? '' : text).replace(/^﻿/, '');
  const first = src.split(/\r?\n/, 1)[0] || '';
  const d = delimiter || [',', ';', '\t'].map((c) => [c, first.split(c).length]).sort((a, b) => b[1] - a[1])[0][0];
  const rows = []; let row = []; let cell = ''; let q = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (q) {
      if (c === '"') { if (src[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c;
    } else if (c === '"') q = true;
    else if (c === d) { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(cell); cell = ''; rows.push(row); row = [];
    } else cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((x) => String(x).trim() !== ''));
}

// First of the first 10 rows with at least 2 non-empty cells (title rows above are skipped).
export function detectHeaderRow(rows) {
  const lim = Math.min(10, rows.length);
  for (let i = 0; i < lim; i++) {
    if ((rows[i] || []).filter((c) => String(c == null ? '' : c).trim() !== '').length >= 2) return i;
  }
  return 0;
}

// Sheet picker data: { name, rows } list -> summary for the UI.
export function describeSheets(sheets) {
  return (sheets || []).map((s) => {
    const h = detectHeaderRow(s.rows || []);
    return { name: s.name, rowCount: Math.max(0, (s.rows || []).length - h - 1), headerRow: h, headers: (s.rows[h] || []).map((x) => String(x == null ? '' : x).trim()) };
  });
}

// ---- matching ------------------------------------------------------------

export function normHeader(h) {
  return String(h == null ? '' : h).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function lev(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}
export function similarity(a, b) {
  const x = normHeader(a), y = normHeader(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  const ta = new Set(x.split(' ')), tb = new Set(y.split(' '));
  const inter = [...ta].filter((t) => tb.has(t)).length;
  const jac = inter / (ta.size + tb.size - inter);
  const ls = 1 - lev(x, y) / Math.max(x.length, y.length);
  return Math.max(jac, ls);
}
export const FUZZY_MIN = 0.8;

// field = { key, label, required?, aliases?: [] }. Order of layers: saved, exact, alias, fuzzy.
// saved: { [fingerprint]: { [headerNorm]: fieldKey } } looked up by caller; pass the inner map here.
export function matchHeaders(headers, fields, saved = {}) {
  const used = new Set();
  const out = headers.map((h, index) => ({ index, header: String(h == null ? '' : h).trim(), field: null, how: null, score: 0 }));
  const byKey = new Map(fields.map((f) => [f.key, f]));
  const claim = (m, key, how, score) => { m.field = key; m.how = how; m.score = score; used.add(key); };
  const pass = (fn) => out.forEach((m) => { if (!m.field && m.header) fn(m); });
  pass((m) => { const k = saved[normHeader(m.header)]; if (k && byKey.has(k) && !used.has(k)) claim(m, k, 'saved', 1); });
  pass((m) => { const f = fields.find((x) => !used.has(x.key) && (normHeader(x.label) === normHeader(m.header) || normHeader(x.key) === normHeader(m.header))); if (f) claim(m, f.key, 'exact', 1); });
  pass((m) => { const f = fields.find((x) => !used.has(x.key) && (x.aliases || []).some((a) => normHeader(a) === normHeader(m.header))); if (f) claim(m, f.key, 'alias', 0.95); });
  pass((m) => {
    let best = null;
    fields.forEach((f) => {
      if (used.has(f.key)) return;
      [f.label, ...(f.aliases || [])].forEach((c) => { const s = similarity(m.header, c); if (s >= FUZZY_MIN && (!best || s > best.s)) best = { f, s }; });
    });
    if (best) claim(m, best.f.key, 'fuzzy', Number(best.s.toFixed(2)));
  });
  return {
    columns: out,
    unmapped: out.filter((m) => !m.field && m.header),
    missingRequired: fields.filter((f) => f.required && !used.has(f.key)).map((f) => f.key),
  };
}

// Layer 3: AI suggestions. Only header names and the field list leave the app; never row values.
export function buildAiPrompt(headers, fields) {
  return [
    'Match spreadsheet column headers to target fields. Reply with JSON only: {"<header>": "<field key or null>"}.',
    'Use each field key at most once. Use null when nothing fits. Do not invent keys.',
    'Headers: ' + JSON.stringify(headers.filter((h) => String(h).trim() !== '')),
    'Fields: ' + JSON.stringify(fields.map((f) => ({ key: f.key, meaning: f.label }))),
  ].join('\n');
}
// Returns validated suggestions only: { header: fieldKey }. Anything off-list or already used is dropped.
export function parseAiSuggestions(answer, headers, fields, alreadyUsed = []) {
  let obj = answer;
  if (typeof answer === 'string') {
    const m = /\{[\s\S]*\}/.exec(answer);
    if (!m) return {};
    try { obj = JSON.parse(m[0]); } catch (e) { return {}; }
  }
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return {};
  const keys = new Set(fields.map((f) => f.key)); const used = new Set(alreadyUsed); const hs = new Set(headers);
  const out = {};
  Object.keys(obj).forEach((h) => {
    const k = obj[h];
    if (hs.has(h) && typeof k === 'string' && keys.has(k) && !used.has(k)) { out[h] = k; used.add(k); }
  });
  return out;
}

// Header fingerprint: the same set of headers gives the same id, so a confirmed mapping is recognised next time.
export async function headerFingerprint(headers) {
  return (await sha256Hex(headers.map(normHeader).filter(Boolean).sort().join('|'))).slice(0, 16);
}

// ---- values --------------------------------------------------------------

// Strict day-first dates. Accepts D/M/YYYY, D-M-YYYY, D.M.YYYY, ISO YYYY-MM-DD, JS Date, Excel serial.
// Never guesses: invalid or impossible dates return null (caller shows the text with a warning).
export function parseDate(v) {
  if (v == null || v === '') return null;
  const iso = (y, m, d) => {
    const dt = new Date(Date.UTC(y, m - 1, d));
    if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
    return dt.toISOString().slice(0, 10);
  };
  if (v instanceof Date) return isNaN(v) ? null : v.toISOString().slice(0, 10);
  if (typeof v === 'number') return v > 20000 && v < 80000 ? new Date(Date.UTC(1899, 11, 30) + v * 86400000).toISOString().slice(0, 10) : null;
  const s = String(v).trim();
  let m = /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/.exec(s);
  if (m) return iso(+m[3], +m[2], +m[1]);
  m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ].*)?$/.exec(s);
  return m ? iso(+m[1], +m[2], +m[3]) : null;
}

// ---- mapping rows --------------------------------------------------------

// mapping: columns from matchHeaders (possibly edited by the user). fields supply `type` ('date' | 'number' | undefined).
// Returns records with provenance, plus warnings. Blank cells stay '' (UI shows NOT_FOUND). Scores are kept as given.
export function mapRows(rows, headerRow, columns, fields, fileName, sheetName) {
  const byKey = new Map(fields.map((f) => [f.key, f]));
  const records = []; const warnings = [];
  for (let r = headerRow + 1; r < rows.length; r++) {
    const cells = rows[r] || [];
    if (!cells.some((c) => String(c == null ? '' : c).trim() !== '')) continue;
    const rec = { values: {}, raw: {}, provenance: {} };
    columns.forEach((col) => {
      if (!col.field) return;
      const raw = cells[col.index]; const text = raw == null ? '' : (raw instanceof Date ? raw.toISOString().slice(0, 10) : String(raw).trim());
      const f = byKey.get(col.field);
      let val = text;
      if (text !== '' && f && f.type === 'date') {
        const d = parseDate(raw instanceof Date ? raw : (typeof raw === 'number' ? raw : text));
        if (d) val = d; else warnings.push({ row: r + 1, column: col.header, message: 'Not a valid day-first date: "' + text + '" (kept as text)' });
      } else if (text !== '' && f && f.type === 'number') {
        const n = Number(text.replace(',', '.'));
        if (isFinite(n)) val = n; else warnings.push({ row: r + 1, column: col.header, message: 'Not a number: "' + text + '" (kept as text)' });
      }
      rec.values[col.field] = val; rec.raw[col.field] = text;
      rec.provenance[col.field] = { file: fileName, sheet: sheetName, row: r + 1, column: col.header };
    });
    records.push(rec);
  }
  return { records, warnings };
}

// Atomic stage: every row must pass, or nothing is staged. `validate(rec)` returns an error string or ''.
export function stageAll(records, validate) {
  const errors = [];
  records.forEach((rec, i) => { const e = validate ? validate(rec) : ''; if (e) errors.push({ index: i, message: e }); });
  return errors.length ? { ok: false, errors, staged: [] } : { ok: true, errors: [], staged: records };
}

// Row key for re-import diffing: join chosen field values, normalised.
export function rowKey(rec, keyFields, take = 80) {
  return keyFields.map((k) => String((rec.values || {})[k] == null ? '' : rec.values[k]).toLowerCase().replace(/\s+/g, ' ').trim().slice(0, take)).join('|');
}
