// Browser smoke checks for the Continuum PWA (backlog checklist, SONNET-FINAL-BACKLOG.md).
//
//   node modules/experience-pwa/tests/smoke.mjs
//
// Starts service.py on :8002 (unless one is already answering), drives the app
// with Playwright + Chromium against the built-in demo dataset, prints
// PASS/FAIL per check and exits 1 on any failure. Each scenario gets a fresh
// browser context, so localStorage state never leaks between scenarios.
//
// Env: PLAYWRIGHT_MODULE (path to the playwright package), PLAYWRIGHT_CHROMIUM
// (path to a chromium binary), BASE_URL (skip starting a server), KEEP_SHOTS=dir.
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const moduleDir = path.resolve(here, '..');
const require = createRequire(import.meta.url);

function loadPlaywright() {
  const candidates = [process.env.PLAYWRIGHT_MODULE, 'playwright', '/opt/node-tools/node_modules/playwright'].filter(Boolean);
  for (const c of candidates) { try { return require(c); } catch (e) { /* try next */ } }
  console.error('playwright not found. Set PLAYWRIGHT_MODULE or `npm i -D playwright`.');
  process.exit(2);
}
const { chromium } = loadPlaywright();
const chromiumPath = process.env.PLAYWRIGHT_CHROMIUM || (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
const BASE = process.env.BASE_URL || 'http://localhost:8002';
const SHOTS = process.env.KEEP_SHOTS;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

// ---------------------------------------------------------------- reporting
const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok: !!ok });
  console.log(`${ok ? 'PASS' : 'FAIL'} | ${name}${detail ? ' | ' + detail : ''}`);
};

// ------------------------------------------------------------------- server
async function up() { try { return (await fetch(BASE + '/app')).ok; } catch (e) { return false; } }
let server = null;
async function startServer() {
  if (await up()) return;
  if (process.env.BASE_URL) throw new Error('BASE_URL not reachable: ' + BASE);
  server = spawn('python3', ['service.py'], { cwd: moduleDir, stdio: 'ignore' });
  for (let i = 0; i < 40; i++) { if (await up()) return; await new Promise((r) => setTimeout(r, 250)); }
  throw new Error('service.py did not start');
}

// ------------------------------------------------------------------ helpers
const PERSONA = 'select[title="Switch persona view"]';
const timeline = (p) => p.evaluate(() => (JSON.parse(localStorage.getItem('onion_db_state') || '{}').timeline) || []);
const stagedRows = async (p) => (await timeline(p)).filter((x) => x.syncStatus === 'pending_processing');
const cards = (p) => p.locator('[id^="tl-"]');
const shot = (p, n) => (SHOTS ? p.screenshot({ path: path.join(SHOTS, n + '.png') }) : null);
const sleep = (p, ms) => p.waitForTimeout(ms);

async function fresh(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.message.slice(0, 200)));
  await p.goto(BASE + '/app');
  await p.waitForSelector('[id^="tl-"]', { timeout: 15000 });
  return { ctx, p, errors };
}
async function closeDrawer(p) { await p.click('#harvester-backdrop', { position: { x: 100, y: 500 } }).catch(() => {}); await sleep(p, 400); }
async function stageAndRun(p, text) {
  await p.click('#harvester-open-btn'); await sleep(p, 600);
  await p.fill('#datapark-raw', text);
  await p.click('text=Stage to Data Park'); await sleep(p, 600);
  const stagedLabel = await p.locator('button:has-text("Run AI Processing Engine")').innerText();
  await p.click('button:has-text("Run AI Processing Engine")'); await sleep(p, 4500);
  return stagedLabel;
}

// ---------------------------------------------------------------- scenarios
const scenarios = {
  async 'personas and navigation'({ p, errors }) {
    for (const who of ['Walter', 'Malcolm', 'Daniel', 'Brené']) {
      await p.selectOption(PERSONA, who); await sleep(p, 500);
      check(`persona ${who}: UI intact, no page error`, (await p.innerText('body')).length > 800 && !errors.length, errors.join(' | '));
    }
    await p.click('text=Lantern-202'); await sleep(p, 400);
    check('project click keeps UI', (await p.innerText('body')).includes('Lantern-202') && !errors.length);
  },

  async 'card feed'({ p, errors }) {
    const body = await p.innerText('body');
    const pcts = [...body.matchAll(/\((\d+)%\)/g)].map((m) => m[1]);
    check('model % varies per card (not static 63)', new Set(pcts).size > 1, 'values=' + pcts.join(','));
    check('evidence sentence: "Evidence strength: <tier> — …"', /Evidence strength: (High|Medium|Low) — /.test(body));
    check('single source reads "not yet corroborated"', /1 source \([^)]+\), not yet corroborated/.test(body));
    check('footer shows Local and Vector status', /Local:\s*\S+\s*\|\s*Vector:\s*\S+/.test(body));
    check('YOUR NOTES sync shows "Nothing pending"', /Nothing pending/.test(body));

    // sort: updated_at descending
    const state = await timeline(p);
    const ids = await cards(p).evaluateAll((els) => els.map((e) => e.id.replace(/^tl-/, '')));
    const times = ids.map((id) => { const c = state.find((x) => String(x.id) === id); return c ? new Date(c.updated_at || c.created_at || 0).getTime() : 0; });
    check('status cards sorted by updated_at desc', ids.length > 1 && times.every((t, i) => i === 0 || times[i - 1] >= t), `n=${ids.length}`);

    const card = cards(p).first();
    await card.locator('button:text-is("+")').click(); await sleep(p, 400);
    check('expanded card shows Provenance with link count', /Provenance — \d+ link/.test(await card.innerText()));
    // pills
    await card.locator('button:has-text("RAW")').first().click(); await sleep(p, 250);
    await card.locator('button:has-text("AI")').first().click(); await sleep(p, 250);
    check('RAW/AI pill clicks do not crash', !errors.length, errors.join(' | '));

    await p.click('text=Collapse All'); await sleep(p, 250);
    check('Collapse All works', !errors.length);
    check('no page errors', !errors.length, errors.join(' | '));
  },

  async 'card options menu'({ p, errors }) {
    await p.selectOption(PERSONA, 'Malcolm'); await sleep(p, 500);
    const card = cards(p).first();
    await card.locator('button[aria-label="Card options"]').click(); await sleep(p, 250);
    const items = await card.locator('button:has-text("Edit Details"), button:has-text("Delete")').evaluateAll((bs) => bs.map((b) => ({ t: b.innerText, h: Math.round(b.getBoundingClientRect().height), dis: b.disabled })));
    check('owner sees enabled Edit Details + Delete', items.length === 2 && items.every((i) => !i.dis), JSON.stringify(items));
    check('menu rows are single-line (not wrapped)', items.every((i) => i.h < 40), JSON.stringify(items.map((i) => i.h)));
    await p.click('button:has-text("Edit Details")'); await sleep(p, 400);
    check('Edit Details opens the editor', /Save|Cancel/.test(await card.innerText()));
    await p.locator('button:has-text("Cancel")').first().click().catch(() => {});

    await p.selectOption(PERSONA, 'Walter'); await sleep(p, 500);
    await cards(p).first().locator('button[aria-label="Card options"]').click(); await sleep(p, 250);
    check('non-owner: Edit Details disabled', await p.locator('button:has-text("Edit Details")').first().isDisabled());
    check('no page errors', !errors.length, errors.join(' | '));
  },

  async 'multi-source confidence sentence'({ p, errors }) {
    const id = await p.evaluate(async () => {
      const s = JSON.parse(window.__continuumRepo.getRaw());
      const c = s.timeline.find((x) => /refresh the Beacon-201 onboarding/.test(x.title));
      const at = new Date().toISOString();
      c.nodes = (c.nodes || []).concat([
        { kind: 'RAW', text: 'Salesforce amount updated', source: 'Salesforce', author: 'Malcolm', at },
        { kind: 'RAW', text: 'Client email confirming', source: 'Outlook Mail', author: 'Malcolm', at }]);
      window.__continuumRepo.setRaw(JSON.stringify(s)); await window.__continuumRepo.flush();
      return c.id;
    });
    await p.reload(); await p.waitForSelector('#tl-' + id); await sleep(p, 600);
    await p.selectOption(PERSONA, 'Malcolm'); await sleep(p, 500);
    const t = await p.locator('#tl-' + id).innerText();
    check('3 sources → "3 sources fused, validated via Salesforce"', /3 sources fused, validated via Salesforce/.test(t));
    check('sources listed "A + B + C"', /Sources: .+ \+ .+ \+ .+/.test(t));
    check('no page errors', !errors.length, errors.join(' | '));
  },

  async 'harvester: stage, run AI, review & merge, approve'({ p, errors }) {
    await p.click('#harvester-open-btn'); await sleep(p, 600);
    const w = await p.evaluate(() => ({ panel: Math.round(document.getElementById('harvester-control-panel').getBoundingClientRect().width), bg: getComputedStyle(document.getElementById('harvester-backdrop')).backgroundColor }));
    check('Harvester drawer is 40vw (640px @1600)', w.panel === 640, JSON.stringify(w));
    check('backdrop dim is 30%', /0\.3\)/.test(w.bg), w.bg);
    await closeDrawer(p);

    const text = 'Walter: refresh the Beacon-201 onboarding pack before the new lead joins; call Dana on 555-123-4567 to confirm the two decision records and release 2 plan.';
    const label = await stageAndRun(p, text);
    check('after Stage: button shows STAGED(1)', /STAGED\(1\)/.test(label), label);

    const rows = await stagedRows(p);
    check('staged row stored as pending_processing', rows.length === 1);
    check('staged title + body PII-redacted (phone)', rows.length === 1 && !/555-123-4567/.test(rows[0].title || '') && !/555-123-4567/.test(rows[0].content || rows[0].detail || ''), (rows[0] || {}).title);
    check('staged author is the selected persona (not System)', rows.length === 1 && rows[0].author === 'Brené', 'author=' + (rows[0] || {}).author);
    check('staged item hidden from main feed', !(await p.evaluate((id) => !!document.getElementById('tl-' + id), rows[0] && rows[0].id)));

    const label2 = await p.locator('button:has-text("Run AI Processing Engine")').innerText();
    const hdr = (await p.innerText('body')).match(/Data Park staged \(\d+\)/);
    check('Run AI clears STAGED counter and staged list', !/STAGED/.test(label2) && !hdr, `btn="${label2}" hdr=${hdr}`);
    check('item still safe in storage until Approve', (await stagedRows(p)).length === 1);
    const hb = await p.innerText('body');
    check('review queue shows Smart Append match', /ready for review/.test(hb) && /Smart Append/.test(hb));

    await closeDrawer(p);
    const banner = p.locator('[id^="tl-"] >> text=/similar update queued in Harvester/');
    check('target card shows queued "Review & Merge" banner', (await banner.count()) === 1);
    await shot(p, 'queued-banner');
    await p.click('button:has-text("Review & Merge")'); await sleep(p, 1300);
    const vis = await p.evaluate(() => { const e = document.getElementById('harvester-review-queue'); const r = e && e.getBoundingClientRect(); return { open: document.getElementById('harvester-control-panel').classList.contains('open'), inView: !!r && r.top >= 0 && r.top < innerHeight }; });
    check('Review & Merge opens drawer and scrolls to queue', vis.open && vis.inView, JSON.stringify(vis));

    await p.locator('button:has-text("Approve")').last().click(); await sleep(p, 1400);
    check('after Approve: nothing left staged', (await stagedRows(p)).length === 0);
    await closeDrawer(p);
    check('banner clears after Approve', (await p.locator('text=/similar update queued in Harvester/').count()) === 0);
    const pa = (await timeline(p)).filter((x) => Array.isArray(x.pendingAppends) && x.pendingAppends.length);
    check('smart append stored on existing card as pending append', pa.length > 0, pa.map((x) => x.author + ' <- ' + x.pendingAppends.map((a) => a.author)).join(';'));
    check('no page errors', !errors.length, errors.join(' | '));
  },

  async 'privacy of pending appends + guide'({ p, errors }) {
    await p.selectOption(PERSONA, 'Walter'); await sleep(p, 400);
    await stageAndRun(p, 'Walter: refresh the Beacon-201 onboarding pack before the new lead joins; confirm the two decision records and release 2 plan.');
    await p.locator('button:has-text("Approve")').last().click(); await sleep(p, 1400);
    await closeDrawer(p);
    const amber = async (who) => { await p.selectOption(PERSONA, who); await sleep(p, 600); return p.locator('[id^="tl-"] button[title*="staged updates"]').count(); };
    check('author (Walter) sees the staged-update banner', (await amber('Walter')) === 1);
    for (const who of ['Malcolm', 'Brené', 'Daniel']) check(`${who} does not see Walter's private draft`, (await amber(who)) === 0);

    await p.click('button:text-is("Guide")'); await sleep(p, 700);
    const g = await p.evaluate(() => { const a = document.querySelector('aside[aria-label="Continuum Guide panel"]'); return { w: Math.round(a.getBoundingClientRect().width), bg: getComputedStyle(a.parentElement).backgroundColor }; });
    check('Guide slider is 40vw (640px @1600)', g.w === 640, JSON.stringify(g));
    check('Guide backdrop dim is 30%', /0\.3\)/.test(g.bg), g.bg);
    check('no page errors', !errors.length, errors.join(' | '));
  },

  // PRV-01/02: No AI by default; remote AI needs consent and a session-only key.
  async 'privacy: no-AI default and session-only keys'({ p, errors }) {
    const requests = [];
    p.on('request', (r) => { if (/openrouter\.ai|anthropic\.com/.test(r.url())) requests.push(r.url()); });
    await p.click('#harvester-open-btn'); await sleep(p, 500);
    await p.click('button[title="AI configuration"]'); await sleep(p, 300);
    check('default provider is No AI', (await p.inputValue('#ai-provider')) === 'none');
    check('status says everything stays on the device', /stays on this device/.test(await p.innerText('#ai-status')));
    await p.selectOption('#ai-provider', 'openrouter'); await sleep(p, 300);
    const d = await p.innerText('#ai-disclosure');
    check('disclosure names destination and data sent', /openrouter\.ai/.test(d) && /What is sent/.test(d), d.slice(0, 120));
    check('not used until consent is given', /not confirmed/.test(await p.innerText('#ai-status')));
    await p.check('#ai-ack'); await p.fill('#ai-key', 'sk-smoke-test-key'); await p.click('#ai-key-save'); await sleep(p, 300);
    check('status shows provider on after consent and key', /OpenRouter is on/.test(await p.innerText('#ai-status')));
    const stored = await p.evaluate(() => ({
      local: Object.entries(localStorage).some(([k, v]) => /sk-smoke-test-key/.test(k + v)),
      sessionHas: Object.entries(sessionStorage).some(([k, v]) => /sk-smoke-test-key/.test(v)),
      shown: document.body.innerText.includes('sk-smoke-test-key'),
    }));
    check('key is not in localStorage', !stored.local);
    check('key is held for the session only', stored.sessionHas);
    check('key is never shown again', !stored.shown);
    await p.click('#ai-key-clear'); await sleep(p, 300);
    check('removing the key turns remote AI off', /no key is set/.test(await p.innerText('#ai-status')));
    check('no request went to an AI provider', requests.length === 0, requests.join(','));
    check('no page errors', !errors.length, errors.join(' | '));
  },

  // DAT-01: export, wipe, restore in a real browser, no network needed.
  async 'backup: export then restore round trip'({ p, errors }) {
    const count = () => p.evaluate(() => JSON.parse(localStorage.getItem('onion_db_state')).timeline.length);
    const before = await count();
    await p.click('#harvester-open-btn'); await sleep(p, 500);
    const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#backup-export')]);
    const file = path.join(os.tmpdir(), 'smoke-backup-' + Date.now() + '.json');
    await dl.saveAs(file);
    await p.evaluate(async () => { const s = JSON.parse(window.__continuumRepo.getRaw()); s.timeline = []; window.__continuumRepo.setRaw(JSON.stringify(s)); await window.__continuumRepo.flush(); });
    check('state wiped before restore', (await count()) === 0);
    await p.reload(); await p.waitForSelector('#harvester-open-btn'); await p.click('#harvester-open-btn'); await sleep(p, 500);
    await p.setInputFiles('#backup-file', file); await p.waitForSelector('#backup-preview');
    await p.check('input[name="backup-mode"] >> nth=1'); // Replace
    p.once('dialog', (d) => d.accept());
    await p.click('#backup-restore');
    await p.waitForSelector('[id^="tl-"]', { timeout: 15000 });
    await sleep(p, 800);
    check('restore brings back every card', (await count()) === before, `before=${before}`);
    const snaps = await p.evaluate(() => Object.keys(localStorage).filter((k) => k.indexOf('onion_preimport_backup_') === 0).length);
    check('safety copy kept before restore', snaps === 1, 'snaps=' + snaps);
    check('no API key in backup file', !/api[_-]?key/i.test(fs.readFileSync(file, 'utf8')));
    check('no page errors', !errors.length, errors.join(' | '));
  },

  // DAT-05: reset/clear are explicit, explain themselves, and cancel changes nothing.
  async 'destructive: reset and clear need confirmation'({ p, errors }) {
    const raw = () => p.evaluate(() => localStorage.getItem('onion_db_state'));
    const before = await raw();
    await p.click('#harvester-open-btn'); await sleep(p, 500);
    await p.click('button[title="AI configuration"]'); await sleep(p, 300);
    await p.click('button:has-text("Reset Demo Dataset")');
    await p.waitForSelector('#confirm-dialog');
    const t = await p.innerText('#confirm-dialog');
    check('reset dialog states what will be removed', /replaces your current data \(\d+ cards/.test(t), t.slice(0, 160));
    await p.click('#confirm-cancel'); await sleep(p, 300);
    check('cancel closes dialog and leaves data unchanged', (await p.locator('#confirm-dialog').count()) === 0 && (await raw()) === before);
    await p.click('#clear-all-btn'); await p.waitForSelector('#confirm-dialog');
    check('clear-all confirm is disabled until the phrase is typed', await p.locator('#confirm-go').isDisabled());
    await p.fill('#confirm-phrase', 'delete all data');
    check('wrong-case phrase keeps it disabled', await p.locator('#confirm-go').isDisabled());
    await p.click('#confirm-cancel'); await sleep(p, 300);
    check('data still unchanged after abandoned clear', (await raw()) === before);
    await p.click('#clear-all-btn'); await p.waitForSelector('#confirm-dialog');
    await p.uncheck('#confirm-backup');
    await p.fill('#confirm-phrase', 'DELETE ALL DATA');
    await p.click('#confirm-go');
    await p.waitForFunction(() => { try { return JSON.parse(localStorage.getItem('onion_db_state')).timeline.length === 0; } catch (e) { return false; } }, null, { timeout: 10000 });
    check('typed phrase clears all data', true);
    check('no page errors', !errors.length, errors.join(' | '));
  },

  // DAT-02: damaged saved data is kept, reported, and never overwritten.
  async 'storage: corrupt state shows banner and is preserved'({ p, errors }) {
    const damaged = '{"timeline":[{"id":"precious"';
    await p.evaluate(async (raw) => { window.__continuumRepo.setRaw(raw); await window.__continuumRepo.flush(); }, damaged);
    await p.reload(); await p.waitForSelector('.storage-banner', { timeout: 15000 });
    const banner = await p.innerText('.storage-banner');
    check('banner explains the problem in plain language', /could not be read/.test(banner) && /Download recovery file/.test(banner), banner);
    const kept = await p.evaluate(() => ({
      orig: localStorage.getItem('onion_db_state'),
      copies: Object.keys(localStorage).filter((k) => k.indexOf('onion_db_corrupt_') === 0).length,
    }));
    check('damaged data left untouched', kept.orig === damaged);
    check('one recovery copy retained', kept.copies === 1, JSON.stringify(kept));
    check('no page errors', !errors.length, errors.join(' | '));
  },
  'persistent storage status (DAT-04)': async ({ p, errors }) => {
    await p.click('#harvester-open-btn'); await sleep(p, 600);
    const t = await p.evaluate(() => (document.querySelector('#persist-status') || {}).textContent || '');
    check('persistence status is shown in plain language', /storage is protected|not protected|cannot tell/.test(t), t);
    check('no page errors', !errors.length, errors.join(' | '));
  },
  'RAID import wizard (IMP-02/03)': async ({ p, errors }) => {
    await p.click('#harvester-open-btn'); await sleep(p, 600);
    const csv = (rows) => ({ name: 'raid.csv', mimeType: 'text/csv', buffer: Buffer.from(rows.join('\n')) });
    const input = p.locator('input[type=file]').nth(1);
    // Older template: different headers, one row with an impossible RAID type.
    await input.setInputFiles(csv(['Raised,Category,Risk Description,Likelihood,Owner', '05-10-2026,Risk,Vendor may slip,0.7,Sam', '06-10-2026,Wish,Not a RAID type,0.2,Sam']));
    await p.waitForSelector('#import-wizard', { timeout: 5000 });
    await p.waitForSelector('#import-mapping', { timeout: 5000 }).catch(() => {});
    const map = await p.evaluate(() => (document.getElementById('import-wizard') || {}).innerText || '');
    check('older headers matched without manual work', /Known variant/.test(map) && await p.locator('#import-missing').count() === 0, map.replace(/\s+/g, ' ').slice(0, 300));
    check('bad RAID type blocks the whole import', await p.locator('#import-errors').count() === 1 && await p.locator('#import-confirm').isDisabled());
    await p.click('#import-cancel'); await sleep(p, 300);
    await input.setInputFiles(csv(['Raised,Category,Risk Description,Likelihood,Owner', '05-10-2026,Risk,Vendor may slip,0.7,Sam']));
    await p.waitForSelector('#import-wizard');
    check('AI paste-in shows headers only', await (async () => { await p.click('#import-ai-toggle'); const t = await p.inputValue('#import-ai-prompt'); return t.includes('Likelihood') && !t.includes('Vendor may slip'); })());
    await p.click('#import-confirm'); await sleep(p, 600);
    check('wizard closes after staging', await p.locator('#import-wizard').count() === 0);
    const t = await p.evaluate(() => document.getElementById('harvester-control-panel').innerText);
    check('rows staged privately with status message', /Staged 1 RAID rows/.test(t) && /private until approved/.test(t), t.slice(0, 80));
    check('no page errors', !errors.length, errors.join(' | '));
  },
  'GDP import (IMP-04)': async ({ p, errors }) => {
    await p.click('#harvester-open-btn'); await sleep(p, 600);
    const cols = ['Engagement Name','Account Name','GDP ID','Project ID','PeopleSoft Engagement ID','Delivery Model','Practice','Location of Delivery','Opportunity ID','SMP Link','Business Unit / BSV','Service Type','GDD','GDM','PrgM','EM / DL','BDM / AM / SAM','National Account Owner','OSG POA','OSG BOA','Sales Organization','Start Date','End Date','Phase','Status Date','Summary','Schedule','Schedule Comments','CSAT','CSAT Comments','Budget','Budget Comments','Engagement Risk','Engagement Risk Comments','Resources','Resources Comments','Status Indicator','Risk Profile','Risk Survey Date','Security Profile Date','Engagement Status','Target Technology Platform'];
    const row = (o) => cols.map((c) => o[c] || '').join(',');
    const file = (h, rows) => ({ name: 'gdp.csv', mimeType: 'text/csv', buffer: Buffer.from([h.join(','), ...rows].join('\n')) });
    const input = p.locator('input[type=file]').nth(0);
    await input.setInputFiles(file(cols.map((c) => (c === 'Status Date' ? 'Status Dt' : c)), [row({ 'Project ID': '7302010' })]));
    await p.waitForSelector('#import-wizard');
    await p.waitForSelector('#import-missing', { timeout: 5000 }).catch(() => {});
    check('renamed required header is reported and blocks import', await p.locator('#import-missing').count() === 1 && await p.locator('#import-confirm').isDisabled());
    await p.click('#import-cancel'); await sleep(p, 300);
    await input.setInputFiles(file(cols, [
      row({ 'Project ID': '7302010', 'Opportunity ID': 'O-730201', 'GDP ID': '7302', 'Status Date': '01/10/2026', Summary: 'On track', 'Status Indicator': 'Green' }),
      row({ 'Project ID': '555', 'Opportunity ID': 'O-1', 'GDP ID': '9', 'Status Date': '01/10/2026', Summary: 'Other', 'Status Indicator': 'Red' }),
    ]));
    await p.waitForSelector('#import-note-0', { timeout: 5000 });
    const notes = await p.evaluate(() => [0, 1, 2].map((i) => document.getElementById('import-note-' + i).textContent));
    check('matched, other-project and no-ID rows are counted', /^1 rows match/.test(notes[0]) && /^1 rows belong to other/.test(notes[1]) && /^0 rows have no/.test(notes[2]), notes.join(' | '));
    await p.click('#import-confirm'); await sleep(p, 600);
    const t = await p.evaluate(() => document.getElementById('harvester-control-panel').innerText);
    check('only the matching row is staged, privately', /Staged 1 GDP rows/.test(t) && /private until approved/.test(t), t.slice(0, 80));
    check('no page errors', !errors.length, errors.join(' | '));
  },
  'PWA install and offline start (PWA-01/02)': async ({ p, ctx, errors }) => {
    const mf = await p.evaluate(async () => { const r = await fetch('/manifest.webmanifest'); return { type: r.headers.get('content-type'), j: await r.json() }; });
    check('manifest served with its own type and icons load', /manifest\+json/.test(mf.type) && mf.j.icons.length >= 3);
    const icon = await p.evaluate(async () => (await fetch('/icons/icon-192.png')).status);
    check('icon is served', icon === 200);
    await p.evaluate(async () => { await navigator.serviceWorker.ready; });
    await p.reload(); await p.waitForSelector('[id^="tl-"]', { timeout: 15000 });
    const ctl = await p.evaluate(() => !!navigator.serviceWorker.controller);
    check('page is controlled by the service worker', ctl);
    const names = await p.evaluate(() => caches.keys());
    check('one versioned cache, precache filled', names.length === 1 && /^continuum-sw-v\d+$/.test(names[0]), names.join(','));
    const n = await p.evaluate(async () => (await (await caches.open((await caches.keys())[0])).keys()).length);
    check('app shell precached', n >= 40, String(n));
    await ctx.setOffline(true);
    await p.reload(); await p.waitForSelector('[id^="tl-"]', { timeout: 15000 }).catch(() => {});
    check('app starts offline with cards visible', (await p.locator('[id^="tl-"]').count()) > 0);
    await ctx.setOffline(false);
    check('no update banner when nothing changed', await p.locator('#update-banner').count() === 0);
  },
  'handover review gate (HND-01/02/03)': async ({ p, errors }) => {
    await p.click('text=Handover'); await p.waitForSelector('#ho-review', { timeout: 5000 });
    const btn = p.locator('button:has-text("Generate Interactive HTML Report")');
    check('export is locked until the review is confirmed', await btn.isDisabled());
    const sum = await p.innerText('#ho-review-summary');
    check('review summary counts approved items and what needs confirmation', /approved items/.test(sum) && /(need confirmation|Nothing waiting)/.test(sum), sum.slice(0, 120));
    await p.waitForFunction(() => !document.getElementById('ho-confirm').disabled, null, { timeout: 5000 });
    await p.check('#ho-confirm');
    check('confirmation is timestamped with a package hash', /Confirmed 20\d\d-.*package [0-9a-f]{12}/.test(await p.innerText('#ho-confirmed-at')));
    check('export unlocks after confirming', await btn.isEnabled());
    await p.fill('textarea[placeholder^="Transition notes"]', 'changed after review');
    await sleep(p, 600);
    check('changing the content cancels the confirmation', await btn.isDisabled() && !(await p.isChecked('#ho-confirm')));
    await p.check('#ho-confirm');
    const [dl] = await Promise.all([p.waitForEvent('download'), btn.click()]);
    const txt = fs.readFileSync(await dl.path(), 'utf8');
    check('exported file carries who confirmed, when, and the hash', /Reviewed and confirmed by/.test(txt) && /Package hash [0-9a-f]{16}/.test(txt));
    check('empty sections read Not found', /<em>Not found<\/em>/.test(txt));
    const [zd] = await Promise.all([p.waitForEvent('download'), p.click('#ho-package')]);
    const zip = fs.readFileSync(await zd.path());
    const names = ['handover.md', 'handover.html', 'handover.json', 'sources.csv', 'manifest.json'];
    check('package is a zip with md, html, json, csv and manifest', zip.readUInt32LE(0) === 0x04034b50 && names.every((n) => zip.includes(Buffer.from(n))), zd.suggestedFilename());
    check('statement ids appear in the exported html', /S-[0-9a-f]{10}/.test(txt));
    check('no page errors', !errors.length, errors.join(' | '));
  },
  'privacy screening (PRV-05)': async ({ p, errors }) => {
    await p.click('#harvester-open-btn'); await sleep(p, 600);
    // import preview states what will be redacted and that emails stay
    const csv = ['Raised,Type,Description,Owner', '05-10-2026,Risk,Call 555-123-4567 about the vendor,me@client.example'].join('\n');
    await p.locator('input[type=file]').nth(1).setInputFiles({ name: 'raid.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });
    await p.waitForSelector('#import-redactions', { timeout: 5000 });
    const t = await p.innerText('#import-redactions');
    check('import preview lists redactions and kept emails', /1 phone number will be redacted/.test(t) && /email address is kept on purpose/.test(t), t);
    await p.click('#import-confirm'); await sleep(p, 600);
    const st = await p.evaluate(() => JSON.parse(localStorage.getItem('onion_db_state') || '{}'));
    const raw = JSON.stringify(st);
    check('redacted text is what is stored', !raw.includes('555-123-4567'));
    const orig = await p.evaluate(() => localStorage.getItem('continuum_pii_originals') || '');
    check('protected original is retained on this device only', orig.includes('555-123-4567'));
    // custom word via settings
    await p.click('button[title="AI configuration"]'); await sleep(p, 400);
    await p.click('#originals-show'); await sleep(p, 300);
    check('protected originals can be viewed on this device', (await p.innerText('#originals-list')).includes('555-123-4567'));
    await p.fill('#pii-words', 'padel');
    await p.fill('#pii-sample', 'padel on friday');
    check('own noise words apply in the live sample', /\[NOISE_FILTERED\] on friday/.test(await p.innerText('#pii-sample-out')));
    check('no page errors', !errors.length, errors.join(' | '));
  },
  'IndexedDB storage and one-time migration (DAT-03)': async ({ p, ctx, errors }) => {
    const mode = await p.evaluate(() => window.__continuumRepo.mode());
    check('fresh browser stores data in IndexedDB', mode === 'idb', mode);
    const legacy = { clients: [{ name: 'Legacy Co' }], projects: [{ Project_ReferenceID: 'LEG-O-1-010126000000', project_name: 'Legacy-1', client_name: 'Legacy Co', opportunity_numbers: ['O-1'], project_ids: ['1'], active: true, created_at: '2099-01-01T00:00:00Z' }],
      timeline: [{ id: 'legacy-card', Project_ReferenceID: 'LEG-O-1-010126000000', project_name: 'Legacy-1', projectId: 'Legacy-1', title: 'Legacy migrated card', content: 'from localStorage', type: 'Chat', privacy: 'Team Shared', syncStatus: 'pending_upload', author: 'Brené', created_at: '2026-01-01T00:00:00Z' }], notes: [], archived: [] };
    const c2 = await ctx.browser().newContext({ viewport: { width: 1600, height: 1000 } });
    const q = await c2.newPage(); const errs = [];
    q.on('pageerror', (e) => errs.push(e.message.slice(0, 200)));
    await q.addInitScript((st) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('onion_db_state', JSON.stringify(st)); sessionStorage.setItem('seeded', '1'); } }, legacy);
    await q.goto(BASE + '/app'); await q.waitForSelector('[id^="tl-"]', { timeout: 15000 });
    const boot = await q.evaluate(() => window.__continuumRepo.boot);
    check('existing localStorage data is migrated once', boot.mode === 'idb' && boot.migrated === true, JSON.stringify(boot));
    check('card survived the migration', (await q.innerText('body')).includes('Legacy migrated card'));
    const bk = await q.evaluate(() => Object.keys(localStorage).filter((k) => k.indexOf('onion_db_state_premigrate_') === 0).length);
    check('dated localStorage backup is kept', bk === 1, String(bk));
    const inIdb = await q.evaluate(() => new Promise((res) => { const r = indexedDB.open('continuum-db'); r.onsuccess = () => { const g = r.result.transaction('kv').objectStore('kv').get('state'); g.onsuccess = () => res(String(g.result || '').includes('Legacy migrated card')); }; r.onerror = () => res(false); }));
    check('state is in IndexedDB', inIdb);
    await q.reload(); await q.waitForSelector('[id^="tl-"]', { timeout: 15000 });
    const boot2 = await q.evaluate(() => window.__continuumRepo.boot);
    check('second boot does not migrate again and keeps the data', boot2.migrated === false && (await q.innerText('body')).includes('Legacy migrated card'));
    // A full localStorage must not stop saving.
    await q.evaluate(() => { const junk = 'x'.repeat(1024 * 256); let i = 0; try { for (;;) localStorage.setItem('junk' + (i++), junk); } catch (e) { /* full */ } });
    await q.evaluate(async () => { const s = JSON.parse(window.__continuumRepo.getRaw()); s.notes.push({ id: 'big-note', title: 'saved while storage full', content: 'x', project_name: 'Legacy-1', Project_ReferenceID: 'LEG-O-1-010126000000', privacy: 'Team Shared', created_at: new Date().toISOString() }); window.__continuumRepo.setRaw(JSON.stringify(s)); await window.__continuumRepo.flush(); });
    await q.reload(); await q.waitForSelector('[id^="tl-"]', { timeout: 15000 });
    const kept = await q.evaluate(() => (window.__continuumRepo.getRaw() || '').includes('saved while storage full'));
    check('changes are still saved when localStorage is full', kept);
    check('no storage warning shown', await q.locator('.storage-banner').count() === 0);
    check('no page errors', !errors.length && !errs.length, errors.concat(errs).join(' | '));
    await c2.close();
  },
  'readable typography (HUI-01)': async ({ p, errors }) => {
    for (const [w, h] of [[1366, 768], [1920, 1080]]) {
      await p.setViewportSize({ width: w, height: h });
      await p.click('#harvester-open-btn'); await sleep(p, 500);
      const r = await p.evaluate(() => {
        let small = 0; const ex = [];
        const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        while (walk.nextNode()) {
          const n = walk.currentNode; if (!n.textContent.trim()) continue;
          const el = n.parentElement; if (!el || !el.getClientRects().length) continue;
          const cs = getComputedStyle(el); if (cs.visibility === 'hidden') continue;
          if (parseFloat(cs.fontSize) * (parseFloat(cs.zoom) || 1) < 12 && parseFloat(cs.fontSize) < 12) { small++; if (ex.length < 3) ex.push(el.tagName + ':' + n.textContent.trim().slice(0, 20)); }
        }
        const short = [...document.querySelectorAll('button')].filter((b) => b.getClientRects().length && b.getBoundingClientRect().height < 30).length;
        return { small, ex, short, hscroll: document.documentElement.scrollWidth > innerWidth + 1 };
      });
      check(`${w}x${h}: no visible text under 12px`, r.small === 0, JSON.stringify(r.ex));
      check(`${w}x${h}: no horizontal scroll`, !r.hscroll);
      check(`${w}x${h}: buttons at least 30px tall`, r.short === 0, String(r.short));
      await closeDrawer(p);
    }
    check('no page errors', !errors.length, errors.join(' | '));
  },
  'record as decision (KNW-02)': async ({ p, errors }) => {
    await p.goto(BASE + '/app'); await p.waitForSelector('[id^="tl-"]', { timeout: 15000 });
    const first = cards(p).first();
    await first.locator('button[aria-label="Card options"]').click(); await sleep(p, 250);
    p.once('dialog', (d) => d.accept('Client agreed in the steering call'));
    await p.click('button:has-text("Record as decision")'); await sleep(p, 600);
    const body = await first.innerText();
    check('card shows who recorded the decision', /Decision · /.test(body), body.slice(0, 160));
    await first.locator('button[aria-label="Card options"]').click(); await sleep(p, 250);
    check('menu now offers to clear it', await p.locator('button:has-text("Clear decision")').count() === 1);
    check('no page errors', !errors.length, errors.join(' | '));
  },
  'diagnostics log (OPS-01/02)': async ({ p, errors }) => {
    await p.goto(BASE + '/app'); await p.waitForSelector('[id^="tl-"]', { timeout: 15000 });
    await p.click('#harvester-open-btn'); await sleep(p, 600);
    await p.click('#diag-preview'); await p.waitForSelector('#diag-text', { timeout: 3000 });
    const t = await p.inputValue('#diag-text');
    check('diagnostics preview shows events, not content', /app\.start/.test(t) && !/Beacon|Apollo|@/.test(t), t.slice(0, 200));
    const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#diag-download')]);
    check('diagnostics download is the previewed JSON', JSON.parse(fs.readFileSync(await dl.path(), 'utf8')).format === 'continuum-diagnostics');
    check('no page errors', !errors.length, errors.join(' | '));
  },
  'card hierarchy flag (HUI-03)': async ({ p, errors }) => {
    await p.goto(BASE + '/app'); await p.waitForSelector('[id^="tl-"]', { timeout: 15000 });
    const before = await p.evaluate(() => ({ attr: document.documentElement.getAttribute('data-layout'), n: document.querySelectorAll('[id^="tl-"]').length, t: parseFloat(getComputedStyle(document.querySelector('.onion-card-title')).fontSize) }));
    check('layout flag is off by default', before.attr === null && before.t < 16, JSON.stringify(before));
    await p.evaluate(() => localStorage.setItem('continuum_layout', 'hierarchy'));
    await p.reload(); await p.waitForSelector('[id^="tl-"]', { timeout: 15000 }); await sleep(p, 400);
    const after = await p.evaluate(() => ({ attr: document.documentElement.getAttribute('data-layout'), n: document.querySelectorAll('[id^="tl-"]').length, t: parseFloat(getComputedStyle(document.querySelector('.onion-card-title')).fontSize) }));
    check('flag on: title is larger and the same cards show', after.attr === 'hierarchy' && after.t >= 17 && after.n === before.n, JSON.stringify(after));
    await p.evaluate(() => localStorage.removeItem('continuum_layout'));
    check('no page errors', !errors.length, errors.join(' | '));
  },
  'RAID re-import diff (IMP-03 gap)': async ({ p, errors }) => {
    await p.goto(BASE + '/app'); await p.waitForSelector('[id^="tl-"]', { timeout: 15000 });
    await p.click('#harvester-open-btn'); await sleep(p, 600);
    const csv = (rows) => ({ name: 'raid-' + rows.length + '-' + Math.random().toString(16).slice(2, 6) + '.csv', mimeType: 'text/csv', buffer: Buffer.from(['Raised,Type,Description,Owner'].concat(rows).join('\n')) });
    const input = p.locator('input[type=file]').nth(1);
    await input.setInputFiles(csv(['05-10-2026,Risk,Reimport vendor slip,Sam', '06-10-2026,Issue,Reimport env down,Sam']));
    await p.waitForSelector('#import-confirm'); await p.click('#import-confirm'); await sleep(p, 600);
    await p.click('text=Approve & Add to Project'); await sleep(p, 1200);
    const kept = await p.evaluate(() => JSON.parse(window.__continuumRepo.getRaw()).timeline.filter((c) => c.type === 'RAID' && /Reimport/.test(c.title || c.content || '')).map((c) => ({ cat: c.category, src: !!c.importSourceId, key: !!c.rowKey, sync: c.syncStatus })));
    check('approved import rows become cards that keep category, source and row key', kept.length === 2 && kept.every((c) => c.cat === 'raid' && c.src && c.key && c.sync !== 'pending_processing'), JSON.stringify(kept));
    await input.setInputFiles(csv(['05-10-2026,Risk,Reimport vendor slip,Sam', '06-10-2026,Issue,Reimport env down,Pat', '07-10-2026,Risk,Reimport brand new,Sam']));
    await p.waitForSelector('#import-confirm'); await p.click('#import-confirm'); await sleep(p, 600);
    const t = await p.innerText('#harvester-status');
    check('re-import reports new, changed and unchanged counts', /1 new, 1 changed .*1 unchanged/.test(t), t.slice(0, 200));
    const body = await p.innerText('#harvester-control-panel');
    check('changed row is staged as an update on its existing card', /Smart Append/.test(body));
    check('no page errors', !errors.length, errors.join(' | '));
  },
};

// --------------------------------------------------------------------- main
let code = 0;
try {
  await startServer();
  const browser = await chromium.launch({ executablePath: chromiumPath });
  const only = process.argv[2];
  for (const [name, fn] of Object.entries(scenarios)) {
    if (only && !name.includes(only)) continue;
    console.log(`\n# ${name}`);
    const ctx = await fresh(browser);
    try { await fn(ctx); } catch (e) { check(`${name}: scenario threw`, false, String(e.message).split('\n')[0]); }
    await ctx.ctx.close();
  }
  await browser.close();
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) { console.log('FAILED:\n - ' + failed.map((f) => f.name).join('\n - ')); code = 1; }
} catch (e) {
  console.error('smoke run error:', e.message); code = 2;
} finally {
  if (server) server.kill();
}
process.exit(code);
