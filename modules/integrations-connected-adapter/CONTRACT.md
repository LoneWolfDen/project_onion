# CONTRACT.md — integrations-connected-adapter — 80% — No API — Bookmarklet + screen scrape

## Purpose
First point where lead to won tracked — Connected Salesforce — no API access — Bookmarklet/screen grab of standard fields, Notes&Attachments, Chatter

## Inputs
- opportunity_id: string — 006Uj00000QOBkvIAH — REGEX
- connected_url: url — https://allegisgroup.lightning.force.com/.../Opportunity/006Uj.../view
- dom_snapshot: object — from bookmarklet — Details tabs Prospect, Interest, Qualifying, Solutioning, Proposing, Negotiating, Closed, System Information, Archive — plus Chatter feed, Opportunity Details Close Date Total Revenue Currency Stage etc., plus Notes & Attachments list Title Created By Last Modified Size actions Download Share Public Link View File Details — e.g., PS-v2026.2a-GEAviationUK-MRODigInspectnPlatform-(O-5030460)-V6.3_ESC 966KB etc.
- keywords: array string — from contributor — e.g., OPP-5030460, geadinspf, 8399, client domain

## Outputs
- clip_id: hash(url + lastModified + anchor_id + opportunity_id) — idempotent PUT not POST
- card_fields: {opportunity_id, account_name, stage, close_date, total_revenue_redacted $XXXk, opportunity_owner, chatter_events[], attachments[]}
- freshness: from Last Modified 19/08/2026 etc.
- provenance: {type: Salesforce Opportunity, subject: Notes & Attachments PS-v2026.2a..., group: Chatter Mate Paller to Allegis Group Only, date, author Nitin Kanade, link, snippet}

## Rules
- Bookmarklet extracts url, title, selection, timestamp, DOM — no install, no admin consent — works on hackathon team machines — multi-user value
- Notes & Attachments may have multiple versions V6.3_ESC, V6.2, V6.1, V6, V5 — use lastModified latest + hash to dedupe, timeline shows V6.1 -> V6.3 evolution not 3 cards
- Must call pii-screener before save — amount, email redacted
- Event emitted: ConnectedDiscovered — EventBridge — Fusion consumes — no direct import