#!/usr/bin/env node
// Repo hygiene guard (FND-01/02/03). Fails if tracked files contain runtime
// databases, personal absolute paths, or key-shaped secrets.
// Run: node scripts/check-repo.mjs
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const files = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8', maxBuffer: 1 << 28 })
  .split('\0').filter(Boolean);

const problems = [];

// 1. Runtime state must never be tracked.
const RUNTIME = [/(^|\/)chroma_data\//, /\.sqlite3?$/i, /(^|\/)(data_level0|header|length|link_lists)\.bin$/];
for (const f of files) if (RUNTIME.some((re) => re.test(f))) problems.push(`runtime file tracked: ${f}`);

// 2. Content checks. Vendored libraries and this script are skipped.
const SKIP = [/(^|\/)vendor\//, /\.min\.js$/, /^scripts\/check-repo\.mjs$/, /\.(png|jpe?g|gif|ico|pdf|woff2?|bin)$/i];
const CONTENT = [
  ['personal absolute path', /\/Users\/[A-Za-z0-9._-]+\/|[A-Z]:\\(Hackathon|Users)\\/],
  ['private key', /-----BEGIN (RSA |EC |OPENSSH |)PRIVATE KEY-----/],
  ['AWS access key', /\bAKIA[0-9A-Z]{16}\b/],
  ['API key', /\bsk-(or-v1-|ant-)?[A-Za-z0-9_-]{24,}\b/],
];
for (const f of files) {
  if (SKIP.some((re) => re.test(f))) continue;
  let text;
  try { text = readFileSync(f, 'utf8'); } catch { continue; }
  if (text.includes('\0')) continue;
  const lines = text.split('\n');
  lines.forEach((line, i) => {
    if (line.length > 4000) return; // generated/minified blobs
    for (const [name, re] of CONTENT) if (re.test(line)) problems.push(`${name}: ${f}:${i + 1}`);
  });
}

if (problems.length) {
  console.error('Repo check failed:\n' + problems.map((p) => '  - ' + p).join('\n'));
  process.exit(1);
}
console.log(`Repo check passed (${files.length} tracked files).`);
