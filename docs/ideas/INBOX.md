# INBOX — Project Onion — Brain Dump — Sources common for every project

## Client Master — PRIMARY KEY and PRIMARY FILTER
- Client Master Dropdown — users cannot add random values, only admin can add — this is PRIMARY KEY and PRIMARY FILTER
    - Second level: To show existing projects and need to have in-line search, if not found then Users can add new
        - This is REGISTRATION/Anchor screen with fields:
            - Project name:
            - Opportunity ID: Unique KEY REGEX
            - Connected URL: PeopleSoft Instance No API access, so Bookmarklet/screen grab of standard fields, Notes&Attachments, Chatter are key to scan
                - URL format actual from work — do not add to git: https://allegisgroup.lightning.force.com/lightning/r/Opportunity/006Uj00000QOBkvIAH/view
                - Key sections to read:
                    - Tab Details: Subtabs Prospect [Business Challenge/Customer Pain, Target Technology], Interest [Opportunity Name, #, sales org, Practice Data Modernization], Qualifying [Close Date, Total Revenue, dates, next steps, final status success/closed/on-hold/washed]
                    - Tab Chatter: chatting and key updates from initial opportunity creation to final status
                    - Fields important: Account Name, Stage, Close Date, Total Revenue Life of Deal, Opportunity Owner
                - Notes & Attachments tab: all attachments — URL format: .../CombinedAttachments/view — contains pre-sales pitch, emails, excel pricing sheets, PDFs signed Work Order, PO, SoW, editable SoW, pre-sales pitch, HLD etc. — screenshot shows PS-v2026.2a-GEAviationUK-MRODigInspectnPlatform-(O-5030460)-V6.3_ESC 966KB, GE-BIT & Digital Inspection Platform Discovery-O-5030460 v1.3_Clean PDF/DOC, multiple versions V6.3, V6.2, V6.1, V6, V5 — need dedupe by lastModified latest
            - Pre-sales input fields:
                - Teams channels URL
                - SharePoint URL
                - OneDrive URL
            - Once Opportunity marked WON, Delivery process starts where Project related structure created:
                - Project ID: Unique ID created, unique key which identifies records from Peoplesoft systems Time&Labour, expenses, each entry has Project ID reference thus we can map
                - SharePoint: https://allegiscloud.sharepoint.com/teams/TEK-UKDelivery/<uniqueID> e.g., acmespf — standard Libraries created:
                    - Budget: burndown template or financial details
                    - Communication: sub-folders/files, Service Reviews or Monthly Business Reviews similar names multiple sub-folders, Collaboration_Plan.docx official contacts client and internal, Value Framework.ppt Value driver, Messaging/Visioning, Enablement/Delivery, Realization
                    - Solution Documents: Contains SoW, PO, WO, change requests final signed copies from Connected Notes&Attachments
                    - Planning Documents: ESC excel project start/end revenue, Risk log/RAID log
                    - Note: SharePoint sites might have multiple versions depends on each project, sometimes we will use same sharepoint
                    - Project ID: Extensions/expansions will definitely have New Opportunity ID/Connected record but use same ProjectID. Sometimes multiple ProjectIDs to differentiate teams based on client requested groups, locations etc., but all linked to same Opportunity IDs if extension/expansions exists. So user need to be able to add multiple OpportunityIDs, Project IDs
                    - Free text like Excel, documents will have multiple rows or different template, but anyways we need to scan each time as users might update status/comments of closed items also from time to time or add new
                - GDP Global Delivery Portal — created once OpportunityID moved to Status=WON. Same multiple OpportunityIDs might have same ProjectIDs and GDP or different ProjectIDs but same GDP or different. This where Engagement managers or delivery manager will update project status WEEKLY basis
                    - GDP URL format: https://gdp.allegisgroup.com/gdp/#/dashboard/project-details/<uniqueID> e.g., 8399
                    - For hackathon: GDP, Expense portals needs VPN and Time&Labour portals dont have APIs. But I can download details to .xlsx, .csv so easier for now
                    - GDP excel export columns exact names: Engagement Name, Account Name, GDP ID, Project ID, GDD, GDM, PrgM, EM/DL, Status Date, Current Phase [Startup, Execution, CloseOut, Closed, On Hold], Status Indicator [Green, Yellow, Red], Start Date, End Date, Location, Summary [weekly status summary], Practice, Business Unit/BSV — () details are for awareness not part of column names
                    - Delivery Focused Teams Site: Usually Delivery manager creates Teams channel or Teams chat group to communicate/share details
                    - GDP portal also have multiple other excel exports which contains lot of valuable details — Reports page shows: Engagement Data Export Active/All, Milestone Agile Sprint Report Active/All, Milestone Delivery Report Active/All, TGS IS Security Profile Report Active/All, PMO Compliance Report, All Stakeholders Data — need to figure out to refresh if new file to update details — share more on these excel columns later — screenshot shows all with Excel download icons

## Multi-Multi Relationship — KEY — to nail at this stage
- Project Reference: Logical grouping under Client Master — e.g., "ACME Discovery" — user creates this. NOT OpportunityID or ProjectID. This is anchor.
    - Link table:
        - ProjectRef <-> OpportunityIDs: many-many — e.g., ProjectRef Acme-Discovery links to OPP-5030460 initial + OPP-5030460-Extension new Opp but same ProjectID
        - ProjectRef <-> ProjectIDs: many-many — same ProjectRef links to ProjectID 12345 UK team + 12346 Hungary team — both same Opportunity
        - ProjectRef <-> GDP IDs: many-many — GDP 8399 may link to both ProjectIDs above
        - ProjectRef <-> SharePoint SMPs: many-many — acmespf may serve both ProjectIDs
    - Rule: When we scan, if we find new OpportunityID/ProjectID/GDPID from any source, ask user: "We found OPP-8893 linked to same SharePoint acmespf — Relevant? Yes/No/Edit — add to ProjectRef?" — already in.html
    - Example from screenshots: Opportunity 006Uj00000QOBkvIAH ACME UK Bristol Robotics Digital Inspection Platform Discovery — has Notes&Attachments V6.3_ESC, V6.2, V6.1 etc — all linked to same ProjectRef — SharePoint acmespf — GDP 8399 — same client

## SharePoint Scan — handle different file names/sub-folders — pattern not path
- Don't rely on exact path /Budget/Burndown.xlsx — use:
    - Library filter: Budget, Communication, Solution Documents, Planning Documents — breadth-first depth<4 <1000 files
    - File name keyword filter: OpportunityID regex 006Uj, ProjectID, GDPID 8399, plus keywords RAID, ESC, Collaboration_Plan, Value Framework, Service Review, MBR
    - Content filter: lastModified >30d + size <50MB
    - Store link+date+author only — not content — unless user clicks Add Reference
    - Same file may exist in multiple versions V6.3_ESC, V6.2_ESC, V6.1_ESC — use lastModified latest + hash to dedupe, timeline shows V6.1 -> V6.3 evolution, not 3 cards

## GDP Refresh — weekly spanning items like RAID multi-row intelligence
- GDP refresh: Full read each time file changes — HEAD check lastModified — because weekly status Summary changes and items span weeks until resolved/closed — like 50% laptop example
- If GDP Excel has 2 rows same ProjectID same week but different Summary — treat as timeline event same card, similarity >0.85 — not new card
- Other GDP exports: Milestone Agile Sprint Report, Milestone Delivery Report, TGS IS Security Profile, PMO Compliance, All Stakeholders Data — each has different columns — need column_map adapter per export — backlog for V2, keep Engagement Data Export for Walking Skeleton

## Other Sources
- Emails: some graph urls working, key filters: client domains, internal contacts from GDP exports. SharePoint Document Collaboration_Plan.docx will have most relevant contacts of both client and internal teams related to ProjectID(s). Note: clients and internal teams would be supporting multiple opportunities OpportunityIDs, ProjectIDs, GDPIDs, start and end dates — one logic to consider as pre-sales start date would have started from Connected Details Prospect Discovery Meeting date this field value makes instead of considering standard 30 days before project start
- Scrap notes: OneNote and Excel sheets and we will ask users to fill in the urls. Users should be able to add multiple links or Sharepoint/One-Drive folders

## PII
- PII fields: email, amount Total Revenue £129,768.00 GBP, payroll TGS_EmpID 8261003, Resource_Name Alex Nejat, Location UK, Budget £119,560 Outcome based SoW value — mark as PII — screenshot shows Allocation 80% FTE, 100% PAYE etc
- Non-PII: OpportunityID 006Uj..., ProjectID, GDPID 8399, Engagement Name Acme Corp Digital Inspection Platform Discovery, Account Name Acme UK, Status Indicator Green/Yellow/Red, Current Phase Execution, Engagement Risk Yellow, Resources list
- Rule: PII screener is platform middleware — must call before any save — CI fails if module saves without calling it

## Integrations
- Graph email Teams chats channels SharePoint, Salesforce Connected, PeopleSoft, GDP, VTTs Teams or Gong meeting transcripts
- Bookmarklet for Connected: capture Details tabs Prospect/Interest/Qualifying, Chatter, Notes&Attachments list Title Created By Last Modified Size actions Download/Share/Public Link/View File Details

## UI
- Project Header mint collapsible, Key Moments last 5, Client 360, Handover Pack with card links
- Pastel tokens --pastel-blue #D6E8FF no black buttons, freshness 2d ago green >1 month red Stale, timeline weekly buckets DECISION/APPROVAL -> timeline CHASING -> provenance, fusion confidence only expanded+admin

## Data
- What is PII what is not — see above
- Column maps for GDP Excel exact names, Peoplesoft adapter config
