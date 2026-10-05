// js/core/exportPackage.js — handover export package (HND-04). Pure: no DOM, no storage.
// handover.md, handover.json and sources.csv share the same statement ids; manifest.json lists the
// SHA-256 of every file plus the package hash the reviewer confirmed. handover.html is added by the UI.
import { sha256Hex, canonicalJson } from './backup.js';
import { statementOf, kindMeta } from './knowledge.js';
import { CATS, NOT_FOUND } from './handover.js';

const csvCell = (v) => { const s = String(v == null ? '' : v); return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
export const toCsv = (rows) => rows.map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';

// entries: [{ project, perNote, groups }] as in packageManifest. sources: Source records (core/source.js).
export function buildStatements(entries) {
  return entries.map((e) => ({
    projectRef: (e.project && e.project.Project_ReferenceID) || '',
    projectName: (e.project && e.project.project_name) || '',
    statements: e.groups.cards.map(statementOf),
  }));
}

export function renderMarkdown(meta, byProject, entries) {
  const L = [];
  L.push('# Handover package', '', 'Generated ' + meta.generatedAt + ' by ' + meta.generatedBy + ' · window: ' + meta.timeframe + ' · package ' + String(meta.packageHash).slice(0, 12), '');
  if (meta.coverNotes) L.push('> ' + meta.coverNotes.replace(/\n/g, '\n> '), '');
  byProject.forEach((p, i) => {
    L.push('## ' + (p.projectName || p.projectRef), '');
    const remark = entries[i] && entries[i].perNote; if (remark) L.push('Remark: ' + remark, '');
    CATS.forEach((cat) => {
      const sts = p.statements.filter((s) => s.category === cat.key);
      L.push('### ' + cat.label + ' (' + sts.length + ')', '');
      if (!sts.length) L.push(NOT_FOUND, '');
      sts.forEach((s) => L.push('- [' + s.id + '] **' + kindMeta(s.kind).label + '**' + (s.closed ? ' (closed)' : '') + ': ' + (s.title ? s.title + ' — ' : '') + s.text.replace(/\s*\n\s*/g, ' ').slice(0, 600) + (s.sourceIds.length ? ' _(sources: ' + s.sourceIds.join(', ') + ')_' : ' _(no source)_')));
      if (sts.length) L.push('');
    });
  });
  return L.join('\n');
}

export function renderSourcesCsv(byProject, sources) {
  const byId = new Map((Array.isArray(sources) ? sources : []).map((s) => [s.id, s]));
  const used = new Map();
  byProject.forEach((p) => p.statements.forEach((s) => s.sourceIds.forEach((id) => { if (!used.has(id)) used.set(id, []); used.get(id).push(s.id); })));
  const rows = [['source_id', 'name', 'kind', 'adapter', 'sha256', 'as_of', 'imported_at', 'statement_ids']];
  [...used.keys()].sort().forEach((id) => {
    const s = byId.get(id) || {};
    rows.push([id, s.name || NOT_FOUND, s.kind || NOT_FOUND, s.adapter || NOT_FOUND, s.hash || NOT_FOUND, s.asOf || NOT_FOUND, s.importedAt || NOT_FOUND, used.get(id).join(' ')]);
  });
  return toCsv(rows);
}

// extraFiles: [{ name, content }] added by the UI (handover.html). Returns files in a stable order.
export async function buildPackage(entries, meta, sources, extraFiles = []) {
  const byProject = buildStatements(entries);
  const json = { format: 'continuum-handover', generatedAt: meta.generatedAt, generatedBy: meta.generatedBy, timeframe: meta.timeframe, packageHash: meta.packageHash, confirmation: meta.confirmation || null, coverNotes: meta.coverNotes || '', projects: byProject };
  const files = [
    { name: 'handover.md', content: renderMarkdown(meta, byProject, entries) },
    ...extraFiles,
    { name: 'handover.json', content: JSON.stringify(json, null, 2) },
    { name: 'sources.csv', content: renderSourcesCsv(byProject, sources) },
  ];
  const hashes = {};
  for (const f of files) hashes[f.name] = await sha256Hex(f.content);
  files.push({ name: 'manifest.json', content: JSON.stringify({ format: 'continuum-handover-manifest', packageHash: meta.packageHash, files: hashes, manifestHash: await sha256Hex(canonicalJson(hashes)) }, null, 2) });
  return files;
}
