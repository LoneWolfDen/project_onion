# Continuum: Current Implementation Assessment

Target release: **Continuum Local Completion Release**
Assessed: 2026-10-01 · Branch `feature/local-completion-readiness` (same commit as `main`, `624db54`)
Method: read-only inspection of every tracked file (207). No code was run, changed, installed or deleted.

Labels used in this document:
- **Observation**: seen directly in the repository, with the path and symbol cited.
- **Assumption**: likely, but not verifiable from the repository alone.
- **Recommendation**: what this assessment proposes. All recommendations are collected in `docs/backlog/LOCAL_COMPLETION_BACKLOG.md`.

Classification scale: WORKING · PARTIAL · PLACEHOLDER · MOCKED · DOCUMENTED ONLY · BROKEN · UNKNOWN.
"WORKING" means the code path exists and is wired end to end in the browser. Nothing was executed during this assessment, so runtime behaviour on a corporate laptop is UNKNOWN until verified.

---

## 1. Executive summary

1. **The application is a readable, no-build React 18 app.** The UI is plain ES modules that use React through `htm` tagged templates (`modules/experience-pwa/static/js/main.js`, `js/components/*.js`). It is not compiled JSX and not minified. The only minified files are third-party vendor bundles. The main maintainability problems are a few very large components and a CSS file that is a frozen Tailwind build with nine patch layers on top.
2. **Local-first storage works, but it is fragile.** `FailoverDB` keeps everything in one `localStorage` key (`onion_db_state`). Write failures are swallowed silently, and a corrupt value is replaced by an empty state. There is no backup, no export of the data and no IndexedDB.
3. **The "failover" to backend services is not real.** `FailoverDB` defines `tryFetch` and `API_BASES` (:8000, :8001) but never calls them. `forceSync()` marks records `synced` without any network call. Only the vector service (:8006) is ever contacted.
4. **Project content can leave the machine.** `AiClient` posts harvested text to `openrouter.ai` or `api.anthropic.com` whenever an API key is stored in `localStorage`. This breaks the hard constraint against external transmission.
5. **The offline Q&A fallback makes up answers.** `mockQaFallback` returns hard-coded sentences about "Apollo", "PO-88921" and "Raj", attached to whichever card is first in scope.
6. **The handover generator exists and is deterministic, but it is not grounded enough.** `HandoverModal` exports HTML and print-to-PDF. It includes **unreviewed** `pending_processing` items, infers "closed" and category from keywords, and has no fact/inference labels, owners, actions or decisions.
7. **Spreadsheet import is not wired.** `parseWb` in `App.js` is never called, and the GDP and RAID drop zones have no handlers. Text paste and bookmarklet-clipboard paste are the only working ingestion paths.
8. **The app is not installable as a PWA.** There is no web app manifest. A service worker is registered from `VectorSync.js`, but it caches stale-first with no precache or versioning discipline.
9. **The servers are exposed to the network.** All Python services bind `0.0.0.0` with CORS `*`. The anchor service writes runtime data into a tracked seed file. `admin-relationship` hard-codes `/Users/wolf/...`.
10. **Diagnostics do not exist.** There are no error handlers, no logs, no health page and no diagnostic export. Tests are curl smoke scripts only, and one of them is broken.

---

## 2. Repository structure and history

| Area | Observation |
|---|---|
| Branches | Local: `main`, `relationship-model-v5`, `feature/local-completion-readiness` (all at `624db54`). The remote has 13 more branches (`feature/v018`, `feature/v020-clean`, `fix/p0-white-screen`, `fix/p1-privacy-pii`, `fix/p2-confidence-provenance`, `LoneWolfDen-prd_ppt`, …), and all appear merged or historical. |
| History | 94 commits, 2026-09-23 to 2026-09-30. Hackathon cadence: "SUPER-FINAL-MASTER", "P0/P1/P2 hotfix", "Finalize … hackathon demo". |
| Root | `README.md`, `STATE.md`, `GLOBAL_BRAIN.md`, `IMPLEMENTATION_MASTER.md` (44 KB), `MUSE_AUDIT_LOG.md`, `.clinerules` (AI-agent rules), a root copy of `Project-Onion-Relationship-Model.html`, `requirements.txt`, `samples/`, `data/seed/`. |
| `modules/0x-*` (01–09) | 45 spec files (PRD, API.yaml, SCHEMA.json, DECISIONS, TOKENS). Templated: all nine `TOKENS.md` files are byte-identical (same md5). **DOCUMENTED ONLY**, with no code. |
| Named modules with code | `experience-pwa` (the product), `platform-anchor` (:8000), `domain-cards-store` (:8001), `gdp-adapter` (:8003), `connected-bookmarklet` (:8004), `admin-relationship` (:8005), `vector-service` (:8006), `domain-fusion-engine/fuse.js`, `integrations-gdp-adapter/parse.js`, `integrations-connected-adapter/bookmarklet.js`. |
| Contract-only modules | `integrations-sharepoint-adapter`, `integrations-excel-parser`, `platform-pii-screener`: `CONTRACT.md` only. **DOCUMENTED ONLY.** |
| `docs/` | 33 files, including several superseded generations (`BACKLOG_v0.16`, `BACKLOG_v0.20`, `REGISTRATION_FIELDS` ×3, `SONNET-FINAL-*`, `SUPER-FINAL-MASTER`, `IMPLEMENTATION-MASTER-FINAL`). |

---

## 3. Frontend architecture

### 3.1 How React is loaded and rendered (WORKING)

- `static/index.html` loads four local UMD vendor scripts: `js/vendor/react.production.min.js` (18.3.1), `react-dom.production.min.js` (18.3.1), `htm.umd.js`, and `xlsx.full.min.js` (SheetJS 0.18.5). There is no CDN.
- `static/js/main.js` imports `App` and calls `window.ReactDOM.createRoot(...).render(window.React.createElement(App))`, with an on-page error box if that fails.
- Components bind `htm` to `React.createElement` (for example `const html = window.htm.bind(window.React.createElement)` in `TimelineCard.js`). Hooks come from `window.React`.
- Module cache-busting is done by hand with query strings (`main.js?v=drafts1`, `styles.css?v=demo5`). `service.py` strips the query string.

**Conclusion:** the UI is genuinely React 18, written as plain JavaScript ES modules plus htm. No transpiler, bundler or `package.json` exists. The PWA is **truly no-build** (Observation). There is one stray JSX file (`modules/experience-pwa/ProjectHeader.jsx`) that nothing can load (see §8).

### 3.2 Application source inventory (`static/js`)

| File | Lines | Role | Maintainability |
|---|---|---|---|
| `components/App.js` | 436 | Shell, persona/project state, registration, assistant, guide panel | Very long lines (some over 1,000 characters), with inline modal logic. Hard to maintain. |
| `components/AppCenter.js` | 303 | Centre column, Key Moments | Moderate |
| `components/AppLeft.js`, `AppRight.js` | 25, 113 | Sidebars, assistant panel | OK |
| `components/HarvesterPanel.js` | 826 | Data Park, staging, AI processing, review queue, approval, reset, AI key UI | Too large. Many "FIX" comments record history inline. |
| `components/TimelineCard.js` | 837 | Status card, provenance, drafts, privacy, edit, delete | Too large |
| `components/HandoverModal.js` | 268 | Handover pack (HTML/PDF/save) | Dense one-line functions and an embedded CSS string. Difficult to maintain. |
| `components/ProjectModal.js` | 59 | Register/edit project | OK |
| `core/FailoverDB.js` | 484 | localStorage repository | Readable |
| `core/AiClient.js` | 318 | OpenRouter/Anthropic/mock AI | Readable |
| `core/VectorSync.js` | 280 | Vector mirror queue, SW registration | Readable |
| `core/PiiGate.js`, `schema.js`, `confidence.js`, `matchExplain.js`, `timeAgo.js` | 28–52 each | Helpers | Good |
| `constants/personas.js`, `worldOfContinuum.js` | small | Persona roster (keep), footer | Good |
| `data/demoDataset.js` | ~39 KB | Fictional demo dataset (boot default) | Data |
| `data/mockSeed.js` | ~22 KB | Older test seed (`resetToSeedData`) | Data |
| `data/seedData.v2.js` | ~7 KB | **Imported by nothing.** Unused. | Remove candidate |

### 3.3 CSS (`static/css/styles.css`, 293 lines, 39 KB): PARTIAL, hard to maintain

Observation: the file is layered on top of a frozen build.
- **BLOCK 0** is a frozen **Tailwind v3.4.18 compiled output**, pasted as one minified line ("restored from index.html.legacy.bak"). There is no `tailwind.config`, input CSS or build script, so it **cannot be regenerated**.
- **BLOCKs 1–9** are hand-written patches. Several exist only to make up for utilities missing from the frozen build: "BLOCK 4: colour utilities the ESM components use but the frozen Tailwind build above never compiled", "ESM Phase-2 layout bridge … Without these, ESM emits bare <header>… unstyled stack", and "BLOCK 5 … overrides the .ho-* rules above". `!important` overrides appear (`.onion-card-private`).
- A static scan found **about 77 class names used in components with no CSS rule**. Examples: `overflow-hidden`, `rounded-lg`, `leading-relaxed`, `transition-colors`, `min-w-[180px]`, `text-[14px]`. Typos also appear: `text[10px]`, `text-[10]`. These classes silently do nothing. (The scan is regex-based, so treat the exact count as approximate.)
- `prefers-reduced-motion` is **not handled** in `styles.css` (0 occurrences). It is handled in `docs/relationship-v5/rm5.css`.
- No font files are bundled. `Inter` falls back to `system-ui`, which is acceptable offline.

### 3.4 Other HTML apps under `static/docs/`

| Path | Nature | Status |
|---|---|---|
| `docs/relationship-v5/` | Readable no-build React+htm explainer (see the earlier V5 review). Static model plus seed replay. | WORKING as a diagram. MOCKED as "live". |
| `docs/guide.html`, `docs/guide-app/*` | Earlier guide with its own React modules | WORKING (docs) |
| `docs/Continuum-V4-Final.html` | 217 KB **generated "React Artifact" export** with inline minified React and Tailwind. Loads **Google Fonts** (`fonts.googleapis.com`) and contains a link to `https://mckinsey.sharepoint.com/sites/collab/Phoenix`. | Generated, no reproducible process. Sensitive reference. External request. |
| `docs/RAG-Architecture.html` | Loads `https://cdn.tailwindcss.com` | **Breaks offline.** External request. |
| `docs/Project-Onion-Data-Model.html`, `docs/Project-Onion-Relationship-Model.html` | Earlier static pages | Superseded by V5 |

---

## 4. Capability classification

| # | Capability | Class | Evidence (path · symbol) | Notes |
|---|---|---|---|---|
| 1 | No-build React UI boot | WORKING | `static/index.html`, `js/main.js` | Local vendor only |
| 2 | Persona drop-down (testing) | WORKING | `constants/personas.js` `PERSONAS`; `App.js:405` `<select>` | **Keep as is** (owner instruction) |
| 3 | Client/project registration and edit | WORKING (local) | `App.js` register/edit slots → `FailoverDB.saveProject` | Stored only in localStorage |
| 4 | Project archive with justification | WORKING | `FailoverDB.archiveProject` | Mandatory justification enforced |
| 5 | localStorage persistence | PARTIAL | `FailoverDB.readLocal` / `writeLocal` (lines 51–113) | `writeLocal` swallows `QuotaExceededError`. A corrupt JSON value returns an empty state, which the next write then saves over the original. No schema version. |
| 6 | IndexedDB | DOCUMENTED ONLY | `.clinerules` says "IndexedDB/LocalStorage"; no IndexedDB code exists | |
| 7 | "Failover" to anchor/cards API | PLACEHOLDER | `FailoverDB.js:24` `API_BASES`, `:114` `tryFetch`, **never called** | `AppCenter.js:264`: "Pure-offline: never fetch localhost:8000" |
| 8 | Sync status / Force Sync | MOCKED | `FailoverDB.forceSync` (line 139) flips `pending_upload`→`synced` with no network call | The UI implies a server sync that never happens |
| 9 | Anchor service (:8000) | WORKING (standalone) | `modules/platform-anchor/service.py`; persists to `data/seed/anchors_persist.json` | Not used by the PWA. Writes runtime data into a tracked file. `DELETE /anchors/clear` has no authentication. |
| 10 | Cards store (:8001) | PARTIAL | `modules/domain-cards-store/service.py`, `STORE = {}` | In memory, lost on restart. Not used by the PWA. |
| 11 | GDP adapter (:8003) | MOCKED | `modules/gdp-adapter/service.py` `ingest_gdp` | Fills hard-coded demo values (`8399`, `O-5030460`, `acmespf`, `£129,768`) when the payload omits them |
| 12 | GDP Excel parser (Node) | PLACEHOLDER | `modules/integrations-gdp-adapter/parse.js` `parseGDPExcel` | Node-only (`import crypto`, `npm xlsx`) with no `package.json`. Invents defaults (`'8399'`, `'Execution'`, `'Green'`). Not used by the PWA. |
| 13 | Spreadsheet upload in PWA (GDP/RAID) | BROKEN (unwired) | `App.js:248` `parseWb` is never called; `HarvesterPanel.js:721-722` file inputs use `props.onGdpFile` / `props.onRaidFile`, which `App.js` never passes; the inputs are `display:none` inside a div with no click or drop handler | V5 lists it as "experience-pwa App.js: XLSX upload parser", which is inaccurate |
| 14 | Data Park text paste → stage | WORKING | `HarvesterPanel.onStage` → `piiScreen` → SHA-256 `contentHash` dedup → `FailoverDB.stageToDataPark` | |
| 15 | Bookmarklet clipboard paste → stage/refine | WORKING (paste path) | `HarvesterPanel.onStageClipboard`, `onRunClipboardHarvest`, `buildClipboardPayload` | Depends on a bookmarklet having run (see 27) |
| 16 | Human review (Gate 2) and approval | WORKING | `HarvesterPanel.onApproveAll`, `FailoverDB.markProcessed`, `smartAppendToCard`, `approveStaged` | Approval is all-or-nothing ("Approve All"); per-item edits are possible in the queue. `appendSuccess = true` is assumed without checking the result. |
| 17 | Duplicate detection | PARTIAL | Exact `contentHash` (`onStage`); `findSmartAppendMatch` (keyword); `VectorSync.querySimilarCards` (vector, threshold-based) | Exact match only, unless the vector service is running |
| 18 | PII screening | PARTIAL | `core/PiiGate.js` `piiScreen` | Phone numbers (US pattern only) and a noise keyword list. **Emails are deliberately not redacted** (comment says "redact emails", code is a no-op). Contains a test string `/Jane likes coffee/`. V5 and docs claim emails are redacted, which is inaccurate. |
| 19 | Privacy (Private / Team Shared) | WORKING (local) | `FailoverDB.updateCardPrivacy`, `updateNotePrivacy`; `AiClient.privacyMatchesCard` | In a single-user release this becomes "draft vs approved for export" (see architecture doc) |
| 20 | AI enrichment (live) | WORKING but **non-compliant** | `AiClient.callOpenRouter` (line 104, `https://openrouter.ai`), `callAnthropic` (line 154, `api.anthropic.com` with `anthropic-dangerous-direct-browser-access`) | Sends project text externally. Key stored in plain text in `localStorage` (`HarvesterPanel.saveKey`, line 363). |
| 21 | AI enrichment (offline mock) | WORKING (degraded) | `AiClient.mockResult` | Truncates text and adds keyword tags. Labelled "Offline mock AI" on cards (`aiEngineLabel`). Honest. |
| 22 | Smart assistant Q&A (live) | WORKING but **non-compliant** | `AiClient.askSmartAssistant` (line 265) → OpenRouter | Sends scoped cards externally |
| 23 | Smart assistant Q&A (offline) | MOCKED and **unsafe** | `AiClient.mockQaFallback` lines 242, 246 | Returns invented, hard-coded facts ("Apollo migration … VNet peering", "PO-88921 … depleted … Raj") attributed to a real card ID |
| 24 | Confidence % | WORKING (rule-based) | `core/confidence.js` `CONFIDENCE_RULE`, `confidenceBreakdown` | A transparent corroboration count, not a model output. Good. |
| 25 | Provenance on cards | PARTIAL | `TimelineCard.provenanceEntriesFor`, `sourceListFor`, `evidenceFor`; `card.nodes[]` RAW/AI | Source is a free-text label (`'Data Park Dropzone'`, `'Bookmarklet Clipboard'`). No file name, row, URL or captured-at hash is kept for imports. |
| 26 | Vector service + Chroma (:8006) | PARTIAL | `modules/vector-service/main.py`, `store.py`; `VectorSync.mirrorToVector`, `flushVectorQueue`, queue `onion_vector_queue` | Optional, with fire-and-forget design. Chroma's default embedding function downloads an ONNX model on first use (Assumption: blocked on a restricted laptop). `/ask` returns a placeholder answer string. CORS `*`. `PersistentClient("./chroma_data")` depends on the working directory. |
| 27 | Connected bookmarklets | UNKNOWN / likely BROKEN on real Connected | Three variants: `connected-bookmarklet/bookmarklet.js` (PUT to `http://localhost:8000`, hard-codes client "Acme Corp", invents fallback IDs), `integrations-connected-adapter/bookmarklet.js`, `static/bookmarklet.js` (copies to clipboard and clicks every "expand/show more" button) | Assumption: Salesforce Lightning CSP (`connect-src`) blocks the localhost `fetch`. The clipboard variant is the only plausible one. Auto-clicking the page is invasive. |
| 28 | Handover pack: HTML export | WORKING | `HandoverModal.downloadHtml` (line 155) | See §5 |
| 29 | Handover pack: PDF | WORKING (print dialog) | `HandoverModal.exportPdf` (line 171) → `window.open` + `print()` | Pop-up blockers fall back to HTML |
| 30 | Handover saved to memory | WORKING | `HandoverModal.saveToMemory` (line 186) → `saveNote`, privacy `Team Shared` | Saved as Team Shared with no review step |
| 31 | Key Moments / timeline | WORKING | `AppCenter.js` (filters `pending_processing`, line 170); `TimelineCard` | |
| 32 | Relationship Model V5 | WORKING (explainer) / MOCKED (story) | `static/docs/relationship-v5/*` | Static model. Its evidence claims drift from the code (rows 13 and 18). |
| 33 | Demo dataset and reset | WORKING but **dangerous** | `FailoverDB.resetToDemoDataset`; `HarvesterPanel.onResetSeed` (line 684), button at line 741 | **No confirmation.** One click wipes all local data and reloads. Card delete does confirm (`TimelineCard.js:464`). |
| 34 | Background "sync" from vector on load | PARTIAL | Inline script in `static/index.html` (`?sync` or `enableBackgroundSync`) | Hard-codes persona `'Brené'`. Only sets a timestamp. |
| 35 | Service worker | PARTIAL | `modules/experience-pwa/sw.js` (served at `/sw.js` by `service.py`), registered in `VectorSync.js:270` | Cache-first after the first visit, with no precache list, no version cleanup and no update prompt. Stale code is likely after edits. Only registered when VectorSync loads. |
| 36 | Web app manifest / installability | DOCUMENTED ONLY | No manifest file and no `<link rel="manifest">` | Not installable |
| 37 | Offline shell | PARTIAL | Works only after a first online visit has cached each file at runtime | No guaranteed offline start |
| 38 | Data backup / export / import of the store | DOCUMENTED ONLY | No code exports or imports `onion_db_state`. No `navigator.storage.persist()`. | Highest data-loss risk |
| 39 | Configuration / environment | PLACEHOLDER | Ports hard-coded in each `service.py`; `localStorage` keys `VECTOR_BASE_URL`, `LLM_PROVIDER`, `OPENROUTER_*`, `ANTHROPIC_API_KEY`; `.env` git-ignored and unused | No single config file and no startup script |
| 40 | Startup | PARTIAL | README / `docs/TESTING.md` describe manual `python3 service.py` per port; `docs/TESTING.md` uses `/Users/wolf/...` | The PWA alone (:8002) is enough for the core path |
| 41 | Logging / diagnostics | DOCUMENTED ONLY | No `window.onerror` or `unhandledrejection` handler, no log store, no export | |
| 42 | Tests | PARTIAL | `*/test-*.sh` curl scripts; `relationship-v5/lib/integrity.js` (model checks) | No JS unit tests and no browser tests. `experience-pwa/test-pwa-api.sh` pipes HTML into `json.tool`, so it fails by design. |
| 43 | Fusion engine | PLACEHOLDER | `modules/domain-fusion-engine/fuse.js` | Not imported anywhere. Cited only as V5 "evidence". |
| 44 | Admin relationship (:8005) | BROKEN off the author's machine | `admin-relationship/service.py:19,34` hard-coded `/Users/wolf/Developer/project_onion/...` (writes there) | |
| 45 | Copilot integration | DOCUMENTED ONLY | No Copilot code in `static/js` (commit 6d08877 mentions "copilot citations" but nothing remains) | |
| 46 | Outlook / Teams / SharePoint / OneDrive / OneNote | DOCUMENTED ONLY | `integrations-sharepoint-adapter/CONTRACT.md`; V5 "Vision" nodes; Harvester label "API Delta Scan Window (Outlook/Teams/GDP Status)" with date inputs only | The date inputs are UI only |
| 47 | CSV / PDF / Word / .eml / .msg / VTT import | DOCUMENTED ONLY | `accept=".xlsx,.xls,.csv"` on unwired inputs only | |
| 48 | Beeline, SMP | DOCUMENTED ONLY | SMP appears as an identifier (`sharepoint_smps`), not as a source | |

---

## 5. Handover readiness (summary; details in `LOCAL_COMPLETION_ARCHITECTURE.md` §3)

`HandoverModal` builds `buildReportModel()` → per project `groupFor()` → `{cards, risks, closed, open, counts}`, then renders to an HTML string.

| Concern | Observation |
|---|---|
| Includes unreviewed data | `scopedCards()` (line 81) filters by privacy, time and project but **not** `syncStatus`, so `pending_processing` items appear in exports. Contrast `AppCenter.js:170`, which excludes them. |
| Inferred status shown as fact | `isClosedCard` treats any mention of "approved", "signed" or "closed" as closed. `categoryFor` assigns categories by keyword. Neither result is labelled as inferred. |
| Missing sections | No overview, decisions, actions, owners, due dates, stakeholders, milestones, open questions, conflicts or "needs confirmation" sections |
| Provenance | Each line shows `source`, date, `syncStatus`, privacy and a short ID. No RAW text, file, row or link. The `#card-id` anchors do not resolve in the exported file. |
| AI | None is used in the handover. That is good for grounding. |
| Human review before export | Project selection and free-text notes only. No preview-and-approve step. |

---

## 6. Explicit identifications

### 6.1 Minified files treated as source
| File | Verdict |
|---|---|
| `static/js/vendor/react.production.min.js`, `react-dom.production.min.js`, `htm.umd.js`, `xlsx.full.min.js` | Legitimate third-party vendor files. Keep, but record versions and licences. SheetJS **0.18.5** is the last npm release and has known prototype-pollution/ReDoS advisories (Assumption: verify against current advisories before parsing untrusted files). |
| `static/css/styles.css` BLOCK 0 | **Minified generated output treated as source**, with no generator |
| `static/docs/Continuum-V4-Final.html` | Generated artifact with minified inline code |
| `static/docs/relationship-v5/data/domainModel.js` | Generated, **with** a reproducible generator (`generate_domain_model.py`). Acceptable. |

### 6.2 Files humans cannot reasonably maintain
- `components/HandoverModal.js`: dense one-line functions and HTML/CSS built by string concatenation.
- `components/App.js`: lines over 1,000 characters (registration/edit handlers inline).
- `components/HarvesterPanel.js` (826 lines) and `TimelineCard.js` (837 lines): several concerns per file, with layered "FIX" comments.
- `static/css/styles.css`: frozen Tailwind plus nine override blocks.
- `static/bookmarklet.js`: dense one-line ES5.

### 6.3 Generated files with no reproducible generation process
- `styles.css` BLOCK 0 (Tailwind 3.4.18)
- `docs/Continuum-V4-Final.html` (external "React Artifact" export)
- `modules/vector-service/chroma_data/*` (runtime database)
- `data/seed/anchors_persist.json` (written by the anchor service at runtime)

### 6.4 Source files that appear unused
| File | Evidence |
|---|---|
| `static/js/data/seedData.v2.js` | No importer |
| `modules/experience-pwa/ProjectHeader.jsx` | JSX cannot load in a no-build app. No reference. |
| `modules/domain-fusion-engine/fuse.js` | Not imported. Referenced only in V5 evidence strings. |
| `modules/integrations-gdp-adapter/parse.js` | Node module with no runner and no `package.json` |
| `modules/integrations-connected-adapter/bookmarklet.js` | Superseded by the other two bookmarklets |
| `FailoverDB.tryFetch`, `API_BASES` | Defined, never called |
| `App.js` `parseWb` | Defined, never called |
| `TimelineCard.js:174` `mockPillDate` | Mock date helper. Needs checking that no rendered path uses it. |

### 6.5 CSS patches compensating for inaccessible source
`styles.css` "ESM Phase-2 layout bridge", "BLOCK 4: colour utilities … the frozen Tailwind build above never compiled", BLOCK 5 (overrides `.ho-*`), BLOCKs 6–8 (cosmetic and readability fixes keyed to existing class names).

### 6.6 Duplicate or competing implementations
| Concern | Copies |
|---|---|
| Bookmarklet | `connected-bookmarklet/bookmarklet.js`, `integrations-connected-adapter/bookmarklet.js`, `experience-pwa/static/bookmarklet.js` |
| GDP parsing | `integrations-gdp-adapter/parse.js` (Node), `gdp-adapter/service.py` `ingest_gdp`, `App.js` `parseWb`, with **three different column mappings** |
| PII screening | `core/PiiGate.js`, a separate `piiScreen` inside `static/bookmarklet.js`, `platform-pii-screener/CONTRACT.md` |
| `categoryFor` / risk keyword rules | `HandoverModal.js` and `TimelineCard.js` (different rules) |
| Project matching | `HandoverModal.matchProject`, `TimelineCard.matchRef`, `AppCenter` `centerMatch` |
| Relationship model pages | Root `Project-Onion-Relationship-Model.html` (9.5 KB) vs `static/docs/Project-Onion-Relationship-Model.html` (12.3 KB) vs `docs/relationship-v5/` |
| Seed data | `mockSeed.js`, `demoDataset.js`, `seedData.v2.js`, `data/seed/*.json`, `seed_cards.py`, `seed_clients.py` and its byte-identical copy `seed_clients.pylear` |
| Guides | `guide.html`, `guide-app/`, `relationship-v5/` Engineering pages |
| Backlogs and masters | `IMPLEMENTATION_MASTER.md`, `docs/IMPLEMENTATION-MASTER-FINAL.md`, `docs/SUPER-FINAL-MASTER.md`, `docs/BACKLOG_v0.16/0.20.md`, `docs/SONNET-FINAL-*.md`, `docs/NEXT_SPRINT.md` |

### 6.7 Stale hackathon-only files
`docs/HACKATHON_DEMO_DATA.md`, `docs/MINIMUM_HACKATHON_DATASET_PLAN.md`, `docs/Demo_Walkthrough_Dataset.md`, `docs/SONNET-FINAL-*`, `docs/SUPER-FINAL-MASTER.md`, `MUSE_AUDIT_LOG.md`, `relationship-v5` "Why"/"Success" judge tabs, the `WORLD_OF_CONTINUUM` footer and signature (`constants/worldOfContinuum.js`, `App.js`), and `docs/Continuum-V4-Final.html` (title "React Artifact").

### 6.8 Runtime data tracked in Git
| Path | Evidence |
|---|---|
| `modules/vector-service/chroma_data/chroma.sqlite3` + `*/data_level0.bin` etc. (5 files) | Tracked despite `.gitignore` entries `**/chroma_data/`, `*.sqlite3`, `*.bin` (added before the ignore rules). Contains 8 demo cards (authors Daniel/Malcolm; clients Acme Corp/NovaTech Labs). |
| `data/seed/anchors_persist.json` | Rewritten by `platform-anchor/service.py` `PERSIST_PATH` on every PUT |
| `*.bak.*` files (4) | Tracked despite the `*.bak` ignore rule |

### 6.9 Files that may contain client data, personal data, credentials or tokens
No API keys, tokens or passwords were found by pattern scan (`sk-or-v1-…`, `sk-ant-…`, `AKIA…`, `ghp_…`, `Bearer …`, `password=`). Items needing owner review:

| Path | Concern |
|---|---|
| `static/docs/Continuum-V4-Final.html` | Contains `https://mckinsey.sharepoint.com/sites/collab/Phoenix`, a real corporate tenant URL. V5's own integrity rule forbids that name. |
| `.clinerules`, `docs/TESTING.md`, `MUSE_AUDIT_LOG.md`, `seed_cards.py`, `seed_clients.py`, `admin-relationship/service.py`, `platform-anchor/README.md` | Personal path `/Users/wolf/...` (username) |
| `docs/TESTING.md` | Lists "GE" as a client. Confirm it is fictional. |
| `data/seed/*`, `gdp-adapter/service.py`, bookmarklets | Realistic-format identifiers (`006Uj00000QOBkvIAH` Salesforce ID, `O-5030460`, GDP `8399`, SMP `acmespf`/`rrdiscovery`/`clienta`, file pattern `PS-v…(O-…)-V6.3_ESC`, budget `£129,768`). Confirm they are synthetic and not copied from real records. |
| Demo emails | `@acme.com`, `@acme.co.uk`, `@novatechlabs.com` are real registered domains. The `.example` addresses are safe. Prefer `.example` throughout. |
| `localStorage` at runtime | Holds API keys in plain text (`OPENROUTER_API_KEY`, `ANTHROPIC_API_KEY`). Not in Git, but exposed to any script on the origin. |

---

## 7. Ports and startup dependencies

| Port | Service | Needed for core use? | Bind | CORS |
|---|---|---|---|---|
| 8002 | `experience-pwa/service.py` (static server) | **Yes** (or any static server) | `0.0.0.0` | n/a |
| 8000 | `platform-anchor` | No (PWA never calls it) | `0.0.0.0` | `*` + credentials |
| 8001 | `domain-cards-store` | No | `0.0.0.0` | `*` |
| 8003 | `gdp-adapter` | No | `0.0.0.0` | `*` |
| 8004 | `connected-bookmarklet` | No | `0.0.0.0` | `*` |
| 8005 | `admin-relationship` | No; broken path | `0.0.0.0` | `*` |
| 8006 | `vector-service` (FastAPI + Chroma) | Optional (similarity) | uvicorn CLI (README: default host) | `localhost:8002`, `localhost:8000`, **`*`** |

Assumption: on a restricted laptop, Python may be available but `pip install chromadb` (and its ONNX model download) may not. The core release must therefore depend on **port 8002 only**. Even that could be replaced by a file the browser opens directly, if module loading allows it (ES modules do not load over `file://` in Chrome, so a local static server stays necessary). See the architecture document.

---

## 8. Diagnostics and supportability: current state

| Item | State | Evidence |
|---|---|---|
| Timestamped app logs | DOCUMENTED ONLY | none |
| Unhandled JS errors | Only the boot `try/catch` in `main.js` | no global handlers |
| Failed network requests | Silent | `FailoverDB.tryFetch` unused; `VectorSync` queues; `AiClient` falls back silently except for `aiFallbackReason` on cards |
| Service-worker events | Partial | `sw.js` posts `onion:vector-online/offline`; nothing records them |
| Storage failures | Silent | `writeLocal` `catch (err) {}` |
| Vector-service failures | Queued silently | `VectorSync.writeQueue` dispatches `onion:vector-queue` |
| Startup health checks | DOCUMENTED ONLY | `vectorHealth()` exists, but there is no consolidated health view |
| Browser/version info | none | |
| Redaction | n/a | |
| Diagnostic export | none | `relationship-v5` validation scripts are display-only console snippets |

---

## 9. What is solid and worth keeping

- The no-build React+htm approach with local vendor files.
- The Data Park → human review → approved card flow (`stageToDataPark`, `pending_processing`, `markProcessed`), including `contentHash` dedup.
- RAW + AI nodes per card (`ensureTimelineNodes`) and the transparent `confidence.js` rule.
- Honest engine labelling of AI output (`aiEngineLabel`: Live / Offline mock / Mock fallback).
- The deterministic, AI-free handover generator as a base.
- Relationship V5's graph engine (`lib/layout.js`, `lib/graph.js`, `lib/highlight.js`) and its integrity-check pattern.
