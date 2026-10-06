# CONTRACT.md — integrations-sharepoint-adapter — 80% — Standard libraries but different file names

## Purpose
Project SharePoint once Opportunity WON — default libraries created — Home, Budget, Communications, Solution Documents, Planning Documents — same set of files but each person manages different file names/sub-folders

## Inputs
- sharepoint_smp_url: url — https://allegiscloud.sharepoint.com/teams/TEK-UKDelivery/<uniqueID> e.g., acmespf
- anchor_id: string — ProjectRef
- last_successful_harvest: timestamp — for incremental HEAD check

## Outputs
- files: array [{link, lastModified, author, library: Budget|Communication|Solution Documents|Planning Documents, file_name, size}]
- clip_id: hash(link + lastModified + anchor_id)

## Rules
- Breadth-first depth<4 <1000 files — filter modified last 30d + OpportunityID regex + ProjectID + GDPID + keywords RAID, ESC, Collaboration_Plan, Value Framework, Service Review, MBR
- Don't rely on exact path /Budget/Burndown.xlsx — use library filter + file name keyword filter + content filter lastModified>30d size<50MB — pattern not path
- Store link+date+author only — not content — unless user clicks Add Reference link-first primary, second small Or upload file
- Multiple versions V6.3_ESC etc — dedupe via hash + lastModified latest — timeline shows evolution
- 6h EventBridge HEAD check: HEAD /sites/{id}/drives/{id}/root:/path — does file exist? without downloading — if 404 mark Stale red Link dead Verify?
- Must call pii-screener
- Emits FileDiscovered event