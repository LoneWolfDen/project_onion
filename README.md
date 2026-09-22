
# Project Onion v0.16 — Archive with justification + Provenance actual links + Client 360 grouped + Sorted by creation

## Quick Start
- Backend :8000 anchor service with provenance actual links, Archive with mandatory justification, sorted by creation date first_seen newest first, mandatory Opp ID + Opp URL, aggregated contacts grouped by project_names
- Frontend :8002/app main UI — Left sidebar projects sorted by creation + search across project name keywords project id opportunity id client names + If project not found Register/Add new — Central collapsable card Apollo-123 — single Edit with repeatable one-line boxes + empty + Archive — Key Stakeholders few details collapsed expand shows all + Add new Email|Role|Name + Archive justification — Your Notes scrap notebook expand latest at top rephrased — Client 360 grouped contacts by project — Smart Assistant My Notes/Team Shared/Both Union by client — Key Moments 1 column view — Project Details collapsed by default

## Provenance actual links
As we are not uploading sources from users for hackathon instead read learn, and then maintain source links like user, source url.
All provenance references are actual links: user, source url, timestamp, origin — connected_provenance, gdp_provenance, sharepoint_provenance, contacts_provenance, notes provenance with references.

## Archive replaces Obsolete
All screens say Archive not Obsolete — Archive button next to each piece — mandatory justification before marking — moves to bottom archived grey still stored — admin enable backlog.

## Commands — see docs/BACKLOG_v0.16.md for full git flow


## v0.17.1 — Edit overlay fix + restored old collar + ALL Clients + breadcrumb fix

- **Edit card fix per screenshot Apollo-124:** Before Done Editing button floating in middle next to Collapse + Save Edit at bottom confusing — edit fields somewhere in middle — After fix edit card overlay right after project name — header Apollo-124 | OPP-8892 | 1 POs | 3 stakeholders | Last updated — [Edit] small red right after project name — click Edit → overlay appears right after project name header absolute top 60px full width central card rounded 16px shadow-xl border white z-10 max-h 80vh overflow-y-auto — overlay header Edit Project — Apollo-124 — X close top right — body field title italic instruction SharePoint file url (select file in SharePoint > right-click > Copy link) e.g. .../Collaboration_Plan.docx Current value chips Textbox showing existing value repeatable one-line boxes + empty box for new + [+ Add] each row Archive with mandatory justification modal moves to bottom grey Archived still stored — footer Save Edit primary blue + Cancel grey at bottom clear — Done Editing removed — no confusion — collapsed line PRJ ID PRJ-f6e5d4c3b2a1 • Created • GDP • Extracted ID • Domains auto from contacts stays below header when not editing as in screenshot

- **Old collar restored:** Mint header gradient #D6F5E8 -> #D6E8FF badges rounded 20px pastel blue #D6E8FF mint yellow #FFF5D6 lavender #E8D6FF helper grey italic #6b7280 input filled #f0f7ff border #bfdbfe — v0.17 artifact changed too much UI — restored to v0.16.1 pastel

- **ALL Clients kept:** Dropdown ALL Clients / Acme Corp / Acme Corp — amazing addition — when ALL selected shows all projects across clients sorted by creation newest first aggregated Key Moments

- **Breadcrumb fix:** Changing client in dropdown Acme / GE / ALL now changes top breadcrumb — was lost code — fixed with useEffect on selectedClient → Acme Corp / Apollo-123, Acme Corp / Acme Corp DIP Discovery, ALL Clients / All Projects — clickable Acme Corp → Client 360, project → project view — highlight active

- **Add new text fields brought back:** Repeatable one-line boxes + empty box always visible + [+ Add URL/Channel] for Opportunity IDs, Project IDs, Teams Channels, all SharePoint artefacts Service Review Collab Plan Risk Log ESC Site with Archive + ? tooltip + mandatory justification modal moves to bottom grey archived still stored — both Edit and Add New — Add New has no Archive only empty + Add as requested — no pre-filled 99974052 O-5030460 — empty placeholders e.g. PO-12345

- **Test data per project included:** data/seed/key_moments_test_data.json 3-4K — Apollo-123 5 moments 4 status 2 notes, Apollo-124 5 moments 3 status 2 notes, Acme Corp 3 moments 2 status 2 notes — selecting left rail project updates central Key Moments Last 5 Status cards Your Notes and breadcrumb — fixes observation Key moments Status cards Your Notes not getting updated based on selected project was lack of test data — file sizes 205K vs 224K difference explained — 205K smaller because removed pre-filled values and Archive in New mode correct — v0.17.1 restored ~230K+ larger due to Vector DB + Merge + test data per project

- **v0.17 features kept:** Vector DB mock TF-IDF Smart Assistant typing IT finds UK+India IT contacts with provenance actual links typing MS3 finds notes, Merge duplicate purple banner Similar to #c4 [Merge] modal side-by-side editable → merged card old two archived auto justification Merged into #c8, Admin enable archived Enable button in bottom grey Archived section modal admin justification mandatory moves back to active top, Excel Weekly yellow card Grouped by Project ID filtered where Client=Acme Auto-links to Status & Health cards Upload new weekly file via Add Reference, Full provenance clickable SSO every line actual clickable link mailto Teams Salesforce SharePoint cleaned new tab icon, Your Notes real Copilot rephrase merging, Handover Pack Export PDF, PII redacted share banner

- **Service.py fixed /app 404:** PWAHandler maps / and /app and /app/ to index.html — fixes Error 404 File not found on http://localhost:8002/app — logs index.html exists True size ~230K+ — old FastAPI version had route for /app 200 OK http.server needs explicit mapping



## v0.18.0 clean — Full 3-day audit restore
- Fix: Project overview existing fields and key moments status cards were all into one expand/collapse — now separate — Project overview collapse, Key Moments each card Expand FULL PROVENANCE, Status cards each Expand provenance — restore
- Fix: no more expand on Status cards — restore Expand provenance link
- Fix: Client 360 not shown except mint bar Client: Acme Corp 360 disappearing — now stable page Acme Corp [← Back] Aggregated Contacts grouped by project_names Support Teams Playbooks All projects under client — not disappearing
- Fix: Edit option missing — restore red pill Edit right after Apollo-123 | OPP-8891 ... — overlay right after project name top 60px full width rounded 16px shadow-xl — Save Edit blue + Cancel grey at bottom clear — Done removed — style from Screenshot_2026-09-21_at_02.53.28.png
- Fix: Expand project looking clean single line PRJ ID PRJ-A1B2C3D4E5F6 • Created • GDP • Extracted ID • Domains auto — not duplicated twice
- Fix: collars worked up — restore pastel simple exact from image_a0eec4.png Header mint gradient #D6F5E8->#D6E8FF badges rounded 20px pastel blue #D6E8FF mint #D6F5E8 yellow #FFF5D6 lavender #E8D6FF helper grey italic #6b7280 11px input filled #f0f7ff border #bfdbfe simple not noisy — removed purple Vector DB Duplicate check and red PII banner from central — keep simple pastel
- Keep: ALL Clients amazing addition, breadcrumb fix changing client Acme/GE/ALL updates top breadcrumb, Add new repeatable fields + empty + Add URL, test data per project dynamic, Vector DB mock, Merge duplicate, Admin enable, Excel Weekly yellow, Full provenance clickable SSO, Your Notes rephrase, Handover Pack Export, PII redacted — but UI simple not worked up
- Layout stable — only fixing related components — not rebuilding whole layout — context handling: keep Project-Onion-Final-Pastel-Ux-Reference.html + Relationship Model + BACKLOG as source of truth, tag after each version, use feature branches, don't overwrite index.html without backup
