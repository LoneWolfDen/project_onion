
# Notes Across Modules — Entire Code Base

## modules/platform-anchor/service.py

- FastAPI anchor service v0.16 — Archive with justification, sorted by creation date first_seen newest first, provenance actual links
- Endpoints:
  - GET / — version, persist_path, store_count, provenance note, mandatory Opp ID+URL, archive replaces obsolete
  - PUT /anchor/{client}/{project} — creates/updates anchor — mandatory validation Opportunity ID + Opportunity URL — URL parsing Connected ID regex ^006[A-Za-z0-9]{15}$ extracting from URL https://.../Opportunity/006Uj.../view — GDP ID regex /project-details/(\d+) extracting from URL — SharePoint cleaning ?e= ?csf=1&web=1 via clean_sharepoint_url urlparse — contacts email validation + domains extraction @domain → Client Domains — keywords auto from Project IDs Opp IDs GDP ID client project tokens + user adds — notes with provenance links actual links user source url timestamp origin — archived_items with mandatory justification — contacts status active|archived archived_justification archived_at — provenance_summary total_sources origins — persist to data/seed/anchors_persist.json load_persist save_persist
  - GET /anchors/{client} — list by client sorted by creation date first_seen newest first
  - GET /client/{client}/360 — aggregated view across projects — aggregated_contacts grouped by project_names — count desc shows with whom we connect more — support_teams playbooks How to raise laptop ticket etc. — all_projects sorted by first_seen — provenance with references from where info originated
  - GET /anchor/{client}/{project} — single anchor
  - GET /anchors — all sorted by creation date
  - DELETE /anchors/clear — clear all

- Business logic still works where applicable: URL parsing, email validation, domains, keywords auto, persist survives restart, sorted by creation, Archive with justification, provenance actual links

## modules/platform-anchor/seed_clients.py

- Seeds clients.json — Acme Corp Apollo-123 Apollo-124 + GE Aero — Connected URL https://.../Opportunity/006Uj.../view — GDP URL https://gdp.../project-details/8399 — SharePoint URLs Service review folder, Collaboration Plan, Risk Log, ESC, Site URL — Teams channels — Contacts with project_names — Notes with text "Client wants MS3 extended..." rephrased + source_url + origin + references — archived_items empty — dry-run option.

## modules/experience-pwa/static/index.html

- v0.16 artifact — Project Onion — Single Edit + Stakeholders Obsolete→Archive + Add Note + Client 360 Grouped + Mandatory Opp
- Left sidebar CLIENT dropdown Acme Corp + PROJECTS search across everything project name keywords project id opportunity id client names sorted by creation date newest first scroll max-height 60vh — helper text If project not found Register/Add new clickable — no duplicate +New button
- Central collapsable card Apollo-123 | OPP-8891 PO-12345 2 POs 5 stakeholders Last updated — Expand/Collapse — collapsed by default — 1 column view Key Moments — Last 5 + Status cards full width stacked — each expanded shows FULL PROVENANCE EXPLORABLE + STRUCTURED + MODEL CONFIDENCE inside same card
- Single Edit button top right — on Edit shows all cards with field title italic instruction example SharePoint file url (select file in SharePoint > right-click > Copy link) e.g. .../Collaboration_Plan.docx — Current value chips + Textbox to edit showing existing value — repeatable one-line boxes + empty box for new + Archive button + mandatory justification modal — moves to bottom archived grey section still stored
- Key Stakeholders few details collapsed clean — click expands to all contacts + Add new Email|Role|Name + Archive with justification — admin enable backlog
- Your Notes scrap notebook — collapsed small — on click expands latest at top rephrased cursor at top — Add update appends to same note threading — notes model with privacy Private/Team Shared, references
- Client 360 — Acme Corp — Back to Apollo-123 — Aggregated Contacts grouped by project names — shows with whom we connect more — Support Teams Playbooks — All projects under Acme Corp cards
- Add New Project form — reordered fields Client Master mandatory, Project Name single textbox, Opportunity IDs mandatory, Project IDs, Start/End Dates, GDP URL only no GDP ID, Contacts email validation, Teams Channels add more, SharePoint URLs Service review folder Collaboration Plan Risk Log ESC etc., Filter Aid Keywords, Client Domains auto — Opportunity ID + Opportunity URL mandatory validation red border
- Project Details Show All card collapsed by default — Raw JSON used by services.py — clean table + toggle Show raw JSON
- Right rail Smart Assistant Ask My Notes / Team Shared / Both — filter logic My Notes all including Private, Team Shared by client not project but carries references from where info originated, Both Union — Fuse.js across contacts notes rephrased SharePoint titles Teams — IT contact UK+India scenario — mock Claude/Copilot synthesis — priority
- Pastel UX mint #D6F5E8 -> #D6E8FF badges rounded 20px cards rounded 16px shadow helper grey italic #6b7280 helper-url left blue border #D6E8FF bg #f9fafb chip blue ref-corner light grey italic dashed #9ca3af input filled #f0f7ff border #bfdbfe

## modules/experience-pwa/service.py

- Simple http.server serving static at 0.0.0.0:8002 — http://localhost:8002/app main UI — Left sidebar Right sidebar Breadcrumb Central card Top5.

## data/seed/clients.json

- Acme Corp Apollo-123 Apollo-124 + GE Aero — connected_example 006Uj..., opportunity_example OPP-8891, project_id_example PO-12345, gdp_example 8399, service_review_url, collab_plan_url, risk_log_url with ?e=abc123&csf=1&web=1 for cleaning test, esc_url, site_url, teams_channels, contacts J.Smith etc., client_domains acme.com, sow_numbers, po_numbers, dates.

## docs/

- REGISTRATION_FIELDS_v0.16.md — Archive replaces Obsolete, search sorted by creation, provenance actual links, field order reordered, mandatory Opp ID+URL, Your Notes, Smart Assistant filter, 1 column view, Client 360 grouped, Project Details collapsed.
- BACKLOG_v0.16.md — What discussed and DONE, what's still pending, recommendations for non-tech user simple language — Archive vs Delete, justification, Add Notes learning engine, Team Shared by client, search smart sorted newest first, mandatory Opp ID+URL, provenance trust, next priority Smart Assistant, demo flow.
- PROVENANCE_MODEL.md — Actual links not uploading sources — read learn maintain source links — connected_provenance, gdp_provenance, sharepoint_provenance, contacts_provenance, notes provenance with references — where displayed — benefit for non-tech user trust + audit.
- NOTES_ACROSS_MODULES.md — This file — entire code base notes.

## Project-Onion-Relationship-Model.html

- Visual relationship model: Client (Acme Corp) -> Projects (Apollo-123, Apollo-124) -> Opportunities (OPP-8891, OPP-8892) -> Workorders/POs (PO-12345, WO-6789) -> Budget & Dates -> Key Stakeholders (Client, Internal, Support) grouped by project_names -> Contacts provenance mailto -> Teams Channels -> SharePoint URLs Service Review, Collaboration Plan, Risk Log, ESC, Site -> Filter Aid Keywords -> Client Domains -> Notes with provenance actual links -> Smart Assistant My Notes/Team Shared/Both Union by client -> Handover Pack -> Recent References -> Key Moments Last 5 -> Status/Health/Risks/Decisions cards with FULL PROVENANCE EXPLORABLE STRUCTURED MODEL CONFIDENCE — provenance summary total_sources origins — Archive with justification moves to bottom — sorted by creation date first_seen.
