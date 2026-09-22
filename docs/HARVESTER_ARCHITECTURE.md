# HARVESTER_ARCHITECTURE.md — Project Continuum Data Aggregation Framework
> Version: v1.0-harvester-architecture — 2026-09-21
> Status: Official Documentation — Hackathon Technical Review Ready
> Source of Truth: `data/seed/relationship_model.json v0.11` + `docs/RELATIONSHIP_MODEL.md` + `GLOBAL_BRAIN.md v1.0-continuum-narrative`
> Scope: `modules/04-harvester` + Resilient Edge Fallbacks

This document formalizes the Harvester design patterns, ingestion boundaries, and user lifecycle scripts for **Project Continuum (Project Onion)**. Documentation-only. No application code is changed.

Active enterprise targets in this document are **only**:

- Client: **Acme Corp** (`acme.com`) — Project focus: **Apollo-123**
- Client: **NovaTech Labs** (`novatechlabs.com`) — Project focus: **NovaTech-42**

Column schemas inside `relationship_model.json` are absolute source of truth. No new fields are invented here.

---
## 1. Executive Vision
### 1.1 The Enterprise Problem
Enterprise delivery systems hold **what was decided**:

- Salesforce / Connected holds Opportunity Stage, Close Date, Total Revenue.
- GDP holds Engagement Name, GDP ID, Project ID, Status Date, Current Phase, Status Indicator, Start / End Date.
- SharePoint holds Risk Log `.xlsx`, ESC `.xlsm`, Collaboration Plan `.docx`, Service Reports / MBRs, Value Framework `.pptx`.
- Outlook / Teams hold approvals, budget deltas, meeting transcripts.

What those systems do **not** hold is **why** a decision was made and **the human context behind it**:

- Why MS3 moved 15 Nov -> 30 Nov.
- Why $120k -> $145k was approved and who approved it in which thread.
- Why a closed RAID row reopened two weeks later.
- Who was in the room (VTT attendees), what was chased vs decided, and which furlough / PO / overrun / payroll / milestone signal mattered.
### 1.2 Continuum Answer (per Concept Draft)
> **Systems hold what was decided; Continuum captures the why and the human context behind it.**
Project Continuum is the aggregation + refinery layer on top of systems of record:
1. **Collector (Dual-Track Ingestion)** — Production Core native APIs (Outlook Graph API) with typed filters only + Resilient Edge Fallbacks (SheetJS parsers + DOM bookmarklet) when APIs are blocked.
2. **Workspace (Review / Edit / Enrich)** — PWA editable form BEFORE submit. User can modify text and append files.
3. **Ask (Conversational Recall)** — NL query over Team Shared cards, scoped by Client dropdown then Anchor.
4. **Refinery (The LLM Lifting)** — Correlates Email / Teams / GDP / RAID fragments via identifier + dates (+/- 30 days) into Knowledge Cards with Model Confidence %.
5. **Vault (Private vs Shared Lifecycle)** — Fail Closed. Every new card defaults to `Team Shared` to build org intelligence. Toggle to `My Notes (Private)` triggers instant local save.
6. **Radar (Freshness Detection)** — Tracks `last_scanned_date` deltas, GDP mutable dates, stale vs refreshed.
### 1.3 Architectural Non-Negotiables
- **Failover Repository Pattern** (`modules/experience-pwa/static/index.html` mandatory): every mutation checks cloud API health first. If offline, fall back to IndexedDB / LocalStorage with `syncStatus: 'pending_upload'`.
- **Privacy Gate first**: every payload passes the client-side PII regex gate (mirroring AWS Presidio / Comprehend) BEFORE timeline / RAID agg / local or org DB memory.
- **Typed filters only, no free text**: `EXACT | CONTAINS | DOMAIN | DATE_RANGE | URL_CONTAINS | TOKEN_OVERLAP`. Free-text parsing FORBIDDEN.
- **No invented metrics**: `relationship_model.json` + anti-hallucination rules are truth. No GDP significance formula. Template1/2/3 authoritative for Risk Log. GDP Excel is Delta-per-week only.
- **Unified 9-field contract** for all edge payloads. Never invent root-level params.
---
## 2. Scope & Boundaries — The Ingestion Matrix (Dual-Track)
Continuum runs **two** ingestion mechanisms. They are not interchangeable.
### 2.1 Ingestion Matrix Summary
| Track | Applies To | Checkpoint | Read Pattern | Dedupe Key | Freshness | Token Strategy |
|-------|------------|------------|--------------|------------|-----------|----------------|
| Delta Scan (Incremental) | Outlook Mail (Graph API), Teams chats/channels, GDP Status updates | last_scanned_date per anchor+source | Pull changes only | MessageId+Thread norm, Channel+Message ID, Status Date+GDP ID | refreshed_at; Radar stale vs refreshed | Aggressive filter, channel allowlist, weekly Delta only |
| Full-Read Pass (Over-the-Top) | Excel RAID Logs, scrapbook pages, Screen Scrapes | None trusted | Read small file/page in full every run | Card ID=hash(sources+description_norm); source_rows Row12+Row18 | Freshness timestamp every run; reopened rows surface as refreshed | Accept full-read cost; hash prevents duplicates |
### 2.2 Delta Scan (Incremental) — Detail
Sources: emails, teams_chats, teams_vtt, gdp_dash, gdp_excel (Delta portion).
1. Anchor holds start/end (mutable via GDP), project_ids, opportunity_ids, gdp_id, teams_channels, contacts, keywords SoW/PO/Contract, client domains acme.com novatechlabs.com.
2. Harvester stores last_scanned_date per anchor per source (e.g. apollo-123/emails/2026-09-18).
3. Each run queries only > last_scanned_date: Outlook Graph EXACT+DOMAIN+DATE_RANGE+TOKEN_OVERLAP+CONTAINS, exclude Re/Fw duplicates but keep Thread linkage; Teams requires SoW+allowlist+IDs+domains+keywords+dates via PUT /edge CONTAINS; GDP uses URL_CONTAINS /project-details/{id} + DATE_RANGE Weekly Status Date, Delta per week only. Extension same GDP new Opp O-908078 appends to same anchor.
4. On success advance checkpoint. On offline do not advance; queue syncStatus pending_upload.
Why Delta: mail/chat volume unbounded. Delta+typed filters keep Refinery input small.
Noise: Low for GDP, High for Email/Teams/Chatter/VTT (PII screen + LLM filter before RAID agg).
### 2.3 Full-Read Pass (Over-the-Top) — Detail
Sources: sp_risk_log sheets RAID/RAID Log/Log/RISK Log, sp_comm_plan docx->contacts, sp_esc xlsm filename Opp ID, scrapbook/OneNote URLs, bookmarklet scrapes.
1. Rows can shift, targets change, closed items reopen — so small files read in full every run. No checkpoint trusted.
2. SheetJS Parser client-side zero-install maps Template1/2/3 authoritatively. Row=one item; mitigation multi-line until closed. Date field is Date not Week.
3. Hash by content: Card ID=hash(sources+description_norm). Multi-row evolution 50%->100% [Row12+Row18] collapses to one card with source_rows traceability. Similarity >0.85 same week/type = same card.
4. Every run tags updated freshness timestamp (card refreshed at) even if unchanged.
5. Bookmarklet auto-click expands collapsed tabs/Load More before DOM pass; packs strict 9-field JSON stringified to clipboard (bypass CORS). PWA Paste Harvested Data drop-zone.
Why Full-Read: Excel/DOM small but positional. Hash gives idempotency (PUT not POST; run twice same clip_id).
### 2.4 What Harvester Does NOT Do
- No direct calls to other modules; via API.yaml + events only (FileDiscovered -> Fusion).
- No raw body in Org; only link+metadata+embedding (+PII-screened snippet).
- No invented colours/metrics/fields; pastel tokens only; relationship_model.json only.
- No free-text mailbox search; typed filters only.
---
## 3. User Stories & Validation Lifecycle (5 Steps)
### Step 1 — Scope Entry: Client Master Dropdown + Project Focus
As delivery lead, I select Client Master then project focus so harvest is scoped, no cross-client leakage.
1. PWA Client Master dropdown (First Level PRIMARY FILTER, non-editable, from data/seed/clients.json, Account Name): Acme Corp / NovaTech Labs.
2. Select e.g. Acme Corp. Cards filter via client_master->project_card Account Name->client_name EXACT.
3. Pick focus: Apollo-123 (or NovaTech-42 under NovaTech Labs).
4. Anchor Hub resolves one-to-many: one Project_ReferenceID -> multiple project_ids 99974052/0000606071, opportunity_ids OPP-8891/OPP-4421, connected_record_ids, gdp_id, sharepoint_urls, teams_channels, contacts, mutable start/end, keywords furlough/PO/overrun (Acme) payroll/milestone (NovaTech).
Validation: dropdown change re-scopes timeline, Key Moments, Smart Assistant. Queries always WHERE client_name=:selected.
### Step 2 — Ingestion: Outlook Scan OR Bookmarklet Paste
As user with Client=Acme Project=Apollo-123, I harvest without full mailbox scan and without installs.
Path A Production Core (Graph Delta): background scan with last_scanned_date + typed filters; new IDs PII-screened then staged as 9-field payloads synced or pending_upload if offline.
Path B Edge Fallback (Bookmarklet/SheetJS): open live Salesforce/GDP screen, click bookmarklet (auto-click collapsed tabs/Load More, DOM extract, map to anchor fields only, PII screen, pack 9-field JSON to clipboard); paste into PWA Paste Harvested Data zone. SheetJS drag-drop RAID/Weekly Excel parsed fully client-side zero-install. Personal noise (Jane likes coffee, hotel/peanut prefs) stripped; names/emails/Project/Opp/GDP/SoW/PO kept. piiStatus Clean|Redacted_Review.
Unified 9-field contract (strict): id, projectId apollo-123|novatech-42, type Email|Excel|Scrape|Chat, title, source, timestamp Just now, content PII-screened, piiStatus, syncStatus. Never invent root params.
### Step 3 — LLM Refinery: Correlation + Confidence
As user drowning in fragments, LLM lifts evidence into one Knowledge Card.
1. Takes PII-screened fragments (Email, Teams+VTT, GDP Delta, RAID rows, Chatter on Opp).
2. Relevance via identifiers+dates +/-30-day window: same IDs/SoW/PO, DOMAIN, TOKEN_OVERLAP, chronological proximity.
3. Weekly buckets: DECISION/APPROVAL/BLOCKER/RESOLUTION/COMMITMENT->timeline; CHASING/REMINDER/FYI/DISCUSSION/QUESTION->provenance only. Frequency cluster (8 Teams/2h=1 Discussion).
4. Emits Knowledge Card + Model Confidence % (see S4).
### Step 4 — User Review Gate: Editable, Default Team Shared
As owner, I review/edit before sharing so org intelligence grows without noise.
1. PWA editable form BEFORE submit. Modify text, append files/artifacts.
2. Fail Closed default: every new card Team Shared to build org intelligence. Explicit opt-out for private.
3. Provenance travels: clickable links (Salesforce Opp URL, GDP /project-details/{id}, cleaned SharePoint URL, mailto contacts, Email/Teams/Meeting links), user, timestamp, origin. Read-learn-maintain links, no upload needed.
4. Failover on submit: cloud healthy->synced; offline->IndexedDB/LocalStorage pending_upload.
### Step 5 — Auto-Save Action: Toggle -> Instant Local Save
As user protecting context, privacy is one toggle with zero loss.
1. Flip Team Shared -> My Notes (Private).
2. Automatic save instantly to browser secure local space. No Save click needed.
3. Private scope private/{user_id}/{project_id}/; Shared scope team-shared/{client_id}/{project_id}/ searchable (Both Union) only after review+approve+audit.
4. Audit: action, justification, user, timestamp, original-vs-redacted diff, TTL.
---
## 4. Model Confidence Calculations — Building User Trust
Confidence % is algorithmic evaluation on each card: how much independent agreeing timely evidence backs it.
### 4.1 Inputs (Evidence Ledger)
Per fused card, e.g.: Email RE: PO Extension APPROVED 12 Aug J.Smith@acme.com link; Teams Channel Apollo-123 Budget link 15 chats provenance; Salesforce Quote-8891/Opp O-008891 Amount 120k->145k link; Excel RAID.xlsx Row12+Row18 link; Meeting VTT timestamp+attendees->contacts overlap. RAID agg Card ID=hash(sources+description_norm) multi-row traceability. Freshness=refreshed at.
### 4.2 Algorithm (Review-documented)
Rises with: (1) Quantity — independent fragments fused (1=Low baseline; 3+=High candidate; internal 0-1 e.g. 0.92 admin-only). (2) Diversity — distinct types (Email vs Teams vs Salesforce vs Excel vs VTT); cross-type agreement (Email approval validated via Salesforce amount + no chasing 7d -> Implied Resolved) beats N same-type messages; clustered chatter counts as one. (3) Chronological alignment — within +/-30d window and causal order (ask->approval->amount->chasing stops); out-of-window/contradictory lowers and flags Validate? amber.
Illustrative: High 85-95% = 3+ sources 2+ types aligned validated via record update no chasing (display: Model confidence High — 3 sources fused validated via Salesforce amount update and no further chasing. Sources: Email+Teams+Salesforce). Med 60-84% = 2 sources or single-type gaps. Low <60% = single fragment or high-noise-only or out-of-window; stays provenance not headline.
### 4.3 Display Rules (Trust UX)
Quick view High/Med/Low only. Full %+ledger+View Card links in expanded+admin. Weekly buckets (same Ref+week+type+significance>0.5=1 milestone) not every chat. CHASING stays provenance. Freshness with confidence: 2d green / 18d amber / >1mo red Stale. CHASING stops 7d -> Implied Resolved amber Validate? explicit rule.
### 4.4 Anti-Hallucination Guardrails
No GDP significance formula. No unmapped fields. DATA_DICTIONARY+Template1/2/3+GDP Delta only. Decision log context not invention. Every % must link ledger entries (clickable links). % with no ledger = bug.
---
## 5. Appendix — Normative References
- data/seed/relationship_model.json v0.11 absolute schema truth.
- docs/RELATIONSHIP_MODEL.md typed enum + one-to-many order (Account EXACT->RefID EXACT->project_ids EXACT->opp EXACT->gdp EXACT/URL_CONTAINS->connected URL_CONTAINS->sharepoint URL_CONTAINS->teams allowlist).
- docs/SOURCES_CONFIG.md SharePoint paths, GDP URL+Excel, Email/Teams/VTT/Chatter filters, PII scope, Re/Fw exclusion.
- GLOBAL_BRAIN.md v1.0-continuum-narrative Concept Draft (Collector/Workspace/Ask/Refinery/Vault/Radar + 9-field contract).
- docs/PROVENANCE_MODEL.md actual-links model.
- docs/PII_AWS_ARCHITECTURE.md production target; client-side regex gate is offline mirror.
- modules/04-harvester PRD/DECISIONS/API.yaml idempotency hash(url+lastModified+anchor_id), events-only, freshness+HEAD EventBridge 6h.
- modules/domain-fusion-engine/CONTRACT.md weekly bucket, noise filter, Top-5, confidence display.
- Bookmarklets on disk: modules/connected-bookmarklet/bookmarklet.js + experience-pwa/static/bookmarklet.js + integrations-connected-adapter/bookmarklet.js.
*End of HARVESTER_ARCHITECTURE.md — documentation-only; no application code changed.*
