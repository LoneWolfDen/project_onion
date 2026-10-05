// Run: node --test modules/experience-pwa/tests/
// PWA-01/02: manifest, precache list, worker rules, update flow.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { watchRegistration, applyUpdate } from '../static/js/core/pwa.js';

const mod = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const staticDir = path.join(mod, 'static');
const sw = fs.readFileSync(path.join(mod, 'sw.js'), 'utf8');
const precache = [...sw.match(/const PRECACHE = \[([\s\S]*?)\n\];/)[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);

function walk(d) { return fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)])); }

test('every precache entry exists and every app file is listed', () => {
  const missing = precache.filter((u) => u !== '/' && !fs.existsSync(path.join(staticDir, u)));
  assert.deepEqual(missing, []);
  const app = walk(staticDir).map((f) => f.slice(staticDir.length)).filter((p) => !p.startsWith('/docs/') && !p.includes('.bak') && !p.endsWith('bookmarklet.js'));
  const unlisted = app.filter((p) => !precache.includes(p));
  assert.deepEqual(unlisted, [], 'add these to PRECACHE in sw.js and bump SW_VERSION');
});

test('manifest is installable', () => {
  const m = JSON.parse(fs.readFileSync(path.join(staticDir, 'manifest.webmanifest'), 'utf8'));
  assert.equal(m.display, 'standalone'); assert.ok(m.name && m.short_name && m.start_url && m.scope && m.theme_color && m.background_color);
  const sizes = m.icons.map((i) => i.sizes);
  assert.ok(sizes.includes('192x192') && sizes.includes('512x512'));
  assert.ok(m.icons.some((i) => i.purpose === 'maskable'));
  m.icons.forEach((i) => assert.ok(fs.existsSync(path.join(staticDir, i.src)), i.src));
  const html = fs.readFileSync(path.join(staticDir, 'index.html'), 'utf8');
  assert.match(html, /rel="manifest" href="\/manifest\.webmanifest"/); assert.match(html, /name="theme-color"/);
});

test('worker rules: versioned cache, old caches deleted, no unconditional skipWaiting, no card data cached', () => {
  assert.match(sw, /const SW_VERSION = 'continuum-sw-v\d+'/);
  assert.match(sw, /keys\.filter\(\(k\) => k !== CACHE\)/);
  const install = sw.slice(sw.indexOf("addEventListener('install'"), sw.indexOf("addEventListener('activate'"));
  assert.ok(!/skipWaiting/.test(install), 'install must not skip waiting');
  assert.match(sw, /d\.type === 'SKIP_WAITING'/);
  ['/ingest', '/delete', '/ask'].forEach((p) => assert.ok(sw.includes("'" + p + "'")));
  assert.ok(!precache.some((u) => /ingest|onion_db|\/api\//i.test(u)));
});

const fakeReg = (over = {}) => { const l = {}; return { waiting: null, installing: null, addEventListener: (t, f) => { l[t] = f; }, fire: (t) => l[t](), ...over }; };

test('update prompt: waiting worker is reported only when an older worker controls the page', () => {
  const w = { state: 'installed', postMessage() {} };
  const seen = []; watchRegistration(fakeReg({ waiting: w }), (x) => seen.push(x), () => true);
  assert.deepEqual(seen, [w]);
  const first = []; watchRegistration(fakeReg({ waiting: w }), (x) => first.push(x), () => false);
  assert.deepEqual(first, [], 'first install is not an update');
});

test('update prompt: a worker that installs later triggers it', () => {
  const l = {}; const w = { state: 'installing', addEventListener: (t, f) => { l[t] = f; } };
  const reg = fakeReg({ installing: w }); const seen = [];
  watchRegistration(reg, (x) => seen.push(x), () => true);
  reg.fire('updatefound'); assert.equal(seen.length, 0);
  w.state = 'installed'; l.statechange(); assert.deepEqual(seen, [w]);
});

test('applyUpdate asks the worker to take over and reloads once on controllerchange', () => {
  const sent = []; const worker = { postMessage: (m) => sent.push(m) };
  let cc; const sws = { addEventListener: (t, f) => { cc = f; } }; let reloads = 0;
  assert.equal(applyUpdate(worker, () => reloads++, sws), true);
  assert.deepEqual(sent, [{ type: 'SKIP_WAITING' }]);
  cc(); cc(); assert.equal(reloads, 1);
  assert.equal(applyUpdate(null), false);
});
