# Continuum: Source Integration Register

Status: assessment and backlog input only. Nothing here is implemented unless the "Current implementation" row says so, with evidence.
Evidence base: `docs/assessments/CURRENT_IMPLEMENTATION_ASSESSMENT.md`. Backlog IDs refer to `docs/backlog/LOCAL_COMPLETION_BACKLOG.md`.

Guiding rules:
- Knowing a portal URL does **not** mean Continuum can retrieve from it. Cross-origin, cookie-authenticated retrieval from `http://127.0.0.1:8002` is blocked by CORS and SameSite cookie rules unless the source system explicitly allows it.
- No automated login, no credential capture, no scraping that bypasses corporate controls, and no browser automation of Copilot.
- Every import creates a `Source` record (file name, SHA-256, adapter and version, sheet/row, imported-at, as-of date) and lands in **Review** before it is retained.
- A placeholder, sample file or contract is **not** an integration.

---

## 1. Level classification (owner-defined, applied to all sources)

| Source | V1: Controlled manual import or export | V2: Assisted refresh or bounded retrieval | V3: Approved live integration |
|---|---|---|---|
| **GDP** | Excel import | Authenticated URL retrieval | Full API |
| **Connected** | Export import | Refresh workflow | Full integration |
| **Outlook** | .eml / .msg | Folder export | Graph |
| **Teams** | Transcript import | Meeting recap retrieval | Graph |
| **SharePoint** | File upload | URL references | Graph |
| **OneNote** | Export | Notebook sync | Graph |
| **Copilot** | User uploads file | Structured prompt package | Agent |
| Beeline | Report export (CSV/XLSX) import | Scheduled report delivery, then import | Vendor API |
| SMP | Export import | URL references | API |
| OneDrive | File upload (from the synced folder) | Folder re-scan of a user-picked local synced folder | Graph |
| Excel | .xlsx/.xls upload | Re-import with row-level diff | Graph workbook API |
| CSV | .csv upload | Folder re-scan / re-import with diff | n/a (owned by the source system) |
| PDF | Text-PDF upload | Batch folder import | Graph (file retrieval only) |
| Word | .docx upload | Batch folder import | Graph (file retrieval only) |
| Email files | .eml / .msg / .txt upload | Batch folder import | n/a (see Outlook V3) |
| RAID logs | .xlsx upload with template mapping | Re-import with row-level diff | SharePoint list / Graph |
| Local manual notes | Typed or pasted in the app | Import .md/.txt files | Sync to an approved M365 location (Graph) |

Priority summary:

| Source | V1 | V2 | V3 |
|---|---|---|---|
| Local manual notes | **P0** | P1 | P3 |
| Excel (engine) | **P0** | P2 | P3 |
| CSV | **P0** | P2 | n/a |
| RAID logs | **P0** | P1 | P3 |
| GDP | **P0** | P2 | P3 |
| Connected | P1 | P2 | P3 |
| Email files | P1 | P2 | n/a |
| Outlook | P1 (via email files) | P2 | P3 |
| Teams | P1 | P2 | P3 |
| Word | P1 | P2 | P3 |
| SharePoint | P1 | P2 | P3 |
| OneDrive | P1 | P2 | P3 |
| Copilot | P1 | P2 | P3 |
| PDF | P2 | P2 | P3 |
| OneNote | P2 | P3 | P3 |
| Beeline | P2 | P3 | P3 |
| SMP | P2 (after definition) | P3 | P3 |

---

## 2. Common profiles (referenced from the source tables)

**B-LOCAL (browser file import, all V1 file sources).** Auth: none (the user already has the file). Browser: `<input type=file>` and drag-drop on all browsers; the File System Access API (`showDirectoryPicker`) only in Chrome/Edge. CORS: not applicable. API: none. Graph: none. App registration: none. Admin consent: none. Restricted-laptop feasibility: **high**, provided downloads and local files are allowed. Offline: full. Parsing happens in the browser; content never leaves the device.

**B-FOLDER (V2 folder re-scan).** The user picks a local folder once (Chrome/Edge `showDirectoryPicker`; the handle is kept in IndexedDB and permission is re-prompted per session). Continuum re-reads the files when the user clicks "Refresh". Safari: not supported, so it falls back to multi-file selection. No background polling. Feasibility: medium. It depends on the browser policy `FileSystemReadAskForUrls` / `DefaultFileSystemReadGuardSetting` (Assumption: confirm with IT).

**G3 (Microsoft Graph live, V3).** Requires an Entra ID app registration (SPA platform, `http://localhost`/`127.0.0.1` redirect URI) and MSAL.js vendored locally. Delegated permissions only (for example `Mail.Read`, `Files.Read`, `Sites.Read.All`, `Notes.Read`, `OnlineMeetingTranscript.Read.All`). Admin or tenant consent is likely, because many tenants disable user consent and several of these scopes always need admin consent. Graph supports CORS for SPAs. Data moves from M365 to the local device; tokens are held in browser memory/session storage. This changes the security posture (a registered app with tenant access) and **needs governance approval**. Priority P3 for all G3 items.

**Provenance (all).** `Source{kind, fileName, sha256, importedAt, adapter@ver, asOf}` plus `sourceRef{sourceId, sheet?, row?, field?, messageId?, timestamp?}` on each item.

**Stale detection (all).** `asOf` (from the content: Status Date, Sent date, meeting date) versus a per-source threshold. The handover marks "Needs confirmation (stale)".

**Duplicate detection (all).** Level 1: the file `sha256` equals a previous Source, so warn ("already imported on …"). Level 2: the row/item natural key (source-specific). Level 3: the existing `contentHash` (`HarvesterPanel.onStage`). Level 4 (optional): vector similarity when :8006 is available.

---

## 3. Source streams

Each table records the 22 required attributes per level. "→ B-LOCAL" means the common profile applies unchanged.

### 3.1 GDP (delivery dashboard and weekly Excel export)

**Repository evidence:**
- `modules/integrations-gdp-adapter/parse.js` `parseGDPExcel`, `EXACT_COLUMNS`: Node only (`import crypto`, `npm xlsx`) with no `package.json`. It defaults missing values to `'8399'`, `'Execution'` and `'Green'`, which invents data. PLACEHOLDER.
- `modules/gdp-adapter/service.py` `ingest_gdp`: in-memory `STORE`, fills demo defaults (`O-5030460`, `acmespf`, `£129,768`). MOCKED.
- `data/seed/gdp_export.json`: a 2-record fictional sample using a *different* column set (`Engagement Name, Client, Status, GDP ID, Opportunity Number, Connected Record ID, SharePoint SMP, Budget, Significance`).
- `static/js/components/App.js:248` `parseWb`: browser SheetJS parser that maps `Project ID|ProjectID`, `Opportunity ID|Opp ID`, `Description|Summary|Title`, **never called**. BROKEN (unwired).
- `HarvesterPanel.js:721` "Drop Weekly GDP Tracker Spreadsheet": the input is hidden, has no handler and its prop is not passed.
- `ProjectModal`/`App.js` `extractGdpId(gdpUrl)`: parses the GDP ID from `/project-details/{id}` (Observation from the call site). WORKING for URL text only.
- Documented columns: `docs/SOURCES_CONFIG.md:21` and `relationship_model.json` `gdp_excel`.

**Can Excel/CSV be parsed today?** Technically yes. SheetJS 0.18.5 is vendored and loaded as `window.XLSX` in `static/index.html`, and reads .xlsx/.xls/.csv in the browser. Functionally no: no wired UI path exists, and no adapter uses the documented columns.

**Expected column mapping (proposed V1 adapter `adapters/gdpExcel.js`; confirm with the system owner):**

| GDP column (documented) | Continuum field | Notes |
|---|---|---|
| Engagement Name | `project.engagementName` | Display only |
| Account Name | `project.client_name` match | EXACT match to the client; mismatch → Needs confirmation |
| GDP ID | `project.gdp_id` | **Join key** (EXACT) |
| Project ID | `project.project_ids[]` | **Join key** (EXACT, normalised with `projectIdEquals`) |
| GDD, GDM, PrgM, EM/DL | `stakeholders[] {role, name}` | Names are personal data, kept locally |
| Status Date | `item.asOf` | Drives staleness. Week bucket. |
| Current Phase | `status.phase` | Fact |
| Status Indicator | `status.rag` | Fact (R/A/G as given, not inferred) |
| Start Date / End Date | `project.start/end` | Conflict check against the anchor's dates |
| Location, Practice, Business Unit / BSV, Business Unit | `project.meta` | Optional |
| Summary | `item.content` (RAW node) | Text goes through PII screening, then Review |

Natural key per row: `GDP ID + Project ID + Status Date`. Rows with the same key and different content → Conflicting evidence.
Missing values stay **empty**, never defaulted (unlike `parse.js`).

| Attribute | V1: Excel import | V2: Authenticated URL retrieval | V3: Full API |
|---|---|---|---|
| User journey | Download the weekly export from GDP → drop it into Continuum → preview the mapped rows → choose the project match → stage → review → approve | The user clicks "Refresh from GDP" for a project and Continuum retrieves the latest status for that GDP ID | GDP pushes or exposes status by API; Continuum pulls on demand |
| Current implementation | Unwired parser (`parseWb`), Node placeholder (`parse.js`), mocked service | None. `headCheckExists()` in `parse.js` does a HEAD `fetch` (cross-origin; would fail). | None |
| Missing implementation | Browser adapter with a column map, preview UI, Source record, natural-key dedup, staleness | A sanctioned retrieval mechanism (see the feasibility note) | Everything |
| Expected data format | .xlsx/.csv, first sheet, header row | HTML/JSON from the GDP portal (unknown) | JSON API (unknown) |
| Authentication | None (file in hand) | GDP portal session (corporate SSO) | Service credential or delegated OAuth (unknown) |
| Browser restrictions | → B-LOCAL | Cross-origin fetch from 127.0.0.1 does not carry GDP cookies (SameSite/third-party cookie blocking) | Same as V2 unless the API supports a token flow |
| CORS restrictions | n/a | **Blocking**, unless GDP returns `Access-Control-Allow-Origin: http://127.0.0.1:8002` with credentials | Must be enabled by the GDP owner, or proxied (proxy = hosting, out of scope) |
| API availability | n/a | **UNKNOWN**: confirm with the system owner | **UNKNOWN** |
| Graph dependency | None | None | None (unless GDP sits on SharePoint) |
| App registration | None | Possibly (if GDP uses Entra SSO and offers an API) | Likely |
| Admin / tenant consent | None | GDP owner approval at minimum | GDP owner and IT approval |
| Privacy / data handling | Contains staff names and commercial status. Stays local. Summary is PII-screened. | Same plus session handling risk | Same, plus a standing access token |
| Restricted-laptop feasibility | **High** | Low (technical and policy) | Low |
| Offline behaviour | Fully offline after download | Requires the network. Falls back to V1. | Requires the network |
| Provenance | `Source{file, sha256, sheet, row, Status Date}` | `Source{url (text), retrievedAt, response hash}` | API record ID and version |
| Stale-data detection | `Status Date` older than 14 days → Needs confirmation | `retrievedAt` and `Status Date` | API timestamps |
| Duplicate detection | File hash, then natural key | Natural key | API ID |
| Acceptance criteria | A sample GDP export imports with 100% of rows previewed; unknown columns are listed; no defaulted values; rows for other projects are excluded with a count; approved rows appear with a citation | Owner-documented mechanism; no stored credentials; no login automation | Owner-approved API contract |
| Verification | Fixture files (synthetic) in `tests/fixtures/gdp/`; browser test page asserts the mapping; manual check against the source spreadsheet | Owner sign-off plus a manual test on the work laptop | Integration test in an approved environment |
| Smallest safe slice | Wire one file input → `adapters/gdpExcel.js` (pure function: rows → items) → existing `stageToDataPark` | **Interim (within V1):** "Open GDP export page" link-out (the URL is text only), then the user downloads and imports | n/a |
| Blocker / external | A real (or sanitised) export header row to confirm column names | GDP owner: is there an export URL or API? CORS? Policy on bookmarklets? | GDP owner and IT |
| Priority | **P0** | P2 | P3 |

**Same-browser authenticated retrieval: assessment.** Continuum's origin (`http://127.0.0.1:8002`) differs from GDP's origin. A `fetch` from Continuum will not include GDP session cookies by default, and with `credentials:'include'` it still needs GDP to answer with explicit CORS credentials headers for that origin. **It is not possible without changes on the GDP side.** The only same-session options are user-initiated actions **inside the GDP tab**, such as a bookmarklet that copies visible data to the clipboard (the pattern of `static/bookmarklet.js`), or the user downloading the export. Both need confirmation that corporate policy permits them. Do not auto-click page elements (`static/bookmarklet.js` `expandCollapsed()` currently does) without approval.

**Confirm with the GDP system owner:** (1) the official export names and column headers, plus a sanitised sample; (2) whether Summary may contain client-confidential text; (3) whether an API or a CORS-enabled read endpoint exists or is planned; (4) whether bookmarklet or clipboard capture in the GDP page is acceptable use; (5) the expected export cadence and Status Date semantics; (6) the meaning of "SMP" and "SharePoint SMP" in GDP data.

### 3.2 Connected (CRM / Opportunity record and Chatter)

**Repository evidence:**
- Three bookmarklets: `modules/connected-bookmarklet/bookmarklet.js` (PUT to `http://localhost:8000`, hard-coded `clientName='Acme Corp'`, fallback IDs `O-5030460`/`8399`/`acmespf`); `modules/integrations-connected-adapter/bookmarklet.js` (scrapes the Details tabs, the Notes & Attachments table and the Chatter `.feedItem`); `static/bookmarklet.js` (clipboard "9-field array", auto-expands the page, its own `piiScreen`).
- `modules/connected-bookmarklet/service.py` (:8004) serves `/install`.
- PWA: `HarvesterPanel.onStageClipboard` / `onRunClipboardHarvest` accept the pasted clipboard JSON. WORKING (paste side only).
- `extractConnectedId(url)` takes the 18-character `006…` ID from Opportunity URLs (registration modal).
- The record ID format `006Uj…` and the Opportunity number `O-xxxxxxx` follow Salesforce conventions (Assumption: Connected is Salesforce Lightning).

**Expected fields (proposed V1 export mapping; confirm with the owner):**

| Export column (expected) | Continuum field | Join |
|---|---|---|
| Opportunity ID (18-char `006…`) | `project.connected_record_ids[]` | EXACT |
| Opportunity Number (`O-…`) | `project.opportunity_numbers[]` | EXACT |
| Opportunity Name, Account Name | display / client check | EXACT on Account |
| Stage, Close Date, Probability | `commercial.stage/closeDate` | Fact with `asOf` = export date |
| Amount / Currency | `commercial.amount` | Sensitive; local only; optional |
| Opportunity Owner | `stakeholders[]` | Personal data |
| Chatter: Post Body, Created By, Created Date, Parent ID | item RAW node | Join by Parent ID = Opportunity ID |

| Attribute | V1: Export import | V2: Refresh workflow | V3: Full integration |
|---|---|---|---|
| User journey | Run a saved Connected report (Opportunities, and Chatter if available) → export CSV/XLSX → import → preview → review | The user re-exports the same saved report (or receives a report subscription email) → import → Continuum shows only changed rows (diff by Opportunity ID + field) | Continuum queries the CRM API for linked Opportunity IDs |
| Current implementation | None for exports. Clipboard paste of bookmarklet output works. | None | None |
| Missing implementation | `adapters/connectedReport.js`, column map, diff | Diff engine (shared with Excel V2), "last imported" per report | OAuth client, API mapping |
| Expected data format | CSV/XLSX report export | Same | REST JSON |
| Authentication | None (file in hand) | None (file in hand) | OAuth via a CRM connected app |
| Browser restrictions | → B-LOCAL | → B-LOCAL / B-FOLDER | CORS allow-list on the CRM required |
| CORS restrictions | n/a | n/a | CRM admin must allow-list the origin |
| API availability | n/a | Report subscriptions (Assumption) | CRM REST API exists in principle; access is UNKNOWN |
| Graph dependency | None | None (unless subscription email is read via Outlook V3) | None |
| App registration | None | None | CRM connected app (admin) |
| Admin / tenant consent | The user's report-export permission must exist | Same | CRM admin plus security approval |
| Privacy / data handling | Commercial amounts and names. Local only. | Same | Standing token |
| Restricted-laptop feasibility | **High**, if export permission exists (UNKNOWN) | High | Low |
| Offline behaviour | Full | Full after download | Network |
| Provenance | `Source{file, sha256, row, Opportunity ID}` | Plus `previousSourceId`, diff | API record and SystemModstamp |
| Stale-data detection | Export date older than 30 days | Diff shows no change since date X | Last-modified |
| Duplicate detection | Opportunity ID + field; Chatter: Post ID or (author, date, body hash) | Same | Record ID |
| Acceptance criteria | Rows map to the correct project by EXACT ID only; unmatched rows listed; nothing auto-retained | Changed, new and removed rows shown before staging | Approved API contract |
| Verification | Synthetic CSV fixtures; manual check against the source report | Two fixture versions; assert the diff | Approved environment |
| Smallest safe slice | CSV path first (no SheetJS dependency for parsing), reusing the generic Excel/CSV engine | Generic diff over the natural key | n/a |
| Blocker / external | Confirm report export permission and available fields (Chatter export may not exist) | Same | CRM owner/admin |
| Priority | P1 | P2 | P3 |

**Same-browser authenticated retrieval.** Not possible from Continuum's origin, for the same CORS and cookie reasons as GDP. The bookmarklet-to-clipboard path runs *inside* the authenticated tab, so it is technically viable but **policy-dependent**. Lightning's CSP will block the `fetch('http://localhost:8000/…')` variant (Assumption, high confidence), so only the clipboard variant is plausible. Recommendation: retire the `fetch`-to-localhost bookmarklet, and keep one clipboard bookmarklet as an optional V2 aid after a policy check. No auto-clicking. Read only what is visible.

**Confirm with the Connected system owner:** export permission; the available report types (Opportunity, Chatter/Feed); field names; whether Chatter is exportable; acceptable use of clipboard capture; whether amounts may be stored locally.

### 3.3 Beeline (contingent workforce / VMS; Assumption: owner to confirm the purpose)

| Attribute | V1: Report export import | V2: Scheduled report delivery | V3: Vendor API |
|---|---|---|---|
| User journey | Export the worker/assignment report → import → map workers to projects | Scheduled report lands as a file (email/SharePoint) → user saves → import with diff | API pull |
| Current implementation | None (no reference in the repository) | None | None |
| Missing implementation | Everything; a field list is needed | Diff | Everything |
| Expected data format | CSV/XLSX (Assumption) | Same | REST (Assumption) |
| Authentication | None (file) | None (file) | Vendor OAuth/API key |
| Browser restrictions | → B-LOCAL | → B-FOLDER | CORS unlikely |
| CORS restrictions | n/a | n/a | Likely blocked (needs a server) → violates local-only |
| API availability | n/a | UNKNOWN | UNKNOWN |
| Graph dependency | None | None | None |
| App registration | None | None | Vendor-side |
| Admin / tenant consent | None | None | Procurement/vendor |
| Privacy / data handling | **High**: worker names, rates. Store only role, start/end and project; drop rates by default. | Same | Same |
| Restricted-laptop feasibility | High | Medium | Low |
| Offline behaviour | Full | Full | Network |
| Provenance | File + row + worker ID | + diff | API ID |
| Stale-data detection | Report date | Report date | API timestamp |
| Duplicate detection | Worker ID + assignment ID | Same | Same |
| Acceptance criteria | Rate columns excluded unless explicitly enabled | Diff shown | n/a |
| Verification | Synthetic fixtures | Fixtures | n/a |
| Smallest safe slice | Generic CSV engine + column picker (no dedicated adapter) | Generic diff | n/a |
| Blocker / external | Confirm the purpose and allowed fields | Same | Vendor + IT |
| Priority | P2 | P3 | P3 |

### 3.4 SMP (meaning to be confirmed)

Repository evidence: "SMP" appears only as an identifier: `sharepoint_smps` (`data/seed/gdp_export.json`, `gdp-adapter/service.py` "SharePoint SMP": `acmespf`). No source code. Assumption: a project SharePoint site code or a service-management portal. **Owner must define it before design.**

| Attribute | V1: Export import | V2: URL references | V3: API |
|---|---|---|---|
| User journey | Export from SMP → import | Store SMP URLs and codes on the project; open them in a new tab | API pull |
| Current implementation | Identifier field only (`project.sharepoint_smps`) | Identifier stored. No link-out. | None |
| Missing implementation | Definition, format | Link-out list with a "last checked by user" date | Everything |
| Expected data format | UNKNOWN | URL text | UNKNOWN |
| Authentication | None | The browser's own session when the user opens the link | UNKNOWN |
| Browser restrictions | → B-LOCAL | None (plain navigation) | UNKNOWN |
| CORS restrictions | n/a | n/a (no fetch) | Likely blocking |
| API availability | n/a | n/a | UNKNOWN |
| Graph dependency | None | None | Possibly (if SharePoint) |
| App registration | None | None | Possibly |
| Admin / tenant consent | None | None | Possibly |
| Privacy / data handling | UNKNOWN | URLs may reveal client names; local only | UNKNOWN |
| Restricted-laptop feasibility | UNKNOWN | High | Low |
| Offline behaviour | Full | Links work only online | Network |
| Provenance | File | URL text + user-confirmed date | API |
| Stale-data detection | Export date | "Last checked" date | API |
| Duplicate detection | UNKNOWN | URL normalisation | API ID |
| Acceptance criteria | Defined after clarification | No automatic fetching | n/a |
| Verification | — | Manual | — |
| Smallest safe slice | None until defined | Show stored SMP references as links in project details and the handover | — |
| Blocker / external | **Definition** | None | — |
| Priority | P2 | P2 | P3 |

### 3.5 Outlook (mailbox)

| Attribute | V1: .eml / .msg | V2: Folder export | V3: Graph |
|---|---|---|---|
| User journey | Drag selected emails from Outlook to a folder (or "Save as") → import into Continuum → preview headers and body → review | The user exports or saves a project folder's messages to a local folder → "Refresh" re-scans it (B-FOLDER) | Continuum reads messages matching project IDs via Graph |
| Current implementation | None | None | None (V5 marks it "Vision") |
| Missing implementation | See Email files (§3.14), which is the shared parser | Folder re-scan plus per-message dedup | → G3 |
| Expected data format | RFC 822 `.eml`; Outlook `.msg` (OLE compound file) | Same, in bulk | Graph `message` JSON |
| Authentication | None | None | → G3 (`Mail.Read` delegated) |
| Browser restrictions | Dragging from new Outlook/OWA to the desktop may yield `.eml` or nothing. Classic Outlook yields `.msg`. (Assumption: verify on the work laptop.) | → B-FOLDER | → G3 |
| CORS restrictions | n/a | n/a | Graph supports CORS |
| API availability | n/a | n/a | Graph Mail API |
| Graph dependency | None | None | Yes |
| App registration | None | None | Yes |
| Admin / tenant consent | None | None | Likely |
| Privacy / data handling | **High**: third-party personal data and signatures. Screen and preview before retention; store body extracts, not attachments, by default. | Same | Same + standing token |
| Restricted-laptop feasibility | Medium–high | Medium | Low |
| Offline behaviour | Full | Full | Network |
| Provenance | `Message-ID`, Date, From (display), Subject, file hash | Same | Graph message ID |
| Stale-data detection | Sent date | Sent date | Received date |
| Duplicate detection | `Message-ID` header; else hash(from+date+subject) | Same | Graph ID |
| Acceptance criteria | Thread replies do not duplicate quoted text (strip quoted blocks); attachments listed, not imported | Re-scan imports only new Message-IDs | n/a |
| Verification | Synthetic .eml/.msg fixtures | Fixture folder | — |
| Smallest safe slice | `.eml` only (plain-text parse, no new vendor); `.msg` later | — | — |
| Blocker / external | `.msg` parsing needs a CFB reader (SheetJS bundles CFB support internally; reuse must be verified) | Browser policy for directory access | IT/Graph approval |
| Priority | P1 | P2 | P3 |

### 3.6 Teams meetings and transcripts

| Attribute | V1: Transcript import | V2: Meeting recap retrieval | V3: Graph |
|---|---|---|---|
| User journey | Download the meeting transcript (.vtt or .docx) from Teams → import → choose the project → review extracted lines | The user opens the Teams meeting recap (or the Copilot recap), copies or exports the recap text → paste into Continuum as a "Meeting recap" item with meeting metadata | Continuum lists the user's meetings and transcripts via Graph |
| Current implementation | None | Paste into the Data Park works generically (`HarvesterPanel.onStage`) | None |
| Missing implementation | VTT parser (speaker, timestamp, text), DOCX transcript parse (needs the Word adapter) | A "Meeting recap" paste template: title, date and attendees fields entered by the user | → G3 |
| Expected data format | WebVTT `.vtt`; `.docx` | Plain text | Graph `callTranscript` |
| Authentication | None | None | → G3 |
| Browser restrictions | → B-LOCAL | Clipboard paste (no read permission needed; the user pastes) | → G3 |
| CORS restrictions | n/a | n/a | Graph supports CORS |
| API availability | n/a | n/a | Graph online-meeting transcript APIs (permissions often admin-consented; verify) |
| Graph dependency | None | None | Yes |
| App registration | None | None | Yes |
| Admin / tenant consent | None, but transcript download depends on meeting policy | None | **Yes**, likely |
| Privacy / data handling | **High**: verbatim speech of named people. Keep the transcript local; extract decisions and actions only after review. | Recap may be AI-generated. Mark it as "Copilot recap (inference)", not Fact. | Same |
| Restricted-laptop feasibility | Medium (depends on transcript download policy) | High | Low |
| Offline behaviour | Full | Full | Network |
| Provenance | Meeting title/date (user-entered or file), file hash, cue timestamp | Recap source label "Teams recap", pasted-at, meeting date | Meeting ID, transcript ID |
| Stale-data detection | Meeting date | Meeting date | Meeting date |
| Duplicate detection | File hash; cue hash | Text hash | Transcript ID |
| Acceptance criteria | Speakers and timestamps preserved; each extracted item links back to its cue range | Recap items are labelled Inference unless confirmed | n/a |
| Verification | Synthetic VTT fixture | Manual | — |
| Smallest safe slice | VTT parser (pure, about 50 lines) | Recap paste template | — |
| Blocker / external | Meeting transcript download policy | None | IT |
| Priority | P1 | P2 | P3 |

### 3.7 SharePoint

| Attribute | V1: File upload | V2: URL references | V3: Graph |
|---|---|---|---|
| User journey | The user opens or downloads the document from SharePoint (or the synced library) → imports it via the Excel/Word/PDF adapter | The project stores SharePoint document URLs (the registration modal already captures `sharepoint_urls`); Continuum shows them as links with "last reviewed" and lets the user attach an imported file to a URL | Continuum fetches listed files via Graph |
| Current implementation | Generic upload not wired (see Excel) | URLs captured in project registration (`App.js` `buildSharepoint`, `sharepoint_urls`) | None. `integrations-sharepoint-adapter/CONTRACT.md` only. |
| Missing implementation | Adapters (Excel/Word/PDF) | Link list in project and handover; URL-to-Source association | → G3 |
| Expected data format | .xlsx/.docx/.pdf | URL text | Drive item JSON + content |
| Authentication | None | The user's browser session on click | → G3 |
| Browser restrictions | → B-LOCAL | Plain navigation only; **no fetch** | → G3 |
| CORS restrictions | n/a | Fetch would be blocked. Not attempted. | Graph CORS supported |
| API availability | n/a | n/a | Graph Files/Sites |
| Graph dependency | None | None | Yes |
| App registration | None | None | Yes |
| Admin / tenant consent | None | None | Likely (`Sites.Read.All`) |
| Privacy / data handling | Document content; local only | URLs reveal site and client names | Same + token |
| Restricted-laptop feasibility | High | High | Low |
| Offline behaviour | Full | Links offline: shown with an offline note | Network |
| Provenance | File hash + optional linked URL text | URL + user-entered "version/modified" | Drive item ID + eTag |
| Stale-data detection | File modified date (from file metadata if present) vs import | "Last reviewed" date set by the user | eTag/lastModified |
| Duplicate detection | File hash | URL normalisation | Item ID |
| Acceptance criteria | Same as the adapters | No network call made for URLs | n/a |
| Verification | Fixtures | Network panel shows no requests | — |
| Smallest safe slice | Covered by [XLS-01]/[FIL-02] | Render `sharepoint_urls` in project details and the handover "Sources" appendix | — |
| Blocker / external | None | None | IT |
| Priority | P1 | P2 | P3 |

### 3.8 OneDrive

| Attribute | V1: File upload | V2: Synced-folder re-scan | V3: Graph |
|---|---|---|---|
| User journey | Pick files from the OneDrive-synced folder → import | Pick the synced project folder once; "Refresh" re-reads changed files (B-FOLDER) | Graph pull |
| Current implementation | None | None | None |
| Missing implementation | Adapters | B-FOLDER + per-file hash index | → G3 |
| Expected data format | Office/PDF/CSV | Same | Drive item |
| Authentication | None (the OneDrive client handles sync) | None | → G3 |
| Browser restrictions | → B-LOCAL. "Files On-Demand" placeholders may need hydration, so open them in Explorer first (Assumption). | → B-FOLDER | → G3 |
| CORS restrictions | n/a | n/a | Graph CORS supported |
| API availability | n/a | n/a | Graph Files |
| Graph dependency | None | None | Yes |
| App registration | None | None | Yes |
| Admin / tenant consent | None | None | Possibly (`Files.Read` is often user-consentable; verify the tenant policy) |
| Privacy / data handling | Local | Local | Token |
| Restricted-laptop feasibility | High | Medium | Low |
| Offline behaviour | Full | Full | Network |
| Provenance | File hash + relative path | + lastModified | Item ID |
| Stale-data detection | File lastModified | Same | eTag |
| Duplicate detection | Hash | Hash + path | Item ID |
| Acceptance criteria | As the adapters | Only changed files re-imported | n/a |
| Verification | Fixtures | Fixture folder | — |
| Smallest safe slice | Covered by the adapters | B-FOLDER shared component | — |
| Blocker / external | None | Browser directory-access policy | IT |
| Priority | P1 | P2 | P3 |

### 3.9 OneNote

| Attribute | V1: Export | V2: Notebook sync | V3: Graph |
|---|---|---|---|
| User journey | Export a page or section (PDF, .docx or copy text) → import or paste | Re-export or re-paste with diff per page title | Graph OneNote pages read |
| Current implementation | Generic paste works | None | None |
| Missing implementation | PDF/Word adapters; "OneNote page" paste template (page title, date) | Page-level diff | → G3 |
| Expected data format | PDF/.docx/plain text (OneNote's own export formats vary by client; Assumption) | Same | Graph page HTML |
| Authentication | None | None | → G3 (`Notes.Read`) |
| Browser restrictions | → B-LOCAL | Manual | → G3 |
| CORS restrictions | n/a | n/a | Graph CORS supported |
| API availability | n/a | n/a | Graph OneNote API (delegated; Microsoft has restricted app-only OneNote access; verify the current state) |
| Graph dependency | None | None | Yes |
| App registration | None | None | Yes |
| Admin / tenant consent | None | None | Possibly |
| Privacy / data handling | Personal notes. Default to Draft. | Same | Same |
| Restricted-laptop feasibility | High | Medium | Low |
| Offline behaviour | Full | Full | Network |
| Provenance | Page title + export date + file hash | + previous version | Page ID |
| Stale-data detection | Page date | Same | lastModified |
| Duplicate detection | Text hash | Page title + hash | Page ID |
| Acceptance criteria | Imported as Draft notes; never auto-shared | Diff shown | n/a |
| Verification | Fixtures | Manual | — |
| Smallest safe slice | Paste template | — | — |
| Blocker / external | None | Manual effort | IT |
| Priority | P2 | P3 | P3 |

### 3.10 Excel (generic engine)

| Attribute | V1: .xlsx/.xls upload | V2: Re-import with diff | V3: Graph workbook API |
|---|---|---|---|
| User journey | Drop a workbook → choose a sheet → choose or confirm the column mapping (saved per template) → preview → stage → review | Re-import a newer version → see new, changed and removed rows → stage only the changes | Read a workbook in SharePoint/OneDrive via Graph |
| Current implementation | SheetJS 0.18.5 vendored and loaded (`static/index.html`). `parseWb` unwired (`App.js:248`). | None | None |
| Missing implementation | `adapters/sheet.js` (generic), mapping UI, template store, Source records | Natural-key diff | → G3 |
| Expected data format | .xlsx, .xls; header row detection; multiple sheets | Same | Graph range JSON |
| Authentication | None | None | → G3 |
| Browser restrictions | → B-LOCAL. Large files (> 20 MB) may be slow; parse in a Web Worker later. | → B-LOCAL / B-FOLDER | → G3 |
| CORS restrictions | n/a | n/a | Graph CORS supported |
| API availability | n/a | n/a | Graph workbook |
| Graph dependency | None | None | Yes |
| App registration | None | None | Yes |
| Admin / tenant consent | None | None | Likely |
| Privacy / data handling | Local. Formulas are not executed (SheetJS reads cached values). | Same | Same |
| Restricted-laptop feasibility | **High** | High | Low |
| Offline behaviour | Full | Full | Network |
| Provenance | file, sha256, sheet, row number (1-based as displayed in Excel), column headers | + previous Source ID | Item ID + range |
| Stale-data detection | Template-specific date column | Same | lastModified |
| Duplicate detection | File hash; template natural key | Natural key diff | — |
| Acceptance criteria | Mapping preview shows every header; unmapped headers listed; empty cells stay empty; SheetJS errors shown to the user | Diff counts correct on fixtures | n/a |
| Verification | `tests/fixtures/*.xlsx` (synthetic) + browser test page | Two-version fixtures | — |
| Smallest safe slice | Wire one input to a pure `rowsFromWorkbook(file) → {sheet, headers, rows}` | — | — |
| Blocker / external | SheetJS 0.18.5 advisories: assess, or restrict to trusted files | None | IT |
| Priority | **P0** | P2 | P3 |

### 3.11 CSV

| Attribute | V1: Upload | V2: Re-import with diff | V3: n/a |
|---|---|---|---|
| User journey | Drop a CSV → choose delimiter/encoding → same mapping UI as Excel | Same as Excel V2 | Not applicable: CSV is an export format of another system |
| Current implementation | `accept=".csv"` on unwired inputs only | None | — |
| Missing implementation | Parser (SheetJS reads CSV, or a small RFC 4180 parser), encoding handling (UTF-8 BOM, Windows-1252) | Diff (shared) | — |
| Expected data format | RFC 4180; `,` or `;`; UTF-8/1252 | Same | — |
| Authentication | None | None | — |
| Browser restrictions | → B-LOCAL | → B-FOLDER | — |
| CORS restrictions | n/a | n/a | — |
| API availability | n/a | n/a | — |
| Graph dependency | None | None | — |
| App registration | None | None | — |
| Admin / tenant consent | None | None | — |
| Privacy / data handling | Local | Local | — |
| Restricted-laptop feasibility | **High** | High | — |
| Offline behaviour | Full | Full | — |
| Provenance | file, sha256, line number | + previous Source | — |
| Stale-data detection | Template date column | Same | — |
| Duplicate detection | Hash + natural key | Diff | — |
| Acceptance criteria | Quoted commas and newlines parse correctly; encoding detected or chosen | Diff correct | — |
| Verification | Fixtures including edge cases | Fixtures | — |
| Smallest safe slice | Route CSV through the same `adapters/sheet.js` | — | — |
| Blocker / external | None | None | — |
| Priority | **P0** | P2 | n/a |

### 3.12 PDF

| Attribute | V1: Text-PDF upload | V2: Batch folder import | V3: Graph (file retrieval) |
|---|---|---|---|
| User journey | Drop a PDF → extracted text per page → select passages → stage | Folder of PDFs → queue | Fetch PDFs from M365 |
| Current implementation | None | None | None |
| Missing implementation | PDF text extraction library (for example pdf.js, Apache-2.0) vendored locally with its worker; no OCR | B-FOLDER | → G3 |
| Expected data format | Text-based PDF. Scanned PDFs give no text → Not found. | Same | Drive item |
| Authentication | None | None | → G3 |
| Browser restrictions | → B-LOCAL. pdf.js worker must load from the same origin (no CDN). | → B-FOLDER | → G3 |
| CORS restrictions | n/a | n/a | Graph |
| API availability | n/a | n/a | Graph |
| Graph dependency | None | None | Yes |
| App registration | None | None | Yes |
| Admin / tenant consent | None | None | Likely |
| Privacy / data handling | Local. Contracts may be highly sensitive. | Local | Token |
| Restricted-laptop feasibility | High (once vendored) | Medium | Low |
| Offline behaviour | Full | Full | Network |
| Provenance | file, sha256, page number | + path | Item ID |
| Stale-data detection | PDF metadata date (if present) or user-entered | Same | lastModified |
| Duplicate detection | Hash; passage hash | Hash | Item ID |
| Acceptance criteria | Page-cited passages; scanned PDF reports "no extractable text" | — | — |
| Verification | Fixtures | Fixtures | — |
| Smallest safe slice | Vendor the library + a single-file extractor page | — | — |
| Blocker / external | New vendor dependency (approval) | — | IT |
| Priority | P2 | P2 | P3 |

### 3.13 Word (.docx)

| Attribute | V1: .docx upload | V2: Batch folder import | V3: Graph (file retrieval) |
|---|---|---|---|
| User journey | Drop a .docx (for example a Collaboration Plan or status report) → paragraphs and tables extracted → select → stage. A Collaboration Plan contacts table → project contacts (preview). | Folder | Graph |
| Current implementation | None. V5 says "Collaboration Plan … document not crawled yet". | None | None |
| Missing implementation | DOCX = zip + XML. Needs an unzip implementation (vendored JSZip, MIT, or a reviewed small inflate) plus a `word/document.xml` text/table walker | B-FOLDER | → G3 |
| Expected data format | Office Open XML | Same | Drive item |
| Authentication | None | None | → G3 |
| Browser restrictions | → B-LOCAL (`DecompressionStream` is available in modern Chromium and Safari 16.4+ and could avoid a vendor dependency for deflate; Assumption: verify) | → B-FOLDER | → G3 |
| CORS restrictions | n/a | n/a | Graph |
| API availability | n/a | n/a | Graph |
| Graph dependency | None | None | Yes |
| App registration | None | None | Yes |
| Admin / tenant consent | None | None | Likely |
| Privacy / data handling | Contacts = personal data. Preview before saving. | Same | Token |
| Restricted-laptop feasibility | High | Medium | Low |
| Offline behaviour | Full | Full | Network |
| Provenance | file, sha256, paragraph/table index | + path | Item ID |
| Stale-data detection | `docProps/core.xml` modified date | Same | lastModified |
| Duplicate detection | Hash | Hash | Item ID |
| Acceptance criteria | Headings, paragraphs and tables in order; tracked changes ignored with a warning | — | — |
| Verification | Fixtures | — | — |
| Smallest safe slice | Text and tables only | — | — |
| Blocker / external | Unzip approach decision | — | IT |
| Priority | P1 | P2 | P3 |

### 3.14 Email files (format stream shared by Outlook V1/V2)

| Attribute | V1: .eml / .msg / .txt upload | V2: Batch folder import | V3: n/a (see Outlook V3) |
|---|---|---|---|
| User journey | Drop email files → headers + body preview → quoted-reply stripping → select → stage | Folder re-scan | — |
| Current implementation | None | None | — |
| Missing implementation | `.eml` MIME parser (multipart, quoted-printable, base64, charset); `.msg` CFB reader | B-FOLDER | — |
| Expected data format | RFC 5322/MIME; MS-OXMSG | Same | — |
| Authentication | None | None | — |
| Browser restrictions | → B-LOCAL. HTML bodies rendered as **text only** (no remote images, no scripts). | → B-FOLDER | — |
| CORS restrictions | n/a | n/a | — |
| API availability | n/a | n/a | — |
| Graph dependency | None | None | — |
| App registration | None | None | — |
| Admin / tenant consent | None | None | — |
| Privacy / data handling | **High**. Addresses kept as display names by default; email addresses optional. | Same | — |
| Restricted-laptop feasibility | High (.eml), medium (.msg) | Medium | — |
| Offline behaviour | Full | Full | — |
| Provenance | Message-ID, Date, Subject, file hash | Same | — |
| Stale-data detection | Date header | Same | — |
| Duplicate detection | Message-ID | Same | — |
| Acceptance criteria | No remote content loaded; attachments listed only | — | — |
| Verification | Fixtures (synthetic) | Fixtures | — |
| Smallest safe slice | `.eml` plain text and quoted-printable | — | — |
| Blocker / external | `.msg` library choice | — | — |
| Priority | P1 | P2 | n/a |

### 3.15 RAID logs

Repository evidence: `relationship_model.json` `sp_risk_log` fields `Date Raised, RAID Type, Description, State/Comments/Mitigation, Assigned To, Status, Priority/Impact (T3), Due Date / Closed Date, Type (T3), Knowledge Area / Category / Source (T3)`; V5 runtime description says "sheets named RAID, RAID Log, Log or RISK Log"; `docs/SOURCES_CONFIG.md:15` says the headers vary by template (Template1–3). `HarvesterPanel.js:722` has an unwired RAID drop zone. The story data uses "Row12 + Row18" from `data/seed/cards.json`.

| Attribute | V1: .xlsx upload with template mapping | V2: Re-import with row diff | V3: SharePoint list / Graph |
|---|---|---|---|
| User journey | Drop the RAID log → auto-select a sheet named RAID / RAID Log / Log / RISK Log → choose a template (T1/T2/T3) or map columns → preview → stage → review | Weekly re-import → item state changes shown (Open → Partial → Closed) as timeline nodes on the same card | Read a SharePoint list RAID |
| Current implementation | Unwired drop zone; documented columns | Smart-append concept exists for text (`smartAppendToCard`) | None |
| Missing implementation | Template maps; RAID item types (Risk/Assumption/Issue/Dependency/Action/Decision); owner/due-date fields | Natural-key diff (RAID ID, or hash(Date Raised + Description prefix)) → append a node | → G3 |
| Expected data format | .xlsx/.csv | Same | List item JSON |
| Authentication | None | None | → G3 |
| Browser restrictions | → B-LOCAL | → B-LOCAL / B-FOLDER | → G3 |
| CORS restrictions | n/a | n/a | Graph |
| API availability | n/a | n/a | Graph lists |
| Graph dependency | None | None | Yes |
| App registration | None | None | Yes |
| Admin / tenant consent | None | None | Likely |
| Privacy / data handling | Owner names; client-sensitive risks. Local. | Same | Token |
| Restricted-laptop feasibility | **High** | High | Low |
| Offline behaviour | Full | Full | Network |
| Provenance | file, sha256, sheet, row, RAID ID | Each state change node cites its row and file version | Item ID + version |
| Stale-data detection | Status not updated for 30 days and still open → Needs confirmation | Same | lastModified |
| Duplicate detection | RAID ID or derived key | Diff | Item ID |
| Acceptance criteria | Actions carry owner and due date as Facts; RAID Type taken from the column, never inferred by keyword; missing owner → "Not found" | Row 12 (50%) and Row 18 (100%) style updates land on one item with two nodes | n/a |
| Verification | Fixtures for T1–T3 | Two-version fixture reproducing the Row12/Row18 story | — |
| Smallest safe slice | One template (the one the owner uses most) | — | — |
| Blocker / external | Sanitised real header rows for each template | — | IT |
| Priority | **P0** | P1 | P3 |

### 3.16 Local manual notes

| Attribute | V1: Typed or pasted in the app | V2: Import .md/.txt files | V3: Sync to an approved M365 location |
|---|---|---|---|
| User journey | Type a note or paste text into the Data Park → stage → review → approve (or save directly as a Draft note) | Drop markdown/text files (meeting notes kept in a local folder) | Write approved notes to OneDrive/SharePoint via Graph |
| Current implementation | **WORKING**: `HarvesterPanel.onStage`, `FailoverDB.saveNote`, notes privacy | None | None |
| Missing implementation | Note date and "as of" field; Statement kind tagging (Fact/Recommendation) | Markdown front-matter (date, project) | → G3 |
| Expected data format | Text | .md/.txt | — |
| Authentication | None | None | → G3 |
| Browser restrictions | None | → B-LOCAL | → G3 |
| CORS restrictions | n/a | n/a | Graph |
| API availability | n/a | n/a | Graph |
| Graph dependency | None | None | Yes |
| App registration | None | None | Yes |
| Admin / tenant consent | None | None | Possibly |
| Privacy / data handling | Local. PII screening runs (phone numbers only today; see [PRV-05]). | Same | Content leaves the device (to the tenant) |
| Restricted-laptop feasibility | **High** | High | Low |
| Offline behaviour | Full | Full | Network |
| Provenance | author (persona), created_at, "Manual note" | file name, hash | Item ID |
| Stale-data detection | Note date | File date | — |
| Duplicate detection | `contentHash` | Hash | — |
| Acceptance criteria | Notes appear in the handover only when approved, labelled with author and date | — | — |
| Verification | Manual + unit test of the handover filter | Fixtures | — |
| Smallest safe slice | Add an "as of" date field | — | — |
| Blocker / external | None | None | IT |
| Priority | **P0** | P1 | P3 |

### 3.17 Microsoft 365 Copilot (detail in `COPILOT_INTEGRATION_OPTIONS.md`)

| Attribute | V1: User uploads file | V2: Structured prompt package | V3: Agent |
|---|---|---|---|
| User journey | Continuum exports the approved handover package (.md/.docx-compatible/.json) → the user uploads or opens it in M365 Copilot → reviews the output → pastes or imports useful corrections back into Continuum as Draft items | Continuum also exports a ready-made prompt set (gap analysis, consistency check, rewrite for audience) with statement IDs, so Copilot answers can be mapped back to statements | A declarative agent or Copilot Studio agent grounded on an approved M365 location holding Continuum exports |
| Current implementation | HTML export exists (`HandoverModal.downloadHtml`); no Markdown/JSON package | None | None |
| Missing implementation | Package format [HND-05], [COP-01]; "Import Copilot review" paste flow | Prompt templates [COP-02] | Agent manifest, governance |
| Expected data format | .md / .docx / .pdf / .json | .md prompt file | Agent manifest |
| Authentication | The user's own M365 session (outside Continuum) | Same | Tenant |
| Browser restrictions | None (manual upload in the Copilot UI) | None | n/a |
| CORS restrictions | n/a: Continuum never calls Copilot | n/a | n/a |
| API availability | n/a | n/a | Copilot extensibility (see the options doc) |
| Graph dependency | None | None | Possibly (connectors, Retrieval API) |
| App registration | None | None | Depends on the route |
| Admin / tenant consent | None beyond an existing licence and policy on file upload | None | Likely |
| Privacy / data handling | Content moves into the M365 tenant (an approved boundary, but it is a boundary change). The user decides per export. | Same | Same + persistent storage |
| Restricted-laptop feasibility | **High** (if Copilot file upload is enabled) | High | Low/medium |
| Offline behaviour | Export works offline; Copilot needs the network | Same | Network |
| Provenance | Package carries statement IDs and source hashes; returned edits keep the statement ID | Same | Agent cites files |
| Stale-data detection | Package `generatedAt`; Copilot output labelled "external review" | Same | — |
| Duplicate detection | Statement ID | Same | — |
| Acceptance criteria | Nothing from Copilot becomes a Fact without matching a cited source | Prompts are versioned | — |
| Verification | Manual round-trip on the work laptop | Same | Pilot |
| Smallest safe slice | Markdown export of the approved handover | One prompt template | — |
| Blocker / external | Confirm the tenant allows file upload to Copilot Chat | None | Tenant admin |
| Priority | P1 | P2 | P3 |
