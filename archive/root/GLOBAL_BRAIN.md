# GLOBAL_BRAIN.md — Project Onion — HDD Memory — Chat is RAM, HDD is this file

## Core Context — Must Read First in New Session
- Project Onion replaces folder copies v3.5 — 80% contracts, budget tracking noise
- Two IDs preserved: O-5030460 business # from file names PS-v2026.2a-...-(O-5030460)-V6.3_ESC vs 006Uj00000QOBkvIAH Salesforce 18-char from URL /Opportunity/006Uj.../view — multi-multi O-5030460 <-> 006Uj... preserved
- Tags are HDD: v0.2-brain-contexts, v0.3-contracts-80pct, v0.3.1-opp-id-split, v0.4-walking-skeleton-code, v0.4.1-readme-hdd, v0.5-anchor-crud-fixed, v0.5.1-anchor-test-python3, v0.6-test-suite-corrected-naming

## Level Clarification — v0.6 Fixed — Critical
- **First Level = Client Master = PRIMARY FILTER = dropdown = NOT editable**
  - client_name = Acme Corp / Acme UK / GE / Rolls-Royce / ClientA — from Client Master list — docs/DATA_DICTIONARY.md defines
  - DynamoDB PK = client_name — all queries start WHERE client_name = :Acme Corp
  - UI: dropdown, user cannot edit, comes from seed data/data/seed/clients.json
  - Example: Acme Corp dropdown -> lists all ProjectRefs under Acme Corp

- **Second Level = ProjectRef = logical grouping UNDER Client = editable**
  - project_ref_name = Acme Corp DIP Discovery — user can edit to Phase 2, e.g., Acme Corp DIP Discovery Phase 2
  - anchor_id = slugified ACME-DIP-DISCOVERY — readable, from client_name + project_ref_name uppercased
  - DynamoDB SK = anchor_id — editable via UI
  - Link table inside anchor: opportunity_numbers [O-5030460], connected_record_ids [006Uj00000QOBkvIAH], sharepoint_smps [acmespf], gdp_ids [8399], project_ids [12345]

## Anchor Service — :8000 — v0.6
- 6 endpoints: PUT /anchor/{client}/{project_ref}, GET /anchor/{client}/{project_ref}, GET /anchors/{client} PRIMARY FILTER, GET /search/opportunity/{O-5030460}, GET /search/connected/{006Uj...}, POST /test/pii-check
- Regex: ^006[A-Za-z0-9]{15}$ = 18 chars — 006 + 15 alphanumeric — 006Uj00000QOBkvIAH passes
- Freshness: first_seen, last_refreshed — for cards-store EventBridge 6h HEAD check
- Validation prompt: "We found new ConnectedRecord 006Uj00000QOBkvIAI linked to same SharePoint acmespf — Relevant? Yes/No/Edit — add to ProjectRef ACME-DIP-DISCOVERY?"
- PII screener middleware must call before save — CI fails if not

## Cards Store — :8001 — v0.7 Next
- PK anchor_id ACME-DIP-DISCOVERY, SK card_id timeline#Week33, GSI client_name-index PRIMARY FILTER Acme Corp
- Freshness: 2d ago green, 1 month red Stale — pastel tokens --pastel-blue #D6E8FF
- Weekly bucket: significance_score 0.9-1.0 EXTENSION/APPROVAL vs 0.25 CHASING — noise filter
- Timeline strip Week 33: Laptop 50%->100% [Row12+Row18] — multi-row hash from Excel
- EventBridge 6h HEAD check for SharePoint acmespf + GDP 8399 — full read on change

## Data as Code vs DVC Decision — v0.6
- For hackathon: Version-Controlled Data Dictionary (markdown + JSON seed) NOT heavy DVC — simple git versioned
- DVC is for large binary datasets, model weights — overkill for client list
- Approach: data/seed/clients.json + docs/DATA_DICTIONARY.md versioned with tags v0.6 — seed script modules/platform-anchor/seed_clients.py inserts into DynamoDB local / STORE
- All details documented and refreshed in docs/TESTING.md + docs/DATA_DICTIONARY.md — new session reads both
# 🌐 Project Continuum (Project Onion) — Global Brain Concept Document
> Version: v1.0-continuum-narrative — 2026-09-21
> Status: Business Requirements Injected into `.clinerules` — Awaiting Human Authorization

## 1. Business Narrative — The Why Behind the What
Product Name: Project Continuum (Project Onion)
Problem Solved: Systems hold what was decided; Continuum captures the why and the human context behind it.
Operational Mandate — Fail Closed: every new Knowledge Card defaults to Team Shared to build org intelligence.

## 2. Six Core Functional Modules
### 1. Collector — Dual-Track Ingestion
- Production Core: native APIs (Outlook Graph API etc) with typed filters only.
- Resilient Edge Fallbacks: SheetJS parsers + DOM bookmarklet when APIs blocked.
### 2. Workspace — Review Edit Enrich
- PWA editable form BEFORE submit. Modify text, append files.
- Failover Repository: cloud health check then IndexedDB pending_upload.
### 3. Ask — Conversational Recall
- NL query over Team Shared cards scoped by Client dropdown then Anchor.
### 4. Refinery — The LLM Lifting
- Correlates Email Teams GDP RAID fragments via identifier dates +/-30 days.
- Synthesizes Knowledge Cards with Model Confidence pct from evidence qty.
### 5. Vault — Private vs Shared Lifecycle
- Default Team Shared. Toggle to My Notes Private triggers auto instant save.
- All payloads pass client-side PII regex gate before memory state.
### 6. Radar — Freshness Detection
- Tracks last_scanned date deltas, GDP mutable dates, stale vs refreshed.

## 3. 9-Field Knowledge Card Layout (strict contract)
1 id hash/uuid (RAID agg hash sources+description_norm)
2 projectId apollo-123 or novatech-42 only
3 type Email Excel Scrape Chat
4 title clean headline
5 source e.g. Salesforce DOM RAID Log Excel Outlook Mail
6 timestamp relative e.g. Just now
7 content PII-screened body
8 piiStatus Clean or Redacted_Review
9 syncStatus pending_upload or synced
Never invent root-level params outside this schema.

## 4. Team Shared Default Review Lifecycle
1 Harvest via API SheetJS Bookmarklet clipboard Paste drop-zone then PII screen.
2 Review Edit in PWA editable form append files.
3 Default Team Shared submit with cloud check fallback pending_upload.
4 Private toggle auto-saves instantly to browser local space.
5 Refinery LLM plus30d correlation to card plus confidence.
6 Radar Vault timeline searchable freshness tracked.

## 5. Bookmarklet Constraints Summary
Auto-click expands collapsed lazy tabs Load More before DOM pass. Packs 9-field JSON stringified to clipboard to bypass CORS. PWA Paste Harvested Data zone.
End Continuum Narrative — No code generated awaiting authorization.
