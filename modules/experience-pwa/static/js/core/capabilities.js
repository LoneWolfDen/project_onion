// js/core/capabilities.js — what this browser can do, and what the app can and cannot read (capability check).
// A web page cannot see Microsoft 365 licences or tenant permissions, so licences are declared by the
// person using the app and only tailor the advice below. Nothing here is sent anywhere.
export const DECLARED_KEY = 'onion_capability_declared';

// Each check reads a plain environment object so it can be tested without a browser.
export function detectBrowser(env = {}) {
  const yn = (v) => (v === undefined ? 'unknown' : v ? 'yes' : 'no');
  return [
    { id: 'secure', label: 'Secure context (HTTPS or localhost)', status: yn(env.secureContext), why: 'Needed for install, offline start and clipboard.' },
    { id: 'sw', label: 'Offline start (service worker)', status: yn(env.serviceWorker), why: 'The app opens without a network once loaded.' },
    { id: 'idb', label: 'Durable storage (IndexedDB)', status: yn(env.indexedDB), why: 'Your data lives in this browser profile.' },
    { id: 'persist', label: 'Storage protected from eviction', status: yn(env.persisted), why: 'If no, export a backup regularly.' },
    { id: 'installed', label: 'Installed as an app', status: yn(env.standalone), why: 'Optional. Chrome and Edge: Install; Safari: Add to Dock or Home Screen.' },
    { id: 'clipboard', label: 'Clipboard paste button', status: yn(env.clipboardRead), why: 'If no, use Ctrl/Cmd+V in the paste box.' },
    { id: 'files', label: 'File picker and drag-and-drop import', status: yn(env.fileInput), why: 'Excel, CSV, .eml and .vtt imports.' },
    { id: 'online', label: 'Network connection right now', status: yn(env.online), why: 'Only needed for an AI provider you choose.' },
    { id: 'vector', label: 'Local similarity search service', status: yn(env.vectorService), why: 'Optional. Exact-match search works without it.' },
    { id: 'ai', label: 'AI provider enabled', status: yn(env.aiEnabled), why: 'Off by default. Everything core works without it.' },
  ];
}

// The reading limits of a browser-only app. These do not depend on licences.
export const SOURCE_ACCESS = [
  { source: 'Teams channels and group chats', direct: 'Cannot read', how: 'Paste the text, or import the meeting transcript (.vtt).', needs: 'A live connection would need Microsoft Graph with Entra app consent from your tenant admin. Not built.' },
  { source: 'Teams meeting transcript or recap', direct: 'File or paste only', how: 'Download the .vtt and import it. Copilot recaps pasted in are labelled Inference.', needs: 'Transcription must be enabled in your meetings.' },
  { source: 'Outlook mail', direct: 'Cannot read', how: 'Save a message as .eml and import it, or paste it.', needs: 'A live connection would need Graph consent. Not built.' },
  { source: 'SharePoint and OneDrive files', direct: 'Cannot read', how: 'Download the Excel or CSV export and import it.', needs: 'Nothing; the file is read on your device only.' },
  { source: 'GDP status', direct: 'Export file only', how: 'Import the GDP export (fixed template).', needs: 'Access to run the export.' },
  { source: 'RAID log', direct: 'Export file only', how: 'Import the Excel or CSV log; older templates are matched by header.', needs: 'Nothing.' },
  { source: 'Microsoft 365 Copilot', direct: 'No connection', how: 'Copy approved text out, paste the answer back as a Draft (Inference).', needs: 'A Copilot licence is needed in Microsoft 365 itself; this page cannot check it.' },
  { source: 'Agents, MCP servers, Graph APIs', direct: 'Not built', how: 'Optional later enhancement; the app is fully usable without them.', needs: 'Decided after the pilot.' },
];

export const DECLARABLE = [
  { id: 'copilot', label: 'I have a Microsoft 365 Copilot licence' },
  { id: 'transcripts', label: 'Teams meeting transcription is on for my meetings' },
  { id: 'graph', label: 'My tenant admin has approved an app to use Microsoft Graph' },
  { id: 'gdpExport', label: 'I can run the GDP export' },
];

export function adviceFor(declared = {}) {
  const out = [];
  if (declared.copilot) out.push('Copilot: use copy-out and paste-back; there is no direct connection from this app.');
  else out.push('No Copilot licence: everything works with no AI, or with a provider you choose in AI settings.');
  out.push(declared.transcripts ? 'Teams: download the transcript (.vtt) after each meeting and import it.' : 'Teams: without transcripts, paste key messages or write notes by hand.');
  out.push(declared.graph ? 'Graph is approved in your tenant, but this app has no Graph connection yet; exports and paste still apply.' : 'Graph is not approved or not known: this is fine, the app does not need it.');
  out.push(declared.gdpExport ? 'GDP: import the export file on the Import screen.' : 'GDP: without the export, add status as notes.');
  return out;
}

export function loadDeclared(storage) {
  try { const v = JSON.parse(storage.getItem(DECLARED_KEY) || '{}'); return v && typeof v === 'object' ? v : {}; } catch (e) { return {}; }
}
export function saveDeclared(storage, declared) {
  try { storage.setItem(DECLARED_KEY, JSON.stringify(declared || {})); return true; } catch (e) { return false; }
}

// Gathers the environment from the real browser. Every probe is guarded.
export async function probeEnvironment(win = globalThis.window, vectorProbe = null, aiEnabled = undefined) {
  const w = win || {}; const n = w.navigator || {};
  const env = { secureContext: w.isSecureContext, serviceWorker: 'serviceWorker' in n, indexedDB: !!w.indexedDB, online: n.onLine, clipboardRead: !!(n.clipboard && n.clipboard.readText), fileInput: typeof w.File !== 'undefined', aiEnabled };
  try { env.standalone = !!(w.matchMedia && w.matchMedia('(display-mode: standalone)').matches) || n.standalone === true; } catch (e) {}
  try { if (n.storage && n.storage.persisted) env.persisted = await n.storage.persisted(); } catch (e) {}
  try { if (vectorProbe) env.vectorService = !!(await vectorProbe()); } catch (e) { env.vectorService = false; }
  return env;
}
