// Run: node --test modules/experience-pwa/tests/
// HND-04: export package with shared statement ids and hashes.
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildHandover } from '../static/js/core/handover.js';
import { buildPackage, toCsv } from '../static/js/core/exportPackage.js';
import { makeZip, crc32 } from '../static/js/core/zip.js';
import { sha256Hex } from '../static/js/core/backup.js';

const proj = { Project_ReferenceID: 'P-1', project_name: 'Apollo' };
const card = (o) => ({ id: 'c' + Math.random(), Project_ReferenceID: 'P-1', privacy: 'Team Shared', created_at: '2026-09-01T00:00:00Z', title: 't', content: 'x', ...o });
const state = { timeline: [card({ id: 'a', title: 'Budget, "agreed"', category: 'finances', importSourceId: 'src_1' }), card({ id: 'b', category: 'raid', raidType: 'Risk', importSourceId: 'src_1' }), card({ id: 'p', syncStatus: 'pending_processing' })] };
const entries = [{ project: proj, perNote: 'Handle with care', groups: buildHandover(state, proj) }];
const meta = { generatedAt: '2026-10-05T10:00:00Z', generatedBy: 'Ana', timeframe: 'Full Lifecycle', packageHash: 'abc123abc123abc123', coverNotes: 'Hello' };
const sources = [{ id: 'src_1', name: 'raid.xlsx', kind: 'xlsx', adapter: 'raid', hash: 'ff00', asOf: '2026-10-01', importedAt: '2026-10-02T00:00:00Z' }];

test('package has md, json, csv and a manifest with SHA-256 of each file', async () => {
  const files = await buildPackage(entries, meta, sources, [{ name: 'handover.html', content: '<html></html>' }]);
  assert.deepEqual(files.map((f) => f.name), ['handover.md', 'handover.html', 'handover.json', 'sources.csv', 'decisions.csv', 'copilot-prompts.md', 'manifest.json']);
  const man = JSON.parse(files.at(-1).content);
  for (const f of files.slice(0, -1)) assert.equal(man.files[f.name], await sha256Hex(f.content), f.name);
  assert.equal(man.packageHash, meta.packageHash);
});

test('statement ids are the same in md, json and sources.csv; unapproved items are absent', async () => {
  const files = Object.fromEntries((await buildPackage(entries, meta, sources)).map((f) => [f.name, f.content]));
  const json = JSON.parse(files['handover.json']);
  const sts = json.projects[0].statements;
  assert.equal(sts.length, 2);
  for (const s of sts) { assert.ok(files['handover.md'].includes('[' + s.id + ']')); assert.ok(files['sources.csv'].includes(s.id)); }
  assert.ok(!files['handover.md'].includes('pending'));
  assert.match(files['handover.md'], /Not found/);
});

test('sources.csv quotes cells and lists each source once with its statements', async () => {
  const csv = (await buildPackage(entries, meta, sources)).find((f) => f.name === 'sources.csv').content;
  const lines = csv.trim().split('\r\n');
  assert.equal(lines.length, 2);
  assert.match(lines[1], /^src_1,raid\.xlsx,xlsx,raid,ff00,2026-10-01,/);
  assert.equal(toCsv([['a,b', 'say "hi"']]), '"a,b","say ""hi"""\r\n');
});

test('same input gives identical files', async () => {
  const a = await buildPackage(entries, meta, sources); const b = await buildPackage(entries, meta, sources);
  assert.deepEqual(a, b);
});

test('zip: valid signatures, entry count and crc', () => {
  const z = makeZip([{ name: 'a.txt', content: 'hello' }, { name: 'b.txt', content: 'world' }]);
  assert.equal(crc32(new TextEncoder().encode('123456789')), 0xcbf43926);
  const v = new DataView(z.buffer);
  assert.equal(v.getUint32(0, true), 0x04034b50);
  assert.equal(v.getUint32(z.length - 22, true), 0x06054b50);
  assert.equal(v.getUint16(z.length - 22 + 10, true), 2);
});

test('confirmed decisions get their own section and decisions.csv; copilot prompts carry the rules', async () => {
  const dState = { timeline: [card({ id: 'd1', title: 'Go nightly batch', importSourceId: 'src_1', decision: { by: 'Ana', at: '2026-09-02T00:00:00Z', rationale: 'Cheaper' } }), card({ id: 'n1', title: 'Plain note', importSourceId: 'src_1' })] };
  const e = [{ project: proj, perNote: '', groups: buildHandover(dState, proj) }];
  const files = Object.fromEntries((await buildPackage(e, meta, sources)).map((f) => [f.name, f.content]));
  assert.match(files['handover.md'], /### Confirmed decisions \(1\)\n\n- \[S-[0-9a-f]+\] Go nightly batch \(decided by Ana, 2026-09-02\)\. Why: Cheaper/);
  const rows = files['decisions.csv'].trim().split('\r\n');
  assert.equal(rows.length, 2);
  assert.match(rows[1], /Go nightly batch,Ana,2026-09-02T00:00:00Z,Cheaper,src_1/);
  assert.match(files['copilot-prompts.md'], /Never present anything as a confirmed fact/);
  assert.match(files['copilot-prompts.md'], /Not found in the package/);
});

test('no decisions shows Not found in the decisions section', async () => {
  const files = Object.fromEntries((await buildPackage(entries, meta, sources)).map((f) => [f.name, f.content]));
  assert.match(files['handover.md'], /### Confirmed decisions \(0\)\n\nNot found/);
});
