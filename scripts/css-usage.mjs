#!/usr/bin/env node
// CSS usage scan (HUI-04). Shows which classes the stylesheets define and which the app uses, and guards
// the rule "no generated CSS is deleted while active classes depend on it".
//   node scripts/css-usage.mjs            report: used, unused (candidates only), used but undefined
//   node scripts/css-usage.mjs --update   rewrite the baseline (docs/css-baseline.json)
//   node scripts/css-usage.mjs --check    fail if a class in the baseline lost its CSS definition
// Limit: only literal class names in className="...", class="..." and html strings are seen. Classes built
// at run time are not, so "unused" is a candidate list, never a delete list.
import { readFileSync, readdirSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const STATIC = join(ROOT, 'modules/experience-pwa/static');
const BASELINE = join(ROOT, 'docs/css-baseline.json');
const walk = (d, out = []) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) { if (f !== 'docs' && f !== 'vendor') walk(p, out); } else out.push(p); } return out; };
const files = walk(STATIC).filter((p) => !p.includes('.bak'));

export function definedClasses(css) {
  const out = new Set();
  const body = css.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const m of body.matchAll(/\.((?:\\.|[A-Za-z0-9_-])+)/g)) { const c = m[1].replace(/\\(.)/g, '$1'); if (/^-?[A-Za-z_]/.test(c)) out.add(c); }
  return out;
}
export function usedClasses(src) {
  const out = new Set();
  for (const m of src.matchAll(/class(?:Name)?\s*=\s*(?:"([^"]*)"|'([^']*)'|\{?`([^`]*)`)/g)) {
    (m[1] || m[2] || m[3] || '').replace(/\$\{[^}]*\}/g, ' ').split(/\s+/).forEach((c) => { if (c && /^[A-Za-z_-][A-Za-z0-9_:\-\[\]\/.#%]*$/.test(c)) out.add(c); });
  }
  return out;
}
const cssFiles = files.filter((p) => p.endsWith('.css'));
const srcFiles = files.filter((p) => /\.(js|html)$/.test(p));
const defined = new Set(); cssFiles.forEach((p) => definedClasses(readFileSync(p, 'utf8')).forEach((c) => defined.add(c)));
const used = new Set(); srcFiles.forEach((p) => usedClasses(readFileSync(p, 'utf8')).forEach((c) => used.add(c)));
const usedAndDefined = [...used].filter((c) => defined.has(c)).sort();
const usedUndefined = [...used].filter((c) => !defined.has(c)).sort();
const unused = [...defined].filter((c) => !used.has(c)).sort();

const mode = process.argv[2];
if (mode === '--update') {
  writeFileSync(BASELINE, JSON.stringify({ note: 'Classes used by the app that a stylesheet defines. node scripts/css-usage.mjs --check fails if one loses its definition.', classes: usedAndDefined }, null, 1) + '\n');
  console.log('Baseline written: ' + usedAndDefined.length + ' classes');
} else if (mode === '--check') {
  if (!existsSync(BASELINE)) { console.error('No baseline. Run: node scripts/css-usage.mjs --update'); process.exit(1); }
  const base = JSON.parse(readFileSync(BASELINE, 'utf8')).classes;
  const lost = base.filter((c) => !defined.has(c));
  if (lost.length) { console.error('CSS definitions removed while the app still depends on them (' + lost.length + '): ' + lost.slice(0, 20).join(', ')); process.exit(1); }
  console.log('CSS check passed (' + base.length + ' dependent classes still defined; ' + cssFiles.length + ' stylesheets: ' + cssFiles.map((p) => relative(STATIC, p)).join(', ') + ')');
} else {
  console.log('Stylesheets: ' + cssFiles.map((p) => relative(STATIC, p)).join(', '));
  console.log('Defined: ' + defined.size + '  Used (literal): ' + used.size + '  Used and defined: ' + usedAndDefined.length);
  console.log('Unused candidates (' + unused.length + '), first 30: ' + unused.slice(0, 30).join(' '));
  console.log('Used but not defined (' + usedUndefined.length + ', often JS hooks or ids), first 30: ' + usedUndefined.slice(0, 30).join(' '));
}
