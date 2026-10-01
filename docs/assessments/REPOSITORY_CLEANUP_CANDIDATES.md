# Repository Cleanup Candidates

Status: **list only. No file has been deleted, moved, renamed or edited.**
Every action below needs explicit owner approval, item by item or batch by batch, and must happen on a dedicated branch (`chore/cleanup-<batch>`) with one commit per batch so it can be reverted.

Actions:
- **ARCHIVE**: move to `archive/<date>/` (keeps history visible).
- **UNTRACK**: `git rm --cached` plus a `.gitignore` entry; the file stays on disk.
- **DELETE**: remove after verification.
- **REVIEW**: owner decision needed (possible sensitive content).
- **REPLACE**: superseded by planned work; remove only after the replacement lands.

Risk: **Low** (no runtime reference) · **Medium** (referenced by docs or links) · **High** (referenced by running code or could hide data).

Before any batch, take a safety snapshot: `git tag pre-cleanup-<date>` and a `git bundle` to a location outside the repository.

## Batch 1: Sensitive content review (do first)

| # | Path | Reason | Action | Risk | Verification required |
|---|---|---|---|---|---|
| 1.1 | `modules/experience-pwa/static/docs/Continuum-V4-Final.html` | Contains `https://mckinsey.sharepoint.com/sites/collab/Phoenix` (a real corporate tenant URL). Loads Google Fonts (external request). Generated "React Artifact" with no generator. | REVIEW → ARCHIVE or DELETE. Consider history rewriting only if the URL is confidential (owner decision; rewriting history is destructive). | Medium | `grep -rn "Continuum-V4-Final"` shows no runtime links (verified: no references in `static/js`). Owner confirms whether the URL is sensitive. |
| 1.2 | `.clinerules`, `MUSE_AUDIT_LOG.md`, `docs/TESTING.md`, `modules/platform-anchor/README.md` | Personal path `/Users/wolf/...` | REVIEW (replace with repo-relative paths in a later docs change) | Low | grep for `/Users/` returns nothing afterwards |
| 1.3 | `data/seed/*.json`, `modules/gdp-adapter/service.py`, bookmarklets | Realistic-format IDs (`006Uj00000QOBkvIAH`, `O-5030460`, `acmespf`, `rrdiscovery`, `clienta`, `£129,768`, `PS-v…ESC` pattern) | REVIEW: owner confirms they are synthetic | Medium | Owner attestation recorded in `docs/DECISION_LOG.md` |
| 1.4 | Demo data using `@acme.com`, `@acme.co.uk`, `@novatechlabs.com` | Real registered domains used as fake addresses | REPLACE with `.example` in a later data change | Low | grep shows no real-domain emails |
| 1.5 | `docs/TESTING.md` client "GE" | A real company name as a client example | REVIEW | Low | Owner decision |

## Batch 2: Runtime data tracked in Git

| # | Path | Reason | Action | Risk | Verification required |
|---|---|---|---|---|---|
| 2.1 | `modules/vector-service/chroma_data/chroma.sqlite3`, `…/cde26433-…/{data_level0,header,length,link_lists}.bin` | Runtime Chroma DB tracked despite the `**/chroma_data/` ignore rule. Holds 8 demo cards. | UNTRACK | Medium: a fresh clone then starts with an empty vector store (`seed.py` can rebuild it) | Run `modules/vector-service/seed.py` in a scratch environment and confirm the service starts with an empty or seeded store |
| 2.2 | `data/seed/anchors_persist.json` | Rewritten at runtime by `platform-anchor/service.py` `PERSIST_PATH`, so a seed file and runtime state are mixed | REPLACE: split into a read-only `anchors_seed.json` plus a runtime path outside the repo (code change, backlog [REP-04]) | High: the anchor service reads it at start | Anchor service starts and loads the seed; `git status` stays clean after PUTs |

## Batch 3: Backup and duplicate files

| # | Path | Reason | Action | Risk | Verification required |
|---|---|---|---|---|---|
| 3.1 | `static/js/components/AppCenter.js.bak.20260923-offline` | Backup tracked despite `*.bak`; not loadable (extension) | DELETE (history keeps it) | Low | No import references (`grep -rn "\.bak"` in `static/js` shows none) |
| 3.2 | `static/js/components/HarvesterPanel.js.bak.20260923-offline` | Same | DELETE | Low | Same |
| 3.3 | `static/js/core/FailoverDB.js.bak.20260923-offline` | Same | DELETE | Low | Same |
| 3.4 | `static/js/data/mockSeed.js.bak.20260923-1950` | Same | DELETE | Low | Same |
| 3.5 | `modules/platform-anchor/seed_clients.pylear` | Byte-identical to `seed_clients.py` (verified with `cmp`); odd extension | DELETE | Low | `cmp` identical; no references |
| 3.6 | Root `Project-Onion-Relationship-Model.html` | Older copy; `static/docs/` has a different, newer version; both are superseded by V5 | ARCHIVE | Low | No links from the app (`App.js` links only `guide.html` and `relationship-v5/`) |

## Batch 4: Unused source

| # | Path | Reason | Action | Risk | Verification required |
|---|---|---|---|---|---|
| 4.1 | `static/js/data/seedData.v2.js` | No importer (verified by grep) | DELETE | Low | App boots; reset to demo and to seed both work |
| 4.2 | `modules/experience-pwa/ProjectHeader.jsx` | JSX in a no-build app; no references | ARCHIVE | Low | grep shows no references |
| 4.3 | `modules/domain-fusion-engine/fuse.js` | Not imported; cited only as V5 evidence | ARCHIVE, and update V5 evidence (backlog [HUI-08]) | Medium (V5 integrity text) | V5 Model check passes after the evidence update |
| 4.4 | `modules/integrations-gdp-adapter/parse.js` | Node-only, unrunnable, invents defaults | REPLACE with the browser adapter [GDP-01], then ARCHIVE | Low | The new adapter covers the same documented columns |
| 4.5 | `modules/integrations-connected-adapter/bookmarklet.js` | Third bookmarklet variant | ARCHIVE | Low | No references |
| 4.6 | `modules/connected-bookmarklet/bookmarklet.js` + `service.py` (:8004) | `fetch` to localhost from the CRM page (likely CSP-blocked); hard-coded client; invents fallback IDs | ARCHIVE after the owner's policy decision on bookmarklets | Low | — |
| 4.7 | `FailoverDB.tryFetch`, `API_BASES` (inside the live file) | Dead code that suggests a sync which does not exist | REPLACE (code change [DAT-06]) | Low | — |
| 4.8 | `App.js` `parseWb` (inside the live file) | Dead code | REPLACE by [XLS-01] | Low | — |

## Batch 5: Optional backend services (keep in repo, mark not-in-release)

| # | Path | Reason | Action | Risk | Verification required |
|---|---|---|---|---|---|
| 5.1 | `modules/admin-relationship/service.py` (:8005) | Hard-coded `/Users/wolf/...` read **and write** path; broken elsewhere | REVIEW: fix the path or ARCHIVE | Medium | — |
| 5.2 | `modules/gdp-adapter/service.py` (:8003) | Mocked defaults; in-memory | ARCHIVE after [GDP-01] | Low | — |
| 5.3 | `modules/domain-cards-store/service.py` (:8001) | Not used by the PWA; in-memory | Keep, labelled "not in release" | Low | — |
| 5.4 | `modules/platform-anchor/service.py` (:8000) | Not used by the PWA | Keep, labelled "not in release"; see 2.2 | Low | — |

## Batch 6: Documentation consolidation

| # | Path | Reason | Action | Risk | Verification required |
|---|---|---|---|---|---|
| 6.1 | `modules/01-anchor-service … 09-admin-governance` (45 files) | Templated specs; all `TOKENS.md` identical; no code; V5 rules already treat them as specs only | ARCHIVE to `archive/specs-v0/` | Low | V5 integrity rule `NUMBERED_MODULE` still passes |
| 6.2 | `docs/BACKLOG_v0.16.md`, `docs/BACKLOG_v0.20.md`, `docs/NEXT_SPRINT.md`, `docs/SONNET-FINAL-ASSESSMENT.md`, `docs/SONNET-FINAL-BACKLOG.md`, `docs/SUPER-FINAL-MASTER.md`, `docs/IMPLEMENTATION-MASTER-FINAL.md`, root `IMPLEMENTATION_MASTER.md` | Superseded backlogs and masters | ARCHIVE once `docs/backlog/LOCAL_COMPLETION_BACKLOG.md` is accepted | Low | Links checked |
| 6.3 | `docs/REGISTRATION_FIELDS_v0.14.md`, `docs/REGISTRATION_FIELDS_v0.16.md` | Versions of `REGISTRATION_FIELDS.md` | ARCHIVE | Low | — |
| 6.4 | `docs/HACKATHON_DEMO_DATA.md`, `docs/MINIMUM_HACKATHON_DATASET_PLAN.md`, `docs/Demo_Walkthrough_Dataset.md`, `MUSE_AUDIT_LOG.md` | Hackathon-only | ARCHIVE | Low | — |
| 6.5 | `static/docs/RAG-Architecture.html` | Loads `cdn.tailwindcss.com` (offline break, external request) | ARCHIVE, or REPLACE the CDN with local CSS | Low | V5 `GUIDE.references` link updated |
| 6.6 | `static/docs/Project-Onion-Data-Model.html`, `static/docs/Project-Onion-Relationship-Model.html`, `static/docs/guide.html`, `static/docs/guide-app/` | Superseded by V5 | ARCHIVE after `App.js` guide links are updated (code change) | Medium: `App.js:75` defaults to `guide.html` | Guide panel loads |
| 6.7 | `docs/ideas/PowerPPoint_VBA_Gen.txt` | Unrelated idea note | REVIEW | Low | — |

## Batch 7: Generated output without a generator

| # | Path | Reason | Action | Risk | Verification required |
|---|---|---|---|---|---|
| 7.1 | `static/css/styles.css` BLOCK 0 (frozen Tailwind 3.4.18) | Generated, no config, cannot be regenerated | REPLACE gradually [HUI-02], [HUI-03]; delete the block only when no component uses its classes | **High** (visual regressions) | Screenshot comparison per screen; class-usage scan reports 0 dependencies |

## Not candidates (keep)

- `static/js/vendor/*` (pinned vendor files; add `VENDOR.md`).
- `static/docs/relationship-v5/data/domainModel.js` (generated, with a reproducible generator).
- `data/seed/relationship_model.json` (source of the V5 Domain view).
- `.gitignore` (the duplicate lines are harmless; tidy later).
