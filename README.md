# Continuum (Project Onion)

Continuum keeps decision context with the project so knowledge compounds instead of decaying. It is an installable web app (PWA) for one delivery lead first: capture notes and files, approve what is trustworthy, and produce a grounded handover.

## Principles

- Installation-free, local-first. Data stays in the browser (IndexedDB) until you export it.
- No AI by default. A provider is used only after you choose one, confirm that content will leave the device, and enter a session-only key.
- Evidence before AI, human approval before retention or export.
- Every capability has a useful degraded mode (offline, no AI, no vector service).
- No credentials or runtime data in Git. See `docs/SECRET_HANDLING.md`.

## Run it

```bash
python3 modules/experience-pwa/service.py      # serves the app on http://localhost:8002
```

Open http://localhost:8002, then use the browser's Install option if you want it as an app. The optional vector search service is in `modules/vector-service` (see its README and `docs/LOCAL_SERVICES.md`).

## Tests

```bash
node --test modules/experience-pwa/tests/*.test.mjs
python3 -m unittest discover -s modules/_shared/tests
python3 -m unittest discover -s modules/vector-service/tests
node scripts/check-repo.mjs
```

See `docs/TESTING.md`. CI runs these plus a Chromium smoke run on every pull request.

## Where things are

| Path | What |
|---|---|
| `modules/experience-pwa/` | The app (no build step: React + htm from `static/js/vendor`) |
| `modules/vector-service/` | Optional local similarity search |
| `modules/_shared/` | Loopback-only helper used by every service |
| `docs/INDEX.md` | Current documentation, in reading order |
| `PHASE2_IMPLEMENTATION_PLAN.md`, `phase3_assessment_plan.md` | What was built and what is next |
| `archive/` | Retired code and superseded documents, kept for reference only |
