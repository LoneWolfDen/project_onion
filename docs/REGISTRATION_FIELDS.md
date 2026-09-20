# REGISTRATION_FIELDS.md — v0.12 — Registration and Anchor Steps — Fields to Add Which Gives Clarity

## Client Master — First Level PRIMARY FILTER dropdown NOT editable

- Field: client_name — Account Name from Connected screen Field name Account Name — unique — from data/seed/clients.json — PRIMARY_UNIQUE — EXACT condition — from Connected: Account Name — editable false — example Client A / GE Aero — First Level PRIMARY FILTER dropdown from data/seed/clients.json NOT editable unique

## Project Card / Anchor — Second Level — anchor_id shorter better — just project name — Project_ReferenceID auto generated UniqueID

- project_name: PRIMARY_UNIQUE — EXACT — example Agentic FullMigration — Second Level user provides after selecting client — anchor_id shorter just project name — not repeating client name as filtered visible — required True — anchor_id = slugify(project_name) short just project name
- Project_ReferenceID: PRIMARY_UNIQUE — EXACT — example PRJ-A1B2C3D4E5F6 auto generated when user adds new project under Account Name — UniqueID to refer each project when multiple Project IDs Opportunity IDs connected_record_ids GDP IDs — PRJ- + 12 hex — auto generated — required False auto_generated True — helps uniquely identify project in scenarios where Project Card/Anchor will have multiple Project IDs, Opportunity IDs, connected_record_ids, GDP IDs — systems Auto generated when user adds new project under Account Name
- project_ids: PRIMARY_UNIQUE — EXACT — example 99974052, 0000606071 multiple — multiple True — 99974052, 0000606071 — PRIMARY_UNIQUE multiple EXACT
- opportunity_numbers: SECONDARY_REF — EXACT — example O-5030460, O-5552629, O-908078 Extension & Expansion same GDP — multiple True — O-5030460 business # from file PS-v2026.2a-GE-Aero-(O-5030460)-V6.3_ESC + O-5552629 from PS-v2026.4-AWProServe Agentic Development (O-5552629)_ESC.xlsm + O-908078 new Opp same GDP on Extension — multi-multi preserved
- connected_record_ids: SECONDARY_REF — URL_CONTAINS — example 006Uj00000QOBkvIAH, 007Pk00000QOA787DBC — 18-char regex ^006[A-Za-z0-9]{15}$ — 006 + 15 = 18 — multiple True — from /Opportunity/006Uj.../view URL — bookmarklet captures current page O-5030460 + 006Uj... per-record individual for every early record
- gdp_id: SECONDARY_REF — URL_CONTAINS — example 8399 / 0000002121 — parsed from GDP URL /project-details/{id} — unique for project but multiple Project IDs Opp IDs logic still apply — same GDP can have new Opp IDs O-908078 on Extension & Expansion
- gdp_url: PRIMARY_UNIQUE — URL_CONTAINS — example https://gdp.allegisgroup.com/gdp/#/dashboard/project-details/7189 — user gives GDP URL -> parse GDP ID — from Solution Documents GDP table — required False
- sharepoint_urls: SECONDARY_REF — URL_CONTAINS — example {communications: [Collaboration_Plan.docx URL https://allegiscloud.sharepoint.com/:w:/r/teams/TEK-UKDelivery/awsProjA/Communications/Collaboration_Plan.docx, Service_Reports_MBRs folder URL https://allegiscloud.sharepoint.com/:f:/r/teams/TEK-UKDelivery/awsProjA/Communications/Service_Reports_MBRs, Value Framework pptx URL], planning_documents: [Risk_Log.xlsx URL https://allegiscloud.sharepoint.com/:x:/r/teams/TEK-UKDelivery/awsProjA/Planning%20Documents/Risk_Log_ProServe__AgenticDevelopment.xlsx, ESC xlsm URL https://allegiscloud.sharepoint.com/:x:/r/teams/TEK-UKDelivery/awsProjA/Planning%20Documents/PS-v2026.4-AWProServe%20Agentic%20Development%20(O-5552629)_ESC.xlsm], solution_documents: [site URL https://allegiscloud.sharepoint.com/teams/TEK-UKDelivery/awsProjA, gdp URL]} — user configures SP URLs in Project Card instead of keyword search — for hackathon excel upload but try sharepoint url configuration where user will have option to add RAID Log Sharepoint url to .xlsx file — does not change fact different people use different templates but contents related to RAID logs — file name keywords not needed to maintain as users will provide sharepoint url — multiple True
- teams_channels: SECONDARY_REF — TOKEN_OVERLAP — example Pre-sales, Delivery, Closeout — dedicated channels user provides — couple channels to cater to relevant groups from pre-sales to delivery and closeout — teams_channels[] + SoW number + project_id + client domains + project tokens — filter Teams by SoW number and channel allowlist — multiple True
- contacts: SECONDARY_REF — DOMAIN — example from collaboration*.docx + scan — contacts identified from user inputs (collaboration*.docx) and also from initial scan users need to mark if relevant or not — at same time users should be able to add to keep it relevant — collapsable card at top which shows all details like project ids etc, contacts etc., all details gathered across fields — contacts[] (parsed) Client + Internal from docx — from sp_comm_plan to project_card feeds contacts — multiple True
- start_date / end_date: SECONDARY_REF — DATE_RANGE — example 01/02/2024 - 01/09/2027 — mutable Extension & Expansion new Opp O-908078 same GDP — dates change over time — Anchor start and end dates + GDP mutable — Extension & Expansion new OpportunityIDs O-908078 but same GDP — required False
- keywords SoW PO Contract: SECONDARY_REF — CONTAINS — example SoW-2024-001, PO-88921, Contract numbers — Anchor free but typed — filter_keywords_typed — no free text — multiple True — SoW / PO / Contract numbers — Anchor free but typed
- client_domains: SECONDARY_REF — DOMAIN — example allegisgroup.com, ge.com — from Client Master Client Domains — DOMAIN condition — From/To domains + contacts on Project details window collapsable card at top — multiple True

## Filter Conditions No Free Text — Typed Enum — Reusable

- EXACT: Account Name, Project ID, Opportunity ID, GDP ID, Thread normalized Re/Fw stripped for thread grouping
- CONTAINS: Project name tokens in subject/body, SoW/PO/Contract numbers, RAID Type detection column header mapping not free text
- DOMAIN: client email domains from Client Master, attendee domains in VTT
- DATE_RANGE: Anchor start/end, GDP mutable dates, last_scanned_date delta full scan once then delta
- TOKEN_OVERLAP: Project name split tokens vs email/Teams/chatter
- URL_CONTAINS: GDP /project-details/{id}, SharePoint file URLs, Connected record ID in URL

- Conditions_no_free_text: Use typed enum, not free text. Each edge has condition + field + description — from data/seed/relationship_model.json v0.11 Data as Code

## Path Patterns — Library Usage Project Name — From User

| Library | Usage | Project Name Example URL |
|---------|-------|--------------------------|
| Communications | Collaboration Plan | https://allegiscloud.sharepoint.com/:w:/r/teams/TEK-UKDelivery/awsProjA/Communications/Collaboration_Plan.docx |
| Communications | Customer Status Report/ MBR | https://allegiscloud.sharepoint.com/:f:/r/teams/TEK-UKDelivery/awsProjA/Communications/Service_Reports_MBRs |
| Communications | Value Framework | https://allegiscloud.sharepoint.com/:p:/r/teams/TEK-UKDelivery/awsProjA/Value%20Framework_...pptx |
| Planning Documents | Risk Log | https://allegiscloud.sharepoint.com/:x:/r/teams/TEK-UKDelivery/awsProjA/Planning%20Documents/Risk_Log_ProServe__AgenticDevelopment.xlsx |
| Planning Documents | ESC | https://allegiscloud.sharepoint.com/:x:/r/teams/TEK-UKDelivery/awsProjA/Planning%20Documents/PS-v2026.4-AWProServe%20Agentic%20Development%20(O-5552629)_ESC.xlsm |
| Solution Documents | Share point site | https://allegiscloud.sharepoint.com/teams/TEK-UKDelivery/awsProjA |
| Solution Documents | GDP | https://gdp.allegisgroup.com/gdp/#/dashboard/project-details/7189 |

## RAID Log Templates — 3 Templates Varying — Hackathon Accept Excel Upload OR SharePoint URL Config

- Template1 Columns: Date Raised (row item date), RAID Type (Risk, Dependency, Inquiry, Action, Assumption, Issue), Description (Actual issue summarised), State/ Comments/Mitigation Steps (multi-date updates on particular item gets updated), Assigned To (Client name, service provider etc, free text), Status (In Progress, Open, Closed), Due date, Closed Date
- Template2: Date Raised, RAID Type (Risk, Issue, Dependency, Action, Assumption), Description, Status/Comments/Mitigation Steps, Assigned To, Status, Due Date, Closed Date
- Template3: Type (External/Internal), RAID Type (Risk, Issue, Dependency, Action, Assumption, Dependency), Project Management Knowledge Area (free text), Category(Free Text), Description, Status/ Comments/ Mitigation Steps, Date Raised, Status, Assigned To, Priority/Impact (High, Low, Medium, Critical), Target date, Closed date, Source(free text)
- Sheet names not structured: RAID, RAID Log, Log, RISK Log etc.
- How to arrive Risk vs Dependency: column RAID Type, expect overwrite on top of above options in rare cases
- Rows: One item per row, updates as multiple lines until closed
- Date filter: no Week, field as Date
- For hackathon too complicated free text multiple templates, part classification to Prod build not hackathon build? or show what detected as its only a demo for now

## GDP Weekly Excel — Columns You Provided — No Significance Formula — Delta Per Week

- Engagement Name, Account Name, GDP ID, Project ID, GDD, GDM, PrgM, EM/DL, Status Date, Current Phase, Status Indicator, Start Date, End Date, Location, Summary, Practice, Business Unit / BSV
- Significance: no formula, not in any columns — we do NOT invent — anti-hallucination
- Weekly Report: Delta, can be downloaded per week so Delta
- GDP ID 8399 unique for project but logic of multiple project IDs and Opportunity IDs still apply

## Emails + Teams + VTTs — Project Filters to Limit Sources

- Emails: Project filters need to apply to limit number of sources like Project IDs, client email id domains, contacts mapped for internal teams, project related keywords, project id, contract or SoW number, PO number etc.
- Teams: VTT transcripts, chat channels with project filters apply to identify relevant conversations — allow users to provide dedicated teams channels etc.
- Duration: from Anchor start and end dates + GDP mutable dates — Extension & Expansion new OpportunityIDs O-908078 same GDP
- Aggregate vs per query: start/end dates, project id, Opportunity id, keywords from project name, client name, connected url, GDP id etc., then delta scan as we know until what date emails scanned previously and email subjects help additional clarity
- PII screener: not for amounts, but personal reminders like Jane Austin likes coffee, Alien_BB does not like peanuts, preferred hotel or personal interests — AWS services Comprehend as hackathon env is AWS
- Email Source: Outlook Graph API only some APIs working so Outlook preferred — no sample subject pattern but [Re], [Fw] should be excluded
- VTTs: video text transcripts, few teams channels, combination keywords, project ID, project name, linked client email ids, user might manage multiple projects same client stakeholders
- Keywords Teams chats: Nothing like Risk, issue or dependency but mostly project related keywords, project id, project name, opportunity id etc.
- Chatter: free text, anything posted on Opportunity record are all related to that Opportunity ID O-986754, no additional filters needed, other references where user updates Anchor section with related opportunity ids, project ids, gap ids etc.

## RAID Aggregation — 5 Sources Into Single — LLM Assessed Not Static Format

- RAID should aggregate from all 5 sources into single — do not want to prescribe static format — expect LLM to assess contents — if multiple line items then present different cards — not complicated aggregate like laptop example
- Multi-row hash — all sources will be linked which are used to extract card data — sources linked multi-row hash — traceability
- Significant noise filter — noise from GDP, Sharepoint very less as event driven user know what adding/updating — noise need to be primarily on emails/chatter/teams chats channels meeting transcripts etc.
- Freshness — aggregated card level — showing when card is updated which intern when card is refreshed — don't worry if RAID log is update or not — scan and gather and parse all updates available at time of scan and update card freshener indicator
- Noise filter flag low for GDP/SP high for Email/Teams/Chatter
- Project level card will already have contacts identified from user inputs (collaboration*.docx) and also from initial scan users need to mark if relevant or not — at same time users should be able to add to keep it relevant — all scanned/refreshed, user inputs etc.

## Relationships + Naming — Shorter Better

- Anchor ID slug: shorter better as we don't need to repeat Client name every time as its already filtered and select client already visible — so <project name> should be suffice and user will anyway provide this so no need to tag client name every time as user will add/update project only after selecting client name from dropdown — slugify(project_name) short just project name
- Client Master: ideally taken from Connected screen Field name Account Name — unique — from data/seed/clients.json — dropdown NOT editable
- Other fields at Project level so Project ID already there + Mapping of sharepoint and GDP — user will already add these urls to project card — Emails primary filter is contact listed under project and client domains and project start and end dates — similarly teams chats similar need to rely on project keywords
- Multi-Multi: Project card will already have all these added, and subject will normally have these references like opportunity id, project id, project name may not be all words in project name but usually words in project name align with project id, opportunity id will be referred

## Collapsable Card at Top Which Shows All Details

- PWA header collapsable card at top which shows all details like project ids etc, contacts etc., all details gathered across fields — Project_ReferenceID + anchor steps — shows Project_ReferenceID auto generated UniqueID, project_ids, opportunity_numbers, connected_record_ids, gdp_id, gdp_url, sharepoint_urls communications MBR Value Framework planning Risk Log ESC solution site GDP URL, teams_channels dedicated Pre-sales Delivery Closeout, contacts from collaboration*.docx + scan user marks relevant/not + user adds, start_date end_date mutable Extension new Opp same GDP, keywords SoW PO Contract, client_domains, filter_conditions typed enum

## Best Way to Commit Once Refined

- Data as Code not DVC — data/seed/relationship_model.json + docs/RELATIONSHIP_MODEL.md + docs/SOURCES_CONFIG.md + docs/REGISTRATION_FIELDS.md versioned with tag v0.12-registration-anchor — not DVC — diffable — reusable reference ready
- Tags are HDD memory — no folder copies — versioned
- Anti-hallucination: DATA_DICTIONARY is source of truth — only fields provided by user in columns — no significance formula — Weekly Report Delta