# Continuum Local Completion Release: Execution Sequence

Status: plan only. Nothing here has been implemented. Every item still needs owner approval and its own branch (backlog standing constraints apply).
Inputs: `docs/backlog/LOCAL_COMPLETION_BACKLOG.md` (item IDs), `docs/assessments/*` (evidence).
Date: 2026-10-01.

**Optimisation target:** the earliest point at which a *real* project handover, generated on the corporate laptop, can be trusted. Usefulness wins over architectural purity, but no step may risk the data or send content off the device.

---

## 1. Success criteria and what each one actually needs

| Criterion | Already true? | Minimum needed | Backlog items |
|---|---|---|---|
| Daily use on a corporate laptop | Unknown | Confirm Python 3 runs without admin (Store or embeddable zip). Confirm the browser profile is **not** wiped at logoff. | FND-03, FND-01 |
| No desktop installation, no admin rights | Yes, if Python is available | One start script bound to 127.0.0.1 | FND-01, PRV-04 |
| Browser-based PWA | Partly. It runs in a browser tab. It cannot be installed. | A tab at `http://127.0.0.1:8002/` is enough for daily use. Installability is Phase 3. | PWA-01..03 |
| Reliable local storage | No. Writes fail silently, corrupt state is overwritten, and there is no backup. | Backup and restore, visible write errors, `persist()`, and a confirmation on reset | DAT-02, DAT-05, DAT-04, HUI-05 |
| Grounded handover | No. Unreviewed items are exported and there is no status source. | Exclude unreviewed items, add an imported GDP status with citations, and add "Not found" | HND-01, GDP-01, HND-03 |
| Manual imports | No. Spreadsheet inputs are unwired. | One wired GDP input; RAID next | XLS-01, GDP-01, XLS-02 |
| No live integrations | Yes | Nothing | — |
| No data leaves the laptop by default | **No.** `AiClient.getProvider()` defaults to `'openrouter'` and sends content whenever a key is stored. | AI provider defaults to none; delete stored keys; CSP | PRV-01, PRV-06, PRV-02 |

---

## 2. Challenged assumptions

The backlog is accurate. Its suggested P0 order is not the fastest route to a trustworthy handover. These are the corrections this plan makes:

1. **"PWA install and a precaching service worker are P0."** Challenged. They do not make a handover more trustworthy. A browser tab on 127.0.0.1 meets "browser-based, no install". A service-worker rewrite is also one of the riskiest changes, because a bad service worker can serve stale code that you cannot fix while away. Moved to Phase 3. The interim stale-code fix is to bump the existing cache name with each release (part of FND-02).
2. **"IndexedDB is needed for reliable storage."** Challenged. For one user with text items, `localStorage` (about 5 MB) will last months. The real reliability gaps are silent write failure, corrupt-state overwrite and the lack of backups (DAT-05, DAT-02). DAT-01 is the highest-risk item in the backlog, so it moves after leave. Phase 0 shows storage usage so the limit is visible long before it is reached.
3. **"HND-02 depends on HUI-04 (split the big components first)."** Challenged. `handover/model.js` can be written as a new pure file beside `HandoverModal.js`. Splitting the 826-line and 837-line components is not needed to ship a grounded handover.
4. **"DAT-03 needs the DAT-07 migration framework."** Challenged. `sourceRef` and `asOf` are additive optional fields. Legacy items without them render as "Source: legacy (unrecorded)". No migration is needed.
5. **"XLS-01 needs a generic SourceAdapter interface first."** Challenged. Build the GDP adapter directly. Extract the shared sheet reader when the second adapter (RAID, Phase 2) arrives. That way the interface is designed from two real cases.
6. **"HND-02 needs all six statement kinds."** Reduced. Fact, Inference, Not found and Needs confirmation (stale or unreviewed) cover the first trustworthy release. Conflicting evidence needs a natural-key comparison across sources and moves to Phase 3.
7. **"HND-07 needs a Decision entity."** Deferred. RAID logs normally contain a Decision type. Once XLS-02 lands, "Key decisions" can be populated from RAID rows typed Decision, each as a cited Fact. Add the entity only if that proves insufficient.
8. **"DIA-01 needs a redacting ring-buffer logger in IndexedDB."** Reduced for now. For a single user, global error handlers that show a visible toast and write `console.error('[continuum] …')` deliver most of the value. The full logger depends on IndexedDB and moves to Phase 3.
9. **"PRV-02 CSP should be enforced in P0."** Staged. Send `Content-Security-Policy-Report-Only` first. Violations still appear in the console, but nothing breaks. Enforce it after a week of clean daily use, and not in the week before leave.
10. **"GDP-02 (owner confirmation) blocks GDP-01."** Challenged. For personal use, your own downloaded weekly export *is* the authoritative header row. Send the GDP-02 questions now for the record, but do not wait for the reply. The adapter matches only the 17 documented headers, lists unknown ones, and never fills defaults, so a header mismatch shows up visibly instead of silently.
11. **Unstated assumption: the browser profile survives.** Some managed laptops clear site data on exit or roam profiles. Check `edge://policy` (or `chrome://policy`) for `ClearBrowsingDataOnExitList` or similar in Phase 0. If it is set, browser storage is not viable and backups become the primary store. This must be verified **before** relying on Continuum for real projects.
12. **Unstated assumption: backups stay local.** Saving `continuum-backup-*.json` into a OneDrive-synced folder sends content to the tenant. That is a user choice, not the default. The backup dialog should say so in one line.

---

## 3. Classification of every backlog item

BUILD NOW = Phase 0–2, before leave. BUILD LATER = Phase 3, after leave. DEFER = not in this release unless a need appears. REMOVE = drop from this release's backlog (out of scope or superseded).
"(r)" = reduced scope, as described in §2 or the phase notes.

### FOUNDATION
| ID | Item | Class | Phase | Reason |
|---|---|---|---|---|
| FND-01 | Start script on 127.0.0.1 | BUILD NOW | 0 | Daily-use entry point; trivial |
| FND-02 | Version stamp (+ SW cache-name bump) | BUILD NOW | 0 | Tells you which code is running; interim stale-cache fix |
| FND-03 | Record owner decisions | BUILD NOW | 0 | Includes the two laptop checks (Python, profile persistence) |
| FND-04 | Central config module | BUILD LATER | 3 | Audit nicety; not on the handover path |

### PWA AND OFFLINE
| ID | Item | Class | Phase | Reason |
|---|---|---|---|---|
| PWA-01 | Manifest and icons | BUILD LATER | 3 | Install is cosmetic for daily use |
| PWA-02 | Precache SW, versioned cache | BUILD LATER | 3 | High risk; see §2.1 |
| PWA-03 | SW registration and update prompt | BUILD LATER | 3 | Pairs with PWA-02 |
| PWA-04 | Degraded-mode banners | BUILD LATER | 3 | Needs DIA-04 |
| PWA-05 | Safari guidance | DEFER | — | Corporate laptop is Edge/Chrome |
| PWA-06 | Remove inline sync script | BUILD NOW | 1 | Hidden network call; unblocks CSP; trivial |

### HUMAN-EDITABLE UI
| ID | Item | Class | Phase | Reason |
|---|---|---|---|---|
| HUI-01 | Vendor manifest and SheetJS decision | BUILD NOW | 1 | Must be decided before parsing real files ("trusted own exports only") |
| HUI-02 | Token and component CSS | DEFER | — | No handover value |
| HUI-03 | Retire frozen Tailwind | DEFER | — | High visual-regression risk, no handover value |
| HUI-04 | Split oversized components | BUILD LATER (r) | 3 | Only the new pure modules are created earlier; no splits before leave |
| HUI-05 | Confirm and back up before reset | BUILD NOW | 0 | One click currently wipes everything |
| HUI-06 | Accessibility baseline | BUILD LATER | 3 | Useful, not on the critical path |
| HUI-07 | Presentation mode | DEFER | — | Needs HUI-06 and DAT-08 |
| HUI-08 | Correct V5 claims | BUILD NOW | 2 | Honesty fix; quick; after XLS work so the claims can be true |
| HUI-09 | Fix missing classes | DEFER | — | Cosmetic |

### HANDOVER
| ID | Item | Class | Phase | Reason |
|---|---|---|---|---|
| HND-01 | Exclude unreviewed items | BUILD NOW | 0 | Highest value per line of code |
| HND-02 | Statement model (r: 4 kinds) | BUILD NOW | 2 | Core of "grounded" |
| HND-03 | Required sections + Not found | BUILD NOW | 1 (r) / 2 | Phase 1: Current status + Not found. Phase 2: all 12 sections. |
| HND-04 | Preview and approve (r: checkbox) | BUILD NOW | 2 | Content hash moves to Phase 3 |
| HND-05 | Portable package (r: md + html) | BUILD NOW | 2 | JSON and schema in Phase 3 with COP-01 |
| HND-06 | Stale (now) and conflict (later) | BUILD NOW (r) | 2 / 3 | Stale by `asOf` is cheap; conflicts later |
| HND-07 | Decision entity | DEFER | — | RAID Decision rows first (§2.7) |
| HND-08 | One `categorise.js`; label inferences | BUILD NOW | 2 | Falls out of HND-02 |
| HND-09 | Save handover to memory as Draft | BUILD NOW | 2 | Quick |

### DATA AND STORAGE
| ID | Item | Class | Phase | Reason |
|---|---|---|---|---|
| DAT-01 | IndexedDB migration | BUILD LATER | 3 | Highest-risk item; not needed yet (§2.2) |
| DAT-02 | Backup and restore | BUILD NOW | 0 | Safety net for everything else |
| DAT-03 | sourceRefs (r: additive fields, no Source store) | BUILD NOW | 1 | Enables citations |
| DAT-04 | `persist()` and usage display | BUILD NOW | 0 | Quick; makes the 5 MB limit visible |
| DAT-05 | Surface write failures; keep corrupt state | BUILD NOW | 0 | Prevents silent loss |
| DAT-06 | Remove fake sync labels | BUILD NOW | 2 | Exports currently print `pending_upload`/`synced` |
| DAT-07 | Schema version and migrations | BUILD LATER | 3 | Only needed with DAT-01 |
| DAT-08 | Per-item approve and reject | BUILD NOW | 2 | Row selection at import covers Phase 1 |

### EXCEL AND FILE IMPORTS
| ID | Item | Class | Phase | Reason |
|---|---|---|---|---|
| XLS-01 | Spreadsheet reading (r: GDP first, generic in Phase 2) | BUILD NOW | 1 / 2 | §2.5 |
| XLS-02 | RAID adapter | BUILD NOW | 2 | Actions, owners, dates, risks, decisions |
| XLS-03 | Saved mapping templates | BUILD LATER | 3 | Fixed GDP/RAID mappings need none |
| XLS-04 | Re-import diff | BUILD LATER | 3 | Natural-key dedup in GDP-01 covers weekly re-imports |
| XLS-05 | Beeline import | DEFER | — | Sensitive rates; purpose unconfirmed |
| FIL-01 | .eml import | BUILD LATER | 3 | Next most valuable source after GDP/RAID |
| FIL-02 | .docx import | DEFER | — | Unzip/vendor decision |
| FIL-03 | Teams VTT import | BUILD LATER | 3 | Plain text, no vendor needed |
| FIL-04 | PDF text | DEFER | — | Vendor and security approval |
| FIL-05 | .msg import | DEFER | — | Vendor/CFB work |
| FIL-06 | "As of" on notes; .md/.txt import | BUILD NOW (r: as-of only) | 2 | Correct dating of manual notes matters to the handover |

### GDP
| ID | Item | Class | Phase | Reason |
|---|---|---|---|---|
| GDP-01 | Browser GDP adapter | BUILD NOW | 1 | First grounded status source |
| GDP-02 | Owner confirmation pack | BUILD NOW (send only) | 0 | Non-blocking (§2.10) |
| GDP-03 | Project status panel | BUILD NOW | 2 | Reuses the Phase 1 "latest GDP status" logic |
| GDP-04 | V2 feasibility decision | DEFER | — | Live retrieval is out of scope |
| GDP-05 | GDP API | REMOVE | — | V3; outside this release |

### CONNECTED
| ID | Item | Class | Phase | Reason |
|---|---|---|---|---|
| CON-01 | Connected CSV adapter | BUILD LATER | 3 | Commercial context; after RAID |
| CON-02 | Owner confirmation | BUILD LATER (send only) | 3 | No dependency before Phase 3 |
| CON-03 | Refresh diff | DEFER | — | Needs XLS-04 |
| CON-04 | Single bookmarklet | DEFER | — | Policy review pending |
| CON-05 | Connected API | REMOVE | — | V3 |

### MICROSOFT 365 SOURCES
| ID | Item | Class | Phase | Reason |
|---|---|---|---|---|
| M365-01 | Outlook via .eml | BUILD LATER | 3 | With FIL-01 |
| M365-02 | Teams transcripts | BUILD LATER | 3 | With FIL-03 |
| M365-03 | Meeting recap template | DEFER | — | Paste works today |
| M365-04 | SharePoint/SMP links in handover | BUILD NOW | 2 | Data already captured; successors need it; no fetch |
| M365-05 | Synced-folder re-scan | DEFER | — | Needs DAT-01, XLS-04, IT policy |
| M365-06 | OneNote paste template | DEFER | — | Paste works today |
| M365-07 | Graph pilot | REMOVE | — | V3 |

### COPILOT
| ID | Item | Class | Phase | Reason |
|---|---|---|---|---|
| COP-01 | Package schema and boundary notice | BUILD LATER | 3 | Needs the Phase 2 package to stabilise |
| COP-02 | Prompt package | DEFER | — | After COP-01 |
| COP-03 | Import external review | DEFER | — | After COP-01 |
| COP-04 | Agent Builder pilot | DEFER | — | Tenant-dependent |
| COP-05 | Tenant admin questions | BUILD LATER (send only) | 3 | No code |

### DIAGNOSTICS
| ID | Item | Class | Phase | Reason |
|---|---|---|---|---|
| DIA-01 | Structured logger | BUILD LATER | 3 | §2.8 |
| DIA-02 | Unhandled errors (r: toast + console) | BUILD NOW | 0 | Errors are currently invisible |
| DIA-03 | Network failure logging | DEFER | — | Optional services only |
| DIA-04 | Diagnostics page | BUILD LATER | 3 | Phase 0 shows storage usage in Settings instead |
| DIA-05 | Diagnostic export | BUILD LATER | 3 | Needs DIA-04 |
| DIA-06 | DevTools and terminal guide | BUILD LATER | 3 | Doc; write with PWA-02 |
| DIA-07 | Server log hygiene | BUILD LATER | 3 | Quick but low value for one user |

### PRIVACY AND SECURITY
| ID | Item | Class | Phase | Reason |
|---|---|---|---|---|
| PRV-01 | No external AI by default (r: default `none`) | BUILD NOW | 0 | The only real leak path |
| PRV-02 | CSP (report-only first) | BUILD NOW (r) | 1 | Enforce in Phase 3 (§2.9) |
| PRV-03 | Remove invented Q&A answers | BUILD NOW | 0 | Fabricated facts |
| PRV-04 | Bind to 127.0.0.1 (r: :8002 only) | BUILD NOW | 0 | Other services are simply not started |
| PRV-05 | PII gate alignment | BUILD LATER | 3 | Needs an owner policy decision |
| PRV-06 | No keys in localStorage | BUILD NOW | 0 | Delete stored keys with PRV-01 |
| PRV-07 | Bookmarklet acceptable-use review | DEFER | — | Not needed for file imports |

### TESTING
| ID | Item | Class | Phase | Reason |
|---|---|---|---|---|
| TST-01 | No-build test harness | BUILD NOW | 0 | About 60 lines; protects every later step |
| TST-02 | Unit tests for P0 logic | BUILD NOW | 1–2 | Written alongside each item, not as a separate phase |
| TST-03 | Synthetic fixtures (r: GDP, then RAID) | BUILD NOW | 1 / 2 | Needed for the adapters |
| TST-04 | Release checklist | BUILD NOW | 2 | Run before leave |
| TST-05 | Fix/retire curl scripts | DEFER | — | Optional services only |
| TST-06 | No-external-request assertion | BUILD LATER | 3 | With CSP enforcement |

### REPOSITORY CLEANUP
| ID | Item | Class | Phase | Reason |
|---|---|---|---|---|
| REP-01 | Sensitive-content review | BUILD LATER (review now, act later) | 3 | Owner should look at the V4 file now; **no history rewrite before leave** |
| REP-02 | Untrack Chroma data | BUILD LATER | 3 | Quick, unrelated to handovers |
| REP-03 | Remove .bak/duplicates/unused | DEFER | — | Noise only |
| REP-04 | Anchor seed vs runtime | REMOVE | — | Anchor service is not in the release; archive instead |
| REP-05 | Docs consolidation | DEFER | — | After the release |
| REP-06 | Fix admin-relationship | REMOVE | — | Not in the release; archive instead |

Totals (95 items): BUILD NOW 38 · BUILD LATER 28 · DEFER 24 · REMOVE 5. Items split across phases are counted once, by their first class.

---

## 4. Rankings

### 4.1 Top 10 highest-value items
1. **GDP-01** GDP adapter: the first sourced, dated project status.
2. **HND-01** Exclude unreviewed items: removes the biggest grounding defect with about one line of code.
3. **DAT-02** Backup and restore: makes it safe to put real projects in.
4. **PRV-01** No external AI by default: turns "no data leaves the laptop" from a hope into a default.
5. **XLS-02** RAID adapter: actions, owners, due dates, risks and decisions as cited facts.
6. **HND-02** Statement model: makes facts, inferences and gaps visibly different.
7. **HND-03** Required sections with "Not found": gaps become explicit instead of silent.
8. **DAT-03** sourceRefs: every statement can cite file, sheet and row.
9. **HND-04** Preview and approve: a human signs off on the final package.
10. **HUI-05** Reset confirmation: removes a one-click data wipe.

### 4.2 Top 10 highest-risk items
| # | Item | Why it is risky |
|---|---|---|
| 1 | DAT-01 IndexedDB migration | Touches every read path (`readLocal()` is synchronous and used everywhere); a bad migration loses data |
| 2 | PWA-02/03 Precache SW rewrite | A broken SW can pin stale or broken code, and recovery needs DevTools knowledge |
| 3 | HUI-03 Retire frozen Tailwind | Unbounded visual regressions with no screenshot tests |
| 4 | HUI-04 Split 800-line components | Large untested refactor with layered "FIX" logic in `HarvesterPanel` |
| 5 | DAT-08 Change the approval flow | `onApproveAll` has smart-append branches and an assumed `appendSuccess` |
| 6 | HND-02/04 Replace the handover renderer | Regresses the one feature that already works; mitigate by keeping the old renderer behind a flag |
| 7 | PRV-02 Enforced CSP | Can silently block inline styles or scripts; mitigate with report-only first |
| 8 | DAT-05 Read-only mode on parse failure | A false positive blocks all writes; needs a test with real state |
| 9 | REP-01/03 History rewrite and deletions | Irreversible; out of scope before leave |
| 10 | FIL-02/04/05, M365-05 | New vendor code or browser APIs needing security/IT approval |

### 4.3 Quick wins (< 1 day each)
HND-01 · HUI-05 · PRV-01 (r) + PRV-06 · PRV-03 · PRV-04 (r) · FND-01 · FND-02 · FND-03 · DAT-04 · DIA-02 (r) · TST-01 · PWA-06 · HUI-01 · GDP-02 (send email) · DAT-06 · HUI-08 · M365-04 · FIL-06 (r) · HND-09 · PRV-02 (report-only) · DIA-07 · REP-02.

### 4.4 Foundations that unlock multiple later features
| Foundation | Unlocks |
|---|---|
| DAT-02 Backup/restore | Every storage change (DAT-01, DAT-07, DAT-08) and safe experimentation with real data |
| DAT-03 sourceRefs + `asOf` | Citations, stale detection (HND-06), conflicts, the Sources appendix (HND-05), Copilot package (COP-01) |
| `js/adapters/gdpExcel.js` → shared sheet reader | RAID (XLS-02), Connected (CON-01), Beeline (XLS-05), templates (XLS-03), diff (XLS-04) |
| `js/handover/model.js` (HND-02) | All 12 sections, stale and conflict statements, md/json package, Copilot round-trip |
| TST-01 harness | Safe changes to adapters, the model and storage |
| PRV-01 + PRV-02 | Any future approved AI provider, added without re-opening the boundary question |
| FND-02 version stamp | SW update flow (PWA-02/03), diagnostics (DIA-04) |

### 4.5 Do not touch before annual leave
Freeze code changes **5 working days before leave**. Use that week to run real handovers, not to build.
- DAT-01 IndexedDB migration and DAT-07 migrations
- PWA-02 / PWA-03 service-worker rewrite (keep the cache-name bump only)
- HUI-02 / HUI-03 / HUI-09 CSS work and HUI-04 component splits
- PRV-02 **enforced** CSP (report-only is fine)
- REP-01 history rewrite, REP-03 / REP-05 deletions and archiving
- New vendor libraries (FIL-02, FIL-04, FIL-05) and File System Access (M365-05)
- Bookmarklets (CON-04, PRV-07)
- The persona drop-down (standing instruction)
- Anything in `data/seed/`

The last action before leave: take a DAT-02 backup, export the handover packages for real projects, and keep both outside the browser.

### 4.6 Recommended implementation order
1. FND-03 (including laptop checks: Python without admin, browser profile persistence) and GDP-02 email
2. DAT-02 backup/restore
3. HUI-05 reset confirmation
4. DAT-05 write failures, DAT-04 persist/usage
5. PRV-01 (r) + PRV-06, PRV-03
6. HND-01
7. PRV-04 (r), FND-01, FND-02, DIA-02 (r), TST-01
8. **Minimum GDP slice (§6)**: HUI-01 decision, TST-03 GDP fixture, GDP-01 + XLS-01 (r) + DAT-03 (r) + HND-03 (r)
9. PWA-06, PRV-02 report-only
10. → **First trustworthy status handover on a real project**
11. XLS-01 shared reader + XLS-02 RAID + TST-03 RAID fixture
12. HND-02 (r) + HND-08 → HND-03 full → HND-06 stale → HND-04 (r) → HND-05 (r)
13. DAT-08, DAT-06, GDP-03, FIL-06 (r), M365-04, HND-09, HUI-08
14. TST-04 checklist on the laptop → **Release candidate; code freeze before leave**
15. After leave: Phase 3 in the order listed there

---

## 5. Phases

### PHASE 0: Safe, local, honest (about 2 days)

**Objective.** Make it safe to put real project data into Continuum, and guarantee that nothing leaves the laptop.

**Items.** FND-03, GDP-02 (send), DAT-02, HUI-05, DAT-05, DAT-04, PRV-01 (r), PRV-06, PRV-03, HND-01, PRV-04 (r), FND-01, FND-02, DIA-02 (r), TST-01.

**Expected outcome.** One command starts Continuum on 127.0.0.1. You can back up and restore everything. Reset cannot wipe data by accident. Storage errors are visible. The AI path is off by default and stored keys are gone. The existing handover no longer contains unreviewed items.

**Dependencies.** The owner answers FND-03, especially: Python 3 available without admin, browser profile persists across logoff (check `edge://policy`), and approval to remove default outbound AI.

**Files likely affected.**
- `modules/experience-pwa/service.py` (host flag, default 127.0.0.1)
- new `start-continuum.cmd`, `start-continuum.sh`; `README.md` quick start
- new `static/js/core/backup.js`; `components/App.js` (Settings entry: back up, restore, storage usage)
- `static/js/core/FailoverDB.js` (`writeLocal` failure, corrupt-state preservation, `persist()`)
- `components/HarvesterPanel.js` (reset confirmation, key UI hidden)
- `static/js/core/AiClient.js` (`getProvider()` default `'none'`; `mockQaFallback` replaced by quoting retrieval or "Not found")
- `components/HandoverModal.js` (`scopedCards()` excludes `pending_processing`; excluded count shown)
- `static/js/main.js` (error handlers); `static/version.json`; `sw.js` (cache name)
- new `static/tests/index.html`, `static/tests/harness.js`
- `docs/DECISION_LOG.md`

**Acceptance criteria.**
- `start-continuum` opens `http://127.0.0.1:8002/`; nothing listens on `0.0.0.0`.
- Back up → reset → restore round-trips identical data (test in the harness).
- Reset requires typed confirmation and downloads a backup first.
- A simulated quota error shows a banner; a corrupt `onion_db_state` is kept as `onion_db_state.corrupt-<ts>` and not overwritten.
- With default settings, the DevTools network panel shows zero requests to hosts other than 127.0.0.1 during a full session (stage, process, approve, ask, handover).
- `localStorage` contains no `*_API_KEY` entries after startup.
- `grep` finds no hard-coded domain sentences in `AiClient.js`.
- A staged, unapproved item never appears in the HTML or PDF handover, and the dialog states how many were excluded.
- A thrown test error shows a toast and a `[continuum]` console line.
- The footer shows the version.

---

### PHASE 1: Minimum GDP slice → first grounded handover (about 2–3 days)

**Objective.** Import the real weekly GDP export, review the rows, create cards, and generate a handover whose **Current status** is a cited fact or an explicit "Not found". See §6 for the step-by-step slice.

**Items.** HUI-01 (SheetJS decision), TST-03 (GDP fixture), XLS-01 (r), GDP-01, DAT-03 (r), HND-03 (r), PWA-06, PRV-02 (report-only), TST-02 (GDP tests).

**Expected outcome.** For each of your projects, the handover begins with a GDP status block (phase, RAG, Status Date, summary) that cites file, sheet and row, and is flagged stale after 14 days. Projects without an approved GDP row say "Not found". **This is the earliest point at which a real handover is trustworthy for status.** The rest of the handover is still the existing card feed (reviewed, but keyword-categorised).

**Dependencies.** Phase 0 complete (backup, AI off, HND-01). One real GDP export downloaded to the laptop. Your projects registered with the correct GDP ID and/or Project IDs.

**Files likely affected.** See §6.3. In addition: `static/index.html` (remove the inline sync script), `service.py` (CSP report-only header), `static/js/vendor/VENDOR.md`.

**Acceptance criteria.**
- The real GDP export imports on the work laptop. Every row is accounted for: matched, excluded (other project, with a count) or unparseable (listed).
- Headers outside the documented 17 are listed. Missing cells stay empty; no value is defaulted.
- Nothing is stored until "Stage selected" is clicked.
- Re-importing the same file stages nothing new (natural key: GDP ID + Project ID + Status Date).
- After process and approve, each GDP card shows its source file, row and Status Date.
- The handover's Current status block quotes field values exactly as in the spreadsheet, with a citation, or says "Not found: no approved GDP import for this project".
- A Status Date older than 14 days shows "Needs confirmation: stale".
- No GDP content is sent anywhere (network panel), and the console shows no CSP report-only violations from app code.

---

### PHASE 2: Full grounded handover (about 5–7 days)

**Objective.** Make the whole handover trustworthy, not just the status block: actions, owners, risks, decisions, labelled inferences, explicit gaps, and human sign-off before export.

**Items.** XLS-01 (shared reader), XLS-02, TST-03 (RAID), HND-02 (r: Fact / Inference / Not found / Needs confirmation), HND-08, HND-03 (all 12 sections), HND-06 (stale only), HND-04 (r: review checkbox), HND-05 (r: md + html, `[S-n]` citations with a Sources appendix), DAT-08, DAT-06, GDP-03, FIL-06 (r), M365-04, HND-09, HUI-08, TST-02, TST-04.

**Expected outcome.** A handover package (Markdown and HTML) in which every line is visibly a Fact with a citation, a labelled Inference, a stale or unreviewed "Needs confirmation", or "Not found in: …". Actions, owners, due dates, RAID items and decisions come from the RAID log. You review, exclude or flag statements, and confirm before export. A release checklist has been run on the work laptop.

**Dependencies.** Phase 1. Sanitised headers of your real RAID log (XLS-02). Owner approval of the four statement kinds (FND-03).

**Files likely affected.**
- `static/js/adapters/sheet.js` (shared reader extracted from `gdpExcel.js`), new `static/js/adapters/raid.js`
- new `static/js/handover/model.js`, `static/js/handover/render.js`, `static/js/cards/categorise.js`
- `components/HandoverModal.js` (preview, review checkbox, md/html export; old renderer behind a flag for one release)
- `components/HarvesterPanel.js` (RAID input, per-item reject), `core/FailoverDB.js` (`reviewState`, `asOf` on notes), `components/TimelineCard.js` (sync labels, shared categoriser)
- `components/AppCenter.js` or new `components/ProjectStatus.js` (GDP-03)
- `static/docs/relationship-v5/data/runtimeModel.js` (HUI-08)
- `static/tests/*.test.js`, `static/tests/fixtures/*`; new `docs/RELEASE_CHECKLIST.md`

**Acceptance criteria.**
- All 12 sections are always present; an empty project produces 12 "Not found in: …" statements (fixture test).
- Every rendered line has a visible kind. Every Fact has at least one citation that resolves inside the same document.
- Keyword-derived "closed" and categories render as "Inferred (rule: keyword)" and never as Facts. Mock-AI text never appears as a Fact.
- The RAID fixture populates Actions (owner, due date), RAID and Key decisions with row citations.
- Export buttons stay disabled until "I have reviewed this handover" is ticked.
- A rejected item never reaches the timeline or the handover.
- No UI text or export implies a server sync.
- `docs/RELEASE_CHECKLIST.md` is completed on the work laptop with real GDP and RAID files.
- **Code freeze; final backup and handover packages exported before leave.**

---

### PHASE 3: Daily-driver hardening (after leave)

**Objective.** Make Continuum robust as a long-term daily tool: installable, offline-first, larger storage, supportable, and ready for more sources and Copilot review.

**Items, in order.** PWA-01 → PWA-02 → PWA-03 → DIA-06 → DAT-07 → DAT-01 → DIA-01 → DIA-04 → DIA-05 → PWA-04 → FND-04 → PRV-02 (enforce) → TST-06 → HND-06 (conflicts) → HND-04 (content hash) → COP-01 (JSON package + schema) → FIL-01/M365-01 → FIL-03/M365-02 → CON-02 → CON-01 → XLS-03 → XLS-04 → PRV-05 → HUI-06 → HUI-04 → DIA-07 → REP-01 → REP-02 → COP-05.

**Expected outcome.** "Install Continuum" works in Edge with no admin prompt, and the app starts with the server stopped. Data lives in IndexedDB with the old store kept as a backup. A Diagnostics page and export exist. The CSP is enforced and automatically tested. Email and transcript files import. The handover exports a JSON package for Copilot review.

**Dependencies.** Phase 2 in daily use for at least two weeks. Owner approval of IndexedDB (FND-03). Answers to CON-02 and COP-05.

**Files likely affected.** `static/manifest.webmanifest`, `static/icons/*`, `sw.js`, `tools/build_precache.py`, `static/precache.json`, `static/js/main.js`, `core/FailoverDB.js`, new `core/repo/*`, `core/log.js`, `components/Diagnostics.js`, `components/StatusStrip.js`, `js/config.js`, `service.py`, `js/adapters/eml.js`, `js/adapters/vtt.js`, `js/adapters/connectedReport.js`, `js/adapters/templates.js`, `js/adapters/diff.js`, `docs/schemas/handover.schema.json`, `docs/SUPPORT.md`, `core/PiiGate.js`.

**Acceptance criteria.**
- Edge shows "Install Continuum"; the installed app starts offline after one visit; exactly one cache exists after an update; updates apply only after the user clicks.
- Migration to IndexedDB preserves per-collection counts and hashes; the app falls back to a read-only banner if IndexedDB fails.
- An automated test fails if any non-127.0.0.1 request is made, and the enforced CSP blocks a test fetch.
- Diagnostics renders offline, and its export contains no content fields or tokens.
- Two contradicting approved sources produce a "Conflicting evidence" statement showing both values.
- The exported `handover.json` validates against the schema.
- A real `.eml` and a real `.vtt` from the laptop import with citations.

---

## 6. Minimum path: GDP spreadsheet → review → cards → grounded handover

The smallest slice that delivers the four steps without framework or architecture changes. It reuses the existing Data Park → AI processing → review queue → approve flow and the existing handover dialog. It is Phase 1's core and assumes Phase 0's guardrails.

### 6.1 Non-negotiable guardrails (must ship with or before the slice)
These are small, but without them the slice either leaks data or produces an ungrounded handover:

| Guardrail | Why | Change |
|---|---|---|
| AI provider defaults to none (PRV-01 r) | `AiClient.getProvider()` returns `'openrouter'` by default, so any stored key would send GDP Summary text to a public API during "Run AI Processing Engine" | `getProvider()` default `'none'`; `processWithAI` returns `mockResult` unless a provider is explicitly enabled |
| Exclude unreviewed items (HND-01) | `HandoverModal.scopedCards()` currently exports `pending_processing` rows, so staged GDP rows would appear before review | Add `c.syncStatus !== 'pending_processing'` to the filter |
| Backup (DAT-02) | First use with real data | Strongly recommended; not strictly part of the slice |

### 6.2 The slice, step by step

1. **Import.** Make the existing hidden GDP input usable. In `HarvesterPanel.js:721`, wrap the `display:none` input in a `<label>` (so clicking the drop zone opens the file picker) and give it a local `onChange` handler in `HarvesterPanel`. This avoids the `props.onGdpFile` prop that `App.js` never passes, so `App.js` is not touched.
2. **Parse and map (new pure file).** `static/js/adapters/gdpExcel.js`, roughly 80–120 lines, no UI:
   - `readGdpFile(file)`: `window.XLSX.read(..., {type:'array', cellDates:true})`, first sheet, `sheet_to_json(..., {defval:''})`, plus the file's SHA-256 (`crypto.subtle`, already used for `contentHash`).
   - `mapGdpRow(row)`: case-insensitive, trimmed match on the 17 documented headers (`docs/SOURCES_CONFIG.md:21`). Returns `{fields, unknownHeaders}`. Dates become ISO `YYYY-MM-DD`. **Empty stays empty; nothing is defaulted.**
   - `matchesProject(fields, project)`: EXACT match of `GDP ID` to `project.gdp_id`, or `Project ID` to any `project.project_ids` using the existing `projectIdEquals`.
   - `naturalKey(fields)`: `GDP ID|Project ID|Status Date`.
3. **Review rows.** Inside the existing GDP card in `HarvesterPanel`, render a compact preview (no new dialog): file name, total rows, matched rows, rows excluded for other projects (count only), unknown headers, rows already imported (by natural key). Each matched row shows Status Date, Current Phase, Status Indicator and the first 120 characters of Summary, with a checkbox (checked by default). A **"Stage selected (n)"** button. Nothing is written before the click.
4. **Stage.** For each selected row, call the existing `api.stageToDataPark(...)` with:
   - `type: 'GDP'`, `source: 'GDP export'`, the active project's `project_name` and `Project_ReferenceID` (required by `HandoverModal.matchProject`)
   - `title`: `GDP status <Status Date> · <Current Phase> · <Status Indicator>` (only the non-empty parts)
   - `content`: deterministic `Field: value` lines for the non-empty fields, with Summary passed through the existing `piiScreen`
   - `contentHash`: hash of the natural key (reuses the existing dedup)
   - new additive fields: `sourceRef: {kind:'gdp-excel', fileName, sha256, sheet, row}` (the spreadsheet row number), `asOf: <Status Date>`, `gdp: fields`

   In `FailoverDB.stageToDataPark`, copy `sourceRef`, `asOf` and `gdp` through to the record (three additive lines; today unknown payload fields are dropped). `markProcessed` uses `Object.assign`, so the fields survive approval.
5. **Create cards.** Use the existing **Run AI Processing Engine → review queue → Approve & Add to Project** flow, with one guard: in `HarvesterPanel.onProcess`, skip smart-append matching for `type === 'GDP'`. Otherwise keyword or vector matching could merge a status row into an unrelated card. With the provider set to none, processing is local (`mockResult`).
6. **Generate the handover.** In `HandoverModal.js`:
   - (from 6.1) exclude `pending_processing`.
   - Add a **Current status (GDP)** block at the top of each project section: the approved GDP card with the latest `asOf`. Render `Current Phase`, `Status Indicator`, `Status Date`, `Start/End Date` and `Summary` **from `card.gdp` verbatim**, then the line `Source: <fileName>, sheet <sheet>, row <row>, imported <date>`. If `asOf` is older than 14 days, add `Needs confirmation: status is <n> days old`. If no approved GDP card exists: `Current status: Not found. No approved GDP import for this project.`
   - For GDP cards in the existing feed, show `content` instead of `synthesizedText` (the mock output truncates text).
   - The block is included in the HTML download and print-to-PDF, which use the same render path.
7. **Test.** `static/tests/fixtures/gdp-sample.csv` (synthetic, `.example` names, two projects, one stale row, one row with an empty RAG, one unknown header). SheetJS reads CSV through the same path, and a text fixture is reviewable in Git. Five assertions in the TST-01 harness: header mapping, no defaults, project match, natural key, stale calculation. Then one manual run with the real export on the laptop.

### 6.3 Files touched by the slice
| File | Change | Size |
|---|---|---|
| new `static/js/adapters/gdpExcel.js` | Pure read, map, match and key functions | ~100 lines |
| `static/js/components/HarvesterPanel.js` | Clickable input, preview list, "Stage selected", skip smart-append for GDP | ~60 lines |
| `static/js/core/FailoverDB.js` | Pass through `sourceRef`, `asOf`, `gdp` in `stageToDataPark` | 3 lines |
| `static/js/components/HandoverModal.js` | Exclude staged, Current status block, `content` for GDP cards | ~30 lines |
| `static/js/core/AiClient.js` | Default provider `none` | ~3 lines |
| new `static/tests/fixtures/gdp-sample.csv` (+ a test file if TST-01 exists) | Fixture | small |

Not touched: `App.js` (the dead `parseWb` is removed later with XLS-01), the storage engine, the service worker, CSS, the persona drop-down, `data/seed/`.

**Estimated effort:** 1.5–2.5 days including the real-file check on the laptop.

### 6.4 What the slice deliberately does not do
- No generic adapter interface, `Source` store, schema migration or IndexedDB.
- No statement model: the status block is the only section built from cited Facts. The rest of the handover is still the reviewed card feed with keyword categories (labelling those as inferences is Phase 2).
- No per-row reject after staging: selection happens at the preview, then the existing bulk approve.
- No conflict detection between GDP rows, and no RAID data (actions, owners and decisions are Phase 2).
- PII screening is still the existing US-phone-only gate (PRV-05, Phase 3). Data stays local, so this is acceptable for personal use.

### 6.5 Slice done when
On the work laptop, with the network panel open: choose the real GDP export → see every row accounted for → stage the selected rows → process and approve → open Handover → the project shows its current GDP status quoted exactly as in the spreadsheet, with file, sheet and row cited (or "Not found"), no unapproved rows, a stale flag where due, and zero non-127.0.0.1 requests.
