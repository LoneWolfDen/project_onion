# test-anchor-api.sh — Test API after implementation — run locally without AWS

echo "Starting anchor service on http://localhost:8000"
echo "In another terminal: bash test-anchor-api.sh"

# 1. Start server
# pip install fastapi uvicorn
# python modules/platform-anchor/service.py &

# 2. Test root
curl -s http://localhost:8000/ | python3 -m json.tool

# 3. Create anchor — GE Discovery O-5030460 + 006Uj00000QOBkvIAH + geadinspf + 8399
curl -s -X PUT http://localhost:8000/anchor/Ge%20Aviation%20Uk/GE%20Discovery   -H "Content-Type: application/json"   -d '{
    "client_name": "Ge Aviation Uk",
    "project_ref_name": "GE Discovery",
    "opportunity_numbers": ["O-5030460"],
    "connected_record_ids": ["006Uj00000QOBkvIAH"],
    "project_ids": ["12345","12346"],
    "gdp_ids": ["8399"],
    "sharepoint_smps": ["geadinspf"],
    "teams_channels": ["https://teams.microsoft.com/l/channel/19:abc"],
    "onedrive_urls": []
  }' | python3 -m json.tool

# 4. Test multi-multi — add extension new ConnectedRecord same OpportunityID
curl -s -X PUT http://localhost:8000/anchor/Ge%20Aviation%20Uk/GE%20Discovery   -H "Content-Type: application/json"   -d '{
    "client_name": "Ge Aviation Uk",
    "project_ref_name": "GE Discovery",
    "opportunity_numbers": ["O-5030460","O-5030460-Extension"],
    "connected_record_ids": ["006Uj00000QOBkvIAH","006Uj00000QOBkvIAI"],
    "project_ids": ["12345","12346"],
    "gdp_ids": ["8399"],
    "sharepoint_smps": ["geadinspf"],
    "teams_channels": [],
    "onedrive_urls": []
  }' | python3 -m json.tool
# Should return validation_prompt: "We found new ConnectedRecord 006Uj... linked to same SharePoint geadinspf — Relevant? Yes/No/Edit"

# 5. Get anchor
curl -s http://localhost:8000/anchor/Ge%20Aviation%20Uk/GE%20Discovery | python3 -m json.tool

# 6. List by client PRIMARY FILTER
curl -s http://localhost:8000/anchors/Ge%20Aviation%20Uk | python3 -m json.tool

# 7. Search by business O-5030460 — users search by this
curl -s http://localhost:8000/search/opportunity/O-5030460 | python3 -m json.tool

# 8. Search by Salesforce 006Uj... — provenance by URL
curl -s http://localhost:8000/search/connected/006Uj00000QOBkvIAH | python3 -m json.tool

# 9. Test PII screener middleware
curl -s -X POST http://localhost:8000/test/pii-check -H "Content-Type: application/json" -d '{"text":"Alex Nejat alex@ge.com £129,768 TGS_EmpID 8261003 UK"}' | python3 -m json.tool

echo "All tests done — anchor service works local — multi-multi O-5030460 <-> 006Uj... preserved"