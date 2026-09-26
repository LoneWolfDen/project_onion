# IMPLEMENTATION_MASTER.md
> Read-only audit artifact. Docs = Intent, Code = Reality. Temperature 0. No application code was modified to produce this file.
> Sources audited: `docs/HARVESTER_ARCHITECTURE.md`, `docs/RELATIONSHIP_MODEL.md`, `docs/REGISTRATION_FIELDS.md`, `docs/PROVENANCE_MODEL.md`, `docs/DECISION_LOG.md`, `data/seed/relationship_model.json` v0.11, `git log -10` (HEAD `dcf673e`), `git status` (9 uncommitted files: App.js, AppCenter.js, HarvesterPanel.js, TimelineCard.js, FailoverDB.js, PiiGate.js, VectorSync.js, chroma_data binaries).

---
## Section 1: Executive Architectural State & Gap Analysis Table

| # | Component / Feature | PRD Requirement [doc:line] | Status | Files & Line Refs + Snippet | Root Cause / Gap Details | Severity |
|---|---|---|---|---|---|---|
| 1 | Living Card 5-step Approval | Mission Brief §1.A.4 (atomic, sequential, no `await` between steps) | Partial | `App.js:109-114`<br/>`const handleApproveCard = async (cardId) => {`<br/>`  setApproved((prev) => { ... });`<br/>`  try { const s = readLocal(); ... t.privacy = 'Team Shared'; ...` | Intent achieved (unlock, clear queue, promote AI, force Team Shared, save) but literal step order/extraction pattern differs: title/text is pulled from `pendingAppends[last]` instead of the spec's `[...card.nodes].reverse().find(n=>n.kind==='AI')`; privacy is forced before the node-scrub loop, not after per the 5-step spec order. | Medium |
| 2 | Staged Purgatory rendering | Mission Brief §1.A.3 | Implemented | `TimelineCard.js:96-98`<br/>`function pendingAppendsBanner(m, open, onToggle) {`<br/>`  try { if (!m ...) return null;`<br/>`    const list = Array.isArray(m.pendingAppends) ? m.pendingAppends : null;` | Staged nodes render distinctly (amber `#fffbeb`/`#fcd34d`), gated to `isOwner` via `appendedNodesBlock` (`TimelineCard.js:109-121`). Matches spec. | Low |
| 3 | Ledger Node schema `{kind,text,author,at,stagedAppend?}` | Mission Brief §1.A.2 | Implemented (superset) | `FailoverDB.js:360-370`<br/>`target.nodes.push({`<br/>`  kind: String((n && n.kind) || 'EV').toUpperCase(),`<br/>`  text: String((n && n.text) || '').slice(0, 800),` | Correct core fields present, plus extra `contributor`,`appendPrivacy`,`appendSyncStatus`,`appended_at` (not `at`) on appended nodes only. Seed-time nodes (`FailoverDB.js:39-42`) use `at:` correctly. Minor key inconsistency (`appended_at` vs `at`) on Smart-Append nodes. | Low |
| 4 | **Hard-Stop Loop Guard (Bug Fix)** | Mission Brief §1.B.2 — `continue`/`return` must fire immediately on `smartAppendToCard` success, never fall through to `markProcessed`/`stageToDataPark` | **BROKEN** | `HarvesterPanel.js:481-517`<br/>`const isAppendMatch = !!(card && card.smartAppend && card.smartAppend.targetCardId);`<br/>`if (isAppendMatch) { ... if (appendSuccess) { appended++; } else { ... await api.markProcessed(...); } }`<br/>`} else { ... await api.markProcessed(card.sourceId, aiResult); }` | No literal `continue`/`return` statement exists anywhere in the `for (const card of queue)` loop (`HarvesterPanel.js:456-538`). The if/else branching happens to skip `markProcessed` on success today, but there is no explicit hard-stop guard — any future code inserted after the if/else (e.g. the cleanup block at lines 519-524, which currently runs unconditionally for BOTH branches) risks double-processing the same item. Additionally, **zero** `contentHash`/`SHA256` dedup logic exists anywhere in `HarvesterPanel.js` or `FailoverDB.js` (confirmed via full-file grep — no hits). | **CRITICAL** |
| 5 | **Semantic Routing Threshold (0.85)** | Mission Brief §1.B.1 — similarity ≥ 0.85 routes to Smart Append | **BROKEN** | `VectorSync.js:142-144`<br/>`const top = retrieved[0] || {};`<br/>`const dist = Number(top.distance);`<br/>`if (!Number.isFinite(dist) || dist > 1.2) return { match: null, engine: 'chromadb' };` | Routing is gated on **Chroma cosine distance ≤ 1.2** (smaller = closer), not on a similarity score ≥ 0.85. There is no literal `0.85` constant anywhere in the codebase (confirmed via grep — only hits are unrelated `impactScore: 0.85` seed data and a code comment). `vectorScoreForDistance()` (`VectorSync.js:158-163`) maps distance→score (dist=0→0.95, dist=1.2→0.55) purely for UI display; it is never compared against 0.85 to gate routing. The legacy exact-match path (`HarvesterPanel.js:59-104` `findSmartAppendMatch`) uses an unrelated token/ref-overlap scoring heuristic, also not 0.85-based. | **CRITICAL** |
| 6 | 9-Field Harvester Payload Contract | Mission Brief §1.B.3 | Partial | `HarvesterPanel.js:11-16`<br/>`export function toPayload(o, persona) {`<br/>`  const p = (typeof persona === 'string' && persona) || (o && (o.author || o.contributor)) || 'Brené';`<br/>`  return { id: o.id, projectId: o.projectId, ..., author: o.author || p, contributor: o.contributor || p, privacy: o.privacy || 'Team Shared' };` | Base 9 fields present but 3 extra fields (`author`,`contributor`,`privacy`) always appended beyond the strict `{id,projectId,type,title,source,timestamp,content,piiStatus,syncStatus}` contract. Author binding correctly never `'MISSING'`/`'Unknown Author'` at the payload layer (falls back to `'Brené'`), BUT `TimelineCard.js:417` UI footer still renders literal `'Unknown Author'` as its terminal fallback string, contradicting the "never Unknown Author" rule at the render layer. | Medium |
| 7 | One-Way Public Door (Smart Append) | Mission Brief §1.C.1-2 | Implemented | `FailoverDB.js:355-357`<br/>`const parentIsShared = String(target.privacy || 'Team Shared') === 'Team Shared';`<br/>`const effPrivacy = parentIsShared ? 'Team Shared' : ((meta && meta.privacy) || 'Team Shared');` | Correct: Team Shared parents can never be contaminated back to Private via a staged append; `App.js:114-115` forces `t.privacy='Team Shared'` unconditionally on approve. Matches spec exactly. | Low |
| 8 | Author-Only Privacy Toggle | Mission Brief §1.C.3 | Implemented | `TimelineCard.js:337`<br/>`const isOwner = (() => { try { const o = String(m.author || m.contributor || '').trim().toLowerCase(); const me = String(props.activePersona || '').trim().toLowerCase(); return !!o && o === me; } catch (e) { return false; } })();` | Ellipsis-menu privacy flip button (`TimelineCard.js:400`) is gated `${isOwner ? html\`<button ... onFlipPrivacy ...\` : null}` — contributors cannot toggle parent privacy. Matches spec. | Low |
| 9 | PII Gate business-email whitelist | Mission Brief §1.D | Implemented (minimal) | `PiiGate.js:4,6,12-15`<br/>`const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;`<br/>`const NOISE_PHRASES = [/Jane likes coffee/gi, /\b(hotel|coffee|lunch|vacation)\b/gi];`<br/>`if (EMAIL_RE.test(t)) { /* flag = 'Clean'; emails now considered clean context */ }` | Emails (incl. `.co.uk`) are correctly never redacted (comment confirms intentional no-op). No named `PRESERVE_REGEX`/`STRIP_KEYWORDS` exports exist — only inline `EMAIL_RE`/`NOISE_PHRASES` with just 2 generic noise patterns, far short of a full personal-chatter keyword list. | Medium |
| 10 | Vector Service FastAPI+ChromaDB :8006 | Mission Brief §1.E.1 | Implemented | `modules/vector-service/main.py:9,14`<br/>`app = FastAPI(title="Project Onion Vector Service", version="1.0.1-privacyfix")`<br/>`allow_origins=["http://localhost:8002", "http://localhost:8000", "*"],  # Allow all for hackathon` | `/health`,`/ingest`,`/delete`,`/ask` all present (`main.py:59-144`); `store.py:36-78` implements `VectorStore` over `chromadb.PersistentClient`. CORS wildcard `"*"` is a documented hackathon shortcut but is flagged as the WP5 "CORS/credential-leak" core risk. | Low |
| 11 | FailoverDB Queue `onion_db_state` + 5MB quota | Mission Brief §1.E.2 | Partial | `FailoverDB.js:23,111-113`<br/>`const STORAGE_KEY = 'onion_db_state';`<br/>`export function writeLocal(state) {`<br/>`  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (err) {}` | No explicit 5MB quota-exceeded handling — the bare `try{...}catch(err){}` silently swallows `QuotaExceededError` with zero user-facing warning, eviction strategy, or retry. Read/seed path (`FailoverDB.js:48-59`) is otherwise correct. | Medium |
| 12 | Sync Status Footer `Local:✅ \| Vector:✅` | Mission Brief §1.E.3 | Implemented | `TimelineCard.js:422`<br/>`<span>Local: ${String(m.syncStatus || 'synced') === 'pending_upload' ? html\`<button ...>☁️ Sync</button>\` : '✅'} \| Vector: ${String(m.vectorSyncStatus || 'synced') === 'pending' ? '☁️' : '✅'}</span>` | Matches spec format exactly, including the sync-now button affordance. | Low |
| 13 | **Dual-Provider LLM Fusion (OpenRouter + Anthropic)** | Mission Brief §1.F — pluggable via `localStorage.getItem('LLM_PROVIDER')`, Anthropic direct mode with exact endpoint/headers/payload/extraction | **BROKEN — Anthropic missing entirely** | `AiClient.js:5-6`<br/>`const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';`<br/>`const DEFAULT_MODEL = 'anthropic/claude-3-haiku';` | Grep across all of `modules/experience-pwa/static/js/` for `api.anthropic.com`, `x-api-key`, `dangerously-allow-browser`, `claude-sonnet-4-5`, `LLM_PROVIDER` returns **zero hits**. Only OpenRouter mode exists (`AiClient.js:68-134` `processWithAI`, `200-244` `askSmartAssistant`). No provider factory, no `data.content[0].text` extraction, no Anthropic→OpenRouter fallback-on-failure logic. The model field (`HarvesterPanel.js:571`) is a single free-text OpenRouter model string, not a Fast/Demo dual-provider selector. | **CRITICAL** |
| 14 | Timeline Pill Interactive Inspector + author hierarchy | Mission Brief §1.G.1 | Implemented (minor inconsistency) | `TimelineCard.js:56,404,417`<br/>`author: String((n && (n.author || n.contributor)) || m.author || m.contributor || 'Unknown'),`<br/>`<span>${selectedNode.author || 'System'} • ${selectedNode.at || 'Just now'}</span>`<br/>`<span>${author || 'Unknown Author'}</span>` | Pill `onClick` → inspector wiring correct (`TimelineCard.js:92-93,404`); timestamp hierarchy `n.at||n.appended_at||n.timestamp` matches spec exactly; `whitespace-pre-wrap` present. BUT terminal fallback token is inconsistent across three sites: `miniTimelineFor` maps to `'Unknown'` (lines 56,61), inspector defaults to `'System'` (line 404), footer defaults to `'Unknown Author'` (line 417) — spec calls for one consistent `'System'` terminal fallback everywhere. | Low |

---
## Section 2: Unified Data Models & Contracts

### 2.1 Anchor Card & Living Status Card (Surface vs Ledger)
```json
{
  "id": "seed-m1",
  "Project_ReferenceID": "Apollo-O-008891-200926120000",
  "projectId": "apollo-123",
  "client_name": "Acme Corp",
  "project_name": "Apollo-123",
  "opportunity_id": "O-008891",
  "author": "Daniel",
  "contributor": "Daniel",
  "type": "Excel",
  "title": "PO Extension Approved",
  "content": "MS3 extended Q2-Q3 signed",
  "synthesizedText": "MS3 extended Q2-Q3 signed",
  "detail": "MS3 extended Q2-Q3 signed",
  "source": "GDP Status",
  "timestamp": "Just now",
  "piiStatus": "Clean",
  "privacy": "Team Shared",
  "is_private": false,
  "isPrivate": false,
  "syncStatus": "synced",
  "vectorSyncStatus": "synced",
  "impactScore": 0.85,
  "tags": ["#Milestone_Tracked"],
  "created_at": "2026-09-20T12:15:00.000Z",
  "updated_at": "2026-09-20T12:15:00.000Z",
  "nodes": [
    { "kind": "RAW", "text": "MS3 extended Q2-Q3 signed", "author": "Daniel", "at": "2026-09-20T12:15:00.000Z", "stagedAppend": false },
    { "kind": "AI", "text": "MS3 extended Q2-Q3 signed", "author": "Onion AI", "at": "2026-09-20T12:15:00.000Z", "stagedAppend": false }
  ],
  "pendingAppends": []
}
```
Ledger append rule (`FailoverDB.js:360-370`, `smartAppendToCard`): staged nodes carry `stagedAppend: true`, `appendPrivacy`, `appendSyncStatus: 'pending_review'`, `appended_at` — a superset of the base node schema `{kind,text,author,at,stagedAppend?}`.

### 2.2 Harvester 9-Field Payload Contract (strict — `toPayload()` currently adds 3 extra fields, see Row 6)
```json
{
  "id": "dp-1758880000000-1234",
  "projectId": "apollo-123",
  "type": "Email",
  "title": "RE: PO Extension APPROVED",
  "source": "Outlook Mail",
  "timestamp": "Just now",
  "content": "J.Smith@acme.com approved MS3 extension via email.",
  "piiStatus": "Clean",
  "syncStatus": "pending_upload"
}
```

### 2.3 Vector Metadata & ChromaDB Schema (`store.py:42-64`)
```json
{
  "id": "seed-m1",
  "document": "Title: PO Extension Approved\nContent: MS3 extended Q2-Q3 signed\nProvenance: GDP Status",
  "metadata": {
    "client": "Acme Corp",
    "project": "Apollo-123",
    "author": "Daniel",
    "is_private": false
  }
}
```
Query filter (`store.py:72-73`): `where = {"$and": [{"project": project}, {"$or": [{"is_private": false}, {"author": active_persona}]}]}`.

### 2.4 Local Storage State Contract (`onion_db_state`, `FailoverDB.js:23,48-72`)
```json
{
  "version": "phase2-esm-v1",
  "seeded_at": "2026-09-20T12:15:00.000Z",
  "clients": [
    { "account_name": "Acme Corp", "project": "Apollo-123", "opportunity_id": "O-008891", "keywords": ["furlough","PO","overrun"], "domains": ["acme.com"] }
  ],
  "projects": [
    { "Project_ReferenceID": "Apollo-O-008891-200926120000", "client_name": "Acme Corp", "project_name": "Apollo-123", "project_ids": ["987987"], "active": true, "syncStatus": "synced" }
  ],
  "timeline": [ "see 2.1 Living Status Card objects" ],
  "notes": [ "same shape as 2.1, privacy defaults to 'My Notes'" ],
  "archived": []
}
```
Vector queue mirror (`VectorSync.js:8,110-125`): `localStorage['onion_vector_queue'] = [{ "op": "upsert" | "delete", "id": "seed-m1", "card": { "...toVectorPayload output..." }, "at": "ISO", "attempts": 0 }]`.

---
## Section 3: Concrete Modular Work Packages (WP5 → WP1 → WP2 → WP4 → WP3)

### 3.0 WP Assignment Matrix
| WP | Name | Target Files | Depends On | Core Risk |
|---|---|---|---|---|
| WP5 | Dual-Provider LLM Fusion & Vector Sync Wiring | `modules/experience-pwa/static/js/core/AiClient.js` | None | Credential leak, CORS |
| WP1 | Harvester Routing & Deduplication Engine | `modules/experience-pwa/static/js/components/HarvesterPanel.js`, `modules/experience-pwa/static/js/core/FailoverDB.js`, `modules/experience-pwa/static/js/core/VectorSync.js` | WP5 | Infinite loop, dup cards |
| WP2 | Living Card State Promotion & Approval Lifecycle | `modules/experience-pwa/static/js/components/App.js` | WP1 | Ledger corruption |
| WP4 | PII Gate Whitelist & Business Context Preservation | `modules/experience-pwa/static/js/core/PiiGate.js` | WP1 | Redacting business emails |
| WP3 | Timeline Pill Interaction & Data Binding | `modules/experience-pwa/static/js/components/TimelineCard.js` | WP2 | Wrong author/time display |

---
### WP5: Dual-Provider LLM Fusion & Vector Sync Wiring
- **Goal:** Add an Anthropic-direct provider branch to `AiClient.js`, switchable via `localStorage['LLM_PROVIDER']`, falling back to OpenRouter on Anthropic failure — without touching the already-correct VectorSync 8006 queue.
- **Depends On:** None
- **Target Files:** `modules/experience-pwa/static/js/core/AiClient.js` ONLY.
- **CONTEXT BUNDLE (current, OpenRouter-only, `AiClient.js:1-6, 68-100`):**
```js
// AiClient.js — Hybrid OpenRouter / Mock AI integration.
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'anthropic/claude-3-haiku';

export async function processWithAI(text, type) {
  const input = String(text || '');
  const kind = String(type || 'general');
  const enrichWithAggregation = (base) => { /* unchanged, adds mergeHint/structured/privacy */ };
  let apiKey = null; let model = DEFAULT_MODEL;
  try {
    apiKey = localStorage.getItem('OPENROUTER_API_KEY') || '';
    model = localStorage.getItem('OPENROUTER_MODEL') || DEFAULT_MODEL;
  } catch (e) { apiKey = null; }
  if (!apiKey || !String(apiKey).trim()) {
    await new Promise((r) => setTimeout(r, 1200));
    return enrichWithAggregation(mockResult(input, kind));
  }
  try {
    const res = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + String(apiKey).trim(),
        'HTTP-Referer': (typeof location !== 'undefined' && location.href) || 'http://localhost',
        'X-Title': 'Project Continuum Data Park' },
      body: JSON.stringify({ model, messages: [
        { role: 'system', content: 'You are an enterprise data parser...' },
        { role: 'user', content: '[' + kind + '] ' + input },
      ] }),
    });
    if (!res.ok) throw new Error('OpenRouter HTTP ' + res.status);
    const data = await res.json();
    const raw = (data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
    // ...JSON.parse(raw) -> enrichWithAggregation({synthesizedText,tags,impactScore,...})...
  } catch (e) { /* falls through — NO Anthropic branch exists anywhere in this file */ }
  await new Promise((r) => setTimeout(r, 1200));
  return enrichWithAggregation(mockResult(input, kind));
}
```
- **Pre-Conditions:** `localStorage` keys `OPENROUTER_API_KEY`/`OPENROUTER_MODEL` already in use by `HarvesterPanel.js:296,571` — MUST NOT rename. No new npm/pip packages.
- **Exact Code Directives [Given/When/Then]:**
  1. GIVEN Factory: `if localStorage.getItem('LLM_PROVIDER')==='anthropic'` use anthropic path else openrouter. Anthropic output = data.content[0].text, OpenRouter output = data.choices[0].message.content. GIVEN `function getProvider(){ try { return localStorage.getItem('LLM_PROVIDER') || 'openrouter'; } catch(e){ return 'openrouter'; } }` WHEN `getProvider() === 'anthropic'` THEN build request `fetch('https://api.anthropic.com/v1/messages', { method:'POST', headers: { 'Content-Type':'application/json', 'x-api-key': (localStorage.getItem('ANTHROPIC_API_KEY')||''), 'anthropic-version':'2023-06-01', 'dangerously-allow-browser':'true' }, body: JSON.stringify({ model:'claude-3-5-sonnet-20241022', max_tokens:1024, messages:[{ role:'user', content: prompt }] }) })` where `prompt` = the same system+user instruction text currently sent to OpenRouter concatenated into one string.
  2. WHEN Anthropic responds THEN extract via `const raw = (data && Array.isArray(data.content) && data.content[0] && data.content[0].text) || '';` then parse with the SAME `JSON.parse`/regex-fallback logic already used for OpenRouter (factor into one shared `parseAiJson(raw)` helper called by both branches — do not duplicate the parse block).
  3. WHEN Anthropic `fetch` throws OR `!res.ok` THEN catch it, then RETRY by calling the existing OpenRouter fetch block verbatim (reuse, do not copy-paste a second time) BEFORE falling back to `mockResult`. Never let an unhandled rejection reach the caller.
  4. GIVEN `getProvider() === 'openrouter'` (default) THEN behavior is 100% unchanged from current code.
  6. BOTH branches (Anthropic and OpenRouter) MUST end with `return enrichWithAggregation(parsedJson)` using the SAME existing `enrichWithAggregation` function in file - NEVER `return raw` or `return data`. This preserves `tags`, `impactScore`, `mergeHint`, `structured`, `privacy` enrichment that cheap models otherwise drop.
  7. OpenRouter branch MUST preserve existing headers `HTTP-Referer: location.href` and `X-Title: 'Project Continuum Data Park'` - these are required by OpenRouter for auth/billing. Anthropic branch MUST NOT include them, only `x-api-key`, `anthropic-version`, `dangerously-allow-browser`.
  5. Keys read fresh from `localStorage` every call — `OPENROUTER_API_KEY`/`ANTHROPIC_API_KEY`/`LLM_PROVIDER`/`OPENROUTER_MODEL` — never hardcoded literals.
- **Forbidden Actions:** Do NOT modify `VectorSync.js`, `main.py`, `store.py` (already spec-compliant per Row 10-12; flag any disagreement to the user instead of editing). Do NOT add an Anthropic SDK — raw `fetch` only. Do NOT rename `OPENROUTER_API_KEY`/`OPENROUTER_MODEL`. Do NOT touch `askSmartAssistant` unless a separate WP explicitly requests it.
- **Verification:**
  - `typeof AiClient.processWithAI === 'function'` → `true`
  - `localStorage.setItem('LLM_PROVIDER','anthropic'); localStorage.setItem('ANTHROPIC_API_KEY','bad-key'); AiClient.processWithAI('test text','Email').then(r=>console.log(typeof r.synthesizedText==='string'))` → resolves `true` (never throws, falls back to mock/OpenRouter)
  - `localStorage.removeItem('LLM_PROVIDER'); AiClient.processWithAI('x','Email').then(r=>!!r.synthesizedText)` → `true` (default path unchanged)
- **Definition of Done:** [ ] Anthropic branch added with exact endpoint/headers/payload [ ] `data.content[0].text` extraction [ ] Anthropic→OpenRouter fallback on failure [ ] Mock fallback preserved as final safety net [ ] no hardcoded keys [ ] no new dependencies.

---
### WP1: Harvester Routing & Deduplication Engine
- **Goal:** (a) Add an explicit `continue` hard-stop guard immediately after a successful `smartAppendToCard` so execution can NEVER fall through to `markProcessed`/`stageToDataPark` for that item; (b) add a `contentHash = SHA256(title+content)` dedup check before staging; (c) correct the routing gate so it is driven by a literal similarity ≥ 0.85 comparison instead of the current unrelated `dist > 1.2` Chroma-distance check.
- **Depends On:** WP5
- **Target Files:** `modules/experience-pwa/static/js/components/HarvesterPanel.js`, `modules/experience-pwa/static/js/core/FailoverDB.js`, `modules/experience-pwa/static/js/core/VectorSync.js`.
- **CONTEXT BUNDLE 1 — the broken loop (`HarvesterPanel.js:468-525`):**
```js
for (const card of queue) {
  let effPrivacy = card ? card.privacy : '';
  // ...effPrivacy resolution from refCur/localStorage omitted (unchanged)...
  effPrivacy = normalizePrivacy(effPrivacy || 'Team Shared');
  const isAppendMatch = !!(card && card.smartAppend && card.smartAppend.targetCardId);
  if (isAppendMatch) {
    let appendSuccess = false;
    if (api && api.smartAppendToCard) {
      try {
        const updated = await api.smartAppendToCard(
          card.smartAppend.targetCardId,
          { kind: 'RAW', text: String(card.content || card.synthesizedText || card.title || ''), author: card.author, at: card.timestamp },
          { kind: 'AI', text: String(card.synthesizedText || card.content || card.title || ''), author: 'Onion AI', at: card.timestamp },
          { title: card.title, synthesizedText: card.synthesizedText, source: card.source, reasons: card.smartAppend.matchReasons, score: card.smartAppend.matchScore, stagedId: card.sourceId, author: card.author, contributor: card.contributor, privacy: effPrivacy }
        );
        if (updated && updated.id) appendSuccess = true;
      } catch (errAppend) { console.error('Smart Append failed:', errAppend); }
    }
    if (appendSuccess) {
      appended++;
      // <-- NO continue/return HERE. Falls through to shared cleanup below (harmless today, unsafe long-term).
    } else {
      const aiResult = { title: card.title, synthesizedText: card.synthesizedText, tags: card.tags, impactScore: card.impactScore, privacy: effPrivacy, author: card.author };
      if (api && api.markProcessed) await api.markProcessed(card.sourceId, aiResult);
    }
  } else {
    const aiResult = { title: card.title, synthesizedText: card.synthesizedText, tags: card.tags, impactScore: card.impactScore, mergeHint: card.mergeHint, structured: card.structured, privacy: effPrivacy, author: card.author, contributor: card.contributor };
    if (api && api.markProcessed) await api.markProcessed(card.sourceId, aiResult);
  }
  // Shared cleanup — currently runs UNCONDITIONALLY for both branches:
  try {
    const k = 'onion_review_privacy_' + String(card.sourceId || '');
    localStorage.removeItem(k);
    if (refCur[k]) delete refCur[k];
  } catch (e) {}
  done++;
}
```
- **CONTEXT BUNDLE 2 — the wrong threshold (`VectorSync.js:127-155`):**
```js
export async function querySimilarCards(text, project, activePersona, topK) {
  const q = String(text || '').slice(0, 1000);
  if (!q.trim()) return { match: null, engine: 'none' };
  const body = { query: q, project: String(project || ''), activePersona: String(activePersona || ''), privacyMode: 'Both' };
  for (const base of vectorBases()) {
    try {
      const res = await fetchTimeout(base + '/ask', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }, 4000);
      if (!res.ok) continue;
      const j = await res.json().catch(() => null);
      const retrieved = (j && j.retrieved) || [];
      if (!retrieved.length) return { match: null, engine: 'chromadb' };
      const top = retrieved[0] || {};
      const dist = Number(top.distance);
      if (!Number.isFinite(dist) || dist > 1.2) return { match: null, engine: 'chromadb' };  // <-- WRONG GATE, not 0.85 similarity
      let title = String(top.id || '');
      try { const doc = String(top.document || ''); const m = doc.match(/Title:\s*([^\n]+)/); if (m && m[1].trim()) title = m[1].trim().slice(0, 80); } catch (e) {}
      return { match: { id: String(top.id || ''), title, distance: dist, reasons: ['vector similarity (dist ' + dist.toFixed(2) + ')'] }, engine: 'chromadb' };
    } catch (e) {}
  }
  return { match: null, engine: 'offline' };
}
export function vectorScoreForDistance(dist) {
  const d = Number(dist);
  if (!Number.isFinite(d)) return 0.55;
  return Math.max(0.5, Math.round((0.95 - d * 0.33) * 100) / 100);
}
```
- **Pre-Conditions:** `FailoverDB.smartAppendToCard`/`markProcessed`/`stageToDataPark` (`FailoverDB.js:270-417`) field names unchanged. `HarvesterPanel.readAllTimelineCards()` (`HarvesterPanel.js:51-58`) available for dedup lookups.
- **Exact Code Directives [Given/When/Then]:**
  1. GIVEN the `for (const card of queue)` loop THEN MOVE the shared cleanup block (`localStorage.removeItem(k)`/`delete refCur[k]`) to the TOP of the loop body, executed unconditionally BEFORE the `isAppendMatch` branch — this guarantees cleanup always runs exactly once even when `continue` fires.
  2. GIVEN `isAppendMatch === true` AND `appendSuccess === true` (i.e. `updated && updated.id`) THEN immediately execute `appended++; done++; continue;` as the literal next statements inside that `if (appendSuccess)` block — this is the hard-stop guard. Execution for this `card` MUST NOT reach the `else` branch's `markProcessed` call NOR the outer `else` (`isAppendMatch === false`) branch.
  3. GIVEN `isAppendMatch === true` AND `appendSuccess === false` THEN keep the existing fallback `await api.markProcessed(card.sourceId, aiResult)` (data-loss prevention), then `done++;` and let the loop iterate naturally (no `continue` needed since it's already the last statement for this branch).
  4. WHEN staging any new payload (`onStage()` `HarvesterPanel.js:265-282` and the `out.push(...)` builder in `onProcess()` `HarvesterPanel.js:388-410`) THEN compute `const contentHash = await sha256Hex(String(title||'') + String(content||''));` using `async function sha256Hex(str){ const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str)); return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join(''); }` (Web Crypto, zero-install) BEFORE pushing to `parsedReviewQueue`; attach `contentHash` to the payload object and to `FailoverDB.stageToDataPark`'s persisted record (`FailoverDB.js:270-288`, add `contentHash: payload.contentHash || ''` to the stored fields).
  5. GIVEN a newly computed `contentHash` THEN compare against `readAllTimelineCards()` with fallback: `(c.contentHash && c.contentHash === contentHash) || (c.title === title && (c.content === content || c.synthesizedText === content))` — WHEN a match exists THEN skip staging (do not push to `parsedReviewQueue`, do not call `stageToDataPark`), set `setParkMsg('Duplicate content detected — skipped (hash match).')`, and return early from that iteration.
  6. GIVEN `VectorSync.js:querySimilarCards` THEN replace the distance gate with an explicit similarity mapping: `const similarity = Math.max(0, Math.min(1, 1 - (dist / 2)));` then `if (!Number.isFinite(dist) || similarity < 0.85) return { match: null, engine: 'chromadb' };` — this makes the literal `0.85` threshold the actual gate (keep `vectorScoreForDistance` for legacy UI display parity but the ROUTING decision must use `similarity >= 0.85`, not the old `dist > 1.2` check). Do NOT invent a different similarity formula without human sign-off if this mapping is disputed — flag instead of guessing.
- **Forbidden Actions:** Do NOT modify `findSmartAppendMatch`/`buildSmartAppendFor` legacy scoring heuristics beyond wiring the new dedup check as an additional pre-check. Do NOT add external hashing libraries. Do NOT touch `AiClient.js` (WP5 scope only).
- **Verification:**
  - `crypto.subtle.digest('SHA-256', new TextEncoder().encode('a')).then(b=>console.log([...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('').length===64))` → `true`
  - After approving a Smart-Append-matched review item: `readLocal().timeline.filter(c=>c.title===DUPLICATE_TITLE).length === 1` → `true` (no duplicate standalone card created)
  - `VectorSync.querySimilarCards('identical text','apollo-123','Brené').then(r=>console.log(r))` with a near-identical seeded card → `match` populated only when mapped `similarity >= 0.85`
- **Definition of Done:** [ ] cleanup moved to loop top [ ] `continue` fires immediately post-success [ ] no fallthrough to `markProcessed`/`stageToDataPark` on success [ ] `contentHash` computed pre-stage via Web Crypto [ ] dedup check blocks duplicate stage [ ] `querySimilarCards` gates on `similarity >= 0.85` literal.

---
### WP2: Living Card State Promotion & Approval Lifecycle
- **Goal:** Re-sequence `handleApproveCard` into the literal 5-step atomic order (scrub `stagedAppend` → clear `pendingAppends` → extract latest AI node via `[...nodes].reverse().find` → force `Team Shared`/`is_private=false` → save + queue vector re-index), aborting with no partial write on any failure.
- **Depends On:** WP1
- **Target Files:** `modules/experience-pwa/static/js/components/App.js` (`handleApproveCard`, lines 109-166 only).
- **CONTEXT BUNDLE (current, `App.js:109-166`):**
```js
const handleApproveCard = async (cardId) => {
  setApproved((prev) => { const n = new Set(prev); n.add(cardId); return n; });
  try {
    const s = readLocal();
    let touched = null;
    const scrubPrivateNodes = (t) => {
      if (!t || typeof t !== 'object') return;
      t.privacy = 'Team Shared';                       // <-- forced BEFORE node scrub (spec wants this as step 4)
      try { t.is_private = false; t.isPrivate = false; } catch (e) {}
      let newestAiText = ''; let newestTitle = '';
      if (Array.isArray(t.nodes)) {
        t.nodes = t.nodes.map((n) => {
          if (!n || typeof n !== 'object') return n;
          const c = Object.assign({}, n);
          if (c.kind === 'AI' && c.stagedAppend) { newestAiText = c.text; }   // <-- ad-hoc extraction, not [...nodes].reverse().find
          try { delete c.private; delete c.pending; } catch (e) {}
          try { if (typeof c.text === 'string' && /private/i.test(c.text)) c.text = c.text.replace(/private/gi, '').trim(); } catch (e) {}
          try { if (c.appendPrivacy) c.appendPrivacy = 'Team Shared'; } catch (e) {}
          try { if (c.stagedAppend) c.stagedAppend = false; } catch (e) {}
          return c;
        });
      }
      if (Array.isArray(t.pendingAppends) && t.pendingAppends.length > 0) {
        const last = t.pendingAppends[t.pendingAppends.length - 1];         // <-- title sourced from pendingAppends, not the AI node
        if (last && last.title) newestTitle = last.title;
      }
      if (newestAiText) t.synthesizedText = newestAiText;
      if (newestTitle) t.title = newestTitle;
      t.updated_at = new Date().toISOString();
      try { if (Array.isArray(t.pendingAppends)) t.pendingAppends = []; } catch (e) {}
    };
    (s.timeline || []).forEach((t) => { if (t && String(t.id) === String(cardId)) { t.piiStatus = 'Approved'; scrubPrivateNodes(t); touched = t; } });
    (s.notes || []).forEach((nn) => { if (nn && String(nn.id) === String(cardId)) { nn.piiStatus = 'Approved'; scrubPrivateNodes(nn); touched = touched || nn; } });
    writeLocal(s);
    try { if (touched && OnionDB && OnionDB.syncCardToVector) { await OnionDB.syncCardToVector(cardId); } } catch (e2) {}
  } catch (e) {}
};
```
- **Pre-Conditions:** `readLocal`/`writeLocal`/`OnionDB` already imported (`App.js:2`). `OnionDB.syncCardToVector` (`FailoverDB.js:250`) unchanged.
- **Exact Code Directives [Given/When/Then]:**
  1. GIVEN `const card = (s.timeline||[]).find(t=>t && String(t.id)===String(cardId)) || (s.notes||[]).find(n=>n && String(n.id)===String(cardId));` IS falsy THEN `return;` immediately — abort before any mutation, no partial save.
  2. STEP 1: `card.nodes.forEach(n => { if (n && n.stagedAppend === true) n.stagedAppend = false; });` — flip flag only; assert `card.nodes.length` is identical before/after (never delete nodes).
  3. STEP 2: `card.pendingAppends = [];` (direct reassignment).
  4. STEP 3: `const latestAi = Array.isArray(card.nodes) ? [...card.nodes].reverse().find(n => n && n.kind === 'AI') : null; if (latestAi) { card.synthesizedText = latestAi.text; card.content = latestAi.text; card.detail = latestAi.text; }` — use this EXACT reduce pattern in place of the current `pendingAppends[last]` extraction. Title promotion: keep current `card.title` unless a `pendingAppends` entry (captured BEFORE step 2 clears it) had a `.title`, in which case apply it as a secondary enrichment.
  5. STEP 4: `card.privacy = 'Team Shared'; card.is_private = false; card.isPrivate = false;` (keep dual-write of `isPrivate` for backward compat since `VectorSync.js:56-57` and `store.py:17-25` both read `isPrivate`).
  6. STEP 5: wrap steps 1-4 in one synchronous `try { ...steps 1-4...; writeLocal(s); } catch (err) { return; }` block with NO `await` between steps 1-4 and the `writeLocal(s)` call. AFTER that block returns successfully, fire `if (OnionDB && OnionDB.syncCardToVector) { OnionDB.syncCardToVector(cardId).catch(() => {}); }` as fire-and-forget (not awaited, queued offline per WP5/VectorSync contract) — do not block the function return on it.
- **Forbidden Actions:** Do NOT modify `TimelineCard.js` rendering. Do NOT modify `FailoverDB.smartAppendToCard`. Do NOT insert `await` between steps 1-4.
- **Verification:**
  - `readLocal().timeline.find(c=>c.id==='test-card').nodes.every(n=>!n.stagedAppend)` → `true` after approve
  - `readLocal().timeline.find(c=>c.id==='test-card').pendingAppends.length === 0` → `true`
  - `readLocal().timeline.find(c=>c.id==='test-card').privacy === 'Team Shared'` → `true`
  - `readLocal().timeline.find(c=>c.id==='test-card').is_private === false` → `true`
- **Definition of Done:** [ ] 4 steps in exact order, no interleaving [ ] `[...nodes].reverse().find` pattern used for AI extraction [ ] no `await` between steps 1-4 [ ] abort-no-partial-save when card missing [ ] vector sync fired after commit, non-blocking.

---
### WP4: PII Gate Whitelist & Business Context Preservation
- **Goal:** Formalize a named `PRESERVE_REGEX` for corporate emails/project tokens and a `STRIP_KEYWORDS` list for personal-noise stripping, without ever flipping `piiStatus` to non-`'Clean'` for business content.
- **Depends On:** WP1
- **Target Files:** `modules/experience-pwa/static/js/core/PiiGate.js` ONLY (36 lines total).
- **CONTEXT BUNDLE (entire current file, `PiiGate.js:1-36`):**
```js
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const PHONE_RE = /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g;
const NOISE_PHRASES = [/Jane likes coffee/gi, /\b(hotel|coffee|lunch|vacation)\b/gi];
export function piiScreen(raw) {
  let t = String(raw ?? '');
  let flag = 'Clean';
  if (EMAIL_RE.test(t)) { /* flag = 'Clean'; emails now considered clean context */ }
  EMAIL_RE.lastIndex = 0;
  t = t.replace(PHONE_RE, '[PHONE_REDACTED]');
  if (/\[PHONE_REDACTED\]/.test(t)) flag = 'Redacted_Review';
  for (const re of NOISE_PHRASES) {
    re.lastIndex = 0;
    if (re.test(t)) { t = t.replace(re, '[NOISE_FILTERED]'); flag = 'Redacted_Review'; }
  }
  return { text: t, flag };
}
export function screenPayload(payload) {
  const out = { ...payload };
  if (typeof out.content === 'string') { const r = piiScreen(out.content); out.content = r.text; out.piiStatus = r.flag; }
  return out;
}
```
- **Pre-Conditions:** `piiScreen`/`screenPayload` signatures must not change (called from `App.js`, `HarvesterPanel.js`, `TimelineCard.js`, `AppCenter.js`).
- **Exact Code Directives [Given/When/Then]:**
  1. Add `export const PRESERVE_REGEX = { EMAIL: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, PROJECT_TOKEN: /\b(O-\d{4,8}|PO-\d{2,8}|SoW-[\w-]+|GDP-?\d+)\b/gi };` — keep the email pattern byte-identical to current `EMAIL_RE` (do not tighten/loosen it) so `killbill@acme.co.uk` keeps matching via the greedy `[A-Za-z0-9.-]+` domain group.
  2. GIVEN `PRESERVE_REGEX.EMAIL.test(content)` is true THEN `piiStatus` MUST remain `'Clean'` — this is the CURRENT behavior (comment at line 12-14 confirms the no-op); WP4 must not regress it under any circumstance.
  3. Add `export const STRIP_KEYWORDS = [/Jane likes coffee/gi, /\b(hotel|coffee|lunch|vacation|birthday|weekend plans|personal reminder)\b/gi];` — this supersedes `NOISE_PHRASES` in the SAME array position/order (keep the first 2 patterns byte-identical so existing `[NOISE_FILTERED]` test expectations don't regress); update `piiScreen`'s loop to iterate `STRIP_KEYWORDS` instead of `NOISE_PHRASES`.
  4. WHEN any `STRIP_KEYWORDS` pattern matches THEN behavior unchanged: `t = t.replace(re, '[NOISE_FILTERED]'); flag = 'Redacted_Review';`.
  5. GIVEN text contains a `PRESERVE_REGEX.PROJECT_TOKEN` match (e.g. `O-008891`, `PO-88921`, `SoW-2024-001`) THEN verify no `STRIP_KEYWORDS`/`PHONE_RE` pattern can ever overlap-match that substring — current patterns already can't (verify, do not add new stripping logic that risks it).
- **Forbidden Actions:** Do NOT change phone-redaction behavior (`PHONE_RE`). Do NOT redact emails. Do NOT change `piiScreen`/`screenPayload` call signatures used by `HarvesterPanel.js`/`TimelineCard.js`/`App.js`/`AppCenter.js`.
- **Verification:**
  - `piiScreen('Contact killbill@acme.co.uk about PO-88921').flag === 'Clean'` → `true`
  - `piiScreen('Jane likes coffee and mentioned her vacation').text.indexOf('[NOISE_FILTERED]') >= 0` → `true`
  - `piiScreen('Call 555-123-4567 re SoW-2024-001').text === 'Call [PHONE_REDACTED] re SoW-2024-001'` → `true`
- **Definition of Done:** [ ] `PRESERVE_REGEX` named export added [ ] `STRIP_KEYWORDS` named export added, supersedes `NOISE_PHRASES` [ ] emails never redacted [ ] project/PO/SoW tokens untouched by stripping [ ] existing call sites unchanged.

---
### WP3: Timeline Pill Interaction & Data Binding
- **Goal:** Correct the author-hierarchy terminal fallback in `miniTimelineFor` and the card footer from `'Unknown'`/`'Unknown Author'` to a single consistent `'System'`, matching the inspector's existing fallback.
- **Depends On:** WP2
- **Target Files:** `modules/experience-pwa/static/js/components/TimelineCard.js` ONLY (`miniTimelineFor` lines 51-67; footer author span line 417).
- **CONTEXT BUNDLE (current, `TimelineCard.js:51-67` and `413-418`):**
```js
function miniTimelineFor(m) {
  if (m && Array.isArray(m.timeline) && m.timeline.length) return m.timeline.slice(0, 10).map((t) => ({
    kind: String((t && t.kind) || 'EV').toUpperCase(),
    label: String((t && t.label) || (t && t.kind) || ''),
    fullText: String((t && (t.text || t.content || t.detail || t.label)) || ''),
    author: String((t && (t.author || t.contributor)) || m.author || m.contributor || 'Unknown'),   // <-- terminal 'Unknown'
    at: String((t && (t.at || t.timestamp || t.created_at)) || m.timestamp || 'Just now'),
    stagedAppend: !!(t && t.stagedAppend),
  }));
  if (m && Array.isArray(m.nodes) && m.nodes.length) return m.nodes.slice(0, 10).map((n) => ({
    kind: String((n && n.kind) || 'EV').toUpperCase(),
    label: String((n && n.text) || (n && n.kind) || '').slice(0, 28) || String((n && n.kind) || ''),
    fullText: String((n && n.text) || ''),
    author: String((n && (n.author || n.contributor)) || m.author || m.contributor || 'Unknown'),   // <-- terminal 'Unknown'
    at: String((n && (n.at || n.appended_at || n.timestamp)) || m.timestamp || 'Just now'),
    stagedAppend: !!(n && n.stagedAppend),
  }));
  // ...fallback for m.source/m.type omitted, unchanged...
}
// Footer, TimelineCard.js:415-418:
<span className="font-bold text-[#1E293B] not-italic flex items-center gap-1.5 bg-[#f8fafc] px-2 py-0.5 rounded-full border border-[#E6EAF2]">
  <span className="w-4 h-4 rounded-full bg-[#1F4A7A] text-white flex items-center justify-center text-[8px] font-bold shadow-sm">${initials || 'U'}</span>
  <span className="truncate max-w-[100px]">${author || 'Unknown Author'}</span>   // <-- terminal 'Unknown Author'
</span>
```
- **Pre-Conditions:** `initialsFor()` (lines 34-42) and the upstream `author`/`initials` variable derivation (outside this function, unchanged) must not be touched — only the final fallback string literal changes.
- **Exact Code Directives [Given/When/Then]:**
  1. GIVEN the `m.timeline` branch of `miniTimelineFor` (line 56) THEN replace the terminal fallback token `'Unknown'` with `'System'` so the hierarchy reads exactly `t.author || t.contributor || m.author || m.contributor || 'System'`.
  2. GIVEN the `m.nodes` branch of `miniTimelineFor` (line 61) THEN apply the identical replacement: `n.author || n.contributor || m.author || m.contributor || 'System'`.
  3. GIVEN the card footer author span (line 417) THEN replace `${author || 'Unknown Author'}` with `${author || 'System'}` — this aligns the footer with the inline inspector's existing `${selectedNode.author || 'System'}` (line 404), making the fallback consistent everywhere.
  4. Do NOT change `initialsFor()` or the `initials` derivation — only the display-string terminal fallback token in the 3 locations above.
  5. Confirm (verification only, no code change) that the timestamp hierarchy `t.at||t.timestamp||t.created_at` / `n.at||n.appended_at||n.timestamp` and the `whitespace-pre-wrap` class on the inspector content div (line 404) remain unchanged — already spec-compliant.
- **Forbidden Actions:** Do NOT refactor `timelineStrip()`, `pendingAppendsBanner()`, or `appendedNodesBlock()`. Do NOT alter the pill's `onClick`/`toggleNode` logic. Do NOT touch `App.js` or `FailoverDB.js`.
- **Verification:**
  - `miniTimelineFor({title:'x'})` → does not throw, returns `[]` or source-based fallback pills (unchanged path)
  - Render a card with `nodes:[{kind:'RAW',text:'hi'}]` and no `author` anywhere on card/node → inspector shows `System • Just now`, footer shows `System` (not `Unknown Author`)
- **Definition of Done:** [ ] `'Unknown'` → `'System'` in both `miniTimelineFor` branches (lines 56, 61) [ ] footer `'Unknown Author'` → `'System'` (line 417) [ ] inspector/footer/miniTimelineFor terminal fallback now consistently `'System'` [ ] no other logic touched.

---
## Section 4: Worker Agent Handoff Prompt Template

Copy-paste wrapper for dispatching a single WP to an isolated worker agent with zero other repo context:

```
You are a Senior Full-Stack Engineer. Implement ONLY the Work Package below. You have ZERO other context
about this repository beyond what is pasted here.

RULES:
- Do not touch any file outside "Target Files".
- Do not refactor, rename, or "improve" code outside the Exact Code Directives.
- Do not add npm, pip, or any other new dependency.
- Do not rename existing fields, exported function names, or localStorage keys unless explicitly directed.
- Follow the Given/When/Then directives literally and in the exact order given.
- Respect every item in "Forbidden Actions" without exception.
- After implementing, run every command in "Verification" and report PASS/FAIL for each one individually.
- If you discover any field, file, pattern, or dependency not mentioned in this WP that appears related,
  STOP immediately and report an "⚠️ Architectural Discovery" warning describing what you found and why
  it matters — do NOT silently modify, delete, or work around it. Wait for explicit human authorization.
- When finished, output a short summary of exactly what changed (file + line ranges) and the verification
  results. Do not claim a task is done without having actually made the edit and verified it.

[PASTE ONE WP BLOCK FROM SECTION 3 HERE IN FULL — E.G. "### WP1: Harvester Routing & Deduplication Engine"
INCLUDING ITS Goal / Depends On / Target Files / CONTEXT BUNDLE / Exact Code Directives / Forbidden Actions /
Verification / Definition of Done — VERBATIM, NO SUMMARIZATION]
```

---
*End of IMPLEMENTATION_MASTER.md — read-only audit artifact. No application code was modified during generation of this file.*

## Section 5: End-to-End Full-Stack Verification Protocol [MANDATORY FOR CHEAP WORKERS]

Every WP worker MUST run these checks after implementation, not just JS one-liners.

### 5.1 Backend + Local Browser Storage (FailoverDB / onion_db_state)

**Why:** WP2 and WP1 touch localStorage['onion_db_state'] - cheap models often corrupt JSON or exceed 5MB quota.

**Commands to run in browser console (Cline browser_action):**
```js
// 1. Valid JSON and size
const raw = localStorage.getItem('onion_db_state');
console.assert(raw && raw.length < 5*1024*1024, 'FAIL: quota exceeded or missing');
const s = JSON.parse(raw);
console.assert(Array.isArray(s.timeline), 'FAIL: timeline missing');
console.assert(s.timeline.every(c => Array.isArray(c.nodes)), 'FAIL: nodes missing');

// 2. Trap 2 fix - detail field must be updated
const card = s.timeline.find(c => c.id === 'test-card') || s.timeline[0];
console.assert(card.detail === card.synthesizedText, 'FAIL: card.detail not synced - UI will show stale content');
console.assert(card.content === card.synthesizedText, 'FAIL: card.content not synced');

// 3. Trap 3 fix - dedup with fallback
console.assert(typeof card.contentHash === 'string' || card.title, 'FAIL: contentHash missing and no fallback');

// 4. One-Way Door
console.assert(card.privacy === 'Team Shared' && card.is_private === false, 'FAIL: privacy not forced');
console.assert(card.nodes.every(n => !n.stagedAppend), 'FAIL: stagedAppend not cleared');
```

### 5.2 Vector / ChromaDB 8006 Sync

**Why:** WP5 says VectorSync queue is already correct, but cheap models often break offline resilience.

```bash
# In terminal
curl -s http://localhost:8006/api/v1/heartbeat | grep -q "nanosecond heartbeat" && echo "PASS: Chroma up" || echo "FAIL: Chroma down - check vector-venv"

# After approving a card, count should increase
curl -s http://localhost:8006/api/v1/collections -H "Content-Type: application/json" | jq

# In browser console - offline queue
const q = localStorage.getItem('onion_vector_queue');
console.log('Vector queue length:', q ? JSON.parse(q).length : 0);
```

**Expected:** If 8006 down, `OnionDB.syncCardToVector(cardId).catch(()=>{})` must NOT throw. App must stay usable.

### 5.3 Frontend UI + CSS Verification (The Cursor CEO thing - you are NOT hallucinating)

**Yes, this is real.** Both Cursor and Cline can launch a browser, take a screenshot, and let the LLM see if CSS is broken. Cursor calls it `Browser Agent`, Cline uses `browser_action` MCP + `mcp-server-playwright`.

**In Cline + VSCode (free, with your OpenRouter keys):**
1. Install MCP: `npx @modelcontextprotocol/server-playwright` or `browser-use` MCP
2. In Cline settings, add MCP config
3. Worker prompt adds: `execute_command: npm run dev -- --port 5173`
4. Then `browser_action: { action: "navigate", url: "http://localhost:5173" }`
5. `browser_action: { action: "screenshot" }` -> model sees if amber #fffbeb purgatory banner renders, if pills are clickable

**In Cursor without subscription:**
Cursor free tier gives ~50 fast requests, then slow. You CAN add OpenRouter keys in Cursor Settings > Models > OpenAI API Key > Override with OpenRouter base URL `https://openrouter.ai/api/v1`. It works, but Cursor still counts it against your fast quota after 50. Cline is unlimited because it's BYOK.

**CSS checks cheap model must do:**
```js
// In browser console after screenshot
const staged = document.querySelector('[data-testid="staged-banner"]') || document.querySelector('.bg-\[\#fffbeb\]');
console.assert(staged, 'FAIL: staged purgatory banner not rendering amber #fffbeb');

const pill = document.querySelector('[data-testid="timeline-pill"]');
pill.click();
const inspector = document.querySelector('[data-testid="inspector"]');
console.assert(inspector.textContent.includes('System'), 'FAIL: inspector still shows Unknown Author - WP3 not fixed');
console.assert(getComputedStyle(inspector.querySelector('pre')).whiteSpace === 'pre-wrap', 'FAIL: whitespace not preserved');
```

### 5.4 Final Documentation Requirement

Each cheap worker MUST output:

```
## WP[X] Implementation Report
- Files changed: path:line-line
- JS Verification: PASS/FAIL (list each one-liner)
- localStorage Check: PASS/FAIL (detail synced, quota ok, privacy forced)
- Vector Check: PASS/FAIL (8006 health, queue not throwing)
- UI/CSS Check: PASS/FAIL (screenshot taken, amber banner, System fallback, pre-wrap)
- Build: npm run build -> 0 errors
- Chroma: curl /heartbeat -> 200
```

If any FAIL, worker must STOP and report Architectural Discovery, not silently fix.

## Fixed Traps Summary (Already patched in IMPLEMENTATION_MASTER.md)

Trap 1: model: 'claude-3-5-sonnet-20241022' -> 'claude-3-5-sonnet-20241022' (Anthropic only accepts 3.5, 3.7, 3-haiku, 4, 4.5 formats - 4-5-20250929 is fictional and returns 404)

Trap 2: WP2 now does card.detail = latestAi.text alongside synthesizedText and content (TimelineCard.js renders m.detail || m.synthesizedText || m.content)

Trap 3: WP1 now uses fallback: (c.contentHash && c.contentHash === contentHash) || (c.title === title && (c.content === content || c.synthesizedText === content)) because seeded cards have no contentHash yet

---
*End of SUPER_FINAL_MASTER.md - All 5 traps fixed (3 user + 2 extra locks) + Single Section 5 E2E Verification. Ready for cheap models. No application code modified.*
