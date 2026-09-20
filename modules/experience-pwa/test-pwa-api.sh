echo "=== PWA v0.8 - mint collapsible header ==="
curl -s http://localhost:8002/ | python3 -m json.tool
echo ""
echo "=== PWA App HTML ==="
curl -s http://localhost:8002/app | head -20
echo ""
echo "=== Check anchor :8000 still works ==="
curl -s http://localhost:8000/anchors/GE%20Aero | python3 -m json.tool | head -20
echo ""
echo "=== Check cards :8001 timeline strip ==="
curl -s http://localhost:8001/cards/GE%20Aero/GEAERO-DIP-DISCOVERY/timeline | python3 -m json.tool
echo ""
echo "Open PWA: http://localhost:8002/app - should show GE Aero / GEAERO-DIP-DISCOVERY / O-5030460 / 006Uj... / 2d ago green + timeline Week33 Laptop 50%->100% [Row12+Row18]"