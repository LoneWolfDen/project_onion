
# Backlog — What we discussed, what's done, what's still pending + Recommendations for non-tech user

## What we discussed and DONE in v0.16 (for non-tech: what portal can do now)

1. **Save Anchor file or DB?** — DONE: File data/seed/anchors_persist.json survives restart — Data as Code — logs [PERSIST] Loaded X.
2. **URL Parsing .xlsx cleaning ?e= params** — DONE: clean_sharepoint_url strips ?e= ?csf=1&web=1 via urlparse — backend only.
3. **Multiple projects per client?** — DONE: Yes — Client Primary filter dropdown, Project Name dropdown shows existing + Add new text field — left rail shows all projects under Acme Corp.
4. **Project Reference ID auto PRJ- + 12 hex** — DONE: Not text field, light grey italic corner badge ref-corner dashed #9ca3af — appears next to Collapse, one pack at top of selected project — unique for multiple IDs.
5. **Connected Record URL not ID** — DONE: Users paste full URL https://.../Opportunity/006Uj.../view — we extract ID internally — mandatory field now.
6. **GDP URL not ID** — DONE: Users paste GDP URL https://gdp.../project-details/7189 — we extract 7189 — no GDP ID textbox — mandatory.
7. **Contacts email+role add more + domains** — DONE: Email|Role|Name three inputs + Add Contact — email validation — domains auto extracted to Client Domains.
8. **Keywords auto + user adds more** — DONE: Auto from Project IDs, Opp IDs, GDP ID, client name, project name tokens + user adds — Filter Aid Keywords renamed.
9. **Pastel UX final layout** — DONE: Mint header gradient #D6F5E8 -> #D6E8FF, badges rounded 20px, cards rounded 16px shadow, reference layout Project-Onion-Final-Pastel-Ux.html kept as base.
10. **Left & right sidebars, breadcrumb, collapsable central card, Top5** — DONE in v0.14: Left sidebar nav, Right sidebar Top5/Projects/Recent Anchors/Quick Stats, Breadcrumb clickable Home > Client > Project, Central card contains ALL fields.
11. **Field titles simplified** — DONE: Connected Record URL + italic example, not verbose regex SECONDARY_REF.
12. **Single Edit for whole central card** — DONE: One Edit button top right, shows all cards with field title, italic instruction, Current value, Textbox to edit showing existing value.
13. **Key Stakeholders expand with Archive + justification** — DONE: Few details collapsed clean, click expands to all + Add new Email|Role|Name + Archive with mandatory justification textarea — moves to bottom archived grey section — still stored — admin enable backlog.
14. **Add Note feature — portal learning** — DONE: Your Notes scrap notebook — collapsed small, on click expands — latest at top, rephrased via Copilot mock, cursor at top, + Add update appends to same note — threading.
15. **Client 360 aggregated contacts grouped by project names** — DONE: /client/{client}/360 endpoint — Aggregated Contacts grouped by project_names — shows with whom we connect more — sorted by count desc — Support Teams Playbooks located here.
16. **+New project button logic simplified** — DONE: Removed duplicate top/bottom button — under Search projects... text "If project not found, Register/Add new" clickable → Add New Project form — Opportunity ID mandatory + Opportunity URL mandatory.
17. **Project search across everything sorted by creation date** — DONE: Search across project name, keywords, project id, opportunity id, client names — fuse.js fuzzy — sorted by first_seen newest first — date by which new project added to Project Onion — scroll shows all.
18. **1 column view Key Moments** — DONE: Key Moments — Last 5 full width + status cards full width stacked — each expanded shows FULL PROVENANCE + STRUCTURED + MODEL CONFIDENCE inside same card.
19. **Project Details Show All card collapsed by default** — DONE: Raw JSON used by services.py fine — collapsed by default — clean table view + toggle Show raw JSON.
20. **Archive replaces Obsolete everywhere + mandatory justification** — DONE in v0.16: All screens say Archive not Obsolete — modal requires justification — backend stores.
21. **Provenance references actual links** — DONE in v0.16: All provenance are actual links: user, source url, timestamp, origin (Salesforce/Email/Teams/SharePoint/Manual) — not uploading sources, read learn, maintain source links — connected_provenance, gdp_provenance, sharepoint_provenance, contacts_provenance, notes provenance with references array.
22. **Smart Assistant priority** — DONE: Right rail Smart Assistant Ask My Notes / Team Shared / Both — filter logic My Notes = all including Private, Team Shared = by client not project but carries references from where info originated, Both = Union — Fuse.js across contacts, notes rephrased, SharePoint titles — IT contact UK+India scenario — mock Claude/Copilot synthesis.

## What's still in BACKLOG — what we discussed but not built yet (for non-tech: next steps)

1. **Admin enable archived** — Backlog: When user archives with justification, admin can enable again if needed — UI button disabled tooltip "Backlog: Admin enable" — need admin role + audit log. Complexity medium — add to next sprint.

2. **Vector DB for Smart Assistant** — Backlog: For hackathon we use Fuse.js + mock LLM. Real implementation needs vector DB (Pinecone/Weaviate) to index all sources user provided — Emails, Teams messages, SharePoint docs, Salesforce — with embeddings — so when user types IT or MS3, semantic search finds relevant. Need to ingest sources via Graph API + Teams API.

3. **Merge duplicate cards** — Backlog: If two cards say same (Similar to #c4 — extension details overlap [Merge]) — show merge option + user edits merged details and save — need duplicate detection logic same Opp + Project IDs + date overlap within 2 days — UI modal side-by-side.

4. **Full provenance explorable links** — Backlog: Currently we maintain source_url and link as actual link, but not clickable to open original Salesforce/SharePoint with SSO — need to make each provenance reference actual clickable link with user context — for hackathon we store link, next step make link open in new tab with auth.

5. **Playbooks location** — Backlog: Client 360 shows Support Teams IT Helpdesk — How to raise laptop ticket etc. — need to auto-discover playbooks from SharePoint roots /sites/Acme-Projects/Apollo/ — Common SharePoint roots logic — auto-linked references grouped by Project ID.

6. **Excel Weekly Status Handling** — Backlog: Card "Grouped by Project ID, filtered where Client=Acme. Auto-links to Status & Health cards. Upload new weekly file via Add Reference." — need Excel parser that reads RAID.xlsx Row 12 — PO Extension flagged — auto-link.

7. **Your Notes rephrase by Copilot real** — Backlog: Currently mock rephrased "Rephrased: ...". Real needs Copilot LLM call to rephrase note + merge threaded updates.

8. **Privacy redacted share** — Backlog: PII: Email, Amount — Approve redacted share — need PII detection + redaction logic — Private vs Team Shared toggle.

9. **Model confidence** — Backlog: Model confidence: High — 3 sources fused, validated via Salesforce amount update — need to calculate confidence from number of sources fused.

10. **Handover Pack Export** — Backlog: Right rail Handover Pack Auto-generated Key Decisions 3, Open Risks 2, Contacts 4, Stale 1 — Export button — need PDF export generation.

## Recommendations for non-tech user like you (simple language)

- **Use Archive not Delete:** When information is old, don't delete — Archive with reason. Portal keeps it at bottom, still searchable, you can see why it was archived. Better than losing history.

- **Always add justification:** When you archive, write why — e.g., "PO closed, replaced by PO-12346" — helps admin and future you.

- **Add Notes is your learning engine:** Every time you learn something — "Client wants MS3 extended" — add as note. Portal rephrases and makes it searchable via Smart Assistant. More notes = more valuable portal.

- **Team Shared by client:** When you share a note or contact for Acme Corp, it becomes visible to all projects under Acme Corp, not just Apollo-123 — because team works across projects for same client. Private notes stay only with you.

- **Search is smart now:** Left search looks across project name, keywords, project id, opportunity id, client name — and sorted by newest first — so latest projects appear top — date added to Project Onion.

- **Mandatory Opp ID + Opp URL:** On new project creation, you must add Opportunity ID and Opportunity URL — this ensures every project has a Salesforce link — actual link maintained as provenance.

- **Provenance = trust:** Every piece of data now shows where it came from — user, source url, timestamp, origin — actual link you can click — not just text — so you know if it's from Email, Teams, Salesforce, SharePoint.

- **Next priority:** Focus on Smart Assistant — it's your priority — make it answer from all sources — even if someone added IT contact for India and you added UK, when you type IT, it finds both — this is value.

- **For hackathon demo:** Show flow: Acme Corp → Apollo-123 collapsed → Expand → Key Stakeholders few contacts → click to expand all → Archive one with justification → Add Note "MS3 extended" → Smart Assistant type MS3 → shows note → Client 360 shows contacts grouped by project → Handover Pack Export.
