# Walking Skeleton — ONE vertical slice — Week 1

Journey: Client Master -> ProjectRef -> OpportunityID + ConnectedRecord + SMP + GDP -> Harvest -> Fuse -> Card

Steps:
1. Anchor: Select Client Ge Aviation Uk, create ProjectRef GE Discovery, add OpportunityID O-5030460, ConnectedRecord 006Uj00000QOBkvIAH, SharePoint geadinspf, GDP 8399 — multi-multi link table validation Relevant? Yes/No/Edit
2. Harvest: Bookmarklet captures Connected Details Prospect/Interest/Qualifying + Chatter + Notes&Attachments list Title Created By Last Modified — store link+date+author only — Title contains O-5030460 for linking
3. Harvest: GDP Engagement Data Export Excel — full read on HEAD change — columns Engagement Name Account Name GDP ID Project ID GDD GDM Status Date Current Phase Status Indicator Summary — Summary may contain O-5030460 reference
4. Parse: Excel multi-row — RAID 50% laptop example — hash project_id+normalized_title+O-5030460, similarity>0.85 same card timeline 10 Aug Open -> 14 Aug Partial -> 20 Aug Closed
5. Fusion: Weekly bucket — same ProjectRef same week same significance>0.5 = 1 milestone — not 18 events — DECISION/APPROVAL -> timeline, CHASING -> provenance — preserve both IDs in provenance
6. Cards: DynamoDB PK anchor_id SK card_id GSI client_name-index filtered by Client PRIMARY, OpenSearch knn filtered by client_name, freshness 2d ago green >1 month red Stale, EventBridge 6h HEAD check — card stores both opportunity_number O-5030460 and connected_record_id 006Uj00000QOBkvIAH
7. PII: Platform middleware must call before save — email amount TGS_EmpID redacted -> User_A@client.com $XXXk EMP-XXXX — Private/Team toggle
8. UI: Pastel tokens --pastel-blue #D6E8FF no black buttons, Project Header mint collapsible OpportunityID O-5030460 + ConnectedRecord 006Uj..., Key Moments last 5 with View Card links, Client 360, Handover Pack with card links

Success criteria: One card shows GE Discovery O-5030460 / 006Uj... with timeline strip Week 33: Laptop 50%->100% [Row12+Row18] and freshness 2d ago green — both IDs searchable

Mapping preserved from org:
- OpportunityID = O-5030460 — business number — in Excel file names PS-v2026.2a-...-(O-5030460)-V6.3_ESC, used by users to search
- ConnectedRecord = 006Uj00000QOBkvIAH — Salesforce 18-char Record ID — in URL — used for bookmarklet DOM capture
- Multi-multi: One OpportunityID O-5030460 may link to many ConnectedRecords 006Uj... (extensions), many ProjectIDs, many GDP IDs 8399, many SMPs geadinspf — ProjectRef GE Discovery anchors all
