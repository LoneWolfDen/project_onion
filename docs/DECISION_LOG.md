# Decision Log — How Project Onion Evolved — For Open Source Users

This file tracks all design/architectural discussions so open source users know decisions and how they evolved. No need to ask to update — GitHub Action appends ADR on PR merge.

## Format — ADR (Architecture Decision Record)
Each ADR: Date, Context, Decision, Consequence, Status

### ADR-001 — 2024-08 — Client Master Dropdown PRIMARY Filter
- Context: Users have many clients, need PRIMARY filter
- Decision: Client Master dropdown searchable, tree = Client -> Projects only, no Opportunity sub-tree
- Consequence: Main page Status->Health first, Opportunity ID inside card searchable, not separate level
- Status: Accepted

### ADR-002 — 2024-08 — Freshness Only, No Rating, No %
- Context: UI clumsy with lot of text, % confidence confusing
- Decision: Quick view shows freshness only: 2d ago green, 18 days old amber, >1 month old red Stale. % removed from quick view, kept as Model confidence High/Med/Low only in expanded + admin view
- Consequence: User knows to validate, not blind trust. Freshness definitions moved to testing-guide.html
- Status: Accepted

### ADR-003 — 2024-08 — Timeline Noise Filter — Holy Grail
- Context: Chats very frequent, emails less, status logs daily/weekly/monthly — timeline spam if show all
- Decision: LLM classify DECISION/APPROVAL/BLOCKER/RESOLUTION/COMMITMENT -> timeline, CHASING/REMINDER/FYI/DISCUSSION/QUESTION -> provenance only. Frequency clustering: 8 Teams messages within 2h same anchor = 1 Discussion. Weekly bucket milestone: same OPP+Project same week same type = 1 milestone. Significance score 0.9-1.0 EXTENSION/EXPANSION/APPROVAL/BUDGET CHANGE/RESOURCE/STAKEHOLDER/PO, 0.5-0.8 ALIGNMENT/RISK, 0.0-0.4 CHASING.
- Consequence: 5-7 meaningful weekly milestones per opportunity, not 50. User option Show older milestones Last 3 months to minimise bandwidth.
- Status: Accepted — Core for open source

### ADR-004 — 2024-08 — Fusion Confidence Engine — Why Show in Expanded
- Context: User wants to know to validate sources
- Decision: Fusion confidence not in quick view, only expanded + admin. Display: Model confidence: High — 3 sources fused, validated via Salesforce amount update and no further chasing. Sources: Email + Teams channel + Salesforce. Internal storage 0.92 in DynamoDB for admin.
- Consequence: Trust without clutter
- Status: Accepted

### ADR-005 — 2024-08 — File/Folder Iteration + Excel Parsing
- Context: SharePoint URL with subfolders, RAID log, Weekly Status Excel containing all projects
- Decision: SharePoint breadth-first depth<4 <1000 files filter modified last 30d + OPP/Project keywords, store link+date+author only. Excel SheetJS browser parse, RAID 1 row=1 card, Weekly Status group by Project ID filter Client=Acme. No content download unless clip.
- Consequence: Discrete scanning, not full scan
- Status: Accepted

### ADR-006 — 2024-08 — Add Reference Link-First + Private/Team Toggle at Add Time
- Context: Drag-drop first wrong, everything in OneDrive/SharePoint except rare local. Processing time heavy if LLM for private.
- Decision: Modal first option Link input Paste SharePoint/OneDrive URL primary, second small Or upload file. Type dropdown RAID/Status Report/Decision Log/SOW/PO/Meeting Notes/Other auto-detected. Visibility toggle Private [only me] / Team Shared [share] at add time. If Private skip embedding, keep IndexedDB only. If Team Shared generate embedding + PII check.
- Consequence: Reduces processing, user knows what they are doing
- Status: Accepted

### ADR-007 — 2024-08 — Project Header Card + Client 360 + Key Moments Last 5
- Context: Need very relevant info opportunity id, project id, POs multiple values over time, notes instead of OneNote, client view for new joiners how to create ticket/case, IT support
- Decision: Project Header collapsible mint always first: Opportunity IDs with validation prompt New Opportunity ID detected OPP-8893 — Relevant? Yes/No/Edit, POs/WOs history, stakeholders, budget, dates, notes textarea. Key Moments last 5: EXTENSION/EXPANSION/APPROVAL/RESOURCE/STAKEHOLDER/PO — not follow-ups — with → View Card links. Client 360 on breadcrumb Acme Corp click: aggregated client contacts, Support teams IT Helpdesk how to raise laptop ticket link, Vendor Mgmt, Playbooks, all projects health, common SharePoint roots.
- Consequence: Single source of truth per project, key for new joiners
- Status: Accepted

### ADR-008 — 2024-08 — Provenance Explorable + Chat Group Subjects
- Context: User wants to explore when expand, refer to chat group subjects
- Decision: Quick icons [Email][Channel: Apollo-123 Budget][Chat: Apollo Budget Group][Meeting][Salesforce][Excel]. Expanded full list with subject/ticket, group/channel name, date author link snippet. Chat group subject from /me/chats topic metadata even when content 403.
- Consequence: Trust layer
- Status: Accepted

### ADR-009 — 2024-08 — Handover Pack with Card References
- Context: Summary as of last contribution implied view
- Decision: Auto-generated Key Decisions 3, Open Risks 2, Contacts 4, Stale 1, each → View Card #123 link, Export Markdown/PDF with links preserved
- Status: Accepted

### ADR-010 — 2024-08 — PII Anonymization + Open Source Adapter Principle
- Context: PeopleSoft Excel real world data, need to move to hackathon AWS/GitHub, others won't have same data structures
- Decision: Work laptop anonymize via Comprehend DetectPII + Presidio + Claude: J.Smith@acme.com → User_A@client.com, $120k → $XXXk, PO-12345 → PO-XXXXX, keep structure. Generate synthetic twin for samples/anonymized/. Core expects Card {opportunity_id, project_id, amount_old, amount_new, stakeholder, date, source_type}, adapter maps external columns via column_map YAML. If no PeopleSoft, adapter not installed.
- Consequence: Open source safe, long term maintainable
- Status: Accepted

### ADR-011 — 2024-08 — EventBridge 6h HEAD Check
- Context: Link may die after 2 months, card still green
- Decision: EventBridge alarm every 6h triggers Lambda HEAD request (does file exist? without downloading). If 404, mark >1 month old Stale Link dead Verify?
- Consequence: Freshness trustworthy, bandwidth minimal
- Status: Accepted

### ADR-012 — 2024-08 — Git Tags Not Folder Copies + Idempotency + Independency
- Context: Messed up merges, spent hours retrieving working version, hence folder copies finance-engine-v3.5
- Decision: Use git tag v0.1-working-demo, git checkout v0.1-working-demo retrieves in 5 seconds. Idempotency hash(url+lastModified+anchor_id) = clip_id PUT not POST. Independency via events EventBridge, no direct imports. Module can only talk via API.yaml + SCHEMA.json.
- Consequence: No rabbit hole, open source maintainable
- Status: Accepted

## How to track evolving decisions — Best way for open source
1. This file is append-only — never edit old ADR, add new ADR with date
2. Each PR must include ADR update in docs/DECISION_LOG.md
3. GitHub Action checks PR has ADR update if PR touches modules/
4. GitHub Discussions for debate, linked to ADR
5. Pastel UX final + testing-guide.html linked from each ADR

This way new contributors know why freshness is 2d ago not %, why timeline buckets weekly, why Add Reference link-first.
