
# v0.16 — Archive with justification + Sorted by creation + Provenance actual links + Client 360 grouped

## Archive replaces Obsolete
All screens now say Archive not Obsolete. Archive button next to each piece of information (Connected URL, Teams channel, Contact, SharePoint URL, Project ID, Opp ID).
On Archive click: mandatory justification textarea required — "Justification required — why archive?" — cannot save empty. Backend stores archived_justification, archived_at, archived_by, status archived. Frontend moves to bottom grey section "Archived (3) — still stored" strikethrough chip with tooltip justification. Admin can enable again if needed — backlog.

## Project search left sidebar sorted by creation date
Search across project name, keywords, project id, opportunity id, client names — fuse.js fuzzy — sorted by creation date first_seen newest first — date by which new project added to Project Onion. Scroll max-height 60vh shows all projects under client. Typeahead highlights matched field.

## Provenance actual links
As we are not uploading sources from users for hackathon instead read learn, and then maintain source links like user, source url.
All provenance references are actual links:
- connected_provenance: source_url, extracted_id, origin Salesforce Opportunity, user, timestamp, link (actual URL)
- gdp_provenance: source_url, extracted_id, origin GDP Dashboard, user, timestamp, link
- sharepoint_provenance: source_url, cleaned_url, origin SharePoint {k}, user, timestamp, link
- contacts_provenance: source_url mailto, origin Collaboration Plan / Graph, user, timestamp, link
- notes: source_url, origin Manual Note / Email / Teams / SharePoint, user, timestamp, link, references array
- provenance_summary: total_sources, origins [Salesforce, Email, Teams, SharePoint, Manual]

## Field order reordered
1. Client Master mandatory
2. Project Name single textbox placeholder Apollo-123 — PRJ only shown as pack at top next to Collapse after save — remove note multiple possible
3. Opportunity IDs mandatory
4. Project IDs
5. Project Start and End Dates
6. GDP URL only — no GDP ID textbox — helper GDP dashboard > project-details > Copy link e.g. .../project-details/7189 — backend extracts ID
7. Contacts email validation type=email — add more Email|Role|Name — repeatable one-line boxes + empty + Archive
8. URLs Teams Channels add more than one repeatable
9. SharePoint URLs per artefact Service review folder, Collaboration Plan, Risk Log, ESC, Site URL — helper SharePoint file url (select file in SharePoint > right-click > Copy link) — cleaning ?e= ?csf=1 via clean_sharepoint_url
10. Filter Aid Keywords rename from Keywords — auto from existing + add more
11. Other fields Client Domains auto from contacts

## Mandatory Opportunity ID + Opportunity URL on Add New Project
Validation red border if missing — cannot save.

## Your Notes — portal learning
Atomic note card Original + Rephrased by Copilot + Threaded updates append only. Add Note expands on click latest at top rephrased cursor at top. Add update appends to same note. Notes model with privacy Private/Team Shared, references.

## Smart Assistant priority — filter logic
My Notes: all sources including Private + Team Shared of current user.
Team Shared: team share by all users for the client (not project) but carry references from where info originated — excludes Private.
Both = Union. For hackathon Fuse.js across contacts, notes rephrased, SharePoint titles, Teams messages — IT contact UK+India scenario — mock Claude/Copilot synthesis — future vector DB.

## 1 column view Key Moments
Key Moments — Last 5 full width + status cards full width stacked — each expanded shows FULL PROVENANCE EXPLORABLE + STRUCTURED + MODEL CONFIDENCE inside same card.

## Client 360 grouped contacts
Aggregated Contacts grouped by project names — shows with whom we connect more — e.g. J.Smith@acme.com — Approver — Apollo-123, Apollo-124 (2 projects) — Primary — sorted by count desc. Support Teams Playbooks located here.

## Project Details collapsed by default
Raw JSON used by services.py fine — collapsed by default — clean table view + toggle Show raw JSON for API use — not monospaced.

## Business logic still works
Connected Record URL regex ^006[A-Za-z0-9]{15}$ extract ID from URL https://.../Opportunity/006Uj.../view — GDP URL /project-details/{id} — SharePoint cleaning ?e= ?csf=1&web=1 — email validation — domains extraction — keywords auto — persist to data/seed/anchors_persist.json load_persist save_persist — sorted by creation date first_seen newest first.

## Pastel UX final
Mint header #D6F5E8 -> #D6E8FF, badges rounded 20px, cards rounded 16px shadow, helper grey italic #6b7280, helper-url left blue border #D6E8FF bg #f9fafb, chip blue, ref-corner light grey italic dashed #9ca3af.
