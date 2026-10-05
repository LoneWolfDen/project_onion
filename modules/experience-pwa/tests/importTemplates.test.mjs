// Run: node --test modules/experience-pwa/tests/
// IMP-03: RAID template fields, validation, content, saved mappings.
import test from 'node:test';
import assert from 'node:assert/strict';
const store = new Map();
globalThis.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => { store.set(k, String(v)); } };
const T = await import('../static/js/core/importTemplates.js');
const E = await import('../static/js/core/importEngine.js');

test('canonical RAID headers all match exactly', () => {
  const headers = ['Date Raised', 'RAID Type', 'Description', 'Probability', 'Impact', 'Overall Impact', 'Status / Comments / Mitigation Steps', 'Assigned To', 'Status', 'Due Date', 'Closed Date'];
  const m = E.matchHeaders(headers, T.RAID_FIELDS);
  assert.ok(m.columns.every((c) => c.how === 'exact'), JSON.stringify(m.columns.filter((c) => c.how !== 'exact')));
  assert.equal(m.unmapped.length, 0);
});

test('older template headers match through aliases', () => {
  const m = E.matchHeaders(['Raised', 'Category', 'Risk Description', 'Likelihood', 'Severity', 'Mitigation', 'Owner', 'Target Date'], T.RAID_FIELDS);
  assert.deepEqual(m.columns.map((c) => c.field), ['raised', 'type', 'description', 'probability', 'impact', 'note', 'owner', 'due']);
});

test('type comes from the RAID Type column only', () => {
  const rec = (type, description) => ({ values: { type, description } });
  assert.equal(T.raidValidate(rec('risk', 'x')), '');
  assert.match(T.raidValidate(rec('Wish', 'x')), /not one of/);
  assert.match(T.raidValidate(rec('', 'x')), /empty/);
  assert.match(T.raidValidate(rec('Risk', '')), /Description is empty/);
});

test('content shows Not found for blanks and keeps scores as given', () => {
  const rec = { values: { type: 'Risk', description: 'Slip', probability: 0.7, owner: '' }, provenance: { description: { file: 'a.xlsx', sheet: 'Log', row: 4, column: 'Description' } } };
  const c = T.raidContent(rec);
  assert.match(c, /Owner: Not found/); assert.match(c, /Probability: 0.7/);
  assert.equal(T.provenanceText(rec), 'a.xlsx › Log › row 4');
});

test('saved mapping is remembered per header fingerprint', async () => {
  const headers = ['Zed', 'Description'];
  const fp = await E.headerFingerprint(headers);
  const cols = E.matchHeaders(headers, T.RAID_FIELDS).columns; cols[0].field = 'owner';
  T.saveMap(fp, cols, E.normHeader);
  const m = E.matchHeaders(headers, T.RAID_FIELDS, T.loadSavedMap(fp));
  assert.equal(m.columns[0].field, 'owner'); assert.equal(m.columns[0].how, 'saved');
});

test('GDP: 42 fixed columns, exact headers only, required keys', () => {
  assert.equal(T.GDP_FIELDS.length, 42);
  const headers = T.GDP_FIELDS.map((f) => f.label);
  const m = E.matchHeaders(headers, T.GDP_FIELDS, {}, { exactOnly: true });
  assert.ok(m.columns.every((c) => c.how === 'exact')); assert.deepEqual(m.missingRequired, []);
  const renamed = E.matchHeaders(headers.map((h) => (h === 'Status Date' ? 'Status Dt' : h)), T.GDP_FIELDS, {}, { exactOnly: true });
  assert.deepEqual(renamed.missingRequired, ['statusDate']);
  assert.equal(renamed.columns.find((c) => c.header === 'Status Dt').field, null);
});

test('GDP: rows join only by GDP ID, Project ID (zeros stripped) or Opportunity ID; others are counted', () => {
  const project = { project_ids: ['7302010'], opportunity_numbers: ['O-730201'], gdp_url: 'https://gdp.example/dashboard/project-details/7302' };
  const row = (v) => ({ row: 2, values: v });
  const rows = [row({ projectId: '007302010' }), row({ oppId: 'O-730201' }), row({ gdpId: '7302' }), row({ projectId: '999' }), row({ engagement: 'Beacon' })];
  const r = T.gdpSelect(rows, project);
  assert.equal(r.staged.length, 3);
  assert.match(r.notes[1], /^1 rows belong to other projects/); assert.match(r.notes[2], /^1 rows have no/);
});

test('GDP: content cites as-of date and shows Not found for blanks', () => {
  const rec = { values: { status: 'Green', statusDate: '2026-10-01', summary: 'On track', gdd: 'Ana' } };
  assert.equal(T.gdpTitle(rec), 'GDP status 2026-10-01: Green');
  const c = T.gdpContent(rec);
  assert.match(c, /As of: 2026-10-01/); assert.match(c, /GDM Not found/);
});
