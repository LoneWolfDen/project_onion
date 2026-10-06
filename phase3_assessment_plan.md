# Phase 3 Assessment and Plan

Source: `Continuum_Backlog_Validation_6Oct2026.pages` (a validation prompt followed by the "Continuum NEXT-SET Prioritized Backlog", the same 11 epics and 47 items as Phase 2).
Reviewed against `main` at `992e74e` (PRs #37 to #62 merged, Phase 2 releases 0 to 3 done).
Roles: architect, solution architect, full-stack developer, AI developer. Per the request the document's own release grouping is ignored; the order below is derived from the code.
Nothing here is implemented yet. Phase 3 starts when the user says so.

## 1. Headline

Every functional item in the backlog is now in the code. What is left is not new features. It is four things:

1. **Proof.** The pilot exit criteria (STR-02) have been tested by unit tests and one Chromium smoke run, never by a person on a real project, a second device, Safari or a Teams share.
2. **Two trust defects that are still in the code** (section 4), one of which breaks the document's own rule "offline extraction never invents names, statuses, decisions".
3. **Repo clean-up that was never finished** (FND-01): tracked `.bak` files, about 40 overlapping docs, a v0.16 README, no history scan, and five Python services the pilot does not use.
4. **Maintainability of the large UI files**, which decide how safely anything after the pilot can be changed.

Recommendation: run Phase 3 as a **pilot-hardening phase**, not a feature phase. Add only the three small features in section 6 that the pilot will immediately ask for.

## 2. Smallest viable production pilot (the document's question 1)

Already satisfied by code: installable PWA with offline start, no-AI default, session-only keys, backup and restore, storage failure banner, destructive-action guards, approved-only handover with review gate and zip package, source records on every import, RAID/GDP/CSV/eml/vtt imports, Evidence Strength with breakdown, Diagnostics, Radar, Presentation Mode.

Not yet true, and each is a pilot gate:

| Gate | What is missing |
|---|---|
| Real-data rehearsal | One delivery lead runs one real (non-sensitive) project for a week, from import to approved handover, using `phase2/TESTING_GUIDE.md`. Nobody has done this end to end. |
| No invented facts | Fix the offline answer fallback (4.1). |
| Backup and restore on a real browser profile | Tested in unit tests and Chromium; not tested with a profile that has weeks of data or after a browser restart. |
| Readable over Teams | HUI-01 is checked by computed font size in Chromium only. A human share test at 1366x768 is not recorded. |
| Merge protection | `critical-tests` is not yet a required check, so a failing trust test does not block merging. Needs a repo setting from the user. |
| Second device / real network | Still unverified (needs the user). Pilot is single-user, so this is a "know before you promise" check, not a blocker. |

## 3. Backlog comparison and classification (the document's questions 1 to 5)

Status is from the code and tests, not from the plan. MoSCoW is for the **single-user delivery-lead pilot**.

| Item | Status | MoSCoW | Note |
|---|---|---|---|
| FND-01 secrets and stale files | Partial | Must | Tree scan clean, key-shaped strings checked in CI. History never scanned; `.bak` files, doc sprawl and stale modules remain (section 5). |
| FND-02 runtime DB out of Git | Done | Must | Untracked, but history still holds Chroma files (5.3). |
| FND-03 personal paths | Done | Must | `check-repo.mjs` guards it. |
| DAT-01 backup/restore | Done | Must | |
| DAT-02 storage failures | Done | Must | |
| DAT-03 IndexedDB | Done | Should | Verified one-time migration. |
| DAT-04 persist() | Done | Should | |
| DAT-05 destructive actions | Done | Must | |
| PRV-01 no-AI default | Done, with defect | Must | Defect 4.1 in the offline answer path. |
| PRV-02 keys out of storage | Done | Must | |
| PRV-03 loopback only | Done | Must | Second device unverified. |
| PRV-04 vector scope | Done | Could | Pilot is single-user; persona is client-supplied unless `ONION_PERSONA` is set. |
| PRV-05 one PII module | Done | Must | Emails intentionally kept (decision 5 Oct). |
| PWA-01/02 manifest, precache | Done | Should | Safari path not tested. |
| PWA-03 degraded indicators | Partial | Should | Diagnostics shows them; confirm each state is visible without opening Diagnostics. |
| IMP-01..04 Source, CSV, RAID, GDP | Done | Must | |
| IMP-05 bookmarklet | Done | Could | Off by default. Defer; not needed for the pilot. |
| IMP-06 eml, vtt | Done | Should | Needs explicit "Decision:" / "Action:" markers. |
| KNW-01 statement kinds | Done | Must | |
| KNW-02 Decision entity | Done, partial | Should | No decisions list and no decisions section in the export. |
| KNW-03 compounding | Done | Should | Reused copies do not refresh (4.4). |
| KNW-04 Evidence Strength | Done | Must | |
| HND-01..03 handover | Done | Must | |
| HND-04 package | Done | Should | Zip is stored, not compressed. Cosmetic. |
| HUI-01 typography | Done | Must | Human share test missing. |
| HUI-02 Presentation Mode | Done | Could | |
| HUI-03 card hierarchy | Done | Should | Behind a flag. Decide if it becomes the default after the pilot. |
| HUI-04 CSS migration | Partial | Could | Only the banner moved. Do not extend before the pilot. |
| RAD-01/02 radar, reuse | Done | Could | Radar ignores staging items. |
| OPS-01..03 logs, diagnostics, trust tests | Done | Must | |
| STR-01 primary user | Decided | Must | Delivery lead. |
| STR-02 pilot | Not run | Must | Section 2. |
| Enterprise (Graph, Entra, MCP, shared storage, agents) | Not started | Future | Keep optional, as the document says. |

**Supports Knowledge Compounding:** KNW-03, KNW-04, RAD-01/02, IMP-01, KNW-02. **Supports Trusted Handover:** HND-01..04, KNW-01, PRV-05, IMP-01, DAT-01.
**Can be deferred without hurting the pilot:** IMP-05, HUI-02, HUI-04, PRV-04, RAD-02, PWA-03 polish.

## 4. Defects and gaps found in the code

1. **Offline answers can invent facts.** `core/AiClient.js` `mockQaFallback` returns canned text when a question contains "why", "delay", "block" or "PO": "The Apollo migration is currently delayed pending AWS gateway VNet peering approval..." and "Work is halted because PO-88921 funding Infosec consultants is depleted... Lead Dev Raj identified a legacy on-prem gateway workaround". These are demo-script lines. In no-AI mode (the default) a real project asking "why was this delayed?" gets this answer, with a citation of an unrelated card. The same function also has a "witty" refusal line. This directly breaks the backlog rule (PRV-01: "offline extraction never invents amounts, names, statuses, decisions, or citations") and the trust-boundary suite does not cover it. **Must fix first.**
2. **Hard-coded demo project in vector sync.** `core/VectorSync.js:44-45` defaults project to `Apollo-123`. A card with no project is filed under a demo project in the vector store. Must fail closed (skip and log) instead.
3. **Extraction needs markers.** Decisions and actions are only recognised after literal "Decision:" or "Action:". Free text produces nothing. This is the honest behaviour; the gap is that the user is not told why nothing was found. See 6.2.
4. **Reuse does not refresh.** A reused copy keeps the evidence it had when copied; the panel shows "N added since" but cannot update the copy. Compounding is visible but not yet useful.
5. **RAID cards whose text was replaced by an approved update re-import as new.** Row key is held in the card text, not on the card. Store the row key as a field.
6. **Radar does not see staging items** (Harvester list). A project can look healthy while unreviewed items pile up.
7. **Decisions are not a list.** Recorded on the card only; not in the handover export as a section of its own and not in `sources.csv`.
8. **Two service-worker/vector coupling leftovers:** `sw.js` header comment and `FailoverDB.js` still reference `localhost:8000/8001` (`API_BASES`) although the app is pure local. Dead path with a CORS-failure history.

## 5. Architecture and repo assessment

### 5.1 What is sound and must not change
No-build React + htm, local-first, `Repo` interface over IndexedDB, pure `core/*.js` modules with unit tests, loopback-only services via one shared helper, repository guards in CI, source record on every import, approved-only handover. Phase 3 keeps all of it. No bundler, no framework, no network dependency.

### 5.2 Code shape
- UI components are the weak point: `HarvesterPanel.js` 926 lines, `TimelineCard.js` 871, `App.js` 512, `AppCenter.js` 303, `HandoverModal.js` 287. Core logic is small and tested; components are not (only the Playwright smoke run covers them).
- `styles.css` is a 39 KB frozen utility block plus tokens; `scripts/css-usage.mjs` guards it. Leave it until after the pilot (HUI-04 stays Could).
- `static/docs/` ships four large reference HTML files and a second React app (`relationship-v5`, `guide-app`) inside the PWA folder. They are presentation material, not product. They should be excluded from the precache and, preferably, moved out of `static/` (needs the service worker test updated).

### 5.3 Repo hygiene (FND-01 remainder)
- `git ls-files` still tracks 4 `.bak.*` files under `static/js` and `data/mockSeed.js.bak.*`. They are not matched by the `*.bak` ignore. Safe to remove once the smoke suite passes (it already does).
- Docs: about 40 files in `docs/`, many superseded (`BACKLOG_v0.16`, `BACKLOG_v0.20`, `NEXT_SPRINT`, `CONTEXT_SUMMARY_v0.20`, three `REGISTRATION_FIELDS*`, `SUPER-FINAL-MASTER`, `IMPLEMENTATION-MASTER-FINAL`, root `IMPLEMENTATION_MASTER.md`, `MUSE_AUDIT_LOG.md`, `STATE.md` at v0.12, `README.md` at v0.16). A new reader following the README is told to start services that the pilot does not use. Needs one `docs/INDEX.md`, a current README, and an `archive/` folder (move, not delete) so references survive.
- Unused service modules: `platform-anchor`, `domain-cards-store`, `gdp-adapter`, `admin-relationship`, spec-only folders `02-file-crawler`, `03-excel-parser`, `05-fusion-engine`, `integrations-excel-parser`. Only `experience-pwa/service.py` (static host) and `vector-service` (optional) are used by the PWA. Recommendation: move the unused ones to `archive/modules/`, keep `_shared`, and drop them from CI (this also shrinks the Python test surface).
- History: no secret has been found in the tree and the CI key-shape check is clean, but git history was **not scanned** (the Phase 2 plan promised gitleaks in CI and it was not added). Chroma database files (`chroma.sqlite3`, vector `.bin`) were committed earlier and remain in history; they came from demo data. Recommendation: scan history once (gitleaks), add it to CI, and leave history as is unless the scan finds a real secret or the user says the Chroma data was real.
- Branch protection: `critical-tests` required (user action).

### 5.4 Test coverage
Strong: pure modules (about 24 test files), trust-boundary suite, Python scope and loopback tests, Chromium smoke. Gaps: no component tests, no WebKit run (Safari is the stated install path in PWA-01), no end-to-end "week of use" scenario, no test that the offline answer path never returns canned facts, no check that precache excludes `static/docs`.

## 6. What to add (from the architect, full-stack and AI roles)

Kept deliberately small: each of these follows from something the pilot will hit in the first week.

1. **Decisions list and export section** (full-stack). A Decisions tab per project and a "Confirmed decisions" section in the handover package, both from the existing Decision records. No new data model.
2. **Why-nothing-was-found feedback in import** (full-stack). After an `.eml` / `.vtt` / paste import with no markers, show "No Decision: or Action: lines found. Add a marker or write the item yourself." Addresses 4.3 without inventing anything.
3. **Opt-in AI proposals for free text** (AI developer). Using the existing provider gate (explicit acknowledgement, session-only key, labelled with provider and model), propose decisions and actions from approved text as Draft with **Inference** kind and a quoted span from the source. Rules: never auto-approve, never fill fields the text does not state, show the quoted span, reject output whose quote is not found in the source (a mechanical check, not a model check). No-AI mode stays unchanged.
4. **Copy-prompt and paste-back workflow** (AI developer, no API needed). Generate a bounded prompt (approved items only, PII screened) for the user to paste into Copilot, and accept the answer back as a Draft with kind Inference. This was already agreed for column matching; extend it to handover summaries. Keeps the "no mandatory API" principle.
5. **Local model option** (AI developer, evaluate only). Evaluate an on-device or loopback model (for example an Ollama endpoint on 127.0.0.1) as a provider in `aiConfig.js`. It satisfies "content never leaves the device" and may be acceptable where remote providers are not. Spike and a decision, not a commitment.
6. **Refresh reused copy** (full-stack). A "Pull new evidence" action on a reused Draft, never automatic.
7. **Optional later, not now:** shared storage, Graph, Entra, MCP, hosted agent. The pilot should produce the feedback that decides whether any are needed.

## 7. Proposed Phase 3 plan

Order is by risk removed, then by dependency. Each workstream is one thread and one to three small PRs, with CI green and the existing "one thread per workstream" rule.

**W1. Trust fixes (Must, first)**
1. Replace `mockQaFallback` with a deterministic, honest fallback: list matching approved cards with their titles and sources, or "No approved evidence matches this question." No canned prose, no names, no witty line.
2. Remove the `Apollo-123` default in `VectorSync.js`; skip and log a safe event if a card has no project.
3. Add trust-boundary tests: offline answers contain only text taken from scoped cards; no canned strings exist in `AiClient.js`; vector payload never has a default project.
4. Remove `API_BASES` and the dead fetch path from `FailoverDB.js` if the smoke suite shows no use.

**W2. Repo clean-up (Must)**
1. Remove tracked `.bak` files; widen `.gitignore` to `*.bak.*`; extend `check-repo.mjs` to fail on them.
2. Add gitleaks to CI and run it on full history once; report findings to the user.
3. Move superseded docs and unused service modules to `archive/` (git mv), write `docs/INDEX.md`, rewrite `README.md` and `STATE.md` to the current state, update every reference.
4. Move `static/docs` reference material out of the precache; update the SW precache test.
5. Gate: smoke suite and unit tests green before and after; no deletion without a browser run (the document's own rule).

**W3. Data fidelity (Should)**
1. Store the RAID row key on the card (fix 4.5) with a one-time migration.
2. Decisions list and export section (6.1).
3. Radar includes staging items (4.6).
4. Import "nothing found" feedback (6.2).

**W4. Verification (Must, needs the user for parts)**
1. WebKit job in CI for the smoke suite (closest to Safari that CI can run).
2. A "week of use" scripted scenario in Playwright: import GDP and RAID, add notes, approve, record decision, re-import changed RAID, back up, wipe, restore, build handover, export package.
3. Manual checklist recorded in `docs/PILOT_CHECKLIST.md`: Teams share readability, second device on a real network, Safari install, backup/restore on a long-lived profile. The user runs these; results go in the file.
4. Mark `critical-tests` required (user).

**W5. Pilot run (Must)**
Run STR-02 with one real project. Collect behavioural measures locally, with no content: sessions, imports, items approved, handovers built, time from import to handover. Show them in Diagnostics (previewable export, as today). Exit criteria are the six STR-02 bullets. Phase 3 is complete when the user signs off the pilot.

**W6. Controlled additions (Could, after W1 to W5, user chooses)**
6.3, 6.4, 6.5 and 6.6 above, one thread each, with the AI proposals behind the provider gate.

## 8. Risks

1. Moving docs and modules can break links used in the app or CI; the repo check and a link scan must run in the same PR.
2. A WebKit CI job may be slow or flaky; if so keep it as a nightly job, not blocking.
3. AI proposals (6.3) are the only place a model could put words in a source's mouth. The quote-must-exist check and Draft-only rule are the control; without them skip 6.3.
4. The pilot measures only one user. Conclusions about teams (PRV-04, shared storage) must wait for a second user.

## 9. Decisions for the user

1. **Archive unused Python services** (`platform-anchor`, `domain-cards-store`, `gdp-adapter`, `admin-relationship`, spec-only modules)? Recommended: yes, move to `archive/`, not delete.
2. **Leave Chroma files in history**, assuming they held only demo data? Recommended: yes; rewriting history changes every commit id.
3. **Mark `critical-tests` as a required check** in branch rules (carried over; only you can do this).
4. **Allow opt-in AI proposals for free text (6.3)** or keep marker-only extraction? Recommended: build 6.4 (paste-back) first, 6.3 after the pilot.
5. **Spike a local model provider (6.5)?** Recommended: yes, time-boxed, decision only.
6. **Who runs the real-project pilot and the manual checks in W4** (Teams share, second device, Safari)?
7. **Should HUI-03 hierarchy become the default** after the pilot, and the old layout be removed?

## 10. Progress (6 Oct)

Decisions received 6 Oct: archive unused code and docs (yes, organised, only what describes the latest implementation stays); Chroma files were committed by mistake; `critical-tests` to be required (user action); Q4/Q5 as recommended; manual checks on Teams share, Windows and Safari (user); HUI-03 layout becomes default only if the old layout is unused.

Done in the first Phase 3 pull request (workstreams W1, W2 and part of W4):
- Offline answers rewritten: they now list matching scoped cards with their own text and citations, or say nothing matched. Canned demo prose removed; test added to the `critical-tests` suite.
- Vector sync no longer files a project-less card under `Apollo-123` (nothing is queued); client default `Acme Corp` removed; tests added.
- Dead `API_BASES` fetch path removed from `FailoverDB.js`.
- FND-01: four tracked `.bak` files removed; `.gitignore` and `check-repo.mjs` now reject backup copies and unexpected module folders; full-history secret scan added to CI (gitleaks, all refs). A manual scan of all 162 commits and gitleaks found no secrets. The old Chroma files in history hold demo and test text only.
- Archive: 19 retired module folders (services and spec-only), 25 superseded documents and folders and the old root documents moved with `git mv` to `archive/`; live modules are `_shared`, `experience-pwa`, `vector-service`. New `README.md`, `docs/INDEX.md`, `docs/TESTING.md`, `archive/README.md`. In-app pages and design notes updated to point at archive paths.
- New "What can this app do here?" panel (Harvester drawer): browser checks, a table of what the app can and cannot read (Teams chats and Outlook cannot be read; Copilot, agents, MCP and Graph not built), and self-declared licences that tailor advice. A browser cannot see Microsoft 365 licences, so they are declared, not detected.
- Smoke run extended (capability panel and guide and map pages); 170/170 checks pass in Chromium, plus 188 unit tests, Python tests and repo checks.
- `docs/PILOT_CHECKLIST.md` lists the manual checks that need a person.

Still open: W3 (RAID row key on the card, decisions list and export section, radar over staging items, "nothing found" import feedback), WebKit CI job, the pilot run, the copy-out / paste-back workflow and the AI proposal and local-model items (W6). The "World of Continuum" footer still links to two personal Codespaces URLs that cannot be checked from here.

Second Phase 3 pull request (6 Oct):
- Cross-app handover: footer links to the Finance Engine and Pre-Sales Accelerator carry the active project's identifiers in `#ctx=`; Continuum opens on an incoming link already filtered (ref, then project ID, opportunity, GDP ID; never by name), or says it found none or several. App addresses can be set per device (Harvester → Linked apps). Contract: `docs/APP_HANDOVER_CONTRACT.md`; prompt for the other repos: `docs/prompts/CROSS_APP_HANDOVER_PROMPT.md`. Recommendation: keep `Project_ReferenceID` as Continuum's opaque, immutable ref and join across apps on business IDs.
- Copilot Pattern A: the package now has `decisions.csv` and `copilot-prompts.md`, and a Confirmed decisions section; "Paste a Copilot reply" stores replies as private Drafts that are always Inference or Recommendation. Assessment of patterns A, B and C: `docs/COPILOT_ASSESSMENT.md`.
- Smart Assistant without AI states the search scope and labels each match with its statement kind (drafts as Needs confirmation, nothing found as Not found); remote answers are labelled Inference with the model.
- Radar: new "Waiting for review" rule for items left in the Harvester list. Mail and transcript import explain what to do when no "Decision:" or "Action:" line is found.
- RAID row key: already stored on cards since Release 2 (`rowKey`); only cards approved before then fall back to content matching.

Still open: WebKit CI job, promoting a pasted Inference to an accepted Recommendation, Pattern B direct writes and Pattern C (need tenant decisions), the pilot run and the manual checks in `docs/PILOT_CHECKLIST.md`.
