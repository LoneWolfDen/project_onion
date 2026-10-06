# Documentation index

Only documents that describe the current implementation are listed here. Everything older is in `archive/` (kept, not deleted).

## Start here
- `README.md` (root): what Continuum is and how to run it.
- `PHASE2_IMPLEMENTATION_PLAN.md` (root): what Phase 2 delivered, with the progress log.
- `phase3_assessment_plan.md` (root): assessment and plan for Phase 3.

## How it works
- `docs/EVIDENCE_STRENGTH.md`: how the trust indicator is calculated, and the compounding loop.
- `docs/CONTINUITY_RADAR.md`: the rules behind the radar.
- `docs/IMPORT_TEMPLATES.md`: GDP export and RAID log columns.
- `docs/LOCAL_SERVICES.md`: loopback-only services, origin checks, vector service scope.
- `docs/SECRET_HANDLING.md`: credential rules.
- `docs/APP_HANDOVER_CONTRACT.md`: how Continuum, Finance Engine and Pre-Sales Accelerator open each other on the same project; `docs/prompts/CROSS_APP_HANDOVER_PROMPT.md` is the prompt for the other repos.
- `docs/COPILOT_ASSESSMENT.md`: Microsoft 365 Copilot patterns A, B and C, and the chat assistant rules.

## Testing
- `docs/TESTING.md`: automated test commands and CI checks.
- `docs/PHASE2_TESTING_GUIDE.md`: manual walkthrough with sample files in `docs/phase2-test-samples/`.

## Design background
- `docs/design/`: Relationship Model v5 scope and concept, status card UX recommendations, harvester architecture.
- `docs/demo/`: the 5-minute demo script and demo dataset definition.
- In the app: the guide and relationship model pages under `modules/experience-pwa/static/docs/`.

## Archive
`archive/docs`, `archive/root` and `archive/modules` hold earlier backlogs, version notes, registration field specs, the retired Python services (anchor, cards store, GDP adapter, admin) and spec-only module folders. Some archived pages still describe those services; they are not part of the current product.
