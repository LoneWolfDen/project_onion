# CONTRACT.md — integrations-excel-parser — 80% — RAID multi-row intelligence KEY

## Purpose
Excel Parser for RAID/Status — plus GDP Excel, ESC Excel, Budget burndown — 1 row != always 1 card — 50% team received laptops but not remaining — contributor may close first RAID log then write new row — intelligence of LLM and timeline plays key role

## Inputs
- excel_file_link: url — SharePoint link or local file
- sheet_name: string — RAID, ESC, Weekly Status, Budget, Engagement Data Export
- rows: array object — raw rows
- anchor_id: string — ProjectRef

## Outputs
- cards: array — Risk ID or auto-generated from title hash, title, description, status Open/Closed, owner, due date, progress 50% pending, comments
- timeline_events: array — for same risk evolution — e.g., 10 Aug Open 50% laptops pending 5 people Row12 R.Patel, 14 Aug Partial 50% received 50% still pending closed previous log opened new row Row18, 20 Aug Closed 100% received Row25 — ONE card with timeline strip 10 Aug Open • 14 Aug Partial • 20 Aug Closed — holy-grail weekly milestone not 3 separate cards
- clip_id: hash(project_id + normalized_title + risk_id_if_exists)

## Rules
- Extract structured fields via Bedrock Claude from unstructured row — RAID log may have no Risk ID — use embedding similarity title vs existing card >0.85 + same project_id + same owner bucket -> same card add timeline event
- If similarity <0.6 -> new card
- Weekly Status group by Project ID — if 2 rows Apollo-123 same week same risk title cluster into 1 status card with last 5 key moments
- If contributor closes first RAID log and writes new row — LLM merges as timeline event not new card
- Significance scoring for timeline: 0.9-1.0 EXTENSION/EXPANSION/APPROVAL/BUDGET CHANGE/RESOURCE/STAKEHOLDER/PO, 0.5-0.8 ALIGNMENT/RISK ESCALATED, 0.0-0.4 CHASING/REMINDER/FYI — only >0.5 goes to timeline, rest provenance
- Must call pii-screener
- Emits ExcelParsed event