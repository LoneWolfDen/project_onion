// js/core/appLink.js — cross-app project handover (World of Continuum).
// Contract: docs/APP_HANDOVER_CONTRACT.md. A link to a sibling app carries the active project's
// business identifiers in the URL fragment (#ctx=...), which browsers never send to a server.
// No card content, notes or people are ever put in the link.
import { projectIdEquals } from './schema.js';

export const CTX_VERSION = 1;
const MAX_LEN = 2048;
const MAX_LIST = 10;

const str = (v, n = 120) => String(v == null ? '' : v).trim().slice(0, n);
const list = (a) => (Array.isArray(a) ? a : a == null || a === '' ? [] : [a]).map((x) => str(x, 40)).filter(Boolean).slice(0, MAX_LIST);

export function gdpIdOf(project) {
  const p = project || {};
  if (p.gdp_id || p.gdpId) return str(p.gdp_id || p.gdpId, 20);
  const m = /project-details\/(\d+)/.exec(String(p.gdp_url || p.gdpUrl || (p.gdp_urls || [])[0] || ''));
  return m ? m[1] : '';
}

// The context Continuum sends for a project. `from` names the sending app.
export function contextFor(project, from = 'continuum', now = new Date()) {
  if (!project) return null;
  return {
    v: CTX_VERSION,
    from: str(from, 40),
    ref: str(project.Project_ReferenceID, 80),
    name: str(project.project_name, 80),
    client: str(project.client_name, 80),
    opp: list(project.opportunity_numbers),
    pid: list(project.project_ids),
    gdp: gdpIdOf(project),
    at: now.toISOString(),
  };
}

function b64urlEncode(text) {
  const bytes = new TextEncoder().encode(text);
  let bin = ''; bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64urlDecode(s) {
  const b = String(s).replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b + '==='.slice((b.length + 3) % 4));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

export function encodeContext(ctx) { return b64urlEncode(JSON.stringify(ctx)); }

// Returns a cleaned context or null. Anything unexpected is dropped, never trusted.
export function decodeContext(encoded) {
  try {
    if (!encoded || String(encoded).length > MAX_LEN) return null;
    const raw = JSON.parse(b64urlDecode(encoded));
    if (!raw || typeof raw !== 'object' || Number(raw.v) !== CTX_VERSION) return null;
    const ctx = { v: CTX_VERSION, from: str(raw.from, 40), ref: str(raw.ref, 80), name: str(raw.name, 80), client: str(raw.client, 80), opp: list(raw.opp), pid: list(raw.pid), gdp: str(raw.gdp, 20), at: str(raw.at, 40) };
    if (!ctx.ref && !ctx.opp.length && !ctx.pid.length && !ctx.gdp) return null;
    return ctx;
  } catch (e) { return null; }
}

// Link to a sibling app with the context in the fragment. Only http(s) addresses are accepted.
export function linkFor(baseUrl, ctx) {
  const base = String(baseUrl || '').trim();
  if (!/^https?:\/\//i.test(base)) return '';
  const clean = base.split('#')[0];
  return ctx ? clean + '#ctx=' + encodeContext(ctx) : clean;
}

// Reads ?ctx= or #ctx= from a location-like object.
export function readContext(loc) {
  const l = loc || {};
  const hash = String(l.hash || '').replace(/^#/, '');
  const fromHash = new URLSearchParams(hash).get('ctx');
  const fromQuery = new URLSearchParams(String(l.search || '')).get('ctx');
  return decodeContext(fromHash || fromQuery);
}

// Finds the project a context points to. Order: Continuum ref, project ID (leading zeros ignored),
// opportunity number, GDP ID. Names and clients are shown to the user but never used to match.
export function resolveProject(ctx, projects) {
  const all = (Array.isArray(projects) ? projects : []).filter(Boolean);
  if (!ctx) return { status: 'none', matches: [] };
  const norm = (s) => String(s || '').trim().toUpperCase();
  const tiers = [
    ['ref', (p) => !!ctx.ref && p.Project_ReferenceID === ctx.ref],
    ['project ID', (p) => ctx.pid.some((x) => (p.project_ids || []).some((y) => projectIdEquals(x, y)))],
    ['opportunity', (p) => ctx.opp.some((x) => (p.opportunity_numbers || []).some((y) => norm(x) === norm(y)))],
    ['GDP ID', (p) => !!ctx.gdp && gdpIdOf(p) === ctx.gdp],
  ];
  for (const [by, test] of tiers) {
    const m = all.filter(test);
    if (m.length === 1) return { status: 'matched', by, project: m[0], matches: m };
    if (m.length > 1) return { status: 'ambiguous', by, matches: m };
  }
  return { status: 'not_found', matches: [] };
}

export function describeContext(ctx) {
  if (!ctx) return '';
  const ids = [ctx.pid.length ? 'project ' + ctx.pid.join(', ') : '', ctx.opp.length ? ctx.opp.join(', ') : '', ctx.gdp ? 'GDP ' + ctx.gdp : ''].filter(Boolean).join(' · ');
  return (ctx.name || 'a project') + (ids ? ' (' + ids + ')' : '');
}

// Addresses of sibling apps. Codespaces and local ports change, so each device can override them.
export const APP_URLS_KEY = 'continuum_app_urls';
export function loadAppUrls(storage) { try { const v = JSON.parse(storage.getItem(APP_URLS_KEY) || '{}'); return v && typeof v === 'object' ? v : {}; } catch (e) { return {}; } }
export function saveAppUrls(storage, urls) {
  const out = {};
  Object.entries(urls || {}).forEach(([k, v]) => { const s = String(v || '').trim(); if (/^https?:\/\//i.test(s)) out[k] = s; });
  try { storage.setItem(APP_URLS_KEY, JSON.stringify(out)); } catch (e) { return null; }
  return out;
}
