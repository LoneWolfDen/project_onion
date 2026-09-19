# Fusion Engine — Timeline Noise Filter + Top5 + Confidence — PRD

## What it does
LLM classify DECISION/APPROVAL vs CHASING, weekly bucket milestone, significance score, fusion confidence High/Med/Low only in expanded+admin, top5 Key Moments

## What it doesn't do
- Does not directly call other modules
- Does not store raw body in Org, only link+metadata+embedding
- Does not invent new colours — only uses pastel tokens

## User Story
As a user with Client=Acme, Project=Apollo-123, I want fusion engine — timeline noise filter + top5 + confidence so I can get cards without scanning whole mailbox.

## Acceptance Criteria
- Idempotent: same input hash(url+lastModified+anchor_id) = same clip_id, run twice no duplicate
- Independent: communicates via API.yaml + events only
- Freshness aware: respects lastModified + EventBridge HEAD check

## Open Source Adapter
Core expects Card {opportunity_id, project_id, amount_old, amount_new, stakeholder, date, source_type}. Adapter maps external columns via column_map YAML.
