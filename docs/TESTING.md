# Project Onion — TESTING.md — HDD Memory for Test Commands & Scenarios

Chat is RAM, HDD is docs/TESTING.md + module TEST_SCENARIOS.md — new session reads this first.

## Level Clarification — Fixed v0.5.1

- **First Level = Client Master = PRIMARY FILTER = dropdown = NOT editable**
  - `client_name` = `GE Aero` / `Ge Aviation Uk` / `GE` — from Client Master list
  - DynamoDB PK = client_name — all queries start with WHERE client_name = :GE Aero
  - Example: dropdown shows GE Aero -> lists all ProjectRefs under GE Aero

- **Second Level = ProjectRef = logical grouping UNDER Client = editable**
  - `project_ref_name` = `GE Aero DIP Discovery` — user can edit, e.g., rename to GE Aero DIP Discovery Phase 2
  - `anchor_id` = slugified `GEAERO-DIP-DISCOVERY` — readable, from client_name + project_ref_name
  - DynamoDB SK = anchor_id — editable via UI
  - Link table inside anchor: opportunity_numbers [O-5030460] business # from file PS-v2026.2a-...-(O-5030460)-V6.3_ESC, connected_record_ids [006Uj00000QOBkvIAH] Salesforce 18-char from URL /Opportunity/006Uj.../view, sharepoint_smps [geadinspf], gdp_ids [8399]

## Anchor Service — Test Suite — v0.5.1

### Setup — 2 terminals — both show (main) branch — normal
```bash
cd /Users/wolf/Developer/project_onion
python3 -m venv .venv
source .venv/bin/activate
pip install fastapi uvicorn pydantic

# Terminal 1 — server
python modules/platform-anchor/service.py
# http://localhost:8000/docs — 6 endpoints

# Terminal 2 — tests
source .venv/bin/activate
bash modules/platform-anchor/test-anchor-api.sh
```

### Test Scenarios — Anchor Service

#### SCENARIO 1: Root health + org mapping preserved
```bash
curl -s http://localhost:8000/ | python3 -m json.tool
# Expect: service platform-anchor, status ok, org_mapping OpportunityID O-5030460 business # vs ConnectedRecord 006Uj... Salesforce ID 18 chars, regex 006 + 15
```

#### SCENARIO 2: Create anchor — GE Aero + GE Aero DIP Discovery — multi-multi O-5030460 <-> 006Uj...
```bash
curl -s -X PUT http://localhost:8000/anchor/GE%20Aero/GE%20Aero%20DIP%20Discovery   -H "Content-Type: application/json"   -d '{
    "client_name": "GE Aero",
    "project_ref_name": "GE Aero DIP Discovery",
    "opportunity_numbers": ["O-5030460"],
    "connected_record_ids": ["006Uj00000QOBkvIAH"],
    "project_ids": ["12345","12346"],
    "gdp_ids": ["8399"],
    "sharepoint_smps": ["geadinspf"]
  }' | python3 -m json.tool
# Expect: anchor_id GEAERO-DIP-DISCOVERY or GEAERO-GE-AERO-DIP-DISCOVERY, opportunity_numbers [O-5030460], connected_record_ids [006Uj...], link_table, freshness first_seen last_refreshed, clip_id hash
```

#### SCENARIO 3: Multi-multi extension — same SharePoint geadinspf + same O-5030460 base -> validation_prompt Relevant? Yes/No/Edit
```bash
curl -s -X PUT http://localhost:8000/anchor/GE%20Aero/GE%20Aero%20DIP%20Discovery   -H "Content-Type: application/json"   -d '{
    "client_name": "GE Aero",
    "project_ref_name": "GE Aero DIP Discovery",
    "opportunity_numbers": ["O-5030460","O-5030460-Extension"],
    "connected_record_ids": ["006Uj00000QOBkvIAH","006Uj00000QOBkvIAI"],
    "project_ids": ["12345","12346"],
    "gdp_ids": ["8399"],
    "sharepoint_smps": ["geadinspf"]
  }' | python3 -m json.tool
# Expect: validation_prompt "We found new ConnectedRecord 006Uj00000QOBkvIAI linked to same SharePoint geadinspf — Relevant? Yes/No/Edit — add to ProjectRef GEAERO-DIP-DISCOVERY?"
```

#### SCENARIO 4: PRIMARY FILTER — Client Master dropdown — only anchors for GE Aero
```bash
curl -s http://localhost:8000/anchors/GE%20Aero | python3 -m json.tool
# Expect: client_name GE Aero, count 1, anchors list contains GEAERO-DIP-DISCOVERY
```

#### SCENARIO 5: Search by business O-5030460 — users search by this from file names
```bash
curl -s http://localhost:8000/search/opportunity/O-5030460 | python3 -m json.tool
# Expect: opportunity_number O-5030460, count 1, anchor GEAERO-DIP-DISCOVERY
```

#### SCENARIO 6: Search by Salesforce 006Uj... — provenance by URL
```bash
curl -s http://localhost:8000/search/connected/006Uj00000QOBkvIAH | python3 -m json.tool
# Expect: connected_record_id 006Uj00000QOBkvIAH, count 1, anchor GEAERO-DIP-DISCOVERY
```

#### SCENARIO 7: PII screener middleware must call before save — CI fails if not
```bash
curl -s -X POST http://localhost:8000/test/pii-check -H "Content-Type: application/json" -d '{"text":"Alex Nejat alex@ge.com £129,768 TGS_EmpID 8261003 UK"}' | python3 -m json.tool
# Expect: pii_detected true, redacted_text REDACTED $XXXk EMP-XXXX User_A@client.com, must_call_pii_screener_before_save true
```

#### SCENARIO 8: Edit ProjectRef — second level editable — first level NOT editable
```bash
# User edits GE Aero DIP Discovery -> GE Aero DIP Discovery Phase 2 — anchor_id should update but client_name stays GE Aero
curl -s -X PUT http://localhost:8000/anchor/GE%20Aero/GE%20Aero%20DIP%20Discovery%20Phase%202   -H "Content-Type: application/json"   -d '{"client_name":"GE Aero","project_ref_name":"GE Aero DIP Discovery Phase 2","opportunity_numbers":["O-5030460"],"connected_record_ids":["006Uj00000QOBkvIAH"],"gdp_ids":["8399"],"sharepoint_smps":["geadinspf"]}' | python3 -m json.tool
# Expect: new anchor_id GEAERO-DIP-DISCOVERY-PHASE-2, same client_name GE Aero
```

### Fixed Regex — 006 + 15 = 18 chars
- Before: 006Uj[A-Za-z0-9]{15} = 20 chars — failed for 006Uj00000QOBkvIAH
- After: ^006[A-Za-z0-9]{15}$ = 18 chars — passes for 006Uj00000QOBkvIAH (006 + 15) — also allows 15-char IDs

### Next Modules — Test Scenarios to Add

- cards-store: freshness 2d ago green >1 month red Stale, EventBridge 6h HEAD check, weekly bucket significance 0.9 EXTENSION vs 0.25 CHASING, timeline Row12+Row18 multi-row hash
- experience-pwa: ProjectHeader mint collapsible pastel tokens --pastel-blue #D6E8FF, shows GE Aero / GEAERO-DIP-DISCOVERY / O-5030460 / 006Uj... both IDs
- gdp-adapter: Engagement Data Export - Active exact columns, full read on HEAD change
- connected-bookmarklet: V6.3_ESC dedupe, captures both O-5030460 + 006Uj...