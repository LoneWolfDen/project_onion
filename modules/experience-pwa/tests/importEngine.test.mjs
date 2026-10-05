// Run: node --test modules/experience-pwa/tests/
// IMP-01/02: Source record, smart column matching, mapping, dates, atomic stage.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../static/js/core/importEngine.js';
import * as S from '../static/js/core/source.js';

const FIELDS = [
  { key: 'raised', label: 'Date Raised', type: 'date', aliases: ['Raised', 'Raised On', 'Date'] },
  { key: 'type', label: 'RAID Type', required: true, aliases: ['Type', 'Category'] },
  { key: 'description', label: 'Description', required: true, aliases: ['Detail', 'Risk Description'] },
  { key: 'probability', label: 'Probability', type: 'number' },
  { key: 'owner', label: 'Assigned To', aliases: ['Owner', 'Assignee'] },
  { key: 'note', label: 'Status / Comments / Mitigation Steps', aliases: ['Mitigation', 'Comments'] },
];

test('source: same bytes give the same id, duplicates found, kind from name', async () => {
  const a = await S.makeSource({ name: 'raid.xlsx', content: new Uint8Array([1, 2, 3]) });
  const b = await S.makeSource({ name: 'copy.xlsx', content: new Uint8Array([1, 2, 3]) });
  const c = await S.makeSource({ name: 'x.csv', content: 'a,b\n1,2' });
  assert.equal(a.hash, b.hash); assert.equal(a.kind, 'xlsx'); assert.equal(c.kind, 'csv');
  assert.equal(S.findDuplicate([a], b).id, a.id);
  assert.equal(S.findDuplicate([a], c), null);
  await assert.rejects(() => S.makeSource({ name: 'x', kind: 'bogus', content: 'x' }));
});

test('csv: quotes, doubled quotes, CRLF, semicolon, BOM, blank rows', () => {
  assert.deepEqual(E.parseCsv('﻿a,b\r\n"x, y","say ""hi"""\r\n\r\n'), [['a', 'b'], ['x, y', 'say "hi"']]);
  assert.deepEqual(E.parseCsv('a;b\n1;2'), [['a', 'b'], ['1', '2']]);
});

test('header row detection skips title rows', () => {
  assert.equal(E.detectHeaderRow([['RAID log'], [''], ['Date', 'Type', 'Desc']]), 2);
  const d = E.describeSheets([{ name: 'S1', rows: [['RAID'], ['A', 'B'], ['1', '2'], ['3', '4']] }]);
  assert.equal(d[0].rowCount, 2); assert.equal(d[0].headerRow, 1);
});

test('matching layers: exact, alias, fuzzy; each field used once', () => {
  const m = E.matchHeaders(['Date Raised', 'Category', 'Owner', 'Descripton', 'Mitigation', 'Priority'], FIELDS);
  const by = Object.fromEntries(m.columns.map((c) => [c.header, c]));
  assert.equal(by['Date Raised'].how, 'exact');
  assert.equal(by['Category'].field, 'type'); assert.equal(by['Category'].how, 'alias');
  assert.equal(by['Owner'].field, 'owner');
  assert.equal(by['Descripton'].how, 'fuzzy'); assert.equal(by['Descripton'].field, 'description');
  assert.equal(by['Mitigation'].field, 'note');
  assert.deepEqual(m.unmapped.map((c) => c.header), ['Priority']);
  assert.deepEqual(m.missingRequired, []);
});

test('missing required fields are reported; unrelated headers are not force-matched', () => {
  const m = E.matchHeaders(['Foo', 'Bar'], FIELDS);
  assert.deepEqual(m.missingRequired, ['type', 'description']);
  assert.equal(m.unmapped.length, 2);
});

test('saved mapping wins and is keyed by fingerprint', async () => {
  const headers = ['Zed', 'Description'];
  const fp1 = await E.headerFingerprint(headers); const fp2 = await E.headerFingerprint(['description', ' ZED ']);
  assert.equal(fp1, fp2);
  const m = E.matchHeaders(headers, FIELDS, { zed: 'owner' });
  assert.equal(m.columns[0].field, 'owner'); assert.equal(m.columns[0].how, 'saved');
});

test('AI prompt carries headers and field list only; answer is validated', () => {
  const p = E.buildAiPrompt(['Zed', 'Description'], FIELDS);
  assert.ok(p.includes('Zed') && p.includes('"owner"'));
  const s = E.parseAiSuggestions('Sure!\n{"Zed":"owner","Description":"bogus","Other":"type"}', ['Zed', 'Description'], FIELDS);
  assert.deepEqual(s, { Zed: 'owner' });
  assert.deepEqual(E.parseAiSuggestions('not json', ['Zed'], FIELDS), {});
  assert.deepEqual(E.parseAiSuggestions('{"Zed":"owner"}', ['Zed'], FIELDS, ['owner']), {});
});

test('dates are strict and day-first', () => {
  assert.equal(E.parseDate('05-10-2026'), '2026-10-05');
  assert.equal(E.parseDate('5/10/2026'), '2026-10-05');
  assert.equal(E.parseDate('31/02/2026'), null);
  assert.equal(E.parseDate('2026-10-05'), '2026-10-05');
  assert.equal(E.parseDate('next week'), null);
  assert.equal(E.parseDate(46000), '2025-12-09');
});

test('mapRows: provenance, blanks stay empty, scores kept as given, bad values warn', () => {
  const rows = [['Raised', 'Type', 'Description', 'Probability', 'Owner'],
    ['05-10-2026', 'Risk', 'Vendor slips', '0.7', ''],
    ['', '', '', '', ''],
    ['bad', 'Issue', 'Env down', 'high', 'Sam']];
  const m = E.matchHeaders(rows[0], FIELDS);
  const { records, warnings } = E.mapRows(rows, 0, m.columns, FIELDS, 'raid.xlsx', 'Log');
  assert.equal(records.length, 2);
  assert.equal(records[0].values.raised, '2026-10-05'); assert.equal(records[0].values.probability, 0.7);
  assert.equal(records[0].values.owner, '');
  assert.deepEqual(records[0].provenance.type, { file: 'raid.xlsx', sheet: 'Log', row: 2, column: 'Type' });
  assert.equal(records[1].provenance.type.row, 4);
  assert.equal(warnings.length, 2);
  assert.equal(E.NOT_FOUND, 'Not found');
});

test('stageAll is all-or-nothing', () => {
  const recs = [{ values: { type: 'Risk' } }, { values: { type: '' } }];
  const bad = E.stageAll(recs, (r) => (r.values.type ? '' : 'Type missing'));
  assert.equal(bad.ok, false); assert.equal(bad.staged.length, 0); assert.equal(bad.errors[0].index, 1);
  assert.equal(E.stageAll(recs.slice(0, 1), () => '').ok, true);
});

test('rowKey normalises and truncates', () => {
  const a = { values: { raised: '2026-10-05', type: 'Risk', description: '  Vendor   SLIPS ' } };
  assert.equal(E.rowKey(a, ['raised', 'type', 'description']), '2026-10-05|risk|vendor slips');
});
