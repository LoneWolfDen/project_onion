// Regenerates the PRECACHE list in modules/experience-pwa/sw.js from the files under static/.
// Usage: node scripts/gen-sw-precache.mjs          (rewrite sw.js)
//        node scripts/gen-sw-precache.mjs --check  (exit 1 if sw.js is out of date)
// Bump SW_VERSION by hand when the list or the worker logic changes.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mod = path.join(root, 'modules/experience-pwa');
const staticDir = path.join(mod, 'static');
const swPath = path.join(mod, 'sw.js');

const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
export function precacheList() {
  const files = walk(staticDir).map((f) => f.slice(staticDir.length).split(path.sep).join('/'))
    .filter((p) => !p.startsWith('/docs/') && !p.includes('.bak') && !p.endsWith('bookmarklet.js') && !p.endsWith('index.html'));
  return ['/', '/index.html', ...files.sort()];
}
export function renderBlock(list) { return 'const PRECACHE = [\n' + list.map((u) => "  '" + u + "'").join(',\n') + '\n];'; }

const re = /const PRECACHE = \[[\s\S]*?\n\];/;
export function currentSw() { return fs.readFileSync(swPath, 'utf8'); }
export function upToDate() { return currentSw().match(re)[0] === renderBlock(precacheList()); }

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--check')) {
    if (!upToDate()) { console.error('sw.js PRECACHE is out of date: run node scripts/gen-sw-precache.mjs and bump SW_VERSION'); process.exit(1); }
    console.log('sw.js PRECACHE is up to date');
  } else {
    fs.writeFileSync(swPath, currentSw().replace(re, renderBlock(precacheList())));
    console.log('sw.js PRECACHE rewritten');
  }
}
