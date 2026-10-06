# SOURCES_CONFIG.md — v0.11 — User Config for SharePoint + GDP + Emails + Teams + Connected — Typed Conditions

## SharePoint URL Configuration — User Provides URL Instead of Keyword Search

- For hackathon: excel upload, but try sharepoint url configuration where user will have option to add RAID Log: Sharepoint url to .xlsx file — does not change fact different people use different templates but contents related to RAID logs
- Path Patterns You Provided — Library Usage Project Name:
  - Communications Collaboration Plan docx
  - Communications Customer Status Report/ MBR folder
  - Communications Value Framework pptx
  - Planning Documents Risk Log xlsx
  - Planning Documents ESC xlsm PS-v2026.4-AWProServe Agentic Development (O-5552629)_ESC.xlsm
  - Solution Documents Share point site https://allegiscloud.sharepoint.com/teams/TEK-UKDelivery/awsProjA
  - Solution Documents GDP https://gdp.allegisgroup.com/gdp/#/dashboard/project-details/7189
- File name keywords: not needed to maintain as users will provide sharepoint url
- RISK log templates: users should actually give file (.xlsx) sharepoint url as column headers would change and not defined — Template1, Template2, Template3 columns listed in RELATIONSHIP_MODEL.md — sheet names RAID, RAID Log, Log, RISK Log not structured — Row one item per row, updates as multiple lines until closed — Date filter field as Date not Week — For hackathon too complicated free text multiple templates, part classification to Prod build not hackathon, show what detected as demo

## GDP Configuration — URL + Excel Upload

- Users will give GDP url (from where we will have GDP ID), and option to upload excel for hackathon
- GDP URL: https://gdp.allegisgroup.com/gdp/#/dashboard/project-details/7189 -> parse GDP ID 7189 / 8399 / 0000002121
- GDP Excel Column Headers: Engagement Name, Account Name, GDP ID, Project ID, GDD, GDM, PrgM, EM/DL, Status Date, Current Phase, Status Indicator, Start Date, End Date, Location, Summary, Practice, Business Unit / BSV — 4 weekly updates — Delta downloadable per week — GDP ID unique for project but multiple project IDs and Opportunity IDs logic still apply
- Significance: no formula, no logic discussed, not in any columns — we do NOT invent — anti-hallucination
- Weekly Report: Delta per week

## Emails + Teams + VTTs — Project Filters to Limit Sources

- Emails: Project filters need to apply to limit number of sources like Project IDs, client email id domains, contacts mapped for internal teams, project related keywords, project id, contract or SoW number, PO number etc.
- Teams: yes VTT transcripts, chat channels with above project filters apply to identify relevant conversations — allow users to provide dedicated teams channels etc., as mostly couple teams channels to cater to relevant groups from pre-sales to delivery and closeout
- Duration: yes from Anchor start and end dates, similarly GDP dates which might change over time, Extension & Expansion new OpportunityIDs O-908078 same GDP
- Aggregate vs per query: yes start/end dates, project id, Opportunity id, keywords from project name, client name, connected url, GDP id etc., and then delta scan as we know when until what date emails scanned previously and from previous scans email subjects help additional clarity
- PII screener: not for amounts, but personal reminders like Jane Austin likes coffee, Alien_BB does not like peanuts, preferred hotel or personal interests — don't need to screen project related but personal reference excluding names/email ids — AWS services Comprehend as hackathon env is AWS
- Email Source: Outlook, Graph API only some APIs working so Outlook preferred — no sample subject pattern but [Re], [Fw] such reference should be excluded while identifying for related email threads sometimes not added or removed
- VTTs: yes video text transcripts, few teams channels, for project need combination of keywords, project ID, project name, linked client email ids etc., note user might manage multiple projects same client and stakeholders
- Keywords Teams chats: Nothing like Risk, issue or dependency but mostly project related keywords, project id, project name, opportunity id etc.
- Chatter: free text, anything posted on Opportunity record are all related to Opportunity ID O-986754, no additional filters needed, other references in data where user updates Anchor section with related opportunity ids, project ids, gap ids etc.

## Project Level Card — Contacts + User Inputs

- Project level card will already have contacts identified from user inputs (collaboration*.docx) and also from initial scan users need to mark if relevant or not — at same time users should be able to add to keep it relevant
- All scanned/refreshed, user inputs etc.
- Collapsible card at top which shows all details like project ids etc, contacts etc., all details gathered across fields

## Registration and Anchor Steps — Fields to Add — Next v0.12

- Client Master dropdown NOT editable Account Name from Connected screen
- Project Card: project_name short anchor_id, Project_ReferenceID auto generated UniqueID when multiple Project IDs, Opportunity IDs, connected_record_ids, GDP IDs
- Fields: project_ids [], opportunity_ids [], connected_record_ids [], gdp_id + gdp_url, sharepoint_urls {communications: {...}, planning_documents: {risk_log_url, esc_url}, solution_documents: {site, gdp}}, teams_channels [], contacts [] from collaboration*.docx + scan, start_date, end_date, keywords SoW/PO/Contract, client domains
- Conditions: DATE_RANGE Anchor start/end + GDP mutable, EXACT Project ID Opp ID GDP ID, CONTAINS SoW PO Contract tokens, DOMAIN client domains, TOKEN_OVERLAP project name tokens, URL_CONTAINS GDP /project-details/{id} SharePoint URLs Connected ID in URL