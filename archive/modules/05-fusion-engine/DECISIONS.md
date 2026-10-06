# DECISIONS — Fusion Engine — Timeline Noise Filter + Top5 + Confidence

## ADR-001 — Why this module exists
LLM classify DECISION/APPROVAL vs CHASING, weekly bucket milestone, significance score, fusion confidence High/Med/Low only in expanded+admin, top5 Key Moments

## ADR-002 — Idempotency
hash(url+lastModified+anchor_id+opportunity_regex) = clip_id. Run twice same file → same id, no duplicate. PUT not POST.

## ADR-003 — Independency
Emits event via EventBridge, does not import other module. Example: File Crawler emits FileDiscovered, Fusion consumes.

## ADR-004 — Freshness + HEAD check
EventBridge every 6h triggers Lambda HEAD request (does file exist? without downloading). If 404, mark Stale red. User option Show older milestones Last 3 months to minimise bandwidth.

## ADR-005 — Pastel UX tokens (for 08-experience-pwa)
--pastel-blue #D6E8FF border #A8C6F0 text #1F4A7A, --mint #D4EFDF border #A8D5BA, --peach #FFE4D6, --lav #E8DAFF, radius 12px, shadow 0 1px 3px rgba(0,0,0,0.06), no #000000 black buttons.

## Evolution
- v0.1: Initial PRD
- v0.2: Added weekly bucket milestone + significance_score
- v0.3: Added Private/Team toggle at Add Reference time to reduce processing
