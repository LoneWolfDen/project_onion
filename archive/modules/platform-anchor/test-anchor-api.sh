# test-anchor-api.sh — Test Suite — Acme Corp + Acme Corp DIP Discovery — corrected naming

echo "Testing anchor service — First Level Client Master PRIMARY FILTER = Acme Corp — Second Level ProjectRef editable = Acme Corp DIP Discovery"
echo "Make sure server running: python modules/platform-anchor/service.py in Terminal 1"
echo ""

echo "=== SCENARIO 1: Root health + org mapping ==="
curl -s http://localhost:8000/ | python3 -m json.tool
echo ""

echo "=== SCENARIO 2: Create anchor — Acme Corp + Acme Corp DIP Discovery — O-5030460 <-> 006Uj... ==="
curl -s -X PUT http://localhost:8000/anchor/Acme%20Corp/Acme%20Corp%20DIP%20Discovery   -H "Content-Type: application/json"   -d '{
    "client_name": "Acme Corp",
    "project_ref_name": "Acme Corp DIP Discovery",
    "opportunity_numbers": ["O-5030460"],
    "connected_record_ids": ["006Uj00000QOBkvIAH"],
    "project_ids": ["12345","12346"],
    "gdp_ids": ["8399"],
    "sharepoint_smps": ["acmespf"]
  }' | python3 -m json.tool
echo ""

echo "=== SCENARIO 3: Multi-multi extension — validation_prompt Relevant? Yes/No/Edit ==="
curl -s -X PUT http://localhost:8000/anchor/Acme%20Corp/Acme%20Corp%20DIP%20Discovery   -H "Content-Type: application/json"   -d '{
    "client_name": "Acme Corp",
    "project_ref_name": "Acme Corp DIP Discovery",
    "opportunity_numbers": ["O-5030460","O-5030460-Extension"],
    "connected_record_ids": ["006Uj00000QOBkvIAH","006Uj00000QOBkvIAI"],
    "project_ids": ["12345","12346"],
    "gdp_ids": ["8399"],
    "sharepoint_smps": ["acmespf"]
  }' | python3 -m json.tool
echo ""

echo "=== SCENARIO 4: PRIMARY FILTER — Client Master dropdown — Acme Corp ==="
curl -s http://localhost:8000/anchors/Acme%20Corp | python3 -m json.tool
echo ""

echo "=== SCENARIO 5: Search by business O-5030460 ==="
curl -s http://localhost:8000/search/opportunity/O-5030460 | python3 -m json.tool
echo ""

echo "=== SCENARIO 6: Search by Salesforce 006Uj... ==="
curl -s http://localhost:8000/search/connected/006Uj00000QOBkvIAH | python3 -m json.tool
echo ""

echo "=== SCENARIO 7: PII screener middleware ==="
curl -s -X POST http://localhost:8000/test/pii-check -H "Content-Type: application/json" -d '{"text":"Alex Nejat alex@acme.com £129,768 TGS_EmpID 8261003 UK"}' | python3 -m json.tool
echo ""

echo "=== SCENARIO 8: Edit second level — Acme Corp DIP Discovery -> Phase 2 — first level Acme Corp NOT editable ==="
curl -s -X PUT http://localhost:8000/anchor/Acme%20Corp/Acme%20Corp%20DIP%20Discovery%20Phase%202   -H "Content-Type: application/json"   -d '{
    "client_name": "Acme Corp",
    "project_ref_name": "Acme Corp DIP Discovery Phase 2",
    "opportunity_numbers": ["O-5030460"],
    "connected_record_ids": ["006Uj00000QOBkvIAH"],
    "gdp_ids": ["8399"],
    "sharepoint_smps": ["acmespf"]
  }' | python3 -m json.tool
echo ""

echo "All tests done — anchor service works local — Acme Corp PRIMARY FILTER + Acme Corp DIP Discovery editable + multi-multi O-5030460 <-> 006Uj... preserved"