import json, argparse, sys
from pathlib import Path
import requests
from urllib.parse import quote

def load_clients(fp):
    with open(fp) as f:
        return json.load(f)

def seed(cards_base_url, clients, base_url="http://localhost:8000", dry_run=False, only_dip=False):
    for client in clients:
        client_name = client["client_name"]
        # Fix: if client has project_refs list, use those, else use project_ref_name or default
        # For GE Aero, we want only GE Aero DIP Discovery -> GEAERO-DIP-DISCOVERY, not GE Aero Discovery -> GEAERO-DISCOVERY duplicate
        project_refs = client.get("project_refs", [])
        if not project_refs:
            # Check if client has specific project_ref_name - for GE Aero use DIP Discovery
            if client_name == "GE Aero":
                project_refs = ["GE Aero DIP Discovery"]  # Only DIP, not generic Discovery - avoids duplicate
            else:
                project_ref = client.get("project_ref_name", f"{client_name} Discovery")
                project_refs = [project_ref]
        
        if only_dip and client_name == "GE Aero":
            project_refs = ["GE Aero DIP Discovery"]  # Force only DIP for cleanup

        for project_ref in project_refs:
            anchor_id_slug = "-".join(project_ref.upper().split())[:50].replace("--","-")
            # Use slugify like service: uppercase + non-alnum to -
            import re
            anchor_id_slug = re.sub(r'[^A-Z0-9]+', '-', project_ref.upper()).strip('-')
            
            payload = {
                "client_name": client_name,
                "project_ref_name": project_ref,
                "opportunity_numbers": [client["opportunity_example"]],
                "connected_record_ids": [client["connected_example"]],
                "gdp_ids": [client["gdp_example"]],
                "sharepoint_smps": [client["sharepoint_example"]]
            }
            
            if dry_run:
                print(f"[DRY-RUN] Would PUT /anchor/{client_name}/{project_ref} -> anchor_id {anchor_id_slug} O:{client['opportunity_example']} 006:{client['connected_example'][:8]}...")
                continue
            
            try:
                url = f"{base_url}/anchor/{quote(client_name)}/{quote(project_ref)}"
                resp = requests.put(url, json=payload, timeout=5)
                if resp.status_code in [200,201]:
                    data = resp.json()
                    print(f"[OK] {client_name} PRIMARY FILTER -> {project_ref} editable -> anchor_id {data.get('anchor_id')} O:{client['opportunity_example']} <-> {client['connected_example']}")
                else:
                    print(f"[FAIL] {client_name} {project_ref} {resp.status_code} {resp.text[:200]}")
            except Exception as e:
                print(f"[ERROR] {client_name} {project_ref} server not running? {e}")

if __name__ == "__main__":
    import argparse
    p=argparse.ArgumentParser(description="Seed Client Master - First Level PRIMARY FILTER - Data as Code - v0.10.1 fix duplicate")
    p.add_argument("--file", default="data/seed/clients.json")
    p.add_argument("--dry-run", action="store_true")
    p.add_argument("--base-url", default="http://localhost:8000")
    p.add_argument("--only-dip", action="store_true", help="Only seed GE Aero DIP Discovery to avoid duplicate GE Aero Discovery")
    a=p.parse_args()
    fp=Path(a.file)
    if not fp.exists():
        alt=Path("/Users/wolf/Developer/project_onion")/a.file
        if alt.exists():
            fp=alt
        else:
            print(f"File not found {a.file}")
            sys.exit(1)
    clients=load_clients(str(fp))
    print(f"Loaded {len(clients)} clients from {fp} - v0.10.1 fix: GE Aero will only seed DIP Discovery to avoid duplicate GEAERO-DISCOVERY vs GEAERO-DIP-DISCOVERY")
    if a.only_dip:
        print("Mode --only-dip: Only GE Aero DIP Discovery will be seeded under GE Aero PRIMARY FILTER - removes duplicate")
    seed(None, clients, base_url=a.base_url, dry_run=a.dry_run, only_dip=a.only_dip)