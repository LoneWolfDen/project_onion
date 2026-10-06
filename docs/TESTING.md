# Testing

## Automated
| Command | Covers |
|---|---|
| `node --test modules/experience-pwa/tests/*.test.mjs` | Pure modules: backup, import, handover, knowledge, privacy, logger, trust boundaries |
| `node --test modules/experience-pwa/tests/trust-boundary.test.mjs` | The `critical-tests` check; also re-run on release tags |
| `python3 -m unittest discover -s modules/_shared/tests` | Loopback and origin guard (needs `pip install fastapi httpx`) |
| `python3 -m unittest discover -s modules/vector-service/tests` | Vector scope and privacy (Chroma is stubbed) |
| `node scripts/check-repo.mjs` | No runtime databases, backup copies, personal paths, key-shaped strings or unexpected module folders |
| `node scripts/css-usage.mjs --check` | CSS classes still defined |
| `node scripts/gen-sw-precache.mjs --check` | Service worker precache list is current |
| `node modules/experience-pwa/tests/smoke.mjs` | Browser run in Chromium (Playwright), including the link and guide pages |

CI (`.github/workflows/pwa-smoke.yml`) runs all of these on every pull request, plus a full-history secret scan (gitleaks).

## Manual
`docs/PHASE2_TESTING_GUIDE.md` walks through every feature with the sample files in `docs/phase2-test-samples/`. Items only a person can check (Teams screen share, Windows, Safari, a second device) are listed in `docs/PILOT_CHECKLIST.md`.
