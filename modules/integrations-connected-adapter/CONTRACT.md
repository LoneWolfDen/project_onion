# CONTRACT.md — integrations-connected-adapter — 80% — No API — Bookmarklet

Inputs:
- opportunity_number: O-5030460 — business # — from file name and Details tab Opportunity Details
- connected_record_id: 006Uj00000QOBkvIAH — Salesforce 18-char ID — from URL
- connected_url: https://allegisgroup.lightning.force.com/.../Opportunity/006Uj.../view
- dom_snapshot: Details tabs Prospect/Interest/Qualifying, Chatter, Notes&Attachments list Title Created By Last Modified Size — Title contains O-5030460

Outputs:
- clip_id: hash(connected_record_id + lastModified + anchor_id + opportunity_number)
- card_fields: {opportunity_number O-5030460, connected_record_id 006Uj..., account_name, stage, close_date, total_revenue_redacted, opportunity_owner, chatter_events[], attachments[] with O-5030460 in title}

Rules: Bookmarklet extracts both IDs — O-5030460 from Details/Title, 006Uj... from URL — store both — search by O-5030460, provenance by 006Uj... URL — dedupe by lastModified latest V6.3_ESC
