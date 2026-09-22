import json, sys
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

def seed(clients, base_url="http://localhost:8000", dry_run=False, only_dip=False):
    for client in clients:
        client_name = client["client_name"]
        project_refs = client.get("project_refs", [])
        if not project_refs:
            project_refs = ["Apollo-123", "Apollo-124"] if client_name == "Acme Corp" else [client.get("project_ref_name", f"{client_name} Discovery")]
        if only_dip and client_name == "Acme Corp":
            project_refs = ["Acme Corp DIP Discovery"]
        if only_dip and client_name == "Acme Corp":
            project_refs = ["Apollo-123"]
        for project_ref in project_refs:
            project_name = project_ref
            connected_url = f"https://allegisgroup.my.salesforce.com/lightning/r/Opportunity/{client['connected_example']}/view"
            gdp_url = client.get("gdp_url", f"https://gdp.allegisgroup.com/gdp/#/dashboard/project-details/{client.get('gdp_example','8399')}")
            payload = {
                "client_name": client_name,
                "project_name": project_name,
                "project_ids": [client.get("project_id_example", "99974052")],
                "opportunity_numbers": [client["opportunity_example"]],
                "connected_record_ids": [],
                "connected_record_urls": [connected_url],
                "gdp_id": "",
                "gdp_url": gdp_url,
                "gdp_urls": [gdp_url],
                "sharepoint_urls": {
                    "service_review": [client.get("service_review_url", "")],
                    "communications": [client.get("collab_plan_url", "")] if client.get("collab_plan_url") else [],
                    "planning_documents": [client.get("risk_log_url", ""), client.get("esc_url", "")],
                    "solution_documents": [client.get("site_url", "")]
                },
                "teams_channels": client.get("teams_channels", ["Pre-sales", "Delivery"]),
                "contacts": [{"email": c, "role": "Delivery", "name": "", "project_names": [project_name]} for c in client.get("contacts", ["J.Smith@acme.com"])],
                "start_date": client.get("start_date", "2024-01-02"),
                "end_date": client.get("end_date", "2027-01-09"),
                "keywords": {"all": client.get("sow_numbers", [])+client.get("po_numbers", [])},
                "client_domains": client.get("client_domains", ["acme.com"]),
                "notes": [
                    {
                        "text": "Client wants MS3 extended by 2 days - finance approval pending",
                        "rephrased": "MS3 extension requested by client for 2 days, pending finance approval",
                        "author": "current_user",
                        "privacy": "Team Shared",
                        "source_url": "https://acme.sharepoint.com/notes/ms3",
                        "origin": "Manual Note",
                        "references": [{"origin": "Email", "link": "mailto:J.Smith@acme.com"}]
                    }
                ],
                "archived_items": []
            }
            payload["sharepoint_urls"] = {k: [v for v in vs if v] for k, vs in payload["sharepoint_urls"].items() if any(vs)}
            if dry_run:
                print(f"[DRY-RUN] {client_name}/{project_name} -> Connected URL {connected_url} -> ID, GDP URL {gdp_url} -> ID, Provenance links maintained")
                continue
            try:
                url = f"{base_url}/anchor/{quote(client_name)}/{quote(project_name)}"
                resp = requests.put(url, json=payload, timeout=5)
                if resp.status_code in [200,201]:
                    data = resp.json()
                    print(f"[OK] {client_name} -> {project_name} {data.get('anchor_id')} {data.get('project_reference_id')} Conn {data.get('connected_record_ids')} GDP {data.get('gdp_id')} Provenance {data.get('provenance_summary', {}).get('total_sources')} sources")
                else:
                    print(f"[FAIL] {project_name} {resp.status_code} {resp.text[:500]}")
            except Exception as e:
                print(f"[ERROR] {project_name} {e}")

if __name__ == "__main__":
    import argparse
    p=argparse.ArgumentParser(description="Seed v0.16 with provenance links, archive justification, sorted by creation")
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
            print(f"File not found {a.file}"); sys.exit(1)
    clients=load_clients(str(fp))
    print(f"Loaded {len(clients)} clients - v0.16 provenance links, archive justification, sorted by creation, team shared by client")
    seed(clients, base_url=a.base_url, dry_run=a.dry_run, only_dip=a.only_dip)
