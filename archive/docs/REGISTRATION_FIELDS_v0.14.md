
# v0.14 — Sidebar + Breadcrumb + Central Card + Top5 + URL Parsing — Complete

## Layout adapted from Project-Onion-Final-Pastel-Ux.html
- Left sidebar 260px: Dashboard, Registration Anchor Steps active mint #D6F5E8 border-left 3px green, Clients Client Master, Projects Project Centre, SharePoint Config, Teams, Contacts, Domains, Keywords, Settings
- Breadcrumb: Home > Client Master > Project Centre > Anchor Steps — shows Acme Corp > Agentic FullMigration > PRJ-...
- Central card: Collapsable Client and Project Centre Card Which Shows All Details — contains ALL fields — not separate cards — Primary Filter, Secondary Refs, SharePoint URLs, Collaboration all in central card — collapsable
- Right sidebar 320px: Top5 Projects by freshness PRJ corner light grey italic dashed, Top5 Clients by count, Recent Anchors 5, Quick Stats persist_path store_count version, Insights URL parsing tips
- Header mint gradient linear-gradient 135deg #D6F5E8 0% -> #D6E8FF 100% sticky top badges rounded 20px pastel

## All fields in central card
Client Master dropdown PRIMARY FILTER unique NOT editable, Project Name short anchor_id dropdown existing + text field for new + Add new button multiple projects per client, Project Reference ID auto PRJ-12hex light grey italic corner not field, Project IDs 99974052 comma separated PRIMARY_UNIQUE multiple EXACT existing chips blue tint filled, Opportunity IDs O-5030460 Extension same GDP SECONDARY_REF, Connected Record URL 006Uj... 18-char regex URL_CONTAINS helper Best Open Opportunity in Connected copy URL from browser address bar when record open or right-click Copy link we extract ID helper-url Example https://.../Opportunity/006Uj00000QOBkvIAH/view, GDP ID 8399 parsed from GDP URL /project-details/{id} URL_CONTAINS, GDP URL https://gdp.allegisgroup.com/gdp/#/dashboard/project-details/7189 helper Best Open project in GDP dashboard copy URL from browser when project-details page open we extract ID helper-url, SharePoint URLs Communications Collaboration Plan docx, Risk Log xlsx, ESC xlsm, Site URL all alike same method helper Best In SharePoint open file Share > Copy link > Copy or browser address bar when file selected we clean extra ?e=... ?csf=1&web=1 params via clean_sharepoint_url urlparse, Teams Channels dedicated Pre-sales Delivery Closeout CONTAINS TOKEN_OVERLAP, Contacts email+role add more DOMAIN contact-row flex Email flex2 Role flex1 Name optional Add Contact domains extracted, Client Domains allegisgroup.com acme.com DOMAIN auto from contacts + user add, Start Date 01/02/2024 DATE_RANGE, End Date 01/09/2027, Keywords SoW PO Contract CONTAINS typed no free text auto from Project IDs Opp IDs GDP ID client name project name tokens + user adds more

## URL Parsing
clean_sharepoint_url strips ? and # via urlparse urlunparse, extract_connected_id_from_url regex 006[A-Za-z0-9]{12,15}, extract_gdp_id_from_url regex /project-details/(\d+)

## Save Anchor file or DB?
File data/seed/anchors_persist.json survives restart Data as Code load_persist save_persist

## Multiple projects per client?
Yes - Client Primary filter dropdown, Project dropdown shows existing + Add new

## Project Reference ID
Auto PRJ- + 12 hex SHA256 - light grey italic corner badge dashed #9ca3af - not text field - unique for multiple IDs

## Pastel UX final
Mint header, badges rounded 20px, cards rounded 16px shadow 0 1px 3px, pastel colors blue #D6E8FF mint #D6F5E8 yellow #FFF5D6 lavender #E8D6FF, helper grey italic #6b7280 helper-url left blue border #D6E8FF bg #f9fafb, existing chips blue, input filled #f0f7ff border #bfdbfe
