// js/core/exportPackage.js — handover export package (HND-04). Pure: no DOM, no storage.
// handover.md, handover.json and sources.csv share the same statement ids; manifest.json lists the
// SHA-256 of every file plus the package hash the reviewer confirmed. handover.html is added by the UI.
import { sha256Hex, canonicalJson } from './backup.js';
import { statementOf, kindMeta, isRecordedDecision } from './knowledge.js';
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
    const decided = entries[i] ? decisionRows([entries[i]]) : [];
    L.push('### Confirmed decisions (' + decided.length + ')', '');
    if (!decided.length) L.push(NOT_FOUND, '');
    decided.forEach((d) => L.push('- [' + d.statementId + '] ' + d.title + ' (decided by ' + d.decidedBy + ', ' + String(d.decidedAt).slice(0, 10) + ')' + (d.rationale ? '. Why: ' + d.rationale : '')));
    if (decided.length) L.push('');
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

// Confirmed decisions across the package (KNW-02): only decisions a person recorded.
export function decisionRows(entries) {
  const rows = [];
  entries.forEach((e) => e.groups.cards.filter(isRecordedDecision).forEach((c) => {
    const s = statementOf(c);
    rows.push({ statementId: s.id, project: (e.project && e.project.project_name) || '', title: s.title || s.text.slice(0, 120), decidedBy: c.decision.by, decidedAt: c.decision.at, rationale: c.decision.rationale || '', sourceIds: s.sourceIds });
  }));
  return rows.sort((a, b) => String(b.decidedAt).localeCompare(String(a.decidedAt)));
}
export function renderDecisionsCsv(rows) {
  return toCsv([['statement_id', 'project', 'decision', 'decided_by', 'decided_at', 'rationale', 'source_ids'], ...rows.map((r) => [r.statementId, r.project, r.title, r.decidedBy, r.decidedAt, r.rationale || NOT_FOUND, r.sourceIds.join(' ')])]);
}

// Ready-made prompts for taking the package to Microsoft 365 Copilot (Pattern A). Copilot's reply
// comes back through "Paste a Copilot reply" and is stored as a Draft Inference or Recommendation.
export function renderCopilotPrompts(meta) {
  const rules = [
    'Use only handover.md, handover.json and sources.csv from this package. Do not use other files, email or web results.',
    'Cite the statement id in square brackets, for example [S-1a2b3c4d5e], after every sentence that uses the package.',
    'Label every sentence as Inference or Recommendation. Never present anything as a confirmed fact or decision; those are already in the package.',
    'If the package does not answer something, write "Not found in the package". Do not guess names, dates, amounts or owners.',
  ];
  const L = ['# Copilot review prompts', '', 'Package ' + String(meta.packageHash).slice(0, 12) + ', generated ' + meta.generatedAt + '.', '', 'Save this folder to OneDrive or SharePoint (or attach the files in Copilot), then paste one prompt. Copy the reply back into Continuum with "Paste a Copilot reply"; it is stored as a Draft and never becomes a Fact.', '', '## Rules to paste first', '', ...rules.map((r) => '- ' + r), ''];
  const prompts = [
    ['Gaps', 'List the most important questions a new delivery lead would still have after reading this handover, grouped by section, and say which statement ids are closest to each question.'],
    ['Risks to watch', 'Which open risks, issues and dependencies need action in the next four weeks? Quote the owner and due date only if the package states them.'],
    ['Plain-language summary', 'Write a half-page summary for a steering group, using only the package and citing statement ids.'],
    ['Consistency check', 'Find statements that conflict with each other or look out of date, and cite both statement ids.'],
  ];
  prompts.forEach(([t, p]) => L.push('## ' + t, '', '```', p, '```', ''));
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
    { name: 'decisions.csv', content: renderDecisionsCsv(decisionRows(entries)) },
    { name: 'copilot-prompts.md', content: renderCopilotPrompts(meta) },
  ];
  const hashes = {};
  for (const f of files) hashes[f.name] = await sha256Hex(f.content);
  files.push({ name: 'manifest.json', content: JSON.stringify({ format: 'continuum-handover-manifest', packageHash: meta.packageHash, files: hashes, manifestHash: await sha256Hex(canonicalJson(hashes)) }, null, 2) });
  return files;
}
