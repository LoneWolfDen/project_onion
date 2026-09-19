# GLOBAL_BRAIN.md — Project Onion — HDD Memory — Chat is RAM, HDD is this file

## Core Context — Must Read First in New Session
- Project Onion replaces folder copies v3.5 — 80% contracts, budget tracking noise
- Two IDs preserved: O-5030460 business # from file names PS-v2026.2a-...-(O-5030460)-V6.3_ESC vs 006Uj00000QOBkvIAH Salesforce 18-char from URL /Opportunity/006Uj.../view — multi-multi O-5030460 <-> 006Uj... preserved
- Tags are HDD: v0.2-brain-contexts, v0.3-contracts-80pct, v0.3.1-opp-id-split, v0.4-walking-skeleton-code, v0.4.1-readme-hdd, v0.5-anchor-crud-fixed, v0.5.1-anchor-test-python3, v0.6-test-suite-corrected-naming

## Level Clarification — v0.6 Fixed — Critical
- **First Level = Client Master = PRIMARY FILTER = dropdown = NOT editable**
  - client_name = GE Aero / Ge Aviation Uk / GE / Rolls-Royce / ClientA — from Client Master list — docs/DATA_DICTIONARY.md defines
  - DynamoDB PK = client_name — all queries start WHERE client_name = :GE Aero
  - UI: dropdown, user cannot edit, comes from seed data/data/seed/clients.json
  - Example: GE Aero dropdown -> lists all ProjectRefs under GE Aero

- **Second Level = ProjectRef = logical grouping UNDER Client = editable**
  - project_ref_name = GE Aero DIP Discovery — user can edit to Phase 2, e.g., GE Aero DIP Discovery Phase 2
  - anchor_id = slugified GEAERO-DIP-DISCOVERY — readable, from client_name + project_ref_name uppercased
  - DynamoDB SK = anchor_id — editable via UI
  - Link table inside anchor: opportunity_numbers [O-5030460], connected_record_ids [006Uj00000QOBkvIAH], sharepoint_smps [geadinspf], gdp_ids [8399], project_ids [12345]

## Anchor Service — :8000 — v0.6
- 6 endpoints: PUT /anchor/{client}/{project_ref}, GET /anchor/{client}/{project_ref}, GET /anchors/{client} PRIMARY FILTER, GET /search/opportunity/{O-5030460}, GET /search/connected/{006Uj...}, POST /test/pii-check
- Regex: ^006[A-Za-z0-9]{15}$ = 18 chars — 006 + 15 alphanumeric — 006Uj00000QOBkvIAH passes
- Freshness: first_seen, last_refreshed — for cards-store EventBridge 6h HEAD check
- Validation prompt: "We found new ConnectedRecord 006Uj00000QOBkvIAI linked to same SharePoint geadinspf — Relevant? Yes/No/Edit — add to ProjectRef GEAERO-DIP-DISCOVERY?"
- PII screener middleware must call before save — CI fails if not

## Cards Store — :8001 — v0.7 Next
- PK anchor_id GEAERO-DIP-DISCOVERY, SK card_id timeline#Week33, GSI client_name-index PRIMARY FILTER GE Aero
- Freshness: 2d ago green, 1 month red Stale — pastel tokens --pastel-blue #D6E8FF
- Weekly bucket: significance_score 0.9-1.0 EXTENSION/APPROVAL vs 0.25 CHASING — noise filter
- Timeline strip Week 33: Laptop 50%->100% [Row12+Row18] — multi-row hash from Excel
- EventBridge 6h HEAD check for SharePoint geadinspf + GDP 8399 — full read on change

## Data as Code vs DVC Decision — v0.6
- For hackathon: Version-Controlled Data Dictionary (markdown + JSON seed) NOT heavy DVC — simple git versioned
- DVC is for large binary datasets, model weights — overkill for client list
- Approach: data/seed/clients.json + docs/DATA_DICTIONARY.md versioned with tags v0.6 — seed script modules/platform-anchor/seed_clients.py inserts into DynamoDB local / STORE
- All details documented and refreshed in docs/TESTING.md + docs/DATA_DICTIONARY.md — new session reads both