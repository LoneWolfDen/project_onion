# CONTRACT.md — domain-fusion-engine — 80% — Timeline noise filter + Top5 + Confidence — Holy Grail

## Purpose
Fusion Engine — Timeline Noise Filter + Top5 Key Moments + Confidence — Weekly bucket milestone aggregation — significance score — not everyday multiple chats

## Inputs
- clips: array — from Connected, SharePoint, GDP, Excel, Email, Teams, OneDrive — each clip has clip_id idempotent, source_type, date, author, link, snippet, significance_score, anchor_id ProjectRef
- anchor_id: string — ProjectRef

## Outputs
- cards: array — unified cards per ProjectRef — each card has Project Header mint collapsible Opportunity IDs with validation prompt New Opportunity ID detected OPP-8893 Relevant? Yes/No/Edit, POs/WOs history, stakeholders, budget, dates, notes textarea
- key_moments_last_5: array — EXTENSION/EXPANSION/APPROVAL/RESOURCE/STAKEHOLDER/PO — not follow-ups — with -> View Card links
- timeline: array — weekly buckets — e.g., Week 33: 12 Aug APPROVED MS3 15 Nov->30 Nov $120k->$145k [3 emails, 15 chats as provenance] — not 18 events — DECISION/APPROVAL/BLOCKER/RESOLUTION/COMMITMENT -> timeline, CHASING/REMINDER/FYI/DISCUSSION/QUESTION -> provenance only — Frequency clustering 8 Teams messages within 2h same anchor = 1 Discussion
- fusion_confidence: High/Med/Low only in expanded+admin — Display: Model confidence High — 3 sources fused validated via Salesforce amount update and no further chasing Sources Email + Teams channel + Salesforce — internal storage 0.92 in DynamoDB for admin — not in quick view
- freshness: 2d ago green, 18 days old amber, >1 month old red Stale — definitions moved to testing-guide.html — user option Show older milestones Last 3 months to minimise bandwidth — button pastel — loads GET /cards?anchor=Apollo-123&older_than=90d&significance>0.8 only significant old milestones not all chats

## Rules
- Idempotency: hash(url+lastModified+anchor_id+opportunity_regex) = clip_id — run twice no duplicate — PUT not POST
- Independency: Emits event via EventBridge does not import other module — Fusion consumes FileDiscovered etc
- LLM classify DECISION/APPROVAL/BLOCKER/RESOLUTION/COMMITMENT vs CHASING/REMINDER/FYI — implicit signals: Salesforce Quote Draft->Approved, Amount $120k->$145k, new PO ID appears, follow-up stops 7 days -> Implied Resolved amber Validate?
- Weekly bucket: same OPP+Project same week same type = 1 milestone — If week has no significance >0.5 no milestone — no clutter
- Must call pii-screener for any PII in timeline