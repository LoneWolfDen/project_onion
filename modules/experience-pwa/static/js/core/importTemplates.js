// js/core/importTemplates.js — field lists for the import engine (IMP-03 RAID; GDP follows in IMP-04).
// Canonical fields come from docs/IMPORT_TEMPLATES.md. Aliases cover older RAID templates.
import { NOT_FOUND } from './importEngine.js';

export const RAID_FIELDS = [
  { key: 'raised', label: 'Date Raised', type: 'date', aliases: ['Raised', 'Raised On', 'Date Logged', 'Logged'] },
  { key: 'type', label: 'RAID Type', required: true, aliases: ['Type', 'Category', 'Log Type', 'Item Type'] },
  { key: 'description', label: 'Description', required: true, aliases: ['Detail', 'Details', 'Risk Description', 'Issue Description', 'Title'] },
  { key: 'probability', label: 'Probability', type: 'number', aliases: ['Likelihood', 'Prob'] },
  { key: 'impact', label: 'Impact', type: 'number', aliases: ['Severity'] },
  { key: 'overall', label: 'Overall Impact', type: 'number', aliases: ['Overall', 'Score', 'Rating', 'Exposure'] },
  { key: 'note', label: 'Status / Comments / Mitigation Steps', aliases: ['Mitigation', 'Mitigation Steps', 'Comments', 'Actions', 'Mitigation Plan', 'Latest Update'] },
  { key: 'owner', label: 'Assigned To', aliases: ['Owner', 'Assignee', 'Responsible', 'Risk Owner'] },
  { key: 'status', label: 'Status', aliases: ['State', 'Current Status'] },
  { key: 'due', label: 'Due Date', type: 'date', aliases: ['Due', 'Target Date', 'Target', 'Review Date'] },
  { key: 'closed', label: 'Closed Date', type: 'date', aliases: ['Closed', 'Date Closed', 'Resolved Date'] },
];
export const RAID_TYPES = ['Risk', 'Assumption', 'Issue', 'Dependency'];
export const RAID_KEY_FIELDS = ['raised', 'type', 'description'];

const v = (rec, k) => { const x = rec.values[k]; return x === '' || x == null ? NOT_FOUND : String(x); };

// RAID type comes from the RAID Type column only; anything else is reported, never guessed.
export function raidValidate(rec) {
  const t = String(rec.values.type || '').trim();
  if (!t) return 'RAID Type is empty';
  if (!RAID_TYPES.some((x) => x.toLowerCase() === t.toLowerCase())) return 'RAID Type "' + t + '" is not one of ' + RAID_TYPES.join(', ');
  if (!String(rec.values.description || '').trim()) return 'Description is empty';
  return '';
}

export function raidContent(rec) {
  return [
    v(rec, 'type') + ': ' + v(rec, 'description'),
    'Raised: ' + v(rec, 'raised') + ' | Owner: ' + v(rec, 'owner') + ' | Status: ' + v(rec, 'status'),
    'Probability: ' + v(rec, 'probability') + ' | Impact: ' + v(rec, 'impact') + ' | Overall: ' + v(rec, 'overall'),
    'Due: ' + v(rec, 'due') + ' | Closed: ' + v(rec, 'closed'),
    'Notes: ' + v(rec, 'note'),
  ].join('\n');
}
export function raidTitle(rec) {
  const d = String(rec.values.description || '').trim();
  return String(rec.values.type || 'RAID') + ': ' + (d.length > 70 ? d.slice(0, 70) + '…' : d);
}
export function provenanceText(rec, key = 'description') {
  const p = rec.provenance[key] || Object.values(rec.provenance)[0];
  return p ? p.file + ' › ' + p.sheet + ' › row ' + p.row : '';
}

// Saved column mappings, per header fingerprint (localStorage; failures are harmless).
const MAP_KEY = 'continuum_import_maps';
export function loadSavedMap(fp) { try { return (JSON.parse(localStorage.getItem(MAP_KEY) || '{}')[fp]) || {}; } catch (e) { return {}; } }
export function saveMap(fp, columns, norm) {
  try {
    const all = JSON.parse(localStorage.getItem(MAP_KEY) || '{}');
    all[fp] = Object.fromEntries(columns.filter((c) => c.field).map((c) => [norm(c.header), c.field]));
    localStorage.setItem(MAP_KEY, JSON.stringify(all));
  } catch (e) { /* storage unavailable: mapping is simply not remembered */ }
}
