# STATE.md — Current State — v0.6-test-suite-corrected-naming

## Last Session — 2026-05-13
- Anchor service tested local — multi-multi O-5030460 <-> 006Uj... preserved — count 1 not 0 — fixed regex 006+15=18
- TESTING.md added — HDD memory — 8 scenarios — First Level GE Aero PRIMARY FILTER vs Second Level GE Aero DIP Discovery editable
- Tags: v0.2 to v0.6 — * main clean

## Current Phase
- v0.6 done: anchor CRUD + TESTING.md + corrected naming GE Aero / GE Aero DIP Discovery / GEAERO-DIP-DISCOVERY
- v0.7 next: cards-store full — freshness 2d ago green >1 month red Stale, EventBridge 6h HEAD, weekly bucket significance

## Next Steps — Immediate
1. Review docs/DATA_DICTIONARY.md — Version-Controlled Data Dictionary — Data as Code for hackathon — add clients seed
2. Test client insert: PUT /anchor/GE%20Aero/GE%20Aero%20DIP%20Discovery + seed_clients.py
3. Build cards-store :8001 with GEAERO-DIP-DISCOVERY PK
4. Update README.md to reference TESTING.md + DATA_DICTIONARY.md

## Blockers
- None — localhost:8000 works — root returns org_mapping O-5030460 vs 006Uj...

## HDD Files to Read First in New Session
cat GLOBAL_BRAIN.md STATE.md README.md docs/TESTING.md docs/DATA_DICTIONARY.md docs/DECISION_LOG.md