echo "=== Connected Bookmarklet v0.10 - :8004 - captures O-5030460 + 006Uj... ==="
curl -s http://localhost:8004/ | python3 -m json.tool
echo ""
curl -s -X PUT http://localhost:8000/anchor/GE%20Aero/GE%20Aero%20DIP%20Discovery -H "Content-Type: application/json" -d '{"client_name":"GE Aero","project_ref_name":"GE Aero DIP Discovery","opportunity_numbers":["O-5030460"],"connected_record_ids":["006Uj00000QOBkvIAH"],"gdp_ids":["8399"],"sharepoint_smps":["geadinspf"]}' | python3 -m json.tool
echo ""
curl -s http://localhost:8000/search/opportunity/O-5030460 | python3 -m json.tool | grep -E "count|O-5030460|006Uj"
echo ""
echo "All done - bookmarklet captures O-5030460 + 006Uj... - dedupes V6.3_ESC"