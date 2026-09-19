# CONTRACT.md — platform-anchor — 80% — Client Master PRIMARY + Project Reference multi-multi — org preserved

Inputs:
- client_name: PRIMARY FILTER Ge Aviation Uk
- project_ref_name: logical grouping GE Discovery
- opportunity_numbers: array string — business Opportunity # O-5030460 — regex O-\d+ — from file names PS-v2026.2a-...-(O-5030460)-V6.3_ESC — users search by this
- connected_record_ids: array string — Salesforce Record ID 006Uj00000QOBkvIAH — regex 006Uj[A-Za-z0-9]{15} — 18-char ID in URL /Opportunity/006Uj.../view — bookmarklet captures
- project_ids: array string — Peoplesoft Project ID — many-many
- gdp_ids: array string — 8399
- sharepoint_smps: array url — geadinspf

Outputs:
- anchor_id: hash(client_name + project_ref_name)
- link_table: {opportunity_numbers:[O-5030460], connected_record_ids:[006Uj...], project_ids:[], gdp_ids:[8399], sharepoint_smps:[geadinspf]} — many-many — One O-5030460 may have many ConnectedRecords extensions, many ProjectIDs team groups, many GDPs

Rule: When scan finds new ConnectedRecord 006Uj... linked to same SharePoint geadinspf with same O-5030460 base — ask Relevant? Yes/No/Edit — add to ProjectRef
