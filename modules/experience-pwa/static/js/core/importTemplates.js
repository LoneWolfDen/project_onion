// js/core/importTemplates.js — field lists for the import engine (IMP-03 RAID; GDP follows in IMP-04).
// Canonical fields come from docs/IMPORT_TEMPLATES.md. Aliases cover older RAID templates.
import { NOT_FOUND } from './importEngine.js';
import { projectIdEquals } from './schema.js';

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

// ---- GDP export (IMP-04): fixed tool export, exact headers only -----------------------------
const GDP_COLS = [
  ['engagement', 'Engagement Name'], ['account', 'Account Name'], ['gdpId', 'GDP ID'], ['projectId', 'Project ID'],
  ['psId', 'PeopleSoft Engagement ID'], ['model', 'Delivery Model'], ['practice', 'Practice'], ['location', 'Location of Delivery'],
  ['oppId', 'Opportunity ID'], ['smp', 'SMP Link'], ['bu', 'Business Unit / BSV'], ['service', 'Service Type'],
  ['gdd', 'GDD'], ['gdm', 'GDM'], ['prgm', 'PrgM'], ['emdl', 'EM / DL'], ['bdm', 'BDM / AM / SAM'], ['nao', 'National Account Owner'],
  ['osgPoa', 'OSG POA'], ['osgBoa', 'OSG BOA'], ['salesOrg', 'Sales Organization'],
  ['start', 'Start Date', 'date'], ['end', 'End Date', 'date'], ['phase', 'Phase'], ['statusDate', 'Status Date', 'date'],
  ['summary', 'Summary'], ['schedule', 'Schedule'], ['scheduleC', 'Schedule Comments'], ['csat', 'CSAT'], ['csatC', 'CSAT Comments'],
  ['budget', 'Budget'], ['budgetC', 'Budget Comments'], ['risk', 'Engagement Risk'], ['riskC', 'Engagement Risk Comments'],
  ['resources', 'Resources'], ['resourcesC', 'Resources Comments'], ['status', 'Status Indicator'], ['riskProfile', 'Risk Profile'],
  ['riskSurvey', 'Risk Survey Date', 'date'], ['secProfile', 'Security Profile Date', 'date'], ['engStatus', 'Engagement Status'], ['platform', 'Target Technology Platform'],
];
const GDP_REQUIRED = ['gdpId', 'projectId', 'oppId', 'statusDate', 'summary', 'status'];
export const GDP_FIELDS = GDP_COLS.map(([key, label, type]) => ({ key, label, type, required: GDP_REQUIRED.includes(key) }));

// A row belongs to the active project only through GDP ID, Project ID or Opportunity ID.
export function gdpClassify(rec, project) {
  const g = String(rec.values.gdpId || '').trim(), pid = String(rec.values.projectId || '').trim(), opp = String(rec.values.oppId || '').trim();
  if (!g && !pid && !opp) return 'noKey';
  const p = project || {};
  const gid = String(p.gdp_id || p.gdpId || ((/project-details\/(\d+)/.exec(p.gdp_url || p.gdpUrl || '') || [])[1]) || '');
  const hit = (g && gid && gid === g.replace(/\.0+$/, ''))
    || (pid && (p.project_ids || []).some((h) => projectIdEquals(pid, h)))
    || (opp && (p.opportunity_numbers || []).includes(opp));
  return hit ? 'matched' : 'other';
}
export function gdpSelect(records, project) {
  const sel = { matched: [], other: [], noKey: [] };
  records.forEach((r) => sel[gdpClassify(r, project)].push(r));
  return {
    staged: sel.matched,
    notes: ['' + sel.matched.length + ' rows match this project', sel.other.length + ' rows belong to other projects (not imported)', sel.noKey.length + ' rows have no GDP ID, Project ID or Opportunity ID (not imported)'],
  };
}
export function gdpTitle(rec) { return 'GDP status ' + (rec.values.statusDate || NOT_FOUND) + ': ' + v(rec, 'status'); }
export function gdpContent(rec) {
  const dims = [['Schedule', 'schedule'], ['CSAT', 'csat'], ['Budget', 'budget'], ['Engagement Risk', 'risk'], ['Resources', 'resources']]
    .map(([l, k]) => l + ': ' + v(rec, k) + ' (' + v(rec, k + 'C') + ')');
  return [
    'Overall: ' + v(rec, 'status') + ' | Phase: ' + v(rec, 'phase') + ' | As of: ' + v(rec, 'statusDate'),
    'Summary: ' + v(rec, 'summary'),
    ...dims,
    'People: GDD ' + v(rec, 'gdd') + ', GDM ' + v(rec, 'gdm') + ', PrgM ' + v(rec, 'prgm') + ', EM/DL ' + v(rec, 'emdl') + ', BDM/AM/SAM ' + v(rec, 'bdm'),
    'Start: ' + v(rec, 'start') + ' | End: ' + v(rec, 'end') + ' | Risk profile: ' + v(rec, 'riskProfile'),
  ].join('\n');
}
