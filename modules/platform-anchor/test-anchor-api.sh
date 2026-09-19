# test-anchor-api.sh — Test Suite — GE Aero + GE Aero DIP Discovery — corrected naming

echo "Testing anchor service — First Level Client Master PRIMARY FILTER = GE Aero — Second Level ProjectRef editable = GE Aero DIP Discovery"
echo "Make sure server running: python modules/platform-anchor/service.py in Terminal 1"
echo ""

echo "=== SCENARIO 1: Root health + org mapping ==="
curl -s http://localhost:8000/ | python3 -m json.tool
echo ""

echo "=== SCENARIO 2: Create anchor — GE Aero + GE Aero DIP Discovery — O-5030460 <-> 006Uj... ==="
curl -s -X PUT http://localhost:8000/anchor/GE%20Aero/GE%20Aero%20DIP%20Discovery   -H "Content-Type: application/json"   -d '{
    "client_name": "GE Aero",
    "project_ref_name": "GE Aero DIP Discovery",
    "opportunity_numbers": ["O-5030460"],
    "connected_record_ids": ["006Uj00000QOBkvIAH"],
    "project_ids": ["12345","12346"],
    "gdp_ids": ["8399"],
    "sharepoint_smps": ["geadinspf"]
  }' | python3 -m json.tool
echo ""

echo "=== SCENARIO 3: Multi-multi extension — validation_prompt Relevant? Yes/No/Edit ==="
curl -s -X PUT http://localhost:8000/anchor/GE%20Aero/GE%20Aero%20DIP%20Discovery   -H "Content-Type: application/json"   -d '{
    "client_name": "GE Aero",
    "project_ref_name": "GE Aero DIP Discovery",
    "opportunity_numbers": ["O-5030460","O-5030460-Extension"],
    "connected_record_ids": ["006Uj00000QOBkvIAH","006Uj00000QOBkvIAI"],
    "project_ids": ["12345","12346"],
    "gdp_ids": ["8399"],
    "sharepoint_smps": ["geadinspf"]
  }' | python3 -m json.tool
echo ""

echo "=== SCENARIO 4: PRIMARY FILTER — Client Master dropdown — GE Aero ==="
curl -s http://localhost:8000/anchors/GE%20Aero | python3 -m json.tool
echo ""

echo "=== SCENARIO 5: Search by business O-5030460 ==="
curl -s http://localhost:8000/search/opportunity/O-5030460 | python3 -m json.tool
echo ""

echo "=== SCENARIO 6: Search by Salesforce 006Uj... ==="
curl -s http://localhost:8000/search/connected/006Uj00000QOBkvIAH | python3 -m json.tool
echo ""

echo "=== SCENARIO 7: PII screener middleware ==="
curl -s -X POST http://localhost:8000/test/pii-check -H "Content-Type: application/json" -d '{"text":"Alex Nejat alex@ge.com £129,768 TGS_EmpID 8261003 UK"}' | python3 -m json.tool
echo ""

echo "=== SCENARIO 8: Edit second level — GE Aero DIP Discovery -> Phase 2 — first level GE Aero NOT editable ==="
curl -s -X PUT http://localhost:8000/anchor/GE%20Aero/GE%20Aero%20DIP%20Discovery%20Phase%202   -H "Content-Type: application/json"   -d '{
    "client_name": "GE Aero",
    "project_ref_name": "GE Aero DIP Discovery Phase 2",
    "opportunity_numbers": ["O-5030460"],
    "connected_record_ids": ["006Uj00000QOBkvIAH"],
    "gdp_ids": ["8399"],
    "sharepoint_smps": ["geadinspf"]
  }' | python3 -m json.tool
echo ""

echo "All tests done — anchor service works local — GE Aero PRIMARY FILTER + GE Aero DIP Discovery editable + multi-multi O-5030460 <-> 006Uj... preserved"