# CONTRACT.md — integrations-gdp-adapter — 80% — Weekly status spanning weeks — multi-row intelligence KEY

## Purpose
GDP Global Delivery Portal created once OpportunityID WON — same multiple OpportunityIDs might have same ProjectIDs and GDP or different — Engagement managers update project status WEEKLY

## Inputs
- gdp_id: string e.g., 8399 — from url https://gdp.allegisgroup.com/gdp/#/dashboard/project-details/<uniqueID>
- excel_exports: object — from Reports page — Engagement Data Export Active/All, Milestone Agile Sprint Report Active/All, Milestone Delivery Report Active/All, TGS IS Security Profile Report Active/All, PMO Compliance Report, All Stakeholders Data — each Excel download icon
- gdp_url: url
- anchor_id: string

## Outputs
- cards: array — Engagement Data Export columns exact names: Engagement Name, Account Name, GDP ID, Project ID, GDD, GDM, PrgM, EM/DL, Status Date, Current Phase, Status Indicator, Start Date, End Date, Location, Summary, Practice, Business Unit/BSV — plus other exports column_map adapter per export — backlog V2 for other exports, keep Engagement Data Export for Walking Skeleton
- status_summary: weekly status summary text — e.g., Project Delivery Discovery phase deliverables final stages expected shared with Jules on 21Sep allows 2 working days sign-off
- status_details: Area Schedule Green, CSAT Green, Budget Green Outcome based engagement Total SoW value £119,560
- resources: Allocation - Employment Type - TGS_EmpID - Resource_Name - Job Title - Location - Resource_StartDate - Resource_EndDate — e.g., 80% FTE Alex Nejat Cloud Engineer Mid UK 12/08/2026-21/09/2026 — PII — redact
- stakeholders: Global Delivery Director Robert Stuart Hendry, GDM Jonathan Scully, EM/DL Vamsi Krishna Yedlapalli, National Account Owner, BDM Jack Edward Wallace, OSG POA/BOA
- engagement_details_change_log: Last Updated By, Date & Time
- status_history: Week Ending Date, Status Indicator, Status Summary
- clip_id: hash(gdp_id + project_id + week_ending_date + summary_hash)

## Rules
- Full read each time file changes — HEAD check lastModified — because weekly status Summary changes and items span weeks until resolved/closed — like RAID 50% laptop example — don't create new card per row
- If GDP Excel has 2 rows same ProjectID same week different Summary — treat as timeline event same card similarity>0.85 — not new card — weekly bucket milestone Week 33: Laptop 50%->100% [Row 12 + Row 18 provenance]
- Must call pii-screener — TGS_EmpID, Resource_Name, Location redacted -> EMP-XXXX, User_A@client.com, $XXXk
- Emits GDPDiscovered event
- Backlog: Other GDP exports column maps — for Walking Skeleton only Engagement Data Export Active