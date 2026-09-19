# Project Onion — Client 360 + Handover Pack

## HDD Memory — Persistent Context — Chat is RAM, not DISK

This README + GLOBAL_BRAIN.md + STATE.md = HDD. Chat = RAM. New Muse session reads HDD first.

### Phase 0 — Brain Dump — DONE — v0.2-brain-contexts
- INBOX.md: Sources common for every project — Connected first point lead->won, SharePoint once WON with libraries Home/Budget/Communications/Solution Documents/Planning Documents same files different names, GDP once WON weekly status, Teams/OneDrive/PeopleSoft
- KEY: OpportunityID, ProjectID, GDPID multi-multi relationship — Project Reference logical grouping under Client Master PRIMARY FILTER — One ProjectRef GE Discovery links many OpportunityIDs O-5030460 + ConnectedRecords 006Uj00000QOBkvIAH + ProjectIDs + GDPIDs 8399 + SMPs geadinspf — validation prompt Relevant? Yes/No/Edit
- Screenshots: GDP Engagement Status, Status Report 8399, Project Details Stakeholders, Reports Engagement Data Export Active/All etc, Connected Opportunity 006Uj... Notes&Attachments V6.3_ESC 966KB multi-version, Details tabs Prospect/Interest/Qualifying

### Phase 1 — CONTRACTs to 80% — DONE — v0.3-contracts-80pct + v0.3.1-opp-id-split
- 8 CONTRACTs: platform-pii-screener middleware must call before save, platform-anchor multi-multi O-5030460 business # vs 006Uj... Salesforce Record ID preserved org usage, integrations-connected-adapter bookmarklet no API, integrations-sharepoint-adapter pattern not path depth<4 <1000, integrations-gdp-adapter full read on HEAD change Engagement Data Export exact columns, integrations-excel-parser multi-row intelligence 50% laptop weekly bucket hash+similarity>0.85 same card timeline, domain-fusion-engine weekly bucket significance 0.9-1.0 EXTENSION/APPROVAL vs 0.25 CHASING, domain-cards-store DynamoDB PK anchor_id SK card_id GSI client_name-index filtered PRIMARY + OpenSearch knn + freshness 2d ago green >1 month red Stale + EventBridge 6h HEAD check
- Org preserved: OpportunityID = O-5030460 business number in file names PS-v2026.2a-...-(O-5030460)-V6.3_ESC, ConnectedRecord = 006Uj00000QOBkvIAH Salesforce 18-char ID in URL /Opportunity/006Uj.../view

### Phase 2 — Walking Skeleton — DONE — v0.4-walking-skeleton-code
- Journey: Client Master Ge Aviation Uk -> ProjectRef GE Discovery O-5030460 + 006Uj... + geadinspf + 8399 -> Harvest bookmarklet + GDP Excel -> Parse multi-row -> Fusion weekly bucket -> Card pastel UX
- Starter code: bookmarklet.js captures both IDs, gdp-parse.js hash(gdpId+projectId+normalizedTitle+week) timeline_events Row12+Row18, fusion-fuse.js weekly bucket significance_score, ProjectHeader.jsx mint collapsible pastel tokens --pastel-blue #D6E8FF
- Walking Skeleton doc: docs/ideas/WALKING_SKELETON.md
- Next Sprint: docs/NEXT_SPRINT.md — Enhance 1 CONTRACT -> build module -> STATE auto-updates

### Tags — Restore Points — No Folder Copies v3.5
- v0.2-brain-contexts — Brain Dump infra
- v0.3-contracts-80pct — 8 CONTRACTs to 80%
- v0.3.1-opp-id-split — fix O-5030460 vs 006Uj... split
- v0.4-walking-skeleton-code — bookmarklet + parse + fusion + ProjectHeader
- Retrieve: git checkout -b restore-v04 v0.4-walking-skeleton-code — 5 seconds, no hours

### RAM vs HDD Rule
- Chat = RAM — volatile — forgets after session
- GLOBAL_BRAIN.md + STATE.md + INBOX.md + CONTRACT.md + README.md = HDD — persistent — new session reads first — auto-compactor updates STATE.md
- Before coding, always: cd /Users/wolf/Developer/project_onion && cat GLOBAL_BRAIN.md STATE.md README.md docs/ideas/INBOX.md

### Next — Week 2+ Loop
- Pick 1: platform-anchor CRUD link table O-5030460 <-> many 006Uj... <-> many ProjectIDs <-> many GDPIDs <-> many SMPs + validation prompt
- Then: domain-cards-store + experience-pwa + integrations-gdp-adapter — one slice end-to-end — PII screener middleware must call before save — CI fails if not
