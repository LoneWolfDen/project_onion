echo "=== SCENARIO 1: Root ==="
curl -s http://localhost:8001/ | python3 -m json.tool
echo ""
echo "=== SCENARIO 2: Create timeline Week33 0.9 Laptop 50%->100% Row12+Row18 2d ago green ==="
curl -s -X PUT http://localhost:8001/card/Acme%20Corp/ACME-DIP-DISCOVERY/timeline%23Week33 -H "Content-Type: application/json" -d '{"client_name":"Acme Corp","project_ref_name":"Acme Corp DIP Discovery","anchor_id":"ACME-DIP-DISCOVERY","card_type":"timeline","title":"Laptop 50%->100%","week":"Week 33","significance_score":0.9,"source_rows":["Row12","Row18"],"content":"Week 33: Laptop 50%->100% [Row12+Row18]","freshness_days":2,"opportunity_numbers":["O-5030460"],"connected_record_ids":["006Uj00000QOBkvIAH"],"gdp_id":"8399","sharepoint_smp":"acmespf"}' | python3 -m json.tool
echo ""
echo "=== SCENARIO 3: doc V6.3_ESC today green ==="
curl -s -X PUT http://localhost:8001/card/Acme%20Corp/ACME-DIP-DISCOVERY/doc%23V6.3_ESC -H "Content-Type: application/json" -d '{"client_name":"Acme Corp","project_ref_name":"Acme Corp DIP Discovery","anchor_id":"ACME-DIP-DISCOVERY","card_type":"doc","title":"PS-v2026.2a-Acme-Corp-(O-5030460)-V6.3_ESC","significance_score":0.8,"source_rows":["Row1"],"content":"Doc V6.3_ESC O-5030460","freshness_days":0,"opportunity_numbers":["O-5030460"],"connected_record_ids":["006Uj00000QOBkvIAH"],"gdp_id":"8399","sharepoint_smp":"acmespf"}' | python3 -m json.tool
echo ""
echo "=== SCENARIO 4: Week32 0.25 CHASING 40d Stale red hide ==="
curl -s -X PUT http://localhost:8001/card/Acme%20Corp/ACME-DIP-DISCOVERY/timeline%23Week32 -H "Content-Type: application/json" -d '{"client_name":"Acme Corp","project_ref_name":"Acme Corp DIP Discovery","anchor_id":"ACME-DIP-DISCOVERY","card_type":"timeline","title":"Chasing budget","week":"Week 32","significance_score":0.25,"source_rows":["Row10"],"content":"Week 32 Chasing budget","freshness_days":40,"opportunity_numbers":["O-5030460"],"connected_record_ids":["006Uj00000QOBkvIAH"],"gdp_id":"8399","sharepoint_smp":"acmespf"}' | python3 -m json.tool
echo ""
echo "=== SCENARIO 5: PRIMARY FILTER Acme Corp ==="
curl -s http://localhost:8001/cards/Acme%20Corp | python3 -m json.tool
echo ""
echo "=== SCENARIO 6: Second Level ACME-DIP-DISCOVERY ==="
curl -s http://localhost:8001/cards/Acme%20Corp/ACME-DIP-DISCOVERY | python3 -m json.tool
echo ""
echo "=== SCENARIO 7: Timeline strip — should show Week33 0.9 not Week32 0.25 ==="
curl -s http://localhost:8001/cards/Acme%20Corp/ACME-DIP-DISCOVERY/timeline | python3 -m json.tool
echo ""
echo "All tests done — cards-store ACME-DIP-DISCOVERY PK + freshness 2d green + Row12+Row18"