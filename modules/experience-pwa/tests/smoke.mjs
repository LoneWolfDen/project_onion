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
    check('confidence sentence: "Model confidence: <tier> — …"', /Model confidence: (High|Medium|Low) — /.test(body));
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
    const id = await p.evaluate(() => {
      const s = JSON.parse(localStorage.getItem('onion_db_state'));
      const c = s.timeline.find((x) => /refresh the Beacon-201 onboarding/.test(x.title));
      const at = new Date().toISOString();
      c.nodes = (c.nodes || []).concat([
        { kind: 'RAW', text: 'Salesforce amount updated', source: 'Salesforce', author: 'Malcolm', at },
        { kind: 'RAW', text: 'Client email confirming', source: 'Outlook Mail', author: 'Malcolm', at }]);
      localStorage.setItem('onion_db_state', JSON.stringify(s));
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
    await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('onion_db_state')); s.timeline = []; localStorage.setItem('onion_db_state', JSON.stringify(s)); });
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
    await p.evaluate((raw) => localStorage.setItem('onion_db_state', raw), damaged);
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
