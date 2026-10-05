// js/core/mailImport.js — .eml and .vtt imports (IMP-06). Pure: no DOM, no network, no rendering.
// Email text is read as text only: HTML is reduced to plain text, nothing is fetched or run, remote
// images and scripts are never loaded, and attachments are listed but not imported.
// Decisions and actions found in the text are Draft proposals; a person must review them. A Copilot or
// Teams recap is machine written, so it is labelled as an inference until a person confirms it.

const lines = (s) => String(s == null ? '' : s).split(/\r?\n/);

// ---- headers and decoding -------------------------------------------------

function parseHeaders(block) {
  const out = {};
  let key = null;
  lines(block).forEach((ln) => {
    if (/^[ \t]/.test(ln) && key) { out[key] += ' ' + ln.trim(); return; }
    const m = /^([!-9;-~]+):[ \t]*(.*)$/.exec(ln);
    if (m) { key = m[1].toLowerCase(); out[key] = m[2]; }
  });
  return out;
}
const splitMessage = (raw) => {
  const s = String(raw == null ? '' : raw).replace(/^﻿/, '');
  const m = /\r?\n\r?\n/.exec(s);
  return m ? { head: s.slice(0, m.index), body: s.slice(m.index + m[0].length) } : { head: s, body: '' };
};
const bytesToText = (bytes, charset) => {
  try { return new TextDecoder(/^(utf-?8|us-ascii|)$/i.test(charset || '') ? 'utf-8' : (charset || 'utf-8'), { fatal: false }).decode(bytes); }
  catch (e) { return new TextDecoder('utf-8').decode(bytes); }
};
function qpBytes(s, headerMode) {
  const t = (headerMode ? s.replace(/_/g, ' ') : s.replace(/=\r?\n/g, ''));
  const out = [];
  for (let i = 0; i < t.length; i++) {
    if (t[i] === '=' && /^[0-9A-Fa-f]{2}$/.test(t.slice(i + 1, i + 3))) { out.push(parseInt(t.slice(i + 1, i + 3), 16)); i += 2; }
    else out.push(t.charCodeAt(i) & 0xff);
  }
  return new Uint8Array(out);
}
function b64Bytes(s) {
  const bin = (typeof atob === 'function' ? atob : (x) => Buffer.from(x, 'base64').toString('binary'))(s.replace(/[^A-Za-z0-9+/=]/g, ''));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}
// RFC 2047 encoded words in headers (=?utf-8?B?...?= / =?utf-8?Q?...?=).
export function decodeWords(v) {
  return String(v || '').replace(/=\?([^?]+)\?([bBqQ])\?([^?]*)\?=/g, (_, cs, enc, txt) => bytesToText(enc.toLowerCase() === 'b' ? b64Bytes(txt) : qpBytes(txt, true), cs)).replace(/\s+/g, ' ').trim();
}
function decodeBody(body, headers) {
  const enc = String(headers['content-transfer-encoding'] || '').toLowerCase().trim();
  const cs = (/charset="?([^";\s]+)/i.exec(headers['content-type'] || '') || [])[1];
  if (enc === 'base64') return bytesToText(b64Bytes(body), cs);
  if (enc === 'quoted-printable') return bytesToText(qpBytes(body, false), cs);
  return body;
}
export function htmlToText(h) {
  return String(h || '')
    .replace(/<(script|style|head)[\s\S]*?<\/\1\s*>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(br|\/p|\/div|\/li|\/tr|\/h[1-6])\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/[ \t]*\n[ \t]*/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

// ---- .eml -----------------------------------------------------------------

function walk(raw, depth, acc) {
  const { head, body } = splitMessage(raw);
  const h = parseHeaders(head);
  const ct = String(h['content-type'] || 'text/plain').toLowerCase();
  const disp = String(h['content-disposition'] || '').toLowerCase();
  const nameOf = () => decodeWords((/filename\*?="?([^";]+)/i.exec(h['content-disposition'] || '') || /name="?([^";]+)/i.exec(h['content-type'] || '') || [])[1] || '');
  const bm = /boundary="?([^";\s]+)"?/i.exec(h['content-type'] || '');
  if (ct.startsWith('multipart/') && bm && depth < 6) {
    body.split('--' + bm[1]).slice(1).forEach((part) => { if (!/^--/.test(part.trimStart())) walk(part.replace(/^\r?\n/, ''), depth + 1, acc); });
    return;
  }
  if (disp.startsWith('attachment') || (nameOf() && !ct.startsWith('text/plain') && !ct.startsWith('text/html'))) {
    acc.attachments.push({ name: nameOf() || '(unnamed)', type: ct.split(';')[0].trim(), approxBytes: Math.round(body.replace(/\s/g, '').length * (String(h['content-transfer-encoding'] || '').toLowerCase() === 'base64' ? 0.75 : 1)), imported: false });
    return;
  }
  if (ct.startsWith('text/html')) acc.html += (acc.html ? '\n' : '') + decodeBody(body, h);
  else if (ct.startsWith('text/plain') || !bm) acc.text += (acc.text ? '\n' : '') + decodeBody(body, h);
}

export function parseEml(raw) {
  const { head } = splitMessage(raw);
  const h = parseHeaders(head);
  const acc = { text: '', html: '', attachments: [] };
  walk(raw, 0, acc);
  const sent = h.date ? new Date(h.date) : null;
  const body = (acc.text.trim() || htmlToText(acc.html)).trim();
  return {
    messageId: String(h['message-id'] || '').trim().replace(/^<|>$/g, ''),
    sentAt: sent && !isNaN(sent) ? sent.toISOString() : '',
    subject: decodeWords(h.subject),
    from: decodeWords(h.from),
    to: decodeWords(h.to),
    body,
    attachments: acc.attachments,
    htmlOnly: !acc.text.trim() && !!acc.html,
  };
}

// ---- .vtt -----------------------------------------------------------------

const TS = '(?:\\d{1,2}:)?\\d{2}:\\d{2}[.,]\\d{3}';
const CUE = new RegExp('^(' + TS + ')\\s*-->\\s*(' + TS + ')');
export function parseVtt(text) {
  const src = lines(text);
  const cues = [];
  for (let i = 0; i < src.length; i++) {
    const m = CUE.exec(src[i].trim());
    if (!m) continue;
    const payload = [];
    let j = i + 1;
    while (j < src.length && src[j].trim() !== '') { payload.push(src[j].trim()); j++; }
    let speaker = '';
    const t = payload.join(' ').replace(/<v(?:\.[^ >]+)?\s+([^>]+)>/i, (_, n) => { speaker = n.trim(); return ''; }).replace(/<\/?[^>]+>/g, '').trim();
    let body = t;
    const pm = !speaker && /^([A-Z][\w .'-]{1,40}):\s+(.*)$/.exec(t);
    if (pm) { speaker = pm[1].trim(); body = pm[2]; }
    cues.push({ index: cues.length + 1, start: m[1].replace(',', '.'), end: m[2].replace(',', '.'), speaker, text: body });
    i = j;
  }
  return cues;
}
export const cueRange = (cues) => (cues.length ? cues[0].start + ' to ' + cues[cues.length - 1].end : '');
export const cueLine = (c) => '[' + c.start + ' to ' + c.end + '] ' + (c.speaker ? c.speaker + ': ' : '') + c.text;
export const vttContent = (cues) => cues.map(cueLine).join('\n');

// ---- drafts ---------------------------------------------------------------

// Explicit markers only ("Decision:", "Action:", "AI:", "Action item", "TODO"); nothing is guessed.
const DECISION = /^\s*(?:[-*]\s*)?(?:decision|decided|agreed)\b\s*[:\-]\s*(.+)$/i;
const ACTION = /^\s*(?:[-*]\s*)?(?:action(?:\s+item)?|ai|todo|follow[- ]?up)\b\s*[:\-]\s*(.+)$/i;
export function extractDrafts(items) {
  const out = [];
  (items || []).forEach((it) => {
    const m = DECISION.exec(it.text) || null;
    const a = !m && ACTION.exec(it.text);
    if (m) out.push({ type: 'decision', text: m[1].trim(), ref: it.ref });
    else if (a) out.push({ type: 'action', text: a[1].trim(), ref: it.ref });
  });
  return out;
}
export const emlDraftItems = (body) => lines(body).map((t, i) => ({ text: t, ref: 'line ' + (i + 1) })).filter((x) => x.text.trim());
export const vttDraftItems = (cues) => cues.map((c) => ({ text: c.text, ref: 'cue ' + c.index + ' (' + c.start + ' to ' + c.end + ')' + (c.speaker ? ', ' + c.speaker : '') }));

// Copilot or Teams recap: machine written, shown as an inference until a person confirms it.
export function isMachineRecap({ name = '', subject = '', text = '' } = {}) {
  const hay = (name + ' ' + subject + ' ' + String(text).slice(0, 1500)).toLowerCase();
  return /\b(copilot|intelligent recap|ai[- ]generated|meeting recap|teams recap)\b/.test(hay);
}
