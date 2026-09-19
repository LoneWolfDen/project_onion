# DATA_DICTIONARY.md — Version-Controlled Data Dictionary — Data as Code — v0.6

Chat is RAM, HDD is this file + data/seed/*.json — versioned with git tags — NOT heavy DVC — DVC is for large binaries, model weights — overkill for hackathon.

## Approach — Data as Code for Hackathon — Simple
- Data files: data/seed/clients.json, data/seed/project_refs.json — JSON — git versioned — tag v0.6-test-suite-corrected-naming
- Dictionary: this file — markdown — defines schema, PK/SK, GSI, examples — versioned
- Seed script: modules/platform-anchor/seed_clients.py — inserts clients into STORE / DynamoDB local — idempotent
- Test: docs/TESTING.md Scenario 9 — insert additional clients — verifies PRIMARY FILTER dropdown

## Client Master — First Level — PRIMARY FILTER — dropdown — NOT editable

### Schema
| Field | Type | Example | Notes |
|-------|------|---------|-------|
| client_id | string | C-001 | internal id, not Salesforce |
| client_name | string | GE Aero | PRIMARY FILTER — PK in anchors — dropdown — NOT editable — from Client Master |
| client_code | string | GEAERO | slug upper — for anchor_id |
| connected_client_name | string | Ge Aviation Uk | variation from Salesforce / SharePoint — maps to same client_name GE Aero |
| is_active | bool | true | filter active clients |
| created_at | iso | 2026-05-13T10:00:00Z | freshness |

### PK/SK — DynamoDB — Client Master Table (if separate) OR in-memory STORE key
- PK = client_name — GE Aero — PRIMARY FILTER
- SK = client_id — C-001 — optional
- GSI = client_code-index — GEAERO -> client_name

### Seed Data — data/seed/clients.json
```json
[
  {"client_id": "C-001", "client_name": "GE Aero", "client_code": "GEAERO", "connected_names": ["Ge Aviation Uk", "GE Aviation", "GE"], "is_active": true},
  {"client_id": "C-002", "client_name": "Rolls-Royce", "client_code": "ROLLS", "connected_names": ["Rolls-Royce Plc", "RR"], "is_active": true},
  {"client_id": "C-003", "client_name": "ClientA", "client_code": "CLIENTA", "connected_names": ["Client A Ltd"], "is_active": true}
]
```

### How to Insert Additional Client — First Level — Steps
```bash
# Option 1: Via API — PUT anchor with new client_name — creates new PRIMARY FILTER automatically
curl -s -X PUT http://localhost:8000/anchor/Rolls-Royce/RR%20Discovery   -H "Content-Type: application/json"   -d '{
    "client_name": "Rolls-Royce",
    "project_ref_name": "RR Discovery",
    "opportunity_numbers": ["O-5030461"],
    "connected_record_ids": ["006Uj00000QOBkvIAJ"],
    "gdp_ids": ["8400"],
    "sharepoint_smps": ["rrdiscovery"]
  }' | python3 -m json.tool

# Then PRIMARY FILTER dropdown shows Rolls-Royce
curl -s http://localhost:8000/anchors/Rolls-Royce | python3 -m json.tool
# count 1

# Option 2: Via Seed Script — Data as Code — versioned — for bulk
cd /Users/wolf/Developer/project_onion
source .venv/bin/activate
python modules/platform-anchor/seed_clients.py --file data/seed/clients.json
# Inserts all clients from JSON into STORE — idempotent — logs inserted

# Option 3: Direct DynamoDB Local — for prod later — same JSON seed
aws dynamodb batch-write-item --request-items file://data/seed/clients.json --endpoint-url http://localhost:8000
# For hackathon, use Option 1 or 2 — simple — no AWS needed
```

## ProjectRef — Second Level — logical grouping UNDER Client — editable

### Schema
| Field | Type | Example | Notes |
|-------|------|---------|-------|
| client_name | string | GE Aero | First Level FK — PRIMARY FILTER |
| project_ref_name | string | GE Aero DIP Discovery | Second Level — editable — user can rename Phase 2 |
| anchor_id | string | GEAERO-DIP-DISCOVERY | slugified client + project_ref — readable — SK |
| opportunity_numbers | list | [O-5030460] | business # from PS-v2026.2a-...-(O-5030460)-V6.3_ESC — GSI |
| connected_record_ids | list | [006Uj00000QOBkvIAH] | Salesforce 18-char — GSI |
| gdp_ids | list | [8399] | GDP ID — from Engagement Data Export |
| sharepoint_smps | list | [geadinspf] | SharePoint site |

### PK/SK — Anchor Table
- PK = client_name — GE Aero — PRIMARY FILTER — dropdown
- SK = anchor_id — GEAERO-DIP-DISCOVERY — editable
- GSI1 = opportunity_number-index — O-5030460 -> anchor
- GSI2 = connected_record_id-index — 006Uj... -> anchor

## Cards — Third Level — under ProjectRef

### Schema
| Field | Type | Example | Notes |
|-------|------|---------|-------|
| anchor_id | string | GEAERO-DIP-DISCOVERY | PK — second level |
| card_id | string | timeline#Week33 | SK — type#id |
| client_name | string | GE Aero | GSI — ensures PRIMARY FILTER |
| card_type | string | timeline | timeline, doc, budget, stakeholder |
| significance_score | float | 0.9 | 0.9-1.0 EXTENSION/APPROVAL vs 0.25 CHASING |
| freshness | dict | {days:2,label:2d ago,color:green} | 2d ago green >1 month red Stale |
| source_rows | list | [Row12,Row18] | multi-row hash |

## Version Control Strategy — For Hackathon — No DVC Overkill
- Version: git tags v0.6 — data/seed/clients.json versioned with code — Data as Code
- DVC would be for 100MB+ Excel, model weights — not needed for client list
- Refresh: update data/seed/clients.json + run seed_clients.py + commit + tag v0.7-clients-added
- Docs: update this file + docs/TESTING.md Scenario 9 + commit

## Test Scenario 9 — Insert Additional Clients — PRIMARY FILTER
```bash
# Insert Rolls-Royce as new Client Master
curl -s -X PUT http://localhost:8000/anchor/Rolls-Royce/RR%20Discovery -H "Content-Type: application/json" -d '{"client_name":"Rolls-Royce","project_ref_name":"RR Discovery","opportunity_numbers":["O-5030461"],"connected_record_ids":["006Uj00000QOBkvIAJ"],"gdp_ids":["8400"],"sharepoint_smps":["rrdiscovery"]}' | python3 -m json.tool

# Verify PRIMARY FILTER dropdown now has GE Aero + Rolls-Royce
curl -s http://localhost:8000/anchors/GE%20Aero | python3 -m json.tool
curl -s http://localhost:8000/anchors/Rolls-Royce | python3 -m json.tool

# Seed from JSON — Data as Code
python modules/platform-anchor/seed_clients.py --file data/seed/clients.json --dry-run
python modules/platform-anchor/seed_clients.py --file data/seed/clients.json
```