# MUSE_AUDIT_LOG.md — Project Onion Systematic Review

> Generated: 2026-09-21 — Token-optimized scan (tree + configs + doc headers + service headers + CONTRACT headers, no full utility reads)
> Root: `/Users/wolf/Developer/project_onion`
> Method: `ls -R`, `requirements.txt`, `README/GLOBAL_BRAIN/STATE`, `docs/BACKLOG_v0.16|v0.20`, `docs/NEXT_SPRINT`, `docs/CONTEXT_SUMMARY_v0.20`, `grep uvicorn.run`, `service.py:1-15`, `CONTRACT.md:1-15`, `fuse.js/parse.js/index.html` heads.

---

## 1. Active Tech Stack

### Runtimes
- **Python 3.14** — `.venv/` present (`bin/python3.14`, `pyvenv.cfg`); no `pyproject.toml`, no `Dockerfile`, no `docker-compose*`.
- **Node/Browser JS (no `package.json`)** — `fuse.js`, `parse.js`, `bookmarklet.js` use ESM `import` (`xlsx`, `crypto`) + browser DOM; no npm manifest, lockfile, or bundler config.
- **Shell harness** — `test-*-api.sh` + `test-bookmarklet.sh` curl-based smoke tests.

### Frameworks & Servers
- **FastAPI + Uvicorn + Pydantic** — all Python services use `FastAPI(title=..., version=...)` + `CORSMiddleware(allow_origins=["*"])` + `if __name__ == "__main__": uvicorn.run(...)`.
- **Python `http.server`** — `modules/experience-pwa/service.py` uses `SimpleHTTPRequestHandler` subclass `PWAHandler` mapping `/`, `/app`, `/app/` → `static/index.html`, `Cache-Control: no-cache`, serves on `0.0.0.0:8002`.
- **Frontend: React 18 UMD + Tailwind v3.4.18 (embedded CSS) + Fuse.js + SheetJS `xlsx` + TF-IDF mock vector search** — single-file bundle `modules/experience-pwa/static/index.html` (~215264 bytes, title `React Artifact`).
- **Reference React component** — `modules/experience-pwa/ProjectHeader.jsx` (pastel tokens, `useState`, orphan reference, not bundled).

### Main Libraries (declared)
- `requirements.txt` (4 lines): `fastapi`, `uvicorn`, `pydantic`, `requests`.
- Stdlib in use: `hashlib`, `re`, `uuid`, `json`, `pathlib`, `datetime`, `argparse`, `urllib.parse`, `os`, `http.server`.
- Frontend CDN/embedded (no install): `React`, `Tailwind`, `Fuse.js`, `xlsx`.
- `.venv/bin` reveals installed but undeclared: `mlx_lm*`, `transformers`, `huggingface-cli`, `fastapi`, `httpx`, `tqdm`, `typer`, `numpy`/`f2py` — not referenced by `requirements.txt` (drift).

### Data / Config / Docs Layer (Data-as-Code)
- **Seed JSON** — `data/seed/`: `anchors_persist.json` (20KB, file DB), `clients.json` (634B, 5 projects: Apollo-123/124, Helios-09, NovaTech-42, Stellar-09), `cards.json`, `gdp_export.json`, `key_moments_test_data.json` (2.7KB), `relationship_model.json` (24KB, 12 nodes/17 edges).
- **Contracts/Specs** — `modules/*/CONTRACT.md`, `modules/01-09/*/API.yaml`, `SCHEMA.json`, `PRD.md`, `DECISIONS.md`, `TOKENS.md`; `docs/DATA_DICTIONARY.md`, `SOURCES_CONFIG.md`, `PROVENANCE_MODEL.md`, `PII_AWS_ARCHITECTURE.md`, `REGISTRATION_FIELDS*.md`, `TESTING.md`, `DECISION_LOG.md`.
- **UX references** — `docs/Project-Onion-Final-Pastel-Ux-Reference.html`, `Project-Onion-Relationship-Model.html`, `modules/experience-pwa/static/index.html` golden master.
- **Ops config**: `.gitignore` (Node/Python/DynamoDB Local/Vite/Next boilerplate), `.venv/pyvenv.cfg`, `LICENSE`, `GLOBAL_BRAIN.md` (HDD memory), `STATE.md` (v0.12), `README.md` (v0.16-v0.18 changelog).
- **Missing**: no `package.json`, no `Dockerfile`, no `docker-compose`, no `.env*`, no CI workflow, no `pyproject`/`setup.py`.

---

## 2. Codebase Entry Points — File Execution Pathways

| Port | Entry File | Type | Purpose / Route |
|------|------------|------|----------------|
| :8000 | `modules/platform-anchor/service.py` | FastAPI `Anchor Service v0.16` | `PUT /anchor/{client}/{project_ref}`, `GET /anchors/{client}`, `GET /search/opportunity\|connected`, `GET /client/{client}/360`, `GET /registration/fields`; persists to `data/seed/anchors_persist.json`; seeded by `seed_clients.py`; tested by `test-anchor-api.sh` |
| :8001 | `modules/domain-cards-store/service.py` | FastAPI `Cards Store v0.8.1` | `GET /cards/.../timeline`, freshness green/Stale; seeded by `seed_cards.py`; tested by `test-cards-api.sh` |
| :8002 | `modules/experience-pwa/service.py` → `static/index.html` | `http.server` PWA | `GET /`, `/app` → `index.html` (localStorage state); Fuse/TF-IDF in-memory; tested by `test-pwa-api.sh` |
| :8003 | `modules/gdp-adapter/service.py` | FastAPI `GDP Adapter v0.9` | `POST /ingest` GDP Export + HEAD-change full-read; parser lib `integrations-gdp-adapter/parse.js` |
| :8004 | `modules/connected-bookmarklet/service.py` + `bookmarklet.js` | FastAPI `Bookmarklet v0.10` | `GET /` bookmarklet loader; captures `O-5030460` + `006Uj...` → `clip_id` hash; `test-bookmarklet.sh` |
| :8005 | `modules/admin-relationship/service.py` | FastAPI `Admin v0.11` | `PUT /node`, `PUT /edge`, `GET /model`; edits `data/seed/relationship_model.json` typed filters |
| — | `modules/domain-fusion-engine/fuse.js` | Lib only | `scoreSignificance()` + `fuseClips()` weekly-bucket Top5; no server wrapper |
| — | `modules/integrations-gdp-adapter/parse.js` | Lib only | `hashId()` + `parseGDPExcel()` multi-row RAID |
| — | `samples/anonymized/peoplesoft-adapter-config.yaml` | Sample config | Peoplesoft adapter example |

**Boot order per TESTING/NEXT_SPRINT:** T1 `:8000` → T2 `:8001` → T3 `:8002` → T4 `:8003` → T5 `:8004` → T6 `:8005`; then `seed_clients.py`, `seed_cards.py`; open `http://localhost:8002/app`.

---

## 3. High-Level Feature Backlog — Incomplete / Structural Adjustments

### A. Spec-only vs Implemented (structural gap)
- `modules/01-anchor-service` through `09-admin-governance` contain **only** `API.yaml/SCHEMA.json/PRD.md/DECISIONS.md/TOKENS.md` — no `.py/.js`. Implemented twins live outside numbering: `platform-anchor`, `domain-cards-store`, `domain-fusion-engine`, `experience-pwa`, `gdp-adapter`, `connected-bookmarklet`, `admin-relationship`, `integrations-*`, `platform-pii-screener`. **Adjustment:** generate stubs from `API.yaml` or mark `01-09` as `spec/` archive.
- `CONTRACT-only` modules (no service): `integrations-excel-parser`, `integrations-sharepoint-adapter`, `platform-pii-screener` (middleware must-call-before-save but zero code), `integrations-connected-adapter` (only `bookmarklet.js`), `integrations-gdp-adapter` (only `parse.js`), `domain-fusion-engine` (only `fuse.js`). **Adjustment:** thin FastAPI wrappers or document as libs.

### B. Open backlog (from BACKLOG_v0.16 pending + v0.20 + NEXT_SPRINT v0.13-v0.15)
1. **Smart Assistant real** — Fuse + TF-IDF mock in-memory; needs cross-source union (My/Team/Both) + real LLM synthesis with actual-link provenance.
2. **Notes rephrase real** — mock `"Rephrased: ..."`; needs Copilot call + threaded merge.
3. **Vector DB + Merge duplicates** — `Similar to #c4 92%` banner + merge modal removed for pastel-clean; needs backend confidence calc.
4. **PII redaction flow** — `Approve redacted share` + `Private/Team Shared` + `[EMAIL_REDACTED]` preview is mock; `platform-pii-screener` unimplemented; Comprehend deferred.
5. **Excel Weekly yellow card** — `Grouped by Project ID where Client=Acme`, needs real RAID `Row12+Row18` parser + `Priority/Impact → significance`.
6. **Model confidence** — display `High — 3 sources fused` needs computed `fusion_confidence` (`0.92` → High/Med/Low).
7. **Handover Pack Export PDF** — `Key Decisions 3 / Risks 2 / Contacts 4 / Stale 1` + Export button unbuilt.
8. **Scanners v0.13/v0.14** — SharePoint `.xlsx` full-scan→delta, GDP weekly delta, Emails/Teams/Chatter delta + `Re:/Fw:` exclusion, EventBridge 6h `HEAD` check (only anchor persists; cards/GDP in-memory).
9. **DEMO_SCRIPT v0.15 3-min** — Acme→Apollo-123→Expand→Archive w/ justification→Add Note→Smart Assistant→Client 360→Handover — not scripted.

### C. Frontend / Data / Ops debt
- **Split-brain state:** backend `anchors_persist.json` vs frontend `localStorage project-onion-projects/archive` — no sync API; drift risk.
- **Monolith bundle:** `static/index.html` 215KB single file, no source map/build; `ProjectHeader.jsx` orphaned; `/app` routing patched via `PWAHandler.do_GET`.
- **Seed drift:** `clients.json` cleaned to Acme/NovaTech/Stellar (no Acme Corp) but `test-*.sh`, `GLOBAL_BRAIN.md`, old tags still cite `Acme Corp / ACME-DIP-DISCOVERY`; `key_moments_test_data.json` minimal per project.
- **Ops/hardening:** `CORS *`, no auth/SSO, no Dockerfile/compose, no CI PII-gate, `.venv` undeclared `mlx_lm/transformers` weight; `seed_clients.pylear` typo artifact; `anchors_persist.json` committed mutable state.

---

## Audit Trail
- Listed: root `ls -la`, `find maxdepth 3`, `ls modules/`, `ls docs/`.
- Read: `requirements.txt`, `README.md`, `GLOBAL_BRAIN.md`, `STATE.md`, `.gitignore`, `BACKLOG_v0.16`, `BACKLOG_v0.20`, `NEXT_SPRINT`, `CONTEXT_SUMMARY_v0.20`, `DATA_DICTIONARY` heads.
- Headers only: `*/service.py:1-15`, `*/CONTRACT.md:1-15`, `fuse.js`, `parse.js`, `index.html`, `ProjectHeader.jsx`, `grep uvicorn.run port`.
- Deliberately unread: full `service.py` bodies, full `index.html` bundle, `anchors_persist.json` rows, `relationship_model.json` edges.
