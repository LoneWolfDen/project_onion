import json, argparse, sys
from pathlib import Path
import requests
from urllib.parse import quote

def load_cards(fp):
    with open(fp) as f:
        return json.load(f)

def seed(cards, base_url="http://localhost:8001", dry_run=False):
    for card in cards:
        if dry_run:
            print(f"[DRY-RUN] {card['anchor_id']} {card['card_id']} {card['title']} sig {card['significance_score']} fresh {card['freshness_days']}d")
            continue
        try:
            url = f"{base_url}/card/{quote(card['client_name'])}/{quote(card['anchor_id'])}/{quote(card['card_id'])}"
            payload = {k: card[k] for k in ["client_name","project_ref_name","anchor_id","card_type","title","week","significance_score","source_rows","content","freshness_days","opportunity_numbers","connected_record_ids","gdp_id","sharepoint_smp"] if k in card}
            resp = requests.put(url, json=payload, timeout=5)
            if resp.status_code in [200,201]:
                d=resp.json()
                print(f"[OK] {card['anchor_id']} {card['card_id']} freshness {d['freshness']['label']} {d['freshness']['color']} sig {card['significance_score']}")
            else:
                print(f"[FAIL] {card['card_id']} {resp.status_code} {resp.text[:200]}")
        except Exception as e:
            print(f"[ERROR] {card['card_id']} server not running? {e}")

if __name__ == "__main__":
    p=argparse.ArgumentParser()
    p.add_argument("--file", default="data/seed/cards.json")
    p.add_argument("--dry-run", action="store_true")
    p.add_argument("--base-url", default="http://localhost:8001")
    a=p.parse_args()
    fp=Path(a.file)
    if not fp.exists():
        alt=Path("/Users/wolf/Developer/project_onion")/a.file
        if alt.exists():
            fp=alt
        else:
            print(f"File not found {a.file}")
            sys.exit(1)
    cards=load_cards(str(fp))
    print(f"Loaded {len(cards)} cards from {fp}")
    seed(cards, base_url=a.base_url, dry_run=a.dry_run)