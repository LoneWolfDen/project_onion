# Continuum Local Completion Release: Backlog

Status: proposed. **Not started. Nothing may be implemented without explicit owner approval.**
Evidence: `docs/assessments/CURRENT_IMPLEMENTATION_ASSESSMENT.md`. Design: `docs/assessments/LOCAL_COMPLETION_ARCHITECTURE.md`. Sources: `docs/assessments/INTEGRATION_REGISTER.md`. Copilot: `docs/assessments/COPILOT_INTEGRATION_OPTIONS.md`. Cleanup: `docs/assessments/REPOSITORY_CLEANUP_CANDIDATES.md`.

Priorities: **P0** necessary for a trustworthy local completion release · **P1** necessary for regular personal use · **P2** assisted integrations and Microsoft enablement · **P3** governed live integrations or broader enterprise use.
Level: V1 controlled manual import/export · V2 assisted refresh/bounded retrieval · V3 approved live integration. Platform items that serve the local release are tagged V1.
Standing constraints for every item: no new build step, no CDN, no outbound transmission of content, persona drop-down untouched, branch per item, and nothing in `data/seed/` written at runtime.
Rollback default ("std"): revert the item's commit(s) on its branch. User data is protected by [DAT-02] export before any storage change.

## Index

| Group | P0 | P1 | P2 | P3 |
|---|---|---|---|---|
| FOUNDATION | FND-01, FND-02, FND-03 | FND-04 | | |
| PWA AND OFFLINE | PWA-01, PWA-02, PWA-03 | PWA-04, PWA-05, PWA-06 | | |
| HUMAN-EDITABLE UI | HUI-05 | HUI-01, HUI-02, HUI-04, HUI-06, HUI-07, HUI-08 | HUI-03, HUI-09 | |
| HANDOVER | HND-01, HND-02, HND-03, HND-04, HND-05 | HND-06, HND-08, HND-09 | HND-07 | |
| DATA AND STORAGE | DAT-02, DAT-03, DAT-04, DAT-05 | DAT-01, DAT-06, DAT-07, DAT-08 | | |
| EXCEL AND FILE IMPORTS | XLS-01, XLS-02 | XLS-03, FIL-01, FIL-02, FIL-03, FIL-06 | XLS-04, XLS-05, FIL-04, FIL-05 | |
| GDP | GDP-01, GDP-02 | GDP-03 | GDP-04 | GDP-05 |
| CONNECTED | | CON-01, CON-02 | CON-03, CON-04 | CON-05 |
| MICROSOFT 365 SOURCES | | M365-01, M365-02 | M365-03, M365-04, M365-05, M365-06 | M365-07 |
| COPILOT | | COP-01, COP-03, COP-05 | COP-02, COP-04 | |
| DIAGNOSTICS | DIA-01, DIA-02 | DIA-03, DIA-04, DIA-05, DIA-06, DIA-07 | | |
| PRIVACY AND SECURITY | PRV-01, PRV-02, PRV-03, PRV-04 | PRV-05, PRV-06, PRV-07 | | |
| TESTING | TST-01, TST-02 | TST-03, TST-04, TST-05 | TST-06 | |
| REPOSITORY CLEANUP | | REP-01, REP-02, REP-04 | REP-03, REP-05, REP-06 | |

Suggested P0 order: FND-03 → DAT-02 → HUI-05 → DAT-05 → DAT-04 → PRV-01 → PRV-03 → PRV-04 → PRV-02 → DIA-01 → DIA-02 → TST-01 → HND-01 → DAT-03 → XLS-01 → XLS-02 → GDP-02 → GDP-01 → HND-02 → HND-03 → HND-04 → HND-05 → TST-02 → FND-01 → FND-02 → PWA-01 → PWA-02 → PWA-03.

---

## FOUNDATION

### FND-01 · Reproducible local startup on 127.0.0.1 · P0 · V1
- **Current state:** Manual `python3 modules/experience-pwa/service.py` (binds `0.0.0.0:8002`). Docs reference `/Users/wolf/...`. Six other optional services are started by hand.
- **Problem:** No single, documented, portable way to start only what the release needs.
- **Proposed smallest change:** Add `start-continuum.cmd` (Windows) and `start-continuum.sh` that run `service.py` with `--host 127.0.0.1 --port 8002` and open the browser. README "Quick start" lists only this.
- **Dependencies:** PRV-04 (bind flag).
- **Likely files:** new `start-continuum.cmd`, `start-continuum.sh`; `modules/experience-pwa/service.py` (argument parsing); `README.md`.
- **Acceptance:** One command starts the app. `netstat` shows a listener on 127.0.0.1 only. No other service is required for the core flows.
- **Verification:** Run on a clean checkout on Windows and macOS/Linux. Open `http://127.0.0.1:8002/`.
- **Rollback:** std.
- **External approval:** Confirm Python 3 is permitted on the work laptop.

### FND-02 · Visible app version and build stamp · P0 · V1
- **Current state:** Cache-busting by hand (`main.js?v=drafts1`, `styles.css?v=demo5`). No version shown.
- **Problem:** Support cannot tell which code is running, especially with a cache-first SW.
- **Proposed smallest change:** `static/version.json` `{version, commit, date}` updated by hand at release. Shown in the footer and the Diagnostics page. The SW cache name derives from it.
- **Dependencies:** PWA-02.
- **Likely files:** `static/version.json`, `App.js` (footer), `sw.js`.
- **Acceptance:** The version is visible. A changed version triggers the SW update flow.
- **Verification:** Bump the version and observe the update prompt.
- **Rollback:** std.
- **External approval:** None.

### FND-03 · Record owner decisions for the release · P0 · V1
- **Current state:** Architecture §7 lists five pending decisions.
- **Problem:** P0 items depend on them (AI removal, IndexedDB, statement kinds, optional services, Python).
- **Proposed smallest change:** Owner answers. Entries are appended to `docs/DECISION_LOG.md`.
- **Dependencies:** none.
- **Likely files:** `docs/DECISION_LOG.md`.
- **Acceptance:** Five dated decisions recorded.
- **Verification:** Review.
- **Rollback:** Edit the log.
- **External approval:** Owner.

### FND-04 · Central configuration module · P1 · V1
- **Current state:** Settings are scattered: `localStorage` keys `VECTOR_BASE_URL`, `LLM_PROVIDER`, `OPENROUTER_*`, `ANTHROPIC_API_KEY`, `enableBackgroundSync`; ports hard-coded in `FailoverDB.js:24`, `VectorSync.js:10`, `sw.js`, `index.html`.
- **Problem:** Hard to audit what the app may contact.
- **Proposed smallest change:** `static/js/config.js` exporting defaults (allowed origins, optional services, stale thresholds, AI provider `none`), plus a Settings panel that persists overrides in one key.
- **Dependencies:** PRV-01.
- **Likely files:** new `js/config.js`; `AiClient.js`, `VectorSync.js`, `FailoverDB.js`, `sw.js`.
- **Acceptance:** A grep for `localhost:` in `static/js` finds only `config.js`.
- **Verification:** grep plus manual settings test.
- **Rollback:** std.
- **External approval:** None.

---

## PWA AND OFFLINE

### PWA-01 · Web app manifest and icons · P0 · V1
- **Current state:** No manifest. The app is not installable (DOCUMENTED ONLY).
- **Problem:** The "PWA" cannot be installed as an app window without a desktop installer.
- **Proposed smallest change:** `static/manifest.webmanifest` (name, short_name, start_url `/`, scope `/`, display `standalone`, theme/background colours, 192/512 PNG icons plus a maskable icon). `<link rel="manifest">` in `index.html`.
- **Dependencies:** PWA-02 (Chromium install criteria need a SW with a fetch handler).
- **Likely files:** `static/manifest.webmanifest`, `static/icons/*`, `static/index.html`, `service.py` (MIME type for `.webmanifest`).
- **Acceptance:** Chrome/Edge show "Install Continuum". The installed window opens the app. No admin prompt.
- **Verification:** DevTools → Application → Manifest shows no errors. Install on the work laptop.
- **Rollback:** Remove the link tag. Installed users uninstall from the app menu.
- **External approval:** Confirm browser policy permits PWA install (Assumption: usually allowed).

### PWA-02 · Precache service worker with versioned cache · P0 · V1
- **Current state:** `modules/experience-pwa/sw.js`: runtime cache-first with no precache, the cache name `onion-sw-v1-privacyfix` is never rotated, old caches are never deleted, and it is registered only from `VectorSync.js:270`.
- **Problem:** No guaranteed offline start. Stale code after edits.
- **Proposed smallest change:** Precache the list in `static/precache.json` (generated by `tools/build_precache.py`, standard library, with a header naming the generator). Cache name = `continuum-<version>`. `activate` deletes other caches. Same-origin GET: cache-first for precached files, network-first for `version.json`. Keep the existing vector message handling.
- **Dependencies:** FND-02.
- **Likely files:** `sw.js`, new `tools/build_precache.py`, `static/precache.json`.
- **Acceptance:** After one visit, the app starts with the server stopped. Exactly one cache exists after an update.
- **Verification:** DevTools offline checkbox, plus stop `service.py` and reload.
- **Rollback:** Ship a "kill-switch" SW (unregisters itself and clears caches), documented in DIA-06.
- **External approval:** None.

### PWA-03 · SW registration in main.js and update prompt · P0 · V1
- **Current state:** Registration is a side effect of loading `VectorSync.js`. No update UI. `skipWaiting()` is called unconditionally.
- **Problem:** Silent mid-session code swaps, and the SW is missing if VectorSync is not loaded.
- **Proposed smallest change:** Register in `main.js`. On `waiting`, show an "Update available. Reload" banner. Call `skipWaiting` only on the user's click.
- **Dependencies:** PWA-02.
- **Likely files:** `js/main.js`, `sw.js`, `core/VectorSync.js` (remove registration).
- **Acceptance:** Bumping the version shows the banner. Nothing changes until the user clicks.
- **Verification:** Manual.
- **Rollback:** std.
- **External approval:** None.

### PWA-04 · Degraded-mode banners · P1 · V1
- **Current state:** Fallbacks are silent apart from AI engine labels on cards.
- **Problem:** The user cannot tell that similarity search or persistence is off.
- **Proposed smallest change:** A status strip: "AI: off (local)", "Similarity: off", "Storage: persisted / not persisted", "Offline".
- **Dependencies:** DAT-04, DIA-04.
- **Likely files:** `App.js` or a new `components/StatusStrip.js`.
- **Acceptance:** Each state is shown correctly when toggled.
- **Verification:** Stop :8006; open a private window; go offline.
- **Rollback:** std.
- **External approval:** None.

### PWA-05 · Safari support and eviction guidance · P1 · V1
- **Current state:** Untested on Safari. `FailoverDB.readLocal` mentions "your Safari shows this" (legacy keys).
- **Problem:** Safari may evict script-written storage after 7 days without use, unless the app is added to the Dock or Home Screen.
- **Proposed smallest change:** Detect Safari and show a one-time notice recommending "Add to Dock" and regular backups (DAT-02). Document supported versions.
- **Dependencies:** DAT-02.
- **Likely files:** `App.js`, `README.md`.
- **Acceptance:** The notice appears once on Safari only.
- **Verification:** Safari 16.4+ manual test.
- **Rollback:** std.
- **External approval:** None.

### PWA-06 · Remove inline "background sync" script from index.html · P1 · V1
- **Current state:** An inline script in `static/index.html` fetches `http://localhost:8006/list` with persona `'Brené'` hard-coded when `?sync` is present.
- **Problem:** A hidden network call, a hard-coded persona, and it blocks a strict CSP (PRV-02).
- **Proposed smallest change:** Delete the inline block. If needed, move the logic into `VectorSync.js` behind config.
- **Dependencies:** FND-04.
- **Likely files:** `static/index.html`.
- **Acceptance:** No inline script remains. The vector feature works as before when enabled.
- **Verification:** View source; network panel.
- **Rollback:** std.
- **External approval:** None.

---

## HUMAN-EDITABLE UI

### HUI-01 · Vendor manifest and SheetJS advisory review · P1 · V1
- **Current state:** Four vendor files with no recorded version, hash or licence (React 18.3.1, ReactDOM 18.3.1, htm, SheetJS 0.18.5).
- **Problem:** Not auditable. SheetJS 0.18.5 has published advisories (Assumption: verify).
- **Proposed smallest change:** `static/js/vendor/VENDOR.md` (name, version, licence, SHA-256, source URL, date). A written decision on SheetJS: keep it with "trusted files only", or replace it with the vendor's current build (approval needed).
- **Dependencies:** none.
- **Likely files:** `static/js/vendor/VENDOR.md`.
- **Acceptance:** Every vendor file is listed with a matching hash.
- **Verification:** `sha256sum` comparison.
- **Rollback:** n/a (document only).
- **External approval:** Security sign-off for the SheetJS decision.

### HUI-02 · Readable token and component CSS · P1 · V1
- **Current state:** `styles.css` = frozen Tailwind BLOCK 0 + BLOCKs 1–9 of patches; ~77 classes used with no rule.
- **Problem:** CSS cannot be regenerated or reasoned about.
- **Proposed smallest change:** Add `css/tokens.css` (colours, spacing, type scale, focus ring, motion) and `css/components.css` (readable classes). Loaded after `styles.css`. No component changes yet.
- **Dependencies:** none.
- **Likely files:** `static/css/tokens.css`, `static/css/components.css`, `static/index.html`.
- **Acceptance:** No visual change on load (screenshots match).
- **Verification:** Before/after screenshots of the main screens.
- **Rollback:** Remove the two link tags.
- **External approval:** None.

### HUI-03 · Migrate components off frozen Tailwind; retire BLOCK 0 · P2 · V1
- **Current state:** Components use Tailwind utility and arbitrary classes.
- **Problem:** Dependency on generated CSS that has no source.
- **Proposed smallest change:** Migrate one component per change to `components.css` classes. When a class-usage scan shows zero BLOCK 0 dependencies, remove BLOCK 0 and the patch blocks it made necessary.
- **Dependencies:** HUI-02, HUI-04, TST-04.
- **Likely files:** `components/*.js`, `css/styles.css`.
- **Acceptance:** BLOCK 0 is removed with no visual regressions.
- **Verification:** Screenshot comparison per screen; class scan script.
- **Rollback:** Revert the component commit.
- **External approval:** None.

### HUI-04 · Split oversized components; extract pure logic · P1 · V1
- **Current state:** `HarvesterPanel.js` 826 lines, `TimelineCard.js` 837, `HandoverModal.js` (dense one-liners), `App.js` lines over 1,000 characters.
- **Problem:** Not reasonably maintainable or testable.
- **Proposed smallest change:** Extract pure modules first: `handover/model.js`, `handover/render.js`, `harvest/payload.js` (`toPayload`, `buildClipboardPayload`), `cards/categorise.js` (one shared `categoryFor`). Then split the views. Behaviour unchanged.
- **Dependencies:** TST-01 (tests protect the refactor).
- **Likely files:** `components/HarvesterPanel.js`, `TimelineCard.js`, `HandoverModal.js`, `App.js`, new `js/handover/*`, `js/harvest/*`, `js/cards/*`.
- **Acceptance:** No file over 400 lines. No line over 160 characters in the edited files. All tests pass.
- **Verification:** TST-02 suites; manual smoke test.
- **Rollback:** std, per extraction commit.
- **External approval:** None.

### HUI-05 · Confirmation and automatic backup before "Reset demo dataset" · P0 · V1
- **Current state:** `HarvesterPanel.onResetSeed` (line 684), button at line 741: one click deletes all keys (`DEMO_RESET_KEYS`) and reloads. **No confirmation.**
- **Problem:** Irreversible loss of real project data in personal use.
- **Proposed smallest change:** Show an in-app confirmation dialog stating the item count, require typing "RESET", and trigger a DAT-02 backup download first. Label the app "Demo data" while the demo dataset is loaded.
- **Dependencies:** DAT-02.
- **Likely files:** `components/HarvesterPanel.js`, `core/FailoverDB.js`.
- **Acceptance:** Reset cannot happen without confirmation. A backup file is produced first.
- **Verification:** Manual; TST-02 for the backup content.
- **Rollback:** std.
- **External approval:** None.

### HUI-06 · Accessibility baseline · P1 · V1
- **Current state:** 8–10px text in places (`text-[8px]`, `text-[9px]`); pastel contrast unverified; no `prefers-reduced-motion` in `styles.css`; `animate-pulse` is used.
- **Problem:** Readability and WCAG 2.2 AA.
- **Proposed smallest change:** Minimum 12px and base 15px via tokens; 4.5:1 contrast for text pills; a visible `:focus-visible`; reduced-motion media query disabling animations.
- **Dependencies:** HUI-02.
- **Likely files:** `css/tokens.css`, `css/components.css`.
- **Acceptance:** An automated contrast check passes on pills and buttons; keyboard navigation reaches every control.
- **Verification:** Chrome Lighthouse accessibility and Edge Accessibility Insights (built-in or approved).
- **Rollback:** std.
- **External approval:** None.

### HUI-07 · Presentation (screen-share) mode · P1 · V1
- **Current state:** None.
- **Problem:** Screen-sharing exposes private drafts and small text.
- **Proposed smallest change:** A toggle that raises the type scale by 125%, hides Draft/private items and the AI settings, and shows a "Presenting" badge.
- **Dependencies:** HUI-06, DAT-08.
- **Likely files:** `App.js`, `css/components.css`.
- **Acceptance:** With the mode on, no Draft item is visible anywhere, including the handover preview.
- **Verification:** Manual.
- **Rollback:** std.
- **External approval:** None.

### HUI-08 · Correct Relationship V5 claims; position it as the System explainer · P1 · V1
- **Current state:** V5 says "Excel files are parsed on upload" (`runtimeModel.js` `sp_risk_log` evidence), "Emails and phone numbers are redacted" (`privacy_gate`), cites `domain-fusion-engine/fuse.js` (unused), and marks "Context survives a handover" as *demonstrated* (a seed replay).
- **Problem:** A documentation page overstates capability.
- **Proposed smallest change:** Update the evidence strings and statuses to match the assessment. Relabel the success item "target". Add a model-check rule that evidence paths exist (from a static list).
- **Dependencies:** none (revisit after XLS-01 and PRV-05).
- **Likely files:** `static/docs/relationship-v5/data/runtimeModel.js`, `data/content.js`, `lib/integrity.js`.
- **Acceptance:** V5 Model check passes. No claim contradicts the assessment.
- **Verification:** Engineering → Model check.
- **Rollback:** std.
- **External approval:** None.

### HUI-09 · Fix missing and typo classes · P2 · V1
- **Current state:** ~77 class names with no CSS rule, including typos `text[10px]` and `text-[10]`.
- **Problem:** Silent styling gaps.
- **Proposed smallest change:** Fix the typos and add the missing rules to `components.css`, or remove them.
- **Dependencies:** HUI-02.
- **Likely files:** `components/*.js`, `css/components.css`.
- **Acceptance:** The scan reports 0 undefined classes.
- **Verification:** Scan script (`tools/check_classes.py`, standard library).
- **Rollback:** std.
- **External approval:** None.

---

## HANDOVER

### HND-01 · Exclude unreviewed items from handover · P0 · V1
- **Current state:** `HandoverModal.scopedCards()` (line 81) does not filter `syncStatus`, so `pending_processing` items are exported. `AppCenter.js:170` does exclude them.
- **Problem:** Unreviewed content in a "grounded" handover. Breaks "human review before export".
- **Proposed smallest change:** Filter to approved items only (`syncStatus !== 'pending_processing'` today, and `reviewState === 'approved'` after DAT-08). Show the excluded count in the dialog ("12 items awaiting review were not included").
- **Dependencies:** none.
- **Likely files:** `components/HandoverModal.js`.
- **Acceptance:** A staged item never appears in the HTML or PDF export.
- **Verification:** TST-02 unit test of the filter; manual: stage an item, export, search for it.
- **Rollback:** std.
- **External approval:** None.

### HND-02 · Statement model with explicit kinds · P0 · V1
- **Current state:** The export lists cards. "Closed" and categories are keyword-inferred and unlabelled.
- **Problem:** Facts, inferences and gaps cannot be told apart. Invented status is possible.
- **Proposed smallest change:** Pure `handover/model.js`: `buildStatements(project, items, sources, now) → Statement[]` with `kind ∈ {fact, inference, recommendation, not_found, needs_confirmation, conflicting}` and the required fields from the architecture §3.2. Existing keyword rules become `inference` with `method: 'rule:keyword-closed'`.
- **Dependencies:** DAT-03 (sourceRefs), HUI-04 (extraction).
- **Likely files:** new `js/handover/model.js`; `HandoverModal.js`.
- **Acceptance:** Every rendered line has a kind. Facts have ≥1 approved sourceRef. No mock-AI text is a Fact.
- **Verification:** TST-02 fixtures covering all six kinds.
- **Rollback:** std (the old renderer is kept behind a flag for one release).
- **External approval:** Owner approves the kinds (FND-03).

### HND-03 · Required handover sections with "Not found" · P0 · V1
- **Current state:** Sections are category tiles plus Open/Closed lists. No overview, stakeholders, actions, milestones, questions or confirmation list.
- **Problem:** The handover outcome is incomplete, and gaps are invisible.
- **Proposed smallest change:** Fixed section list: Overview (project record), Current status, Key decisions, Evidence index, Actions/owners/dates, RAID, Stakeholders, Delivery & commercial, Milestones, Unresolved questions, Stale/conflicting, Needs confirmation. Empty → `not_found` naming the sources searched.
- **Dependencies:** HND-02; richer content after XLS-02, GDP-01.
- **Likely files:** `js/handover/model.js`, `js/handover/render.js`.
- **Acceptance:** All 12 sections are always present. Empty ones state "Not found in: …".
- **Verification:** Fixture with an empty project produces 12 Not-found sections.
- **Rollback:** std.
- **External approval:** None.

### HND-04 · Preview and approve before export · P0 · V1
- **Current state:** Export buttons act immediately after project selection.
- **Problem:** No human review of the final package.
- **Proposed smallest change:** A Preview step that renders the statements. The user can mark any statement "Needs confirmation" or exclude it, and must tick "I have reviewed this handover". Approval is stored as `Handover{approvedAt, statementsHash}`. Export buttons stay disabled until approved. A boundary reminder appears at export.
- **Dependencies:** HND-02.
- **Likely files:** `HandoverModal.js` (or the split dialog), `FailoverDB.js`.
- **Acceptance:** Export is impossible without approval. A changed content hash invalidates the approval.
- **Verification:** Manual plus a unit test of the hash.
- **Rollback:** std.
- **External approval:** None.

### HND-05 · Portable handover package (md + json + html + sources.csv) · P0 · V1
- **Current state:** HTML download (`downloadHtml`, line 155) and print-to-PDF (`exportPdf`, line 171). `#card-…` anchors do not resolve.
- **Problem:** No machine-readable package for later Copilot or Microsoft use. Citations are not resolvable.
- **Proposed smallest change:** Export four files (separate downloads; no zip needed). Citations become `[S-12]` linking to a Sources appendix in the same document.
- **Dependencies:** HND-02, HND-04.
- **Likely files:** `js/handover/render.js`, `HandoverModal.js`.
- **Acceptance:** Every citation resolves inside each format. The JSON validates against `docs/schemas/handover.schema.json`.
- **Verification:** TST-02 schema check; manual open in Word (md) and a browser.
- **Rollback:** std.
- **External approval:** None.

### HND-06 · Stale and conflict detection · P1 · V1
- **Current state:** Card age dots only (`TimelineCard.ageDotColor`).
- **Problem:** Out-of-date or contradictory facts look current.
- **Proposed smallest change:** Per-source thresholds (config). Conflicts = the same subject key (for example GDP ID + field) with different values from approved sources.
- **Dependencies:** HND-02, DAT-03, FND-04.
- **Likely files:** `js/handover/model.js`, `js/config.js`.
- **Acceptance:** Fixtures produce the expected `needs_confirmation(stale)` and `conflicting` statements.
- **Verification:** TST-02.
- **Rollback:** std.
- **External approval:** None.

### HND-07 · Decision entity (only after approval) · P2 · V1
- **Current state:** Decisions are a keyword category (`TimelineCard.js:19`).
- **Problem:** Decisions and rationale cannot be grounded.
- **Proposed smallest change:** The `Decision` store and a "Record as decision" action on an approved item, per architecture §3.3. Never AI-created.
- **Dependencies:** DAT-01, HND-02, owner approval.
- **Likely files:** `FailoverDB.js`/repository, `TimelineCard.js`, `js/handover/model.js`.
- **Acceptance:** The handover "Key decisions" section lists only recorded decisions, each with evidence.
- **Verification:** TST-02.
- **Rollback:** std (the store is additive).
- **External approval:** Owner.

### HND-08 · Label keyword inferences; prefer explicit status fields · P1 · V1
- **Current state:** `isClosedCard` and `categoryFor` are duplicated with different rules in `HandoverModal.js` and `TimelineCard.js`.
- **Problem:** Inconsistent, unlabelled inference.
- **Proposed smallest change:** One shared `cards/categorise.js`. Explicit `status` from RAID/GDP takes precedence. Otherwise mark the result as Inference.
- **Dependencies:** HUI-04, XLS-02.
- **Likely files:** `cards/categorise.js`, both components.
- **Acceptance:** One implementation; inferences are labelled in the UI and the export.
- **Verification:** TST-02.
- **Rollback:** std.
- **External approval:** None.

### HND-09 · "Save handover to memory" as a Draft, with confirmation · P1 · V1
- **Current state:** `saveToMemory` (line 186) saves a note with `privacy:'Team Shared'` immediately.
- **Problem:** Retained without review.
- **Proposed smallest change:** Save as Draft, linked to the approved Handover ID.
- **Dependencies:** HND-04, DAT-08.
- **Likely files:** `HandoverModal.js`.
- **Acceptance:** Saved handovers appear as Draft until the user approves them.
- **Verification:** Manual.
- **Rollback:** std.
- **External approval:** None.

---

## DATA AND STORAGE

### DAT-01 · IndexedDB repository with one-time migration · P1 · V1
- **Current state:** One localStorage key `onion_db_state` (about 5 MB browser limit). No IndexedDB despite `.clinerules`.
- **Problem:** Capacity, atomicity, and blocking JSON re-serialisation on every write.
- **Proposed smallest change:** `core/repo/idb.js` behind the existing `OnionDB` method names. Migration copies the localStorage data once and keeps `onion_db_state.backup-<date>`. Sync `readLocal()` callers are moved to the async API.
- **Dependencies:** DAT-02, DAT-07, TST-02.
- **Likely files:** `core/FailoverDB.js`, new `core/repo/*`, callers of `readLocal` (`HandoverModal.js`, `HarvesterPanel.js`, `App.js`).
- **Acceptance:** Data identical after migration (count and hash per collection). The app still works if IndexedDB fails (read-only banner).
- **Verification:** Migration test with fixture state; manual on Chrome, Edge and Safari.
- **Rollback:** The backup key restores the old store; revert the commit.
- **External approval:** Owner (FND-03).

### DAT-02 · Full backup export and restore · P0 · V1
- **Current state:** None (DOCUMENTED ONLY).
- **Problem:** Single point of data loss (browser clear, profile reset, eviction).
- **Proposed smallest change:** Settings → "Back up now": download `continuum-backup-<date>.json` `{schemaVersion, exportedAt, appVersion, data, sha256}`. "Restore": preview counts, confirm, then replace (after an automatic backup of the current state).
- **Dependencies:** none.
- **Likely files:** new `core/backup.js`; `App.js` (settings entry).
- **Acceptance:** Backup → reset → restore round-trips byte-identical data.
- **Verification:** TST-02 round-trip; manual.
- **Rollback:** std.
- **External approval:** None.

### DAT-03 · Source records and item sourceRefs · P0 · V1
- **Current state:** `source` is a free-text label ("Data Park Dropzone", "Bookmarklet Clipboard").
- **Problem:** Provenance cannot cite a file, row or date.
- **Proposed smallest change:** Add `sources[]` to the store and `sourceRefs[]` plus `asOf` to items, written by `stageToDataPark`. Paste creates a `Source{kind:'paste', sha256, capturedAt}`.
- **Dependencies:** DAT-07.
- **Likely files:** `core/FailoverDB.js`, `HarvesterPanel.js`, `TimelineCard.js` (`provenanceEntriesFor`).
- **Acceptance:** Every new item has ≥1 sourceRef. Legacy items show "Source: legacy (unrecorded)".
- **Verification:** TST-02.
- **Rollback:** std (fields are additive).
- **External approval:** None.

### DAT-04 · Persistent storage request and quota display · P0 · V1
- **Current state:** No `navigator.storage.persist()`.
- **Problem:** The browser may evict data under storage pressure.
- **Proposed smallest change:** Call `persist()` at first data write. Show `estimate()` usage in Diagnostics and the status strip.
- **Dependencies:** none.
- **Likely files:** `js/main.js` or `core/FailoverDB.js`; DIA-04.
- **Acceptance:** Diagnostics shows "persisted: true/false" and the usage.
- **Verification:** DevTools → Application → Storage.
- **Rollback:** std.
- **External approval:** None.

### DAT-05 · Surface write failures; never overwrite unreadable state · P0 · V1
- **Current state:** `writeLocal` swallows errors (line 109). On a JSON parse failure, `readLocal` returns an empty state that the next write saves over the original.
- **Problem:** Silent data loss.
- **Proposed smallest change:** On a parse failure, copy the raw value to `onion_db_state.corrupt-<ts>`, enter read-only mode, and show a banner with "Download raw data". `writeLocal` returns or throws on failure, and the UI shows an error.
- **Dependencies:** DIA-01.
- **Likely files:** `core/FailoverDB.js`, `App.js`.
- **Acceptance:** A simulated quota error shows a banner and loses nothing. A corrupt value is preserved.
- **Verification:** TST-02 with stubbed `localStorage`.
- **Rollback:** std.
- **External approval:** None.

### DAT-06 · Remove the fake sync semantics · P1 · V1
- **Current state:** `forceSync()` marks items `synced` with no network call. `tryFetch`/`API_BASES` are dead. `pending_upload` is shown on cards and in exports.
- **Problem:** The UI claims server synchronisation that does not exist.
- **Proposed smallest change:** Replace with "Saved locally" and remove `forceSync` and `tryFetch`. Keep the vector queue status separately.
- **Dependencies:** none.
- **Likely files:** `core/FailoverDB.js`, `TimelineCard.js`, `HandoverModal.js` (card row prints `syncStatus`).
- **Acceptance:** No UI text implies a server sync.
- **Verification:** grep for `synced` / `pending_upload` in UI strings.
- **Rollback:** std.
- **External approval:** None.

### DAT-07 · Schema version and migrations · P1 · V1
- **Current state:** No version field. Ad-hoc "heal" logic in `readLocal`.
- **Problem:** Changes like DAT-03 need controlled upgrades.
- **Proposed smallest change:** `schemaVersion` in the store and an ordered `migrations[]` run at load (with a backup before running).
- **Dependencies:** DAT-02.
- **Likely files:** `core/FailoverDB.js` or `core/repo/migrate.js`.
- **Acceptance:** v0 → v1 migration is idempotent.
- **Verification:** TST-02.
- **Rollback:** Restore from the pre-migration backup.
- **External approval:** None.

### DAT-08 · Explicit review state; per-item approve and reject · P1 · V1
- **Current state:** `onApproveAll` approves the whole queue. `appendSuccess = true` is assumed (`HarvesterPanel` Branch A). Privacy doubles as visibility.
- **Problem:** Bulk approval weakens the gate. Failed appends count as successes.
- **Proposed smallest change:** `reviewState: staged|approved|rejected` per item. Approve and Reject buttons per row (keep Approve All with a count confirmation). Check the `smartAppendToCard` return value.
- **Dependencies:** DAT-07.
- **Likely files:** `HarvesterPanel.js`, `FailoverDB.js`.
- **Acceptance:** Rejected items are kept out of the timeline and the handover; failures are reported.
- **Verification:** TST-02 plus manual.
- **Rollback:** std.
- **External approval:** None.

---

## EXCEL AND FILE IMPORTS

### XLS-01 · Generic spreadsheet adapter, wired file input, mapping preview · P0 · V1
- **Current state:** SheetJS is loaded. `App.js:248` `parseWb` is never called. The GDP/RAID inputs (`HarvesterPanel.js:721-722`) are hidden with no handlers.
- **Problem:** No working structured import. All structured data must be pasted as text.
- **Proposed smallest change:** `js/adapters/sheet.js` (pure: `File → {sheets, headers, rows}` for xlsx/xls/csv), a `SourceAdapter` interface `{id, version, accepts(file), parse(file), map(rows, template) → items}`, a visible "Import file" button (label + input, drag-drop) and a preview table → stage. Remove `parseWb`.
- **Dependencies:** DAT-03.
- **Likely files:** new `js/adapters/sheet.js`, `js/adapters/index.js`, `components/ImportDialog.js`; `HarvesterPanel.js`, `App.js`.
- **Acceptance:** A synthetic xlsx and csv import with every row previewed; unmapped headers listed; nothing is retained before review.
- **Verification:** TST-03 fixtures; TST-02; manual on Chrome/Edge/Safari.
- **Rollback:** std.
- **External approval:** HUI-01 SheetJS decision.

### XLS-02 · RAID log adapter (one template first) · P0 · V1
- **Current state:** Documented columns (`relationship_model.json` `sp_risk_log`); unwired drop zone.
- **Problem:** No actions, owners, due dates or typed RAID for the handover.
- **Proposed smallest change:** `adapters/raid.js` template T1 mapping `Date Raised, RAID Type, Description, State/Comments/Mitigation, Assigned To, Status, Due Date/Closed Date` to items with `raidType`, `owner`, `dueDate`, `status` as Facts. Sheet auto-detection by name (RAID / RAID Log / Log / RISK Log).
- **Dependencies:** XLS-01.
- **Likely files:** `js/adapters/raid.js`, fixtures.
- **Acceptance:** The handover Actions and RAID sections populate from the fixture, with row citations.
- **Verification:** TST-02/TST-03.
- **Rollback:** std.
- **External approval:** Owner provides sanitised headers of the real template.

### XLS-03 · Saved column-mapping templates · P1 · V1
- **Current state:** None.
- **Problem:** Repeated manual mapping for weekly files.
- **Proposed smallest change:** Store `{templateId, headerSignature, mapping}`. Auto-apply on a matching header signature, with a preview.
- **Dependencies:** XLS-01.
- **Likely files:** `js/adapters/templates.js`.
- **Acceptance:** A second import of the same layout needs no mapping.
- **Verification:** Manual.
- **Rollback:** std.
- **External approval:** None.

### XLS-04 · Re-import diff engine · P2 · V2
- **Current state:** None.
- **Problem:** Weekly files re-import everything.
- **Proposed smallest change:** Natural-key diff (new, changed, removed) against the previous Source of the same template. Changed rows become timeline nodes on the existing item.
- **Dependencies:** XLS-03, DAT-08.
- **Likely files:** `js/adapters/diff.js`.
- **Acceptance:** The two-version RAID fixture yields one item with two nodes (the Row12/Row18 pattern).
- **Verification:** TST-02.
- **Rollback:** std.
- **External approval:** None.

### XLS-05 · Beeline report import (generic CSV with field exclusion) · P2 · V1
- **Current state:** No reference in the repository.
- **Problem:** Resourcing data may matter for handover, but it is sensitive (rates).
- **Proposed smallest change:** Use XLS-01 with a column picker that excludes rate and cost fields by default.
- **Dependencies:** XLS-01; owner confirms purpose and fields.
- **Likely files:** `js/adapters/templates.js`.
- **Acceptance:** Excluded columns never stored.
- **Verification:** Fixture.
- **Rollback:** std.
- **External approval:** Owner/data-handling guidance.

### FIL-01 · .eml email file import · P1 · V1
- **Current state:** None.
- **Problem:** Email evidence can only be pasted.
- **Proposed smallest change:** `adapters/eml.js`: headers (Message-ID, Date, From display name, Subject), text/plain body or HTML converted to text, quoted-reply stripping, attachments listed only.
- **Dependencies:** XLS-01 (adapter interface).
- **Likely files:** `js/adapters/eml.js`.
- **Acceptance:** Fixtures parse; no remote content loaded; Message-ID dedup.
- **Verification:** TST-02/TST-03.
- **Rollback:** std.
- **External approval:** None.

### FIL-02 · .docx text and table extraction · P1 · V1
- **Current state:** None.
- **Problem:** Collaboration Plans and status reports cannot be imported.
- **Proposed smallest change:** `adapters/docx.js` using `DecompressionStream` (if adequate) or a vendored unzip library, plus a `document.xml` walker for paragraphs and tables.
- **Dependencies:** XLS-01; a vendor decision if a library is needed (HUI-01).
- **Likely files:** `js/adapters/docx.js`.
- **Acceptance:** Paragraphs and tables in order, with paragraph-index citations.
- **Verification:** Fixtures.
- **Rollback:** std.
- **External approval:** Vendor approval if needed.

### FIL-03 · Teams VTT transcript import · P1 · V1
- **Current state:** None.
- **Problem:** Meeting decisions are lost.
- **Proposed smallest change:** `adapters/vtt.js`: cues → {start, end, speaker, text}; the user selects cue ranges to stage; citations carry timestamps.
- **Dependencies:** XLS-01.
- **Likely files:** `js/adapters/vtt.js`.
- **Acceptance:** Fixture parses with speakers; staged items cite cue times.
- **Verification:** TST-02.
- **Rollback:** std.
- **External approval:** None (transcript download policy is the user's concern).

### FIL-04 · Text-PDF extraction · P2 · V1
- **Current state:** None.
- **Problem:** Contract and report PDFs cannot be imported.
- **Proposed smallest change:** Vendor a PDF text library locally (worker on the same origin); page-cited passages; scanned PDF → "no extractable text".
- **Dependencies:** HUI-01 (vendor approval).
- **Likely files:** `static/js/vendor/pdf*`, `js/adapters/pdf.js`.
- **Acceptance:** Fixture pages extracted; no network requests.
- **Verification:** TST-06.
- **Rollback:** std.
- **External approval:** Vendor/security approval.

### FIL-05 · .msg email import · P2 · V1
- **Current state:** None.
- **Problem:** Classic Outlook drag-out produces .msg.
- **Proposed smallest change:** A CFB reader (verify whether the SheetJS bundle's CFB support can be reused, else vendor a library) and a property-stream parse.
- **Dependencies:** FIL-01.
- **Likely files:** `js/adapters/msg.js`.
- **Acceptance:** Fixture parsed equivalently to the .eml version.
- **Verification:** TST-02.
- **Rollback:** std.
- **External approval:** Vendor approval if needed.

### FIL-06 · Manual-note "as of" date and .md/.txt import · P1 · V1 (import is V2 of local notes)
- **Current state:** Notes and pastes are WORKING; `created_at` only.
- **Problem:** Notes written later about earlier events are mis-dated.
- **Proposed smallest change:** An optional "as of" date on the note and paste forms; `.md/.txt` file import through the adapter interface.
- **Dependencies:** DAT-03.
- **Likely files:** `HarvesterPanel.js` (or `DataParkInput.js`), `js/adapters/text.js`.
- **Acceptance:** The handover uses `asOf` where present.
- **Verification:** Manual plus TST-02.
- **Rollback:** std.
- **External approval:** None.

---

## GDP

### GDP-01 · Browser GDP Excel adapter (documented columns, no defaults) · P0 · V1
- **Current state:** `integrations-gdp-adapter/parse.js` (Node, invents defaults), `gdp-adapter/service.py` (mocked), `parseWb` (unwired), three inconsistent column maps.
- **Problem:** No trustworthy current status for the handover.
- **Proposed smallest change:** `adapters/gdpExcel.js` per the integration register §3.1 mapping. Join on GDP ID / Project ID (EXACT). Natural key GDP ID + Project ID + Status Date. Missing values stay empty. `Status Date` → `asOf`.
- **Dependencies:** XLS-01, GDP-02 (header confirmation).
- **Likely files:** `js/adapters/gdpExcel.js`, fixtures.
- **Acceptance:** Synthetic fixture imports; other projects' rows are excluded with a count; no defaulted values; the handover status section cites the row and Status Date.
- **Verification:** TST-02/TST-03; manual comparison with a sanitised real export.
- **Rollback:** std.
- **External approval:** GDP-02.

### GDP-02 · GDP system-owner confirmation pack · P0 · V1
- **Current state:** Column list from internal docs only (`docs/SOURCES_CONFIG.md:21`).
- **Problem:** The mapping, sensitivity and V2 options are unconfirmed.
- **Proposed smallest change:** Send the six questions in integration register §3.1 and record the answers in `docs/DECISION_LOG.md`.
- **Dependencies:** none.
- **Likely files:** `docs/DECISION_LOG.md`.
- **Acceptance:** Answers recorded; sanitised header row obtained.
- **Verification:** Review.
- **Rollback:** n/a.
- **External approval:** **GDP owner.**

### GDP-03 · Project status panel from GDP facts · P1 · V1
- **Current state:** No status panel. The project stores the GDP ID/URL only.
- **Problem:** Status is not visible outside the handover.
- **Proposed smallest change:** Show the latest approved GDP row (phase, RAG, Status Date, age) on the project header, with a stale marker.
- **Dependencies:** GDP-01, HND-06.
- **Likely files:** `AppCenter.js` or a new `components/ProjectStatus.js`.
- **Acceptance:** Shows "Not imported" when absent; never shows a default RAG.
- **Verification:** Manual.
- **Rollback:** std.
- **External approval:** None.

### GDP-04 · V2 feasibility decision (authenticated retrieval) · P2 · V2
- **Current state:** `parse.js` `headCheckExists()` (a cross-origin HEAD, which would fail).
- **Problem:** Same-browser retrieval from `127.0.0.1` is blocked by CORS and cookie rules (register §3.1).
- **Proposed smallest change:** Decision record only. If the owner offers an export link, add a "Open GDP export" link-out (navigation, no fetch). Remove `headCheckExists`.
- **Dependencies:** GDP-02.
- **Likely files:** `docs/DECISION_LOG.md`, `ProjectModal.js` (link-out).
- **Acceptance:** No cross-origin fetch exists in the code.
- **Verification:** grep for `fetch(`.
- **Rollback:** std.
- **External approval:** GDP owner and IT policy.

### GDP-05 · GDP API integration · P3 · V3
- **Current state:** None.
- **Problem:** n/a until an API exists.
- **Proposed smallest change:** Defer.
- **Dependencies:** GDP-04, a governance process.
- **Likely files:** —
- **Acceptance:** —
- **Verification:** —
- **Rollback:** —
- **External approval:** GDP owner, IT, security.

---

## CONNECTED

### CON-01 · Connected report export adapter (CSV first) · P1 · V1
- **Current state:** Bookmarklet clipboard paste only. No export import.
- **Problem:** No structured commercial or opportunity data.
- **Proposed smallest change:** `adapters/connectedReport.js` with the mapping in register §3.2. EXACT join on Opportunity ID/Number. Amount optional and off by default.
- **Dependencies:** XLS-01, CON-02.
- **Likely files:** `js/adapters/connectedReport.js`, fixtures.
- **Acceptance:** Unmatched rows listed; nothing auto-retained.
- **Verification:** TST-02/TST-03.
- **Rollback:** std.
- **External approval:** CON-02.

### CON-02 · Connected owner confirmation · P1 · V1
- **Current state:** Fields assumed from Salesforce conventions.
- **Problem:** Unknown export permission and Chatter exportability.
- **Proposed smallest change:** Send the questions in register §3.2 and record the answers.
- **Dependencies:** none.
- **Likely files:** `docs/DECISION_LOG.md`.
- **Acceptance:** Answers recorded.
- **Verification:** Review.
- **Rollback:** n/a.
- **External approval:** **Connected owner.**

### CON-03 · Refresh workflow (diff on re-export) · P2 · V2
- **Current state:** None.
- **Problem:** Repeated full imports.
- **Proposed smallest change:** Reuse XLS-04 keyed on Opportunity ID + field.
- **Dependencies:** XLS-04, CON-01.
- **Likely files:** `js/adapters/diff.js`.
- **Acceptance:** Diff fixture correct.
- **Verification:** TST-02.
- **Rollback:** std.
- **External approval:** None.

### CON-04 · Single clipboard bookmarklet (after policy review) · P2 · V2
- **Current state:** Three bookmarklets: one `fetch`es localhost (likely CSP-blocked), one hard-codes a client and invents IDs, one auto-clicks page controls.
- **Problem:** Policy risk, invented data, duplication.
- **Proposed smallest change:** If approved: keep one read-only clipboard bookmarklet (visible text only, no clicks, no fetch, no default IDs) whose output passes through the existing paste path. Otherwise archive all three (REP-03).
- **Dependencies:** PRV-07.
- **Likely files:** `static/bookmarklet.js`; archive the other two.
- **Acceptance:** No network call; no DOM mutation; no defaults.
- **Verification:** Code review; manual test on a test page.
- **Rollback:** std.
- **External approval:** **IT / acceptable-use.**

### CON-05 · Connected API integration · P3 · V3
- **Current state:** None.
- **Problem / change:** Defer (needs a CRM connected app, a CORS allow-list and governance).
- **Dependencies:** CON-02, a governance process.
- **Likely files:** —
- **Acceptance / Verification / Rollback:** —
- **External approval:** CRM admin, security.

---

## MICROSOFT 365 SOURCES

### M365-01 · Outlook V1 via email files · P1 · V1
- **Current state:** None.
- **Problem:** Email context is pasted by hand.
- **Proposed smallest change:** User guidance (drag emails to a folder → import) plus FIL-01 (and FIL-05 later). Verify what drag-out produces on the work laptop (new Outlook vs classic).
- **Dependencies:** FIL-01.
- **Likely files:** `README.md` / in-app help.
- **Acceptance:** A real exported email (from the user's own mailbox) imports on the work laptop.
- **Verification:** Manual on the work laptop.
- **Rollback:** n/a.
- **External approval:** None.

### M365-02 · Teams transcript import · P1 · V1
- **Current state:** None.
- **Problem:** Meeting decisions are lost.
- **Proposed smallest change:** FIL-03 plus help text on downloading transcripts.
- **Dependencies:** FIL-03.
- **Likely files:** help.
- **Acceptance:** A real transcript imports (where meeting policy allows download).
- **Verification:** Manual.
- **Rollback:** n/a.
- **External approval:** Meeting transcript policy (organiser).

### M365-03 · Meeting recap paste template · P2 · V2
- **Current state:** Generic paste.
- **Problem:** Recap text lacks meeting metadata, and AI recaps would be treated as facts.
- **Proposed smallest change:** A "Meeting recap" paste form (title, date, attendees as text, source "Teams/Copilot recap"). Items are labelled Inference until confirmed.
- **Dependencies:** DAT-03, HND-02.
- **Likely files:** `DataParkInput` component.
- **Acceptance:** Recap items never render as Fact without confirmation.
- **Verification:** TST-02.
- **Rollback:** std.
- **External approval:** None.

### M365-04 · SharePoint and SMP URL references (no fetch) · P2 · V2
- **Current state:** `sharepoint_urls` and `sharepoint_smps` are captured in project registration and not shown.
- **Problem:** Successors cannot find the source documents.
- **Proposed smallest change:** Show the links in project details and the handover Sources appendix, with a user-set "last reviewed" date. Ask the owner to define SMP.
- **Dependencies:** HND-05.
- **Likely files:** `AppCenter.js`/project details, `js/handover/render.js`.
- **Acceptance:** The network panel shows no request to SharePoint.
- **Verification:** Manual.
- **Rollback:** std.
- **External approval:** SMP definition (owner).

### M365-05 · Synced-folder re-scan (OneDrive/SharePoint sync) · P2 · V2
- **Current state:** None.
- **Problem:** Re-importing updated files is manual.
- **Proposed smallest change:** `showDirectoryPicker` (Chrome/Edge) with the handle stored in IndexedDB. "Refresh" re-hashes files and offers changed ones to the adapters. Safari falls back to multi-select.
- **Dependencies:** DAT-01, XLS-04.
- **Likely files:** `js/adapters/folder.js`.
- **Acceptance:** Only changed files are offered.
- **Verification:** Manual.
- **Rollback:** std.
- **External approval:** Browser policy for file-system access (IT).

### M365-06 · OneNote page paste template · P2 · V1
- **Current state:** Generic paste.
- **Problem:** No page metadata.
- **Proposed smallest change:** A "OneNote page" paste form (page title, date). Saved as Draft.
- **Dependencies:** DAT-03.
- **Likely files:** `DataParkInput` component.
- **Acceptance:** Page title and date are kept in the provenance.
- **Verification:** Manual.
- **Rollback:** std.
- **External approval:** None.

### M365-07 · Microsoft Graph delegated pilot · P3 · V3
- **Current state:** None.
- **Problem:** Live retrieval needs governance.
- **Proposed smallest change:** Defer. Prerequisites: an approved Entra SPA registration, vendored MSAL, delegated read-only scopes, admin consent as required.
- **Dependencies:** COP-05 answers, security review.
- **Likely files:** —
- **Acceptance / Verification / Rollback:** —
- **External approval:** Tenant admin, security.

---

## COPILOT

### COP-01 · Handover package schema and export boundary notice · P1 · V1
- **Current state:** No package format.
- **Problem:** No stable contract for Copilot or Microsoft use.
- **Proposed smallest change:** `docs/schemas/handover.schema.json` (statements, kinds, sourceRefs, hashes). The export dialog shows a boundary reminder.
- **Dependencies:** HND-05.
- **Likely files:** `docs/schemas/handover.schema.json`, `HandoverModal.js`.
- **Acceptance:** The exported JSON validates.
- **Verification:** TST-02.
- **Rollback:** std.
- **External approval:** None.

### COP-02 · Structured prompt package · P2 · V2
- **Current state:** None.
- **Problem:** Copilot review is ad hoc and loses statement IDs.
- **Proposed smallest change:** Export `copilot-prompts.md` with versioned prompts (gap analysis, consistency, rewrite-without-new-facts), each instructing the model to cite `[S-n]` IDs.
- **Dependencies:** COP-01.
- **Likely files:** `js/handover/prompts.js`.
- **Acceptance:** Prompts reference only statement IDs present in the package.
- **Verification:** Manual round-trip.
- **Rollback:** std.
- **External approval:** None.

### COP-03 · Import external review as Draft suggestions · P1 · V1
- **Current state:** None.
- **Problem:** Copilot feedback has no way back in.
- **Proposed smallest change:** A paste box that parses `[S-n]` references into suggestions attached to statements. The user accepts or rejects each. Accepted text becomes a Recommendation or edited wording, never a Fact without a source.
- **Dependencies:** HND-02, HND-04.
- **Likely files:** `components/ExternalReviewImport.js`.
- **Acceptance:** A suggestion without a statement ID is listed as "unmapped".
- **Verification:** TST-02.
- **Rollback:** std.
- **External approval:** None.

### COP-04 · Agent Builder pilot over approved exports · P2 · V2
- **Current state:** None.
- **Problem:** Optional richer review inside M365.
- **Proposed smallest change:** Documented recipe only: a OneDrive folder of approved packages plus a declarative agent with fixed instructions. No Continuum code.
- **Dependencies:** COP-05 answers.
- **Likely files:** `docs/` recipe.
- **Acceptance:** The agent answers with citations to package files.
- **Verification:** Manual pilot.
- **Rollback:** Delete the agent.
- **External approval:** Tenant agent policy.

### COP-05 · Tenant administrator questions · P1 · V1
- **Current state:** Unknown entitlements.
- **Problem:** Patterns A, B and C depend on tenant settings.
- **Proposed smallest change:** Send the five questions in `COPILOT_INTEGRATION_OPTIONS.md` §F and record the answers.
- **Dependencies:** none.
- **Likely files:** `docs/DECISION_LOG.md`.
- **Acceptance:** Answers recorded.
- **Verification:** Review.
- **Rollback:** n/a.
- **External approval:** **Tenant admin.**

---

## DIAGNOSTICS

### DIA-01 · Local structured logger with redaction and bounded retention · P0 · V1
- **Current state:** None. Errors are swallowed throughout (`catch (e) {}`).
- **Problem:** Failures are invisible and unsupportable.
- **Proposed smallest change:** `core/log.js`: levels, ISO timestamps, event codes, allow-listed fields, redaction (PII screen + token patterns), ring buffer of 5,000 entries or 7 days in IndexedDB (localStorage fallback with a smaller cap), daily segments.
- **Dependencies:** none.
- **Likely files:** new `js/core/log.js`.
- **Acceptance:** Content fields are never logged. Tokens are redacted in tests. Retention is enforced.
- **Verification:** TST-02 redaction tests.
- **Rollback:** std.
- **External approval:** None.

### DIA-02 · Capture unhandled errors and rejections · P0 · V1
- **Current state:** Only the boot `try/catch` in `main.js`.
- **Problem:** Runtime errors are lost.
- **Proposed smallest change:** `window` `error` and `unhandledrejection` listeners log via DIA-01. A small non-blocking toast "Something went wrong. Details in Diagnostics."
- **Dependencies:** DIA-01.
- **Likely files:** `js/main.js`.
- **Acceptance:** A thrown test error appears in the log with a stack hash, not content.
- **Verification:** Manual (DevTools console `setTimeout(()=>{throw new Error('t')})`).
- **Rollback:** std.
- **External approval:** None.

### DIA-03 · Network failure logging (no bodies) · P1 · V1
- **Current state:** Silent failures (`VectorSync`, `AiClient`).
- **Problem:** Optional-service issues are undiagnosable.
- **Proposed smallest change:** A `safeFetch` wrapper that logs method, origin+path, status, duration and error name. Never headers, query or body.
- **Dependencies:** DIA-01.
- **Likely files:** `js/core/net.js`, `VectorSync.js`, `AiClient.js`.
- **Acceptance:** A test asserts no body or header is logged.
- **Verification:** TST-02.
- **Rollback:** std.
- **External approval:** None.

### DIA-04 · Diagnostics page and startup health checks · P1 · V1
- **Current state:** `vectorHealth()` only.
- **Problem:** No single support view.
- **Proposed smallest change:** Show app version, browser brand and version, storage persisted, quota, IndexedDB OK, SW state, cache name, vendor versions, optional service ping (127.0.0.1 only), queue lengths and the last 50 log events.
- **Dependencies:** DIA-01, DAT-04, FND-02.
- **Likely files:** `components/Diagnostics.js`.
- **Acceptance:** All checks render offline.
- **Verification:** Manual.
- **Rollback:** std.
- **External approval:** None.

### DIA-05 · User-controlled diagnostic export · P1 · V1
- **Current state:** None.
- **Problem:** Cannot share a support bundle safely.
- **Proposed smallest change:** "Export diagnostics": preview the JSON (redacted), then download. Never uploaded.
- **Dependencies:** DIA-04.
- **Likely files:** `components/Diagnostics.js`.
- **Acceptance:** The export contains no content fields or tokens (automated check).
- **Verification:** TST-02.
- **Rollback:** std.
- **External approval:** None.

### DIA-06 · DevTools and terminal logging guide · P1 · V1
- **Current state:** `relationship-v5` validation scripts (display-only).
- **Problem:** No support runbook.
- **Proposed smallest change:** `docs/SUPPORT.md`: Chrome/Edge DevTools (Console filter, Application → Storage/IndexedDB/Service Workers "Update on reload"/"Unregister", Network "Preserve log", warning about HAR files), the SW kill-switch, and terminal logging (`… 2>&1 | tee -a ~/Continuum/logs/server-$(date +%F).log`, Windows `>> log 2>&1`).
- **Dependencies:** PWA-02.
- **Likely files:** `docs/SUPPORT.md`.
- **Acceptance:** A new user can collect diagnostics by following the guide.
- **Verification:** Walkthrough.
- **Rollback:** n/a.
- **External approval:** None.

### DIA-07 · Server log hygiene · P1 · V1
- **Current state:** `service.py` uses the default `log_message` (logs the full request line including the query).
- **Problem:** Queries could contain identifiers. There is no persistent log option.
- **Proposed smallest change:** Override `log_message`: timestamp, method, path without the query, status. Optional `--log-file` with size-based rotation (`logging.handlers.RotatingFileHandler`).
- **Dependencies:** FND-01.
- **Likely files:** `modules/experience-pwa/service.py`.
- **Acceptance:** No query strings in the log; rotation at the configured size.
- **Verification:** Manual.
- **Rollback:** std.
- **External approval:** None.

---

## PRIVACY AND SECURITY

### PRV-01 · No external AI by default; AiProvider interface · P0 · V1
- **Current state:** `AiClient.callOpenRouter` (line 104) and `callAnthropic` (line 154) post content to public APIs when a key exists. `askSmartAssistant` (line 265) does the same with scoped cards.
- **Problem:** Violates "no external transmission of client or project content".
- **Proposed smallest change:** `provider = 'none'` by default (deterministic extract and tags; Q&A = local retrieval). Remote providers are removed from the release build or placed behind an explicit Settings switch that is off by default and shows a persistent "content leaves this device" warning. Keep a `remote-approved` slot for a future corporate endpoint.
- **Dependencies:** FND-03 decision.
- **Likely files:** `core/AiClient.js`, `HarvesterPanel.js` (gear/key UI), `AppRight.js`.
- **Acceptance:** With default settings, a full session makes zero requests to non-127.0.0.1 hosts.
- **Verification:** TST-06 plus the DevTools network panel.
- **Rollback:** std.
- **External approval:** Owner (FND-03).

### PRV-02 · Content-Security-Policy restricting network destinations · P0 · V1
- **Current state:** No CSP. An inline script exists in `index.html`.
- **Problem:** Nothing enforces the local-only boundary.
- **Proposed smallest change:** `service.py` sends `Content-Security-Policy: default-src 'self'; connect-src 'self' http://127.0.0.1:8006; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'none'; frame-src 'self'` (inline styles are needed by the current htm `style=${…}` usage).
- **Dependencies:** PWA-06 (remove the inline script), PRV-01.
- **Likely files:** `modules/experience-pwa/service.py`.
- **Acceptance:** Any attempted request to an external host is blocked and logged.
- **Verification:** Console shows CSP violations for a test fetch.
- **Rollback:** Remove the header.
- **External approval:** None.

### PRV-03 · Remove invented offline Q&A answers · P0 · V1
- **Current state:** `AiClient.mockQaFallback` lines 242 and 246 return hard-coded claims ("Apollo migration … VNet peering", "PO-88921 … depleted … Raj") with a real card citation.
- **Problem:** Fabricated facts presented as grounded.
- **Proposed smallest change:** Replace with deterministic retrieval: top-N scoped approved items by token overlap, quoting their text with citations, or "Not found in the current scope".
- **Dependencies:** none.
- **Likely files:** `core/AiClient.js`.
- **Acceptance:** No hard-coded domain sentences remain (grep). Answers quote only stored text.
- **Verification:** TST-02.
- **Rollback:** std.
- **External approval:** None.

### PRV-04 · Bind services to 127.0.0.1 and restrict CORS · P0 · V1
- **Current state:** All services bind `0.0.0.0`. CORS `*` (vector, anchor with credentials, cards, GDP, connected, admin).
- **Problem:** Project data is reachable from the local network. Any website can call the local services.
- **Proposed smallest change:** Default host `127.0.0.1` (flag to override). CORS `allow_origins=["http://127.0.0.1:8002","http://localhost:8002"]`, credentials false.
- **Dependencies:** none.
- **Likely files:** all `modules/*/service.py`, `modules/vector-service/main.py`.
- **Acceptance:** Not reachable from another machine. A cross-origin request from another origin is refused.
- **Verification:** `curl` from another host; a browser test page on a different port.
- **Rollback:** std.
- **External approval:** None.

### PRV-05 · Align the PII gate with documented behaviour · P1 · V1
- **Current state:** `PiiGate.piiScreen`: US-only phone regex; emails deliberately kept; test string `/Jane likes coffee/`; a separate `piiScreen` in `static/bookmarklet.js`.
- **Problem:** Documentation and V5 claim email redaction. Behaviour is inconsistent.
- **Proposed smallest change:** An owner decision on emails (single-user local: possibly keep them but mask in exports). International phone pattern. Remove the test string. One implementation shared with the bookmarklet. Apply to exports (handover) per policy.
- **Dependencies:** FND-03.
- **Likely files:** `core/PiiGate.js`, `static/bookmarklet.js`, `HandoverModal.js`.
- **Acceptance:** Unit tests for UK/US/international numbers and the email policy.
- **Verification:** TST-02.
- **Rollback:** std.
- **External approval:** Data-handling guidance (owner).

### PRV-06 · No secrets in localStorage · P1 · V1
- **Current state:** `OPENROUTER_API_KEY` / `ANTHROPIC_API_KEY` stored in plain text (`HarvesterPanel.saveKey`, line 363). The reset keeps them.
- **Problem:** Exposed to any script on the origin and persisted indefinitely.
- **Proposed smallest change:** If remote AI is kept (PRV-01), hold the key in memory for the session only. Delete the existing keys at startup.
- **Dependencies:** PRV-01.
- **Likely files:** `HarvesterPanel.js`, `AiClient.js`, `FailoverDB.js`.
- **Acceptance:** No `*_API_KEY` key in storage after use.
- **Verification:** DevTools → Application → Local Storage.
- **Rollback:** std.
- **External approval:** None.

### PRV-07 · Bookmarklet acceptable-use review · P1 · V2
- **Current state:** Three bookmarklets, including auto-clicking and localhost POST variants.
- **Problem:** Possible conflict with corporate policy and system terms.
- **Proposed smallest change:** Ask IT and the system owners, then record the decision. Until then, hide bookmarklet instructions in the UI.
- **Dependencies:** none.
- **Likely files:** `docs/DECISION_LOG.md`, `HarvesterPanel.js` (help text).
- **Acceptance:** Decision recorded.
- **Verification:** Review.
- **Rollback:** n/a.
- **External approval:** **IT / system owners.**

---

## TESTING

### TST-01 · No-build browser test harness · P0 · V1
- **Current state:** No JS tests. Curl scripts only.
- **Problem:** Refactors and P0 fixes cannot be verified repeatably.
- **Proposed smallest change:** `static/tests/index.html` plus `tests/harness.js` (about 60 lines: `test`, `assertEqual`, results table), importing app modules directly. It runs in any browser at `/tests/`. It is excluded from the precache.
- **Dependencies:** none.
- **Likely files:** new `static/tests/*`.
- **Acceptance:** Opening `/tests/` shows pass/fail counts.
- **Verification:** Manual run in Chrome/Edge/Safari.
- **Rollback:** Delete the folder.
- **External approval:** None.

### TST-02 · Unit tests for P0 logic · P0 · V1
- **Current state:** None.
- **Problem:** Handover grounding and data safety need proof.
- **Proposed smallest change:** Suites: handover filter (HND-01), statement kinds (HND-02/03), backup round-trip (DAT-02), corrupt-state handling (DAT-05), adapters (XLS-01/02, GDP-01), PII and log redaction (PRV-05, DIA-01), offline Q&A has no invented text (PRV-03).
- **Dependencies:** TST-01, TST-03.
- **Likely files:** `static/tests/*.test.js`.
- **Acceptance:** All pass. Each P0 item lists its tests.
- **Verification:** Run the harness.
- **Rollback:** n/a.
- **External approval:** None.

### TST-03 · Synthetic fixtures · P1 · V1
- **Current state:** Seed JSON only.
- **Problem:** No file fixtures for the adapters.
- **Proposed smallest change:** `static/tests/fixtures/`: GDP xlsx and csv, RAID T1 two versions, Connected csv, eml, vtt, docx (later). All `.example` domains and fictional IDs.
- **Dependencies:** none.
- **Likely files:** `static/tests/fixtures/*`.
- **Acceptance:** No real names, domains or IDs (reviewed).
- **Verification:** Review plus a grep check.
- **Rollback:** n/a.
- **External approval:** None.

### TST-04 · Manual release checklist · P1 · V1
- **Current state:** None.
- **Problem:** Install, offline and export are browser-level behaviours.
- **Proposed smallest change:** `docs/RELEASE_CHECKLIST.md`: start, install, offline start, import, review, handover preview/approve/export, backup/restore, update prompt, diagnostics export. Run on Chrome, Edge and Safari.
- **Dependencies:** P0 items.
- **Likely files:** `docs/RELEASE_CHECKLIST.md`.
- **Acceptance:** A signed-off checklist per release.
- **Verification:** Execution.
- **Rollback:** n/a.
- **External approval:** None.

### TST-05 · Fix or retire curl smoke scripts · P1 · V1
- **Current state:** `experience-pwa/test-pwa-api.sh` pipes HTML into `json.tool` (fails by design). Other scripts target optional services.
- **Problem:** Misleading test assets.
- **Proposed smallest change:** Fix the PWA script to check HTTP 200 and the content type. Mark the service scripts "optional services".
- **Dependencies:** none.
- **Likely files:** `modules/*/test-*.sh`.
- **Acceptance:** Scripts exit 0 against a running PWA.
- **Verification:** Run.
- **Rollback:** std.
- **External approval:** None.

### TST-06 · Automated "no external request" assertion · P2 · V1
- **Current state:** None.
- **Problem:** The local-only boundary is not continuously verified.
- **Proposed smallest change:** A test page step that lists `performance.getEntriesByType('resource')` and fails on any non-127.0.0.1/localhost origin. It also listens for CSP `securitypolicyviolation` events.
- **Dependencies:** TST-01, PRV-02.
- **Likely files:** `static/tests/network.test.js`.
- **Acceptance:** Fails when an external URL is added.
- **Verification:** Negative test.
- **Rollback:** n/a.
- **External approval:** None.

---

## REPOSITORY CLEANUP
(Each item executes the matching batch in `REPOSITORY_CLEANUP_CANDIDATES.md`, only with approval.)

### REP-01 · Sensitive-content review (Batch 1) · P1 · V1
- **Current state:** A corporate SharePoint URL in `Continuum-V4-Final.html`; personal paths; realistic IDs.
- **Problem:** Possible confidential references in Git.
- **Proposed smallest change:** Owner review; archive or delete the V4 file; decide on history rewriting separately (destructive, so explicit approval).
- **Dependencies:** none.
- **Likely files:** see Batch 1.
- **Acceptance:** Owner attestation recorded.
- **Verification:** grep for `sharepoint.com`, `/Users/` and the forbidden names.
- **Rollback:** Revert the commit (history rewriting cannot be rolled back easily; avoid it unless required).
- **External approval:** **Owner.**

### REP-02 · Untrack Chroma runtime data (Batch 2.1) · P1 · V1
- **Current state:** `modules/vector-service/chroma_data/*` tracked despite `.gitignore`.
- **Problem:** Runtime data in Git.
- **Proposed smallest change:** `git rm --cached -r modules/vector-service/chroma_data` (files stay on disk).
- **Dependencies:** none.
- **Likely files:** `chroma_data/*`.
- **Acceptance:** `git status` stays clean after the vector service runs.
- **Verification:** Run the service; `git status`.
- **Rollback:** `git revert`.
- **External approval:** Owner.

### REP-03 · Remove .bak files, duplicates and unused source (Batches 3–4) · P2 · V1
- **Current state:** Four `.bak` files, `seed_clients.pylear`, `seedData.v2.js`, `ProjectHeader.jsx`, extra bookmarklets.
- **Problem:** Noise and confusion.
- **Proposed smallest change:** Delete or archive per the batch list.
- **Dependencies:** CON-04 (bookmarklets), GDP-01 (parse.js).
- **Likely files:** see Batches 3–4.
- **Acceptance:** The app boots; tests pass.
- **Verification:** TST-01/TST-04.
- **Rollback:** `git revert`.
- **External approval:** Owner.

### REP-04 · Separate the anchor seed from runtime persistence · P1 · V1
- **Current state:** `platform-anchor/service.py` `PERSIST_PATH` = `data/seed/anchors_persist.json`.
- **Problem:** Runtime writes into a tracked seed.
- **Proposed smallest change:** Read the seed from `data/seed/anchors_seed.json`; persist to `~/.continuum/anchors.json` (or an env var).
- **Dependencies:** none (optional service).
- **Likely files:** `modules/platform-anchor/service.py`, `data/seed/`.
- **Acceptance:** `git status` stays clean after PUTs.
- **Verification:** Run plus `git status`.
- **Rollback:** std.
- **External approval:** Owner.

### REP-05 · Documentation consolidation (Batch 6) · P2 · V1
- **Current state:** Many superseded masters and backlogs; 45 templated spec files.
- **Problem:** Conflicting sources of truth.
- **Proposed smallest change:** Archive per the batch list once this backlog is accepted. Update README links.
- **Dependencies:** acceptance of this backlog.
- **Likely files:** see Batch 6.
- **Acceptance:** README points to the current docs only.
- **Verification:** Link check.
- **Rollback:** `git revert`.
- **External approval:** Owner.

### REP-06 · Fix or archive admin-relationship (:8005) · P2 · V1
- **Current state:** Hard-coded `/Users/wolf/...` read and write paths (`service.py:19,34`).
- **Problem:** Broken elsewhere; it writes outside the repository.
- **Proposed smallest change:** Archive (not in the release) or switch to repo-relative paths.
- **Dependencies:** none.
- **Likely files:** `modules/admin-relationship/service.py`.
- **Acceptance:** No absolute personal paths remain.
- **Verification:** grep.
- **Rollback:** `git revert`.
- **External approval:** Owner.
