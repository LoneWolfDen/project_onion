# Phase 2 Implementation Plan

Source: `Phase2_BAcklog_5Oct.md` ("Continuum NEXT-SET Prioritized Backlog", 11 epics).
Reviewed against `main` at `d2012ac` (PR #35 merged, 24/24 unit tests pass locally, CI green).

## 1. Starting position

- All 19 items of the previous backlog (`docs/SONNET-FINAL-BACKLOG.md`) are done. No other open PRs. Old feature/fix branches exist on origin but are not backlog work.
- Test safety net today: `node --test modules/experience-pwa/tests/*.test.mjs` (confidence + VectorSync, 24 tests) and a Playwright smoke script (`tests/smoke.mjs`), both run by `.github/workflows/pwa-smoke.yml` on every PR.
- Code size is small and no-build: the PWA is ~4.2k lines of ES modules under `modules/experience-pwa/static/js` (React + htm from `vendor/`). State is one localStorage object (`onion_db_state`) behind `core/FailoverDB.js`.

## 2. What already exists vs the backlog

| Item | Status in code | Evidence |
|---|---|---|
| FND-01 secrets/stale files | Partial. Quick pattern scan of the tree found no live keys, but history was not scanned. `.bak` files, many overlapping docs (`docs/BACKLOG_*`, `SUPER-FINAL-MASTER`, `IMPLEMENTATION_MASTER`, `MUSE_AUDIT_LOG`, three registration-field versions) remain. | `components/*.bak.*`, `core/FailoverDB.js.bak.*`, `data/mockSeed.js.bak.*` |
| FND-02 runtime DB untracked | **Not done.** `.gitignore` lists `chroma_data` but five files are still tracked, so the ignore has no effect. | `git ls-files | grep chroma` → `chroma.sqlite3` + 4 `.bin` |
| FND-03 machine paths | **Not done.** personal absolute paths (macOS home folder, `C:` drive) still in 7 files. | `seed_cards.py`, `admin-relationship/service.py`, `platform-anchor/README.md`, `seed_clients.py`, `MUSE_AUDIT_LOG.md`, `docs/TESTING.md`, `docs/DATA_DICTIONARY.md` |
| DAT-01 backup/restore | Missing. | no export/import code |
| DAT-02 storage failures | **Worse than described.** `writeLocal` has an empty `catch` and reports success; `readLocal` returns an empty dataset on JSON parse failure, and the next write overwrites the corrupt original. | `core/FailoverDB.js:51-125` |
| DAT-03 IndexedDB | Missing. Everything is localStorage plus a `FailoverDB` class that mixes API-or-local access. | no `indexedDB` use |
| DAT-04 persist() | Missing. | no `navigator.storage` use |
| DAT-05 destructive actions | Partial. Card delete uses `window.confirm`; Reset Demo Dataset path in `HarvesterPanel.js:719` needs confirmation check; no typed phrase, no pre-reset backup. `resetToSeedData` has no guard at all. | `TimelineCard.js:484`, `FailoverDB.js:458-476` |
| PRV-01 no-AI default | Partial. AI falls back to mock when no key (good), but provider choice, data-leaves-device acknowledgement, and "No AI" labelling are not present. | `core/AiClient.js:105-120` |
| PRV-02 keys not in storage | **Not done.** `OPENROUTER_API_KEY`, `ANTHROPIC_API_KEY` in localStorage; key re-read into the input box. | `AiClient.js:108,166,287`; `HarvesterPanel.js:171,396` |
| PRV-03 loopback only | **Not done.** Six services bind `0.0.0.0`; six also allow `*` CORS, and `vector-service` allows `*` alongside its listed origins. | `platform-anchor:409`, `domain-cards-store:116`, `gdp-adapter:146`, `admin-relationship:182`, `connected-bookmarklet:55`, `experience-pwa/service.py:92`, `vector-service/main.py:14` |
| PRV-04 vector privacy | Partial. Privacy mapping fix exists, but it is inferred from a free-text string and `/ask` takes `activePersona` from the request body. No auth. | `vector-service/main.py:64-130` |
| PRV-05 PII | Partial/inconsistent. `PiiGate` redacts phones and noise words only; emails deliberately left in. Handover imports its own `piiScreen`. Titles unscreened. | `core/PiiGate.js` |
| PWA-01 manifest | Missing (no manifest, no icons). | `index.html` |
| PWA-02 SW | Not done. `sw.js` is cache-first with a fixed name `onion-sw-v1-privacyfix`, `skipWaiting()` on install (no user-controlled update), no precache list, hard-coded `localhost:8006`. | `sw.js:8-16` |
| PWA-03 degraded indicators | Partial. SW posts vector online/offline messages; no unified indicator. | `sw.js`, `VectorSync.js` |
| IMP-01 Source record | Missing. | |
| IMP-02 Excel/CSV | Stub. `xlsx.full.min.js` is vendored and `App.js:249-252` reads **only the first sheet** with no mapping or preview; two dropzone labels in `HarvesterPanel.js:752-753` are not wired. | |
| IMP-03/04 RAID, GDP | Missing; `modules/gdp-adapter`, `integrations-*` hold only `CONTRACT.md` or mock services. | |
| IMP-05 bookmarklet | Partial. Two implementations exist (`static/bookmarklet.js`, `modules/connected-bookmarklet`). | |
| IMP-06 eml/VTT | Missing. | |
| KNW-01 statement kinds | Missing. | |
| KNW-02 Decision entity | Missing. | |
| KNW-03 compounding | Missing (Relationship Model docs describe it only). | |
| KNW-04 Evidence Strength | Partial. `core/confidence.js` is a transparent corroboration rule with breakdown and tests, but counts distinct "origins" including unapproved ones, and is named "confidence". | `confidence.js:17-27` |
| HND-01..04 handover | Partial. `HandoverModal.js` builds HTML/PDF with **keyword inference** (`categoryFor`, `isRiskCard`) and no approved-only filter, no Not found, no preview gate, no package export. | `HandoverModal.js:19-31` |
| HUI-01 typography | Not done. 10/11/12px text is common (e.g. dozens of 8-12px inline font sizes in `TimelineCard.js`). | |
| HUI-02..04 | Missing. | |
| RAD-01/02 | Missing. | |
| OPS-01/02 | Missing (no `onerror`/`unhandledrejection`, no diagnostics screen). | |
| OPS-03 trust tests | Partial. Confidence and VectorSync covered; handover, PII, backup, privacy isolation, SW upgrade uncovered. | `tests/` |
| STR-01/02 | Product decisions, no code. | |

## 3. Key risks and dependencies

1. **The `FailoverDB`/localStorage coupling is the critical path.** DAT-01, DAT-02, DAT-03, IMP-01, KNW-02 and OPS-02 all read or write state. Introduce a repository interface first (a thin `Repo` module) so IndexedDB is a swap, not a rewrite.
2. **Data model changes ripple.** Source, Decision, statement kind, and structured RAID fields need a `schemaVersion` and a migration runner before any of them land; otherwise DAT-01 backups become incompatible as soon as the model changes.
3. **No-build, no-dependency constraint** (`vendor/` only). Hashing uses `crypto.subtle`; zip/xlsx use the vendored lib. Do not add a bundler to deliver any item.
4. **Handover rewrite touches the largest, least-tested file** (`HandoverModal.js`, 268 dense lines). Extract pure functions first and test them.
5. **Python services are mostly mock and may be dropped.** PRV-03 is cheap if scoped to a shared helper; avoid hardening services the pilot does not use (STR-02 says no Graph/CRM/agents).
6. **Removing tracked Chroma files** changes history size but not behaviour; confirm a fresh clone starts (`seed.py`).
7. **Secret history**: if a key ever existed in history, deleting it from HEAD is not enough (FND-01). Needs a history scan and, if found, rotation by the owner.
8. Open product decisions block scope: STR-01 (persona) and STR-02 (pilot) affect whether PRV-04, Radar and Graph-like work are needed at all. Recommended defaults are in the backlog; confirm before starting Release 3.
9. **Doc cleanup is destructive.** FND-01 requires browser testing before deleting stale code; use the existing smoke suite and extend it first.

## 4. Sequencing

Follows the backlog's releases but regroups by dependency. Each step ships as its own PR with tests; CI stays green throughout.

### Step 0: Safety net (before any feature)
- Extend `tests/smoke.mjs` to cover: load, add note, approve card, open handover, reset demo (cancel + confirm).
- Add `scripts/check-repo.mjs` (run in CI): fails on tracked runtime DBs, machine paths, and key-shaped strings. This makes FND-01/02/03 permanent, not one-off.
- Add gitleaks (or equivalent) to CI for history.

### Release 0 — Protect existing value (P0, ~1-2 weeks)
1. **FND-02** `git rm --cached` chroma files; verify fresh clone + `seed.py`; guard added in Step 0.
2. **FND-03** replace paths with repo-relative lookup (`Path(__file__)` / env var `ONION_DATA_DIR`) in the 7 files; one shared constant for admin and services.
3. **FND-01** run history scan; remove `.bak` files and merge docs into one status doc **after** smoke passes; leave redirects/notes where files were referenced.
4. **Repo layer + schema version** (enabler, not in backlog): `core/Repo.js` wrapping `readLocal`/`writeLocal`, with `schemaVersion`, typed `StorageError`, and a persistent error banner hook.
5. **DAT-02** make `writeLocal` return success/failure and surface it; on parse failure retain raw string under `onion_db_corrupt_<date>` and open read-only with a download link instead of writing an empty dataset.
6. **DAT-01** export/import JSON with `generatedAt`, versions, SHA-256 (`crypto.subtle`), Replace/Merge, validate-then-apply, auto pre-import backup. Pure functions in `core/backup.js` for unit tests.
7. **DAT-05** shared `ConfirmDialog` (plain confirm for reset, typed phrase for clear-all, backup offered first); remove unguarded `resetToSeedData` callers.
8. **PRV-01/02** provider setting default `none`; remove key from localStorage (session memory only, `sessionStorage` at most, never in exports/diagnostics); acknowledgement dialog; label generated content "No AI" or provider+model; fail closed without key.
9. **PRV-03** one `bind_local.py` helper: `127.0.0.1`, CORS limited to `http://localhost:8002`/`127.0.0.1:8002`, origin check on mutating routes. Test with a script that asserts a non-loopback bind is rejected.
10. **HUI-01** raise base to 16px, floor 12px via CSS tokens first (a `:root` variable pass), then fix inline `fontSize` literals in `TimelineCard.js`/`HarvesterPanel.js`; add Playwright viewport checks at 1366×768 and 1920×1080 that fail if computed essential text is under 12px.

### Release 1 — Local completion (P0/P1, ~3-4 weeks)
11. **DAT-03/04** IndexedDB behind `Repo`, one-time migration (retry-safe, dated localStorage backup kept), explicit read-only mode on failure; `storage.persist()` plus quota in Diagnostics later. Do after DAT-01 so a rollback path exists.
12. **PWA-01/02** manifest + icons; rewrite `sw.js` with versioned cache name, explicit precache list, old-cache cleanup, waiting-worker "Update available" prompt (remove unconditional `skipWaiting`), never cache `/ingest`/card data; Playwright offline-start test.
13. **IMP-01** `Source` record + `core/source.js` (SHA-256, kind, adapter/version, as-of); duplicate detection before staging.
14. **IMP-02** generic xlsx/csv engine: sheet picker, header mapping preview, unmapped list, row preview, atomic stage (all-or-nothing), provenance (file/sheet/row/column). Pure parse+map functions tested with fixture files under `tests/fixtures/`.
    - **Smart column matching (agreed 5 Oct).** Three layers, each optional and each ending in the user's confirmation on the mapping preview: (1) exact header match; (2) a built-in alias table plus fuzzy match for known template variants (for example older RAID headers such as "Raised", "Owner", "Mitigation"); (3) AI suggestions for headers still unmatched. Layer 3 sends **only the header names and a target field list, never row values**, and only after the user explicitly enables a provider (PRV-01). Two ways to run it with no installation: paste the generated prompt into Copilot or any assistant and paste the JSON answer back, or use the configured provider key. AI output is a suggestion only: it is shown with "Suggested" labels, can never skip the preview, is validated against the allowed field list, and cannot change values. Confirmed mappings are saved per header fingerprint, so a known variant is recognised next time without AI. Without any AI the engine still works, with unmatched columns listed for manual mapping.
15. **IMP-03/04** RAID then GDP adapters as mapping templates over step 14 (not new engines). Explicit column mapping only, `Not found` for blanks, re-import appends a timeline node (diff by row key), unmatched/other-project counts shown. Templates are now agreed (see `docs/IMPORT_TEMPLATES.md`).
16. **HND-01/02/03** rewrite handover as a pure `buildHandover(state, project)` returning sections; approved-only default; separate "Needs confirmation"; `Not found` for empty sections; remove keyword inference in favour of structured fields (add `category` field via mapping, `Uncategorised` otherwise); preview + review-confirmed gate with timestamp and package hash.
17. **PRV-05** one `core/pii.js` used by paste, notes, titles, bookmarklet, file import; preview of redactions; retain protected original; resolve the "emails stay" rule (needs a product answer).

### Release 2 — Trusted knowledge (P0/P1, ~3-4 weeks)
18. **KNW-01** `kind` on every handover statement (6 kinds); facts must carry source IDs; mock/fallback AI output cannot be Fact (enforced in `buildHandover`).
19. **KNW-02** Decision entity + "Record as decision" action; AI never creates or confirms.
20. **KNW-04** evolve `confidence.js`: count only approved, independent raw sources; rename to Evidence Strength; show breakdown; document Low/Medium/High reachability.
21. **HND-04** export package (`handover.md/html/json`, `sources.csv`) with shared statement IDs and hashes.
22. **HUI-03** card hierarchy, behind a layout flag, no behaviour change.
23. **OPS-01/02** safe logger (module, event code, no content, bounded), global `error`/`unhandledrejection`, Diagnostics page with previewable export.
24. **OPS-03** complete the trust-boundary test list; make "critical tests" a required CI check blocking release tags.
25. **PRV-04** server-side scope and project enforcement in `vector-service` with explicit privacy metadata and `server-derived` persona. P0 only if multi-user; otherwise P1.

### Release 3 — Compounding (P1/P2, scope after pilot feedback)
26. KNW-03, RAD-01, RAD-02, HUI-02, IMP-05 (delete one of the two bookmarklets), IMP-06, HUI-04. Keep these behind the pilot exit criteria in STR-02; decide scope after Release 2 pilot feedback.

## 5. Testing strategy

- **Unit (`node --test`, offline)**: every new module is pure and DOM-free: `backup`, `Repo` migration, `source`, import mapping, `buildHandover`, `pii`, `statementKind`, `evidenceStrength`, logger redaction. Fixtures live in `tests/fixtures/`.
- **Characterize before change**: for `HandoverModal` and `FailoverDB`, first record current output for the demo dataset, then change.
- **Browser (Playwright smoke)**: grows with each release: reset confirmation, backup→wipe→restore round trip, offline start, SW update prompt, viewport font checks, import preview.
- **Trust-boundary tests** (OPS-03) are written alongside the feature, not at the end: draft excluded from handover, fallback AI never Fact, strength counts approved independent sources only, Smart Append keeps provenance, cross-project isolation.
- **Repo guards in CI**: tracked-DB, path, secret, and gitleaks checks.
- **Definition of done per item**: acceptance criteria mapped to a test name in the PR description; CI green; one demo-dataset run in a real browser.

## 6. Decisions and open questions

Decided (5 Oct):
1. Primary user is a delivery lead and the pilot is single-user. **The persona drop-down stays** as a test aid for privacy and scope features (PRV-04, Presentation Mode, Radar); it is not a security boundary in single-user mode.
2. Emails are **kept**, not redacted. PRV-05 consolidates screening around phones, configured patterns and noise words only; emails remain visible in the redaction preview as intentionally preserved.
3. No credential was ever committed, so no rotation is needed. The FND-01 history scan stays as a confirming CI check.
4. Chroma database files are deleted from git (PR `claude/fnd02-untrack-chroma`).

Received (5 Oct): the GDP export columns (42) and RAID log columns (11) are recorded in `docs/IMPORT_TEMPLATES.md`. Answers to the open points:
- **RAID project:** the import goes to the active project already shown in the Harvester drawer, so no project column or picker is needed.
- **Private until approved:** GDP content (including people names) is held private until the user approves it, like all imported data.
- **Scores:** Probability, Impact and Overall Impact are imported as given, never recalculated.
- **RAID templates vary:** older RAID templates are still in use with mostly-similar columns, so the import engine must tolerate different headers (see step 14). GDP is a tool export and its columns rarely change, so it uses a fixed template with a clear error if headers differ.

Still to settle during step 15: how a RAID row is recognised on re-import (proposed: raised date + type + normalised description start, since the file has no row ID).

## 7. Progress (5 Oct)

Release 0 done and merged: FND-02 (#37), FND-03 plus repo hygiene check (#38), DAT-02 (#39), DAT-01 backup and restore (#40), DAT-05 destructive-action protection (#41), PRV-01/02 no-AI default and keys out of storage (#42), PRV-03 loopback-only services (#43), HUI-01 readable typography (#44), DAT-04 persistent storage (#45).
Next: Release 1, starting with IMP-01/02 (Source record, generic Excel/CSV engine with smart column matching), then IMP-03 RAID, IMP-04 GDP, DAT-03 IndexedDB, PWA-01/02, HND-01..03, PRV-05. Each release runs in its own thread to keep context small; this section is the source of status.
