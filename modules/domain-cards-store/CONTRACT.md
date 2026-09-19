# CONTRACT.md — domain-cards-store — 80% — DynamoDB + OpenSearch + Freshness + EventBridge 6h HEAD check

## Purpose
Cards Service — DynamoDB + OpenSearch + Freshness — Client Master dropdown PRIMARY filter

## Inputs
- cards: array — from Fusion Engine — each card has anchor_id ProjectRef, client_name PRIMARY, project_id, opportunity_ids[], gdp_ids[], sharepoint_smps[], title, status, timeline_events[], provenance[], freshness first_seen last_refreshed last_link_check, fusion_confidence internal 0.92

## Outputs
- dynamodb: PK anchor_id SK card_id GSI client_name-project_id-index — filtered by client_name PRIMARY
- opensearch: knn 1536-dim filtered by client_name PRIMARY — embedding Titan — cite card_id — Request Access flow — Ask My/Team/Both
- freshness_display: 2d ago green, 18 days old amber, >1 month old red Stale Link dead Verify? — quick view shows freshness only no % — % removed from quick view kept as Model confidence High/Med/Low only expanded+admin
- eventbridge_6h_head_check: Alarm every 6h triggers Lambda HEAD request does file exist without downloading — if 404 mark >1 month old Stale Link dead Verify? — bandwidth minimal — knocks not entering

## Rules
- Client Master dropdown PRIMARY filter — tree = Client -> Projects only no Opportunity sub-tree — Main page Status->Health first Opportunity ID inside card searchable not separate level
- OpenSearch knn filtered by client_name PRIMARY — not full scan
- Freshness aware: respects lastModified + EventBridge HEAD check — user option Show older milestones Last 3 months to minimise bandwidth — loads only significant old milestones significance>0.8
- Must call pii-screener before store
- Idempotent PUT /cards/{anchor_id}/{hash}