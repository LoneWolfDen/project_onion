// js/core/source.js — Source record for imported files (IMP-01).
// Pure: no DOM, no network. A Source says which file, which bytes (SHA-256),
// which adapter read it and which as-of date it speaks for.
import { sha256Hex } from './backup.js';

export const SOURCE_KINDS = ['xlsx', 'csv', 'paste', 'bookmarklet', 'note'];

export async function hashBytes(bytes) {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const buf = await globalThis.crypto.subtle.digest('SHA-256', u8);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function kindFromName(name) {
  const m = /\.([a-z0-9]+)$/i.exec(String(name || ''));
  const ext = m ? m[1].toLowerCase() : '';
  if (ext === 'xlsx' || ext === 'xls' || ext === 'xlsm') return 'xlsx';
  if (ext === 'csv' || ext === 'tsv') return 'csv';
  return 'note';
}

// content: string | Uint8Array | ArrayBuffer. Same content always gives the same hash.
export async function makeSource({ name, kind, content, adapter, adapterVersion = '1', asOf = null, now = new Date() }) {
  if (kind && !SOURCE_KINDS.includes(kind)) throw new Error('Unknown source kind: ' + kind);
  const hash = typeof content === 'string' ? await sha256Hex(content) : await hashBytes(content);
  return {
    id: 'src_' + hash.slice(0, 16),
    hash,
    name: String(name || 'unnamed'),
    kind: kind || kindFromName(name),
    adapter: adapter || 'generic',
    adapterVersion,
    asOf: asOf || null,
    importedAt: now.toISOString(),
  };
}

// Duplicate = same bytes already imported. Checked before anything is staged.
export function findDuplicate(sources, candidate) {
  return (Array.isArray(sources) ? sources : []).find((s) => s && s.hash === candidate.hash) || null;
}
