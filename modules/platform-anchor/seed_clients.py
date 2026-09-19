# seed_clients.py — Data as Code — inserts clients from data/seed/clients.json into anchor STORE — idempotent
# Usage: python modules/platform-anchor/seed_clients.py --file data/seed/clients.json [--dry-run]

import json
import argparse
import sys
from pathlib import Path

# For local STORE in-memory — calls API — for hackathon simple — no DynamoDB needed
import requests

def load_clients(file_path: str):
    with open(file_path, 'r') as f:
        return json.load(f)

def seed_via_api(clients, base_url="http://localhost:8000", dry_run=False):
    for client in clients:
        client_name = client["client_name"]
        project_ref = f"{client_name} Discovery"  # default ProjectRef under client
        anchor_id_slug = client["client_code"] + "-DISCOVERY"
        
        payload = {
            "client_name": client_name,
            "project_ref_name": project_ref,
            "opportunity_numbers": [client["opportunity_example"]],
            "connected_record_ids": [client["connected_example"]],
            "gdp_ids": [client["gdp_example"]],
            "sharepoint_smps": [client["sharepoint_example"]]
        }
        
        if dry_run:
            print(f"[DRY-RUN] Would PUT /anchor/{client_name}/{project_ref} -> {payload}")
            continue
        
        try:
            url = f"{base_url}/anchor/{client_name.replace(' ', '%20')}/{project_ref.replace(' ', '%20')}"
            resp = requests.put(url, json=payload, timeout=5)
            if resp.status_code in [200,201]:
                data = resp.json()
                print(f"[OK] Inserted Client Master PRIMARY FILTER {client_name} -> anchor_id {data.get('anchor_id')} — O-5030460 {client['opportunity_example']} <-> {client['connected_example']}")
            else:
                print(f"[FAIL] {client_name} {resp.status_code} {resp.text[:200]}")
        except Exception as e:
            print(f"[ERROR] {client_name} server not running? {e} — start: python modules/platform-anchor/service.py in Terminal 1")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed Client Master — First Level PRIMARY FILTER dropdown — Data as Code")
    parser.add_argument("--file", default="data/seed/clients.json", help="JSON file with clients")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be inserted without calling API")
    parser.add_argument("--base-url", default="http://localhost:8000", help="Anchor service base URL")
    args = parser.parse_args()
    
    file_path = Path(args.file)
    if not file_path.exists():
        # Try from project root
        alt = Path("/Users/wolf/Developer/project_onion") / args.file
        if alt.exists():
            file_path = alt
        else:
            print(f"File not found {args.file} — run from project_onion root")
            sys.exit(1)
    
    clients = load_clients(str(file_path))
    print(f"Loaded {len(clients)} clients from {file_path} — First Level PRIMARY FILTER NOT editable")
    seed_via_api(clients, base_url=args.base_url, dry_run=args.dry_run)
    print("Done — check PRIMARY FILTER dropdown: GET /anchors/GE%20Aero and /anchors/Rolls-Royce")