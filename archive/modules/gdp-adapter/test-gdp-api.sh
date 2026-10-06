echo "=== GDP Adapter v0.9 - :8003 - Engagement Data Export - Active ==="
curl -s http://localhost:8003/ | python3 -m json.tool
echo ""
echo "=== PUT GDP 8399 - Acme Corp - O-5030460 <-> 006Uj... - significance 0.9 EXTENSION ==="
curl -s -X PUT http://localhost:8003/gdp/8399 -H "Content-Type: application/json" -d '{
  "gdp_id": "8399",
  "client_name": "Acme Corp",
  "project_ref_name": "Acme Corp DIP Discovery",
  "anchor_id": "ACME-DIP-DISCOVERY",
  "engagement_name": "Acme Corp DIP Discovery",
  "engagement_status": "Active",
  "opportunity_numbers": ["O-5030460"],
  "connected_record_ids": ["006Uj00000QOBkvIAH"],
  "sharepoint_smps": ["acmespf"],
  "budget": 129768,
  "significance_raw": 0.9,
  "export_columns": {
    "Engagement Name": "Acme Corp DIP Discovery",
    "Client": "Acme Corp",
    "Status": "Active",
    "GDP ID": "8399",
    "Opportunity Number": "O-5030460",
    "Connected Record ID": "006Uj00000QOBkvIAH",
    "SharePoint SMP": "acmespf",
    "Budget": "£129,768 redacted to $XXXk",
    "Significance": 0.9
  },
  "freshness_days": 1
}' | python3 -m json.tool
echo ""
echo "=== GET GDP 8399 ==="
curl -s http://localhost:8003/gdp/8399 | python3 -m json.tool
echo ""
echo "=== GET GDPS by Client Acme Corp PRIMARY FILTER ==="
curl -s http://localhost:8003/gdps/Acme%20Corp | python3 -m json.tool
echo ""
echo "=== POST Ingest - full read on HEAD change - Engagement Data Export - Active exact columns ==="
curl -s -X POST http://localhost:8003/ingest -H "Content-Type: application/json" -d '{"gdp_id":"8399","client_name":"Acme Corp","project_ref_name":"Acme Corp DIP Discovery","anchor_id":"ACME-DIP-DISCOVERY","export_columns":{"Engagement Name":"Acme Corp DIP Discovery","Client":"Acme Corp","Status":"Active","GDP ID":"8399","Opportunity Number":"O-5030460","Connected Record ID":"006Uj00000QOBkvIAH","SharePoint SMP":"acmespf","Budget":"£129,768 redacted"}}' | python3 -m json.tool
echo ""
echo "All tests done - GDP adapter :8003 - 8399 maps to O-5030460 + 006Uj... + acmespf + significance 0.9 EXTENSION"