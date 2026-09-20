import json, argparse, sys
from pathlib import Path
import requests
from urllib.parse import quote
import re

def slugify(t: str) -> str:
    t = t.strip()
    t = re.sub(r'[^A-Z0-9]+', '-', t.upper())
    t = re.sub(r'-+', '-', t).strip('-')
    return t[:64]

def load_clients(fp):
    with open(fp) as f:
        return json.load(f)

def seed(cards_base_url, clients, base_url="http://localhost:8000", dry_run=False, only_dip=False):
    for client in clients:
        client_name = client["client_name"]
        project_refs = client.get("project_refs", [])
        if not project_refs:
            if client_name == "GE Aero":
                project_refs = ["GE Aero DIP Discovery"]
            else:
                project_ref = client.get("project_ref_name", f"{client_name} Discovery")
                project_refs = [project_ref]
        if only_dip and client_name == "GE Aero":
            project_refs = ["GE Aero DIP Discovery"]
        for project_ref in project_refs:
            project_name = project_ref
            anchor_id_slug = slugify(project_name)
            payload = {
                "client_name": client_name,
                "project_name": project_name,
                "project_ref_name": project_name,
                "project_ids": [client.get("project_id_example", "99974052")] if client.get("project_id_example") else ["99974052"],
                "opportunity_numbers": [client["opportunity_example"]],
                "connected_record_ids": [client["connected_example"]],
                "gdp_id": client.get("gdp_example", "8399"),
                "gdp_url": client.get("gdp_url", f"https://gdp.allegisgroup.com/gdp/#/dashboard/project-details/{client.get('gdp_example','8399')}"),
                "sharepoint_urls": {
                    "communications": [client.get("collab_plan_url", "")] if client.get("collab_plan_url") else [],
                    "planning_documents": [client.get("risk_log_url", client.get("sharepoint_example", "")), client.get("esc_url", "")],
                    "solution_documents": [client.get("site_url", "")]
                },
                "teams_channels": client.get("teams_channels", ["Pre-sales", "Delivery"]),
                "contacts": [{"email": c, "source": "data/seed/clients.json", "relevant": "seed"} for c in client.get("contacts", ["jane@client.com"])],
                "start_date": client.get("start_date", "2024-01-02"),
                "end_date": client.get("end_date", "2027-01-09"),
                "keywords": {"SoW": client.get("sow_numbers", []), "PO": client.get("po_numbers", []), "Contract": client.get("contract_numbers", []), "all": client.get("sow_numbers", [])+client.get("po_numbers", [])},
                "client_domains": client.get("client_domains", ["allegisgroup.com", "ge.com"]),
                "gdp_ids": [client["gdp_example"]],
                "sharepoint_smps": [client["sharepoint_example"]],
                "project_ids_legacy": []
            }
            payload["sharepoint_urls"] = {k: [v for v in vs if v] for k, vs in payload["sharepoint_urls"].items()}
            if dry_run:
                print(f"[DRY-RUN] Would PUT /anchor/{client_name}/{project_name} -> anchor_id {anchor_id_slug} O:{client['opportunity_example']} Project_ReferenceID auto PRJ-... persists to data/seed/anchors_persist.json survives restart")
                continue
            try:
                url = f"{base_url}/anchor/{quote(client_name)}/{quote(project_name)}"
                resp = requests.put(url, json=payload, timeout=5)
                if resp.status_code in [200,201]:
                    data = resp.json()
                    print(f"[OK] {client_name} -> {project_name} short anchor_id {data.get('anchor_id')} Project_ReferenceID {data.get('project_reference_id')} O:{client['opportunity_example']} persists to anchors_persist.json")
                else:
                    print(f"[FAIL] {client_name} {project_name} {resp.status_code} {resp.text[:500]}")
            except Exception as e:
                print(f"[ERROR] {client_name} {project_name} server not running? {e}")

if __name__ == "__main__":
    p=argparse.ArgumentParser(description="Seed Client Master - v0.12.3 thorough fix - persistence")
    p.add_argument("--file", default="data/seed/clients.json")
    p.add_argument("--dry-run", action="store_true")
    p.add_argument("--base-url", default="http://localhost:8000")
    p.add_argument("--only-dip", action="store_true")
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
    print(f"Loaded {len(clients)} clients from {fp} - v0.12.3 thorough fix - persistence to anchors_persist.json survives restart - sends project_name not project_ref_name")
    if a.only_dip:
        print("Mode --only-dip: Only GE Aero DIP Discovery")
    seed(None, clients, base_url=a.base_url, dry_run=a.dry_run, only_dip=a.only_dip)