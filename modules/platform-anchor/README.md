# Anchor Service — Testable API — v0.5

## Run locally — no AWS needed

```bash
cd /Users/wolf/Developer/project_onion
pip install fastapi uvicorn
python modules/platform-anchor/service.py
# Server on http://localhost:8000 — docs at http://localhost:8000/docs
```

In another terminal:
```bash
bash modules/platform-anchor/test-anchor-api.sh
```

## Endpoints — O-5030460 vs 006Uj... split preserved

- PUT /anchor/{client_name}/{project_ref_name} — create/update anchor with opportunity_numbers O-5030460 + connected_record_ids 006Uj...
- GET /anchor/{client_name}/{project_ref_name} — get anchor
- GET /anchors/{client_name} — PRIMARY FILTER Client Master dropdown
- GET /search/opportunity/{O-5030460} — users search by business #
- GET /search/connected/{006Uj...} — provenance by Salesforce URL
- POST /test/pii-check — simulates pii-screener middleware must call before save

## Multi-multi validation

When new ConnectedRecord 006Uj... found linked to same SMP geadinspf with same O-5030460 base:
Returns validation_prompt: "We found new ConnectedRecord 006Uj00000QOBkvIAI linked to same SharePoint geadinspf — Relevant? Yes/No/Edit — add to ProjectRef GE-Discovery?"

## HDD Memory update

This implements platform-anchor CONTRACT — link table many-many — replaces folder copies v3.5 with git tags v0.5