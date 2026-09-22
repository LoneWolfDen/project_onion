# RELATIONSHIP_MODEL.md — v0.11 — Reusable + Reference Ready — Data as Code — No Free Text

## Data Dictionary Source of Truth
Do NOT invent fields not in user columns. See docs/RELATIONSHIP_MODEL.md + data/seed/relationship_model.json — anti-hallucination: only fields provided in user columns.

## Client Master — First Level PRIMARY FILTER dropdown NOT editable

- Source: data/seed/clients.json — unique field Account Name from Connected screen
- Example: Acme Corp / NovaTech Labs
- Filter: EXACT Account Name -> client_name
- Client Domains: acme.com, novatechlabs.com — SECONDARY_REF — for DOMAIN condition in Emails + Teams VTTs

## Project Card / Anchor — Second Level — anchor_id short project name only

- Primary Identifiers: project_name (short anchor_id), Project_ReferenceID auto generated UniqueID to refer each project Card/Anchor when multiple Project IDs, Opportunity IDs, connected_record_ids, GDP IDs, Oppurtunit_id, project_id
- Fields:
  - client_name FOREIGN example Acme Corp
  - project_name PRIMARY_UNIQUE example Agentic FullMigration
  - project_ids PRIMARY_UNIQUE example 99974052, 0000606071
  - opportunity_ids SECONDARY_REF example O-5030460, O-5552629, O-908078 (Extension & Expansion same GDP)
  - connected_record_ids SECONDARY_REF example 006Uj00000QOBkvIAH, 007Pk00000QOA787DBC
  - gdp_id SECONDARY_REF example 8399 / 0000002121
  - sharepoint_urls[] SECONDARY_REF example Risk_Log.xlsx URL, Collaboration Plan, Service Reports, ESC, Value Framework
  - teams_channels[] SECONDARY_REF example Pre-sales, Delivery Channel URLs
  - contacts[] SECONDARY_REF from collaboration*.docx + scan — user marks relevant/not + user adds to keep relevant
  - start_date / end_date SECONDARY_REF example 01/02/2024 - 01/09/2027 — mutable — GDP dates can shift on Extension
  - keywords: SoW, PO, Contract SECONDARY_REF example SoW-2024-001, PO-88921
- Filter Keywords Typed (no free text):
  - EXACT: project_id, opportunity_id O-xxxxx, gdp_id from GDP URL /project-details/{id}, Thread normalized Re/Fw stripped
  - CONTAINS: SoW / PO / Contract, Project name tokens in subject/body, RAID Type detection column header mapping
  - DOMAIN: client_email_domains from Client Master, attendee domains in VTT
  - DATE_RANGE: Anchor start/end + GDP mutable dates + last_scanned_date delta — full scan once then delta
  - TOKEN_OVERLAP: Project name split tokens vs email/Teams/chatter
  - URL_CONTAINS: GDP /project-details/{id}, SharePoint file URLs, Connected record ID 006... in URL
- Notes: Second level anchor_id = short project name only, already filtered by client dropdown visible, holds all refs — shorter better as client already visible

## SharePoint Sources — Path Patterns You Provided

| Library | Usage | Project Name Example URL |
|---------|-------|--------------------------|
| Communications | Collaboration Plan | https://allegiscloud.sharepoint.com/:w:/r/teams/TEK-UKDelivery/awsProjA/Communications/Collaboration_Plan.docx?d=wb5665238e666421d9d2ed744e8ff878 |
| Communications | Customer Status Report/ MBR | https://allegiscloud.sharepoint.com/:f:/r/teams/TEK-UKDelivery/awsProjA/Communications/Service_Reports_MBRs |
| Communications | Value Framework | https://allegiscloud.sharepoint.com/:p:/r/teams/TEK-UKDelivery/awsProjA/Value%20Framework_...pptx |
| Planning Documents | Risk Log | https://allegiscloud.sharepoint.com/:x:/r/teams/TEK-UKDelivery/awsProjA/Planning%20Documents/Risk_Log_ProServe__AgenticDevelopment.xlsx |
| Planning Documents | Engagement Start Process (ESP)/ ESC | https://allegiscloud.sharepoint.com/:x:/r/teams/TEK-UKDelivery/awsProjA/Planning%20Documents/PS-v2026.4-AWProServe%20Agentic%20Development%20(O-5552629)_ESC.xlsm |
| Solution Documents | Share point site | https://allegiscloud.sharepoint.com/teams/TEK-UKDelivery/awsProjA |
| Solution Documents | GDP | https://gdp.allegisgroup.com/gdp/#/dashboard/project-details/7189 |

- For hackathon: excel upload, but try sharepoint url configuration where user will have option to add RAID Log: Sharepoint url to .xlsx file — does not change fact different people use different templates but contents related to RAID logs
- File name keywords: not needed to maintain as users will provide sharepoint url like above
- RISK log templates: users should actually give file (.xlsx) sharepoint url as column headers would change and not defined
  - Template1 Columns: Date Raised (row item date), RAID Type (Risk, Dependency, Inquiry, Action, Assumption, Issue), Description (Actual issue summarised), State/ Comments/Mitigation Steps (multi-date updates on particular item gets updated), Assigned To (Client name, service provider etc, free text), Status (In Progress, Open, Closed), Due date, Closed Date
  - Template2: Date Raised, RAID Type (Risk, Issue, Dependency, Action, Assumption), Description, Status/Comments/Mitigation Steps, Assigned To, Status, Due Date, Closed Date
  - Template3: Type (External/Internal), RAID Type (Risk, Issue, Dependency, Action, Assumption, Dependency), Project Management Knowledge Area (free text: Project management, Infosec, Contract, Finance), Category(Free Text: Project implementation etc.,), Description, Status/ Comments/ Mitigation Steps, Date Raised, Status, Assigned To, Priority/Impact (High, Low, Medium, Critical), Target date, Closed date, Source(free text:Project kick-off, SoW)
  - Sheet names not structured: RAID, RAID Log, Log, RISK Log etc.
- How to arrive Risk vs Dependency: column RAID Type, expect overwrite on top of above options in rare cases
- Rows: One item per row, updates as multiple lines until closed
- Date filter: no Week, field as Date
- For hackathon too complicated free text multiple templates, part classification to Prod build not hackathon build? or show what detected as its only demo

## GDP — Weekly Excel Export - Active — Delta

- Users will give GDP url (from where we will have GDP ID), and option to upload excel for hackathon
- Column Headers and 4 weekly updates you provided:
  - Engagement Name, Account Name, GDP ID, Project ID, GDD, GDM, PrgM, EM / DL, Status Date, Current Phase, Status Indicator, Start Date, End Date, Location, Summary, Practice, Business Unit / BSV
  - Example rows: Apollo-123 Acme Corp 0000002121 99974052 Bill Byron Jane Austin John Dew John smith 09/19/2026 Startup Green 01/02/2024 01/09/2027 Remote Project is BAU...
  - Significance: no formula, not in any columns — we do NOT invent significance — anti-hallucination
  - Weekly Report: Delta, can be downloaded per week so Delta
  - GDP ID 8399 unique for project but logic of multiple project IDs and Opportunity IDs still apply — same GDP can have new Opp IDs O-908078 on Extension & Expansion
- Filter: Weekly Delta by Status Date — DATE_RANGE condition

## Emails — Outlook — Filtered Around Duration — Aggregate Not Per Query

- Project filters need to apply to limit sources like Project IDs, client email id domains, contacts mapped for internal teams, project related keywords, project id, contract or SoW number, PO number etc.
- Duration: yes from Anchor start and end dates, similarly GDP dates which might change over time, Extension & Expansion new OpportunityIDs O-908078 same GDP
- Aggregate vs per query: yes start/end dates, project id, Opportunity id, keywords from project name, client name, connected url, GDP id etc., and then delta scan as we know until what date emails scanned previously and from previous scans email subjects help additional clarity
- PII screener: not for amounts, but personal reminders like Jane Austin likes coffee, Alien_BB does not like peanuts, preferred hotel or personal interests — don't need to screen project related but personal reference excluding names/email ids — AWS services Comprehend etc. as hackathon env is AWS
- Email Source: Outlook, Graph API only some APIs working so Outlook preferred — no sample subject pattern but [Re], [Fw] should be excluded while identifying related email threads sometimes not added or removed
- Primary Identifiers: MessageId + Thread normalized Re/Fw stripped
- Filter Keywords: EXACT Re/Fw stripped for thread grouping, CONTAINS Project ID tokens + Opportunity ID O-xxxx + Project name tokens, DOMAIN Client domain From/To domains + contacts on Project details window collapsable card at top which shows all details like project ids etc, DATE_RANGE last_scanned_date delta scan checkpoint

## Teams — Chats / Channels + VTTs Transcripts — Filtered Around Duration

- Yes VTT transcripts, chat channels with project filters apply to identify relevant conversations — allow users to provide dedicated teams channels etc., as mostly couple teams channels to cater to relevant groups from pre-sales to delivery and closeout
- VTTs video text transcripts, few teams channels, for project need combination of keywords, project ID, project name, linked client email ids etc., sometime user might manage multiple projects with same client and stakeholders
- Keywords Teams chats: Nothing like Risk, issue or dependency but mostly project related keywords, project id, project name, opportunity id etc.
- Primary Identifiers: Channel ID + Message ID, Meeting ID + VTT timestamp
- Filter Keywords: EXACT Channel allowlist user config, TOKEN_OVERLAP Project tokens in message, DOMAIN Attendee email domain match meeting participants, CONTAINS Project ID / Opp ID spoken in transcript

## Connected URL > Chatter — Opportunity Record

- Free text — anything posted on Opportunity record are all related to that Opportunity ID O-986754, no additional filters needed — other references in data where user updates Anchor section with related opportunity ids, project ids, gap ids etc.
- Primary Identifiers: Opportunity ID O-986754 + Chatter ID
- Filter Keywords: EXACT Opportunity ID record context no extra filter needed, CONTAINS Related IDs extraction from Anchor section free text parsing

## RAID Aggregated Cards — 5 Sources → Single

- Aggregated from 5 sources: SP Risk Log + GDP + Emails + Teams + Connected
- LLM assessed, not static format — multiple cards if multiple line items — don't make complicated aggregate like laptop example — present different cards
- Sources linked multi-row hash — which rows contributed — traceability
- Noise filter flag: Low for GDP/SP event driven user know what adding/updating, High for Email/Teams/Chatter meeting transcripts
- Freshness = card refreshed at — aggregated level timestamp — show when card is updated which is when card refreshed — don't worry if RAID log is update or not, scan and gather parse all updates available at time of scan and update freshener indicator
- Primary Identifiers: Card ID = hash(sources + description_norm)
- Filter Keywords: EXACT Source lineage traceability, EXACT Dedup hash description normalized

## Reusable Config Pattern — No Free Text — Typed Enum

```
primary_identifiers: [Account Name, project_name, project_id, GDP ID from URL path, Opportunity ID O-xxxxx]
secondary_identifiers: [connected_record_ids, sharepoint_urls, teams_channels, contacts[]]
filter_keywords_typed:
  EXACT: [Account Name, Project ID, Opportunity ID, GDP ID, Thread normalized]
  CONTAINS: [Project name tokens in subject/body, SoW/PO/Contract numbers, RAID Type detection]
  DOMAIN: [client email domains from Client Master, attendee domains in VTT]
  DATE_RANGE: [Anchor start/end, GDP mutable dates, last_scanned_date delta]
  TOKEN_OVERLAP: [Project name split tokens vs email/Teams/chatter]
  URL_CONTAINS: [GDP /project-details/{id}, SharePoint file URLs, Connected record ID in URL]
conditions_no_free_text: Use typed enum, not free text. Each edge has condition + field + description.
```

## Anti-Hallucination Rules

- DATA_DICTIONARY is source of truth — only fields provided by user in columns — Template1/2/3 columns authoritative for SP Risk Log — GDP columns Engagement Name, Account Name, GDP ID, Project ID, GDD, GDM, PrgM, EM/DL, Status Date, Current Phase, Status Indicator, Start Date, End Date, Location, Summary, Practice, BU/BSV — no significance formula
- Do NOT invent GDP significance formula — user said no formula — no logic we discussed — not in any columns
- Keep decision log in docs/DECISION_LOG.md
- Keep GLOBAL_BRAIN.md for context, not field invention
- Weekly Report Delta downloadable per week

## Next Steps — Registration and Anchor Steps — Fields to Add

Probable next steps is build registration and anchor steps, so you can see what all fields need to be added which gives clarity — Project level card will already have contacts identified from user inputs (collaboration*.docx) and also from initial scan users need to mark if relevant or not, at same time users should be able to add to keep it relevant — all these scanned/refreshed, user inputs etc.

Registration fields:
- Client Master: Account Name dropdown NOT editable from data/seed/clients.json — unique — from Connected screen Field name Account Name
- Project Card Anchor: project_name (user input after selecting client, anchor_id shorter just project name, auto generated Project_ReferenceID UniqueID to refer each project when multiple Project IDs, Opportunity IDs, connected_record_ids, GDP IDs), project_ids [], opportunity_ids [], connected_record_ids [], gdp_id + gdp_url, sharepoint_urls {communications: Collaboration Plan docx, Service Reports MBR folder, Value Framework pptx, planning_documents: Risk Log xlsx url, ESC xlsm url, solution_documents: site url}, teams_channels [] dedicated channels, contacts [] from collaboration*.docx + scan + user marked relevant/not + user adds, start_date, end_date, keywords SoW/PO/Contract, client email domains, project name tokens
- Sources Config: SharePoint URL config where user will have option to add RAID Log Sharepoint url to .xlsx file + GDP url + excel upload for hackathon + Teams channels config + contacts