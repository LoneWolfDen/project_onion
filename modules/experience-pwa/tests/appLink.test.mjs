import test from 'node:test';
import assert from 'node:assert/strict';
import { contextFor, encodeContext, decodeContext, linkFor, readContext, resolveProject, saveAppUrls, loadAppUrls } from '../static/js/core/appLink.js';

const P = (o) => ({ Project_ReferenceID: 'R1', project_name: 'Beacon-201', client_name: 'Halden', opportunity_numbers: ['O-730201'], project_ids: ['7302010'], gdp_url: 'https://gdp.example/dashboard/project-details/7302', ...o });

test('context carries identifiers only and round-trips through the fragment', () => {
  const ctx = contextFor(P({ contacts: [{ email: 'x@y.z' }], notes: 'secret' }), 'continuum', new Date('2026-10-06T00:00:00Z'));
  assert.deepEqual(Object.keys(ctx).sort(), ['at', 'client', 'from', 'gdp', 'name', 'opp', 'pid', 'ref', 'v']);
  assert.equal(ctx.gdp, '7302');
  const url = linkFor('http://localhost:3005/#old', ctx);
  assert.match(url, /^http:\/\/localhost:3005\/#ctx=[A-Za-z0-9_-]+$/);
  assert.deepEqual(readContext({ hash: new URL(url).hash }), ctx);
  assert.ok(!url.includes('secret') && !url.includes('x@y.z'));
});

test('unicode names survive and bad input is rejected', () => {
  const ctx = contextFor(P({ project_name: 'Brené Ø' }));
  assert.equal(decodeContext(encodeContext(ctx)).name, 'Brené Ø');
  assert.equal(decodeContext('not-base64!!'), null);
  assert.equal(decodeContext(encodeContext({ v: 2, ref: 'x' })), null);
  assert.equal(decodeContext(encodeContext({ v: 1, name: 'only a name' })), null);
  assert.equal(decodeContext('A'.repeat(5000)), null);
  assert.equal(linkFor('javascript:alert(1)', ctx), '');
});

test('resolve order: ref, project ID without leading zeros, opportunity, GDP; never by name', () => {
  const a = P(); const b = P({ Project_ReferenceID: 'R2', project_name: 'Other', opportunity_numbers: ['O-1'], project_ids: ['999'], gdp_url: '' });
  const ctx = (o) => ({ v: 1, from: 'finance', ref: '', name: '', client: '', opp: [], pid: [], gdp: '', ...o });
  assert.equal(resolveProject(ctx({ ref: 'R2' }), [a, b]).project, b);
  const byPid = resolveProject(ctx({ pid: ['007302010'] }), [a, b]);
  assert.equal(byPid.project, a); assert.equal(byPid.by, 'project ID');
  assert.equal(resolveProject(ctx({ opp: ['o-730201'] }), [a, b]).project, a);
  assert.equal(resolveProject(ctx({ gdp: '7302' }), [a, b]).project, a);
  assert.equal(resolveProject(ctx({ name: 'Beacon-201', pid: ['1'] }), [a, b]).status, 'not_found');
  assert.equal(resolveProject(ctx({ opp: ['O-730201'] }), [a, P({ Project_ReferenceID: 'R3' })]).status, 'ambiguous');
});

test('only http(s) app addresses are saved', () => {
  const m = new Map(); const st = { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, v) };
  saveAppUrls(st, { finance: 'http://localhost:3005', presales: 'file:///x', bad: 'javascript:1' });
  assert.deepEqual(loadAppUrls(st), { finance: 'http://localhost:3005' });
});
