# CONTRACT.md — platform-anchor — 80% — Client Master PRIMARY + Project Reference multi-multi

## Purpose
Client Master Dropdown PRIMARY KEY and PRIMARY FILTER — only admin can add — second level in-line search existing projects — users can add new Project Reference logical grouping under client

## Inputs
- client_name: string — PRIMARY FILTER — e.g., Ge Aviation Uk — from Client Master — cannot be random
- project_ref_name: string — logical grouping e.g., GE Aviation Discovery — user creates
- opportunity_ids: array string — Opportunity ID Unique KEY REGEX 006Uj00000QOBkvIAH — user can add multiple
- project_ids: array string — Unique ID from Peoplesoft — Project ID — user can add multiple — extensions same ProjectID different OpportunityID, or multiple ProjectIDs same OpportunityID for team groups locations
- gdp_ids: array string — GDP ID e.g., 8399 — user can add multiple
- sharepoint_smps: array url — https://allegiscloud.sharepoint.com/teams/TEK-UKDelivery/<uniqueID> e.g., geadinspf — user can add multiple
- connected_urls: array url — https://allegisgroup.lightning.force.com/lightning/r/Opportunity/006Uj.../view — bookmarklet capture — do not add to git
- teams_channels: array url
- onedrive_urls: array url

## Outputs
- anchor_id: string — hash(client_name + project_ref_name) — e.g., GE-Discovery
- link_table: object — {opportunity_ids:[], project_ids:[], gdp_ids:[], sharepoint_smps:[]} — many-many
- validation_prompt: When scan finds new OpportunityID/ProjectID/GDPID linked to same SharePoint — "We found OPP-8893 linked to same SharePoint geadinspf — Relevant? Yes/No/Edit — add to ProjectRef?" — already in.html

## Rules
- Project Reference is NOT OpportunityID or ProjectID — it is anchor — one ProjectRef under client for retrieval and historical references
- User must be able to Add Opportunity ID, Project ID, Sharepoint SMP, GDP etc. keep updating
- Free text like Excel, documents will have multiple rows or different template — scan each time as users might update status/comments of closed items also
- Pre-sales start date logic: Use Connected Details Prospect Discovery Meeting date instead of standard 30 days before project start