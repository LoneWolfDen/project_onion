# Project Onion — TESTING.md — HDD Memory for Test Commands & Scenarios

Chat is RAM, HDD is docs/TESTING.md + module TEST_SCENARIOS.md — new session reads this first.

## Level Clarification — Fixed v0.5.1

- **First Level = Client Master = PRIMARY FILTER = dropdown = NOT editable**
  - `client_name` = `Acme Corp` / `Acme UK` / `GE` — from Client Master list
  - DynamoDB PK = client_name — all queries start with WHERE client_name = :Acme Corp
  - Example: dropdown shows Acme Corp -> lists all ProjectRefs under Acme Corp

- **Second Level = ProjectRef = logical grouping UNDER Client = editable**
  - `project_ref_name` = `Acme Corp DIP Discovery` — user can edit, e.g., rename to Acme Corp DIP Discovery Phase 2
  - `anchor_id` = slugified `ACME-DIP-DISCOVERY` — readable, from client_name + project_ref_name
  - DynamoDB SK = anchor_id — editable via UI
  - Link table inside anchor: opportunity_numbers [O-5030460] business # from file PS-v2026.2a-...-(O-5030460)-V6.3_ESC, connected_record_ids [006Uj00000QOBkvIAH] Salesforce 18-char from URL /Opportunity/006Uj.../view, sharepoint_smps [acmespf], gdp_ids [8399]

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

#### SCENARIO 2: Create anchor — Acme Corp + Acme Corp DIP Discovery — multi-multi O-5030460 <-> 006Uj...
```bash
curl -s -X PUT http://localhost:8000/anchor/Acme%20Corp/Acme%20Corp%20DIP%20Discovery   -H "Content-Type: application/json"   -d '{
    "client_name": "Acme Corp",
    "project_ref_name": "Acme Corp DIP Discovery",
    "opportunity_numbers": ["O-5030460"],
    "connected_record_ids": ["006Uj00000QOBkvIAH"],
    "project_ids": ["12345","12346"],
    "gdp_ids": ["8399"],
    "sharepoint_smps": ["acmespf"]
  }' | python3 -m json.tool
# Expect: anchor_id ACME-DIP-DISCOVERY or ACME-GE-AERO-DIP-DISCOVERY, opportunity_numbers [O-5030460], connected_record_ids [006Uj...], link_table, freshness first_seen last_refreshed, clip_id hash
```

#### SCENARIO 3: Multi-multi extension — same SharePoint acmespf + same O-5030460 base -> validation_prompt Relevant? Yes/No/Edit
```bash
curl -s -X PUT http://localhost:8000/anchor/Acme%20Corp/Acme%20Corp%20DIP%20Discovery   -H "Content-Type: application/json"   -d '{
    "client_name": "Acme Corp",
    "project_ref_name": "Acme Corp DIP Discovery",
    "opportunity_numbers": ["O-5030460","O-5030460-Extension"],
    "connected_record_ids": ["006Uj00000QOBkvIAH","006Uj00000QOBkvIAI"],
    "project_ids": ["12345","12346"],
    "gdp_ids": ["8399"],
    "sharepoint_smps": ["acmespf"]
  }' | python3 -m json.tool
# Expect: validation_prompt "We found new ConnectedRecord 006Uj00000QOBkvIAI linked to same SharePoint acmespf — Relevant? Yes/No/Edit — add to ProjectRef ACME-DIP-DISCOVERY?"
```

#### SCENARIO 4: PRIMARY FILTER — Client Master dropdown — only anchors for Acme Corp
```bash
curl -s http://localhost:8000/anchors/Acme%20Corp | python3 -m json.tool
# Expect: client_name Acme Corp, count 1, anchors list contains ACME-DIP-DISCOVERY
```

#### SCENARIO 5: Search by business O-5030460 — users search by this from file names
```bash
curl -s http://localhost:8000/search/opportunity/O-5030460 | python3 -m json.tool
# Expect: opportunity_number O-5030460, count 1, anchor ACME-DIP-DISCOVERY
```

#### SCENARIO 6: Search by Salesforce 006Uj... — provenance by URL
```bash
curl -s http://localhost:8000/search/connected/006Uj00000QOBkvIAH | python3 -m json.tool
# Expect: connected_record_id 006Uj00000QOBkvIAH, count 1, anchor ACME-DIP-DISCOVERY
```

#### SCENARIO 7: PII screener middleware must call before save — CI fails if not
```bash
curl -s -X POST http://localhost:8000/test/pii-check -H "Content-Type: application/json" -d '{"text":"Alex Nejat alex@acme.com £129,768 TGS_EmpID 8261003 UK"}' | python3 -m json.tool
# Expect: pii_detected true, redacted_text REDACTED $XXXk EMP-XXXX User_A@client.com, must_call_pii_screener_before_save true
```

#### SCENARIO 8: Edit ProjectRef — second level editable — first level NOT editable
```bash
# User edits Acme Corp DIP Discovery -> Acme Corp DIP Discovery Phase 2 — anchor_id should update but client_name stays Acme Corp
curl -s -X PUT http://localhost:8000/anchor/Acme%20Corp/Acme%20Corp%20DIP%20Discovery%20Phase%202   -H "Content-Type: application/json"   -d '{"client_name":"Acme Corp","project_ref_name":"Acme Corp DIP Discovery Phase 2","opportunity_numbers":["O-5030460"],"connected_record_ids":["006Uj00000QOBkvIAH"],"gdp_ids":["8399"],"sharepoint_smps":["acmespf"]}' | python3 -m json.tool
# Expect: new anchor_id ACME-DIP-DISCOVERY-PHASE-2, same client_name Acme Corp
```

### Fixed Regex — 006 + 15 = 18 chars
- Before: 006Uj[A-Za-z0-9]{15} = 20 chars — failed for 006Uj00000QOBkvIAH
- After: ^006[A-Za-z0-9]{15}$ = 18 chars — passes for 006Uj00000QOBkvIAH (006 + 15) — also allows 15-char IDs

### Next Modules — Test Scenarios to Add

- cards-store: freshness 2d ago green >1 month red Stale, EventBridge 6h HEAD check, weekly bucket significance 0.9 EXTENSION vs 0.25 CHASING, timeline Row12+Row18 multi-row hash
- experience-pwa: ProjectHeader mint collapsible pastel tokens --pastel-blue #D6E8FF, shows Acme Corp / ACME-DIP-DISCOVERY / O-5030460 / 006Uj... both IDs
- gdp-adapter: Engagement Data Export - Active exact columns, full read on HEAD change
- connected-bookmarklet: V6.3_ESC dedupe, captures both O-5030460 + 006Uj...# Add to docs/TESTING.md — Scenario 9 — Insert Additional Clients — First Level PRIMARY FILTER

## SCENARIO 9: Insert Additional Client Master — First Level — PRIMARY FILTER dropdown — Data as Code

### Why — Your Question
- First Level = Client Master = Acme Corp / Rolls-Royce = PRIMARY FILTER dropdown NOT editable — from seed data
- How to add new client? Via API PUT or via seed_clients.py Data as Code — versioned — not DVC
- DVC is for large binary datasets — overkill — Version-Controlled Data Dictionary JSON is enough for hackathon

### Steps — Option 1: Via API — Quick Add

```bash
# Terminal 1: server running
python modules/platform-anchor/service.py

# Terminal 2: insert Rolls-Royce as new Client Master
curl -s -X PUT http://localhost:8000/anchor/Rolls-Royce/RR%20Discovery   -H "Content-Type: application/json"   -d '{
    "client_name": "Rolls-Royce",
    "project_ref_name": "RR Discovery",
    "opportunity_numbers": ["O-5030461"],
    "connected_record_ids": ["006Uj00000QOBkvIAJ"],
    "gdp_ids": ["8400"],
    "sharepoint_smps": ["rrdiscovery"]
  }' | python3 -m json.tool
# Expect: anchor_id ROLLS-RR-DISCOVERY or ROLLS-DISCOVERY — client_name Rolls-Royce

# Verify PRIMARY FILTER now has Acme Corp + Rolls-Royce
curl -s http://localhost:8000/anchors/Acme%20Corp | python3 -m json.tool
# count 1 for Acme Corp
curl -s http://localhost:8000/anchors/Rolls-Royce | python3 -m json.tool
# count 1 for Rolls-Royce — dropdown shows both
```

### Steps — Option 2: Via Seed Script — Data as Code — Versioned — Recommended for Hackathon

```bash
cd /Users/wolf/Developer/project_onion
cat data/seed/clients.json | python3 -m json.tool
# Shows 3 clients: Acme Corp, Rolls-Royce, ClientA — each with client_name PRIMARY FILTER

# Dry run — see what would be inserted
source .venv/bin/activate
python modules/platform-anchor/seed_clients.py --file data/seed/clients.json --dry-run

# Real insert — requires server running in Terminal 1
python modules/platform-anchor/seed_clients.py --file data/seed/clients.json

# Verify all clients
curl -s http://localhost:8000/anchors/Acme%20Corp | python3 -m json.tool
curl -s http://localhost:8000/anchors/Rolls-Royce | python3 -m json.tool
curl -s http://localhost:8000/anchors/ClientA | python3 -m json.tool
```

### Data Dictionary Approach vs DVC — Decision

| Approach | When | For Project Onion |
|----------|------|-------------------|
| Version-Controlled Data Dictionary (markdown + JSON seed) | Small reference data — client list, project_refs — <1MB — git versioned — Data as Code | ✅ Use this for hackathon — data/seed/clients.json + docs/DATA_DICTIONARY.md — simple — tag v0.6 |
| Data Version Control (DVC) | Large binary datasets — 100MB+ Excel, model weights, embeddings — needs S3, .dvc files | ❌ Overkill for client list — would complicate — avoid for hackathon |
| DynamoDB Seed Script | Prod — bulk insert — same JSON — idempotent | ✅ Use seed_clients.py — same JSON — works for local STORE + DynamoDB local later |

### Commit New Client — Version Control
```bash
# Edit data/seed/clients.json — add new client e.g., Airbus
cat data/seed/clients.json | python3 -m json.tool
# Add entry for Airbus

# Update docs/DATA_DICTIONARY.md — add Airbus to table
# Update docs/TESTING.md Scenario 9 — test Airbus

git checkout -b feature/add-client-airbus
git add data/seed/clients.json docs/DATA_DICTIONARY.md docs/TESTING.md
git commit -m "data(clients): add Airbus as Client Master PRIMARY FILTER — Data as Code — versioned — seed via PUT /anchor/Airbus/Airbus Discovery"
git push origin feature/add-client-airbus
# PR → Squash → tag v0.7-clients-added
```