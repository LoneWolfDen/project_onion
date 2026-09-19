# Next Sprint — Iterate after Walking Skeleton

Week 2: For each new feature: Refine 1-2 REQUIREMENTS.md → Update CONTRACT.md → /plan → approve → build → STATE.md auto-updates

Priority:
1. platform-anchor: Implement link table DynamoDB PK client_name SK anchor_id GSI opportunity_number-index + connected_record_id-index — CRUD for O-5030460 + 006Uj... + ProjectID + GDPID + SMP — validation prompt
2. domain-cards-store: DynamoDB + OpenSearch knn filtered by client_name PRIMARY — freshness 2d ago green >1 month red Stale + EventBridge 6h HEAD check
3. experience-pwa: Wire ProjectHeader.jsx to anchor-service + cards-store — pastel tokens --pastel-blue #D6E8FF, mint header, Top5 Key Moments
4. integrations-gdp-adapter: Wire parse.js to real Excel export from screenshot — Engagement Data Export Active — full read on HEAD change

Do NOT build all 6 modules — build 1 slice end-to-end, validate PII screener middleware must call before save — CI fails if module saves without calling it.
