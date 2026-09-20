echo "=== GDP Adapter v0.9 - :8003 - Engagement Data Export - Active ==="
curl -s http://localhost:8003/ | python3 -m json.tool
echo ""
echo "=== PUT GDP 8399 - GE Aero - O-5030460 <-> 006Uj... - significance 0.9 EXTENSION ==="
curl -s -X PUT http://localhost:8003/gdp/8399 -H "Content-Type: application/json" -d '{
  "gdp_id": "8399",
  "client_name": "GE Aero",
  "project_ref_name": "GE Aero DIP Discovery",
  "anchor_id": "GEAERO-DIP-DISCOVERY",
  "engagement_name": "GE Aero DIP Discovery",
  "engagement_status": "Active",
  "opportunity_numbers": ["O-5030460"],
  "connected_record_ids": ["006Uj00000QOBkvIAH"],
  "sharepoint_smps": ["geadinspf"],
  "budget": 129768,
  "significance_raw": 0.9,
  "export_columns": {
    "Engagement Name": "GE Aero DIP Discovery",
    "Client": "GE Aero",
    "Status": "Active",
    "GDP ID": "8399",
    "Opportunity Number": "O-5030460",
    "Connected Record ID": "006Uj00000QOBkvIAH",
    "SharePoint SMP": "geadinspf",
    "Budget": "£129,768 redacted to $XXXk",
    "Significance": 0.9
  },
  "freshness_days": 1
}' | python3 -m json.tool
echo ""
echo "=== GET GDP 8399 ==="
curl -s http://localhost:8003/gdp/8399 | python3 -m json.tool
echo ""
echo "=== GET GDPS by Client GE Aero PRIMARY FILTER ==="
curl -s http://localhost:8003/gdps/GE%20Aero | python3 -m json.tool
echo ""
echo "=== POST Ingest - full read on HEAD change - Engagement Data Export - Active exact columns ==="
curl -s -X POST http://localhost:8003/ingest -H "Content-Type: application/json" -d '{"gdp_id":"8399","client_name":"GE Aero","project_ref_name":"GE Aero DIP Discovery","anchor_id":"GEAERO-DIP-DISCOVERY","export_columns":{"Engagement Name":"GE Aero DIP Discovery","Client":"GE Aero","Status":"Active","GDP ID":"8399","Opportunity Number":"O-5030460","Connected Record ID":"006Uj00000QOBkvIAH","SharePoint SMP":"geadinspf","Budget":"£129,768 redacted"}}' | python3 -m json.tool
echo ""
echo "All tests done - GDP adapter :8003 - 8399 maps to O-5030460 + 006Uj... + geadinspf + significance 0.9 EXTENSION"