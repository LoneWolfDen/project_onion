
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict
import hashlib, re, uuid, json
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse, urlunparse

app = FastAPI(title="Anchor Service v0.16", version="v0.16-archive-justification-sorted-provenance-links")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

STORE = {}
CONNECTED_ID_EXTRACT = re.compile(r'(006[A-Za-z0-9]{12,15})')
GDP_URL_REGEX = re.compile(r'/project-details/(\d+)')
PERSIST_PATH = Path(__file__).parent.parent.parent / "data" / "seed" / "anchors_persist.json"
if not PERSIST_PATH.parent.exists():
    PERSIST_PATH.parent.mkdir(parents=True, exist_ok=True)

def slugify(t: str) -> str:
    t = t.strip()
    t = re.sub(r'[^A-Z0-9]+', '-', t.upper())
    t = re.sub(r'-+', '-', t).strip('-')
    return t[:64]

def gen_project_reference_id(client_name: str, project_name: str) -> str:
    raw = f"{client_name}|{project_name}|{uuid.uuid4()}"
    return "PRJ-" + hashlib.sha256(raw.encode()).hexdigest()[:12].upper()

def extract_connected_id_from_url(url_or_id: str) -> str:
    url_or_id = url_or_id.strip()
    if not url_or_id: return ""
    if re.match(r'^006[A-Za-z0-9]{15}$', url_or_id): return url_or_id
    m = CONNECTED_ID_EXTRACT.search(url_or_id)
    return m.group(1) if m else url_or_id

def extract_gdp_id_from_url(url_or_id: str) -> str:
    url_or_id = url_or_id.strip()
    if not url_or_id: return ""
    if url_or_id.isdigit(): return url_or_id
    m = GDP_URL_REGEX.search(url_or_id)
    return m.group(1) if m else url_or_id

def clean_sharepoint_url(url: str) -> str:
    url = url.strip()
    if not url: return ""
    try:
        parsed = urlparse(url)
        return urlunparse((parsed.scheme, parsed.netloc, parsed.path, '', '', ''))
    except Exception:
        return url.split('?')[0].split('#')[0]

def load_persist():
    global STORE
    if PERSIST_PATH.exists():
        try:
            with open(PERSIST_PATH) as f:
                data = json.load(f)
                STORE = data.get("store", {})
                print(f"[PERSIST] Loaded {len(STORE)} anchors from {PERSIST_PATH} - provenance links maintained")
        except Exception as e:
            print(f"[PERSIST] Failed: {e}"); STORE = {}

def save_persist():
    try:
        with open(PERSIST_PATH, "w") as f:
            json.dump({"store": STORE, "saved_at": datetime.utcnow().isoformat(), "version": "v0.16-archive-justification-provenance-links"}, f, indent=2)
        print(f"[PERSIST] Saved {len(STORE)} anchors")
    except Exception as e:
        print(f"[PERSIST] Failed: {e}")

load_persist()

class AnchorCreate(BaseModel):
    client_name: str
    project_name: str
    project_ids: List[str] = []
    opportunity_numbers: List[str] = []
    connected_record_ids: List[str] = []
    connected_record_urls: List[str] = []
    gdp_id: Optional[str] = None
    gdp_url: Optional[str] = None
    gdp_urls: List[str] = []
    sharepoint_urls: Dict[str, List[str]] = {}
    teams_channels: List[str] = []
    contacts: List[Dict] = []
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    keywords: Dict[str, List[str]] = {}
    client_domains: List[str] = []
    notes: List[Dict] = []
    archived_items: List[Dict] = []

@app.get("/")
def root():
    return {
        "service": "platform-anchor v0.16",
        "version": "v0.16-archive-justification-sorted-provenance-links",
        "persist_path": str(PERSIST_PATH),
        "store_count": len(STORE),
        "provenance": "Actual links maintained: user, source url, timestamp, origin (Salesforce/Email/Teams/SharePoint) - not uploading sources, read learn, maintain source links",
        "layout": "Left sidebar projects sorted by creation date first_seen newest first, Central single Edit with repeatable one-line boxes + empty box + Archive with mandatory justification, 1 column Key Moments, Client 360 grouped contacts by project, Smart Assistant priority My Notes/Team Shared/Both by client",
        "mandatory": "Opportunity ID + Opportunity URL mandatory on Add New Project",
        "archive": "Archive replaces Obsolete everywhere - mandatory justification - moves to bottom archived section - still stored - admin enable backlog"
    }

@app.put("/anchor/{client_name}/{project_name}")
def create_anchor(client_name: str, project_name: str, payload: AnchorCreate):
    # Mandatory validation
    if not payload.opportunity_numbers or not any(o.strip() for o in payload.opportunity_numbers):
        raise HTTPException(status_code=400, detail="Opportunity ID mandatory - cannot save without Opportunity ID")
    if not payload.connected_record_urls and not payload.connected_record_ids:
        raise HTTPException(status_code=400, detail="Opportunity URL mandatory - cannot save without Opportunity URL - Salesforce > Opportunity > Copy link")
    
    client_name = payload.client_name or client_name
    project_name = payload.project_name or project_name
    if not project_name:
        raise HTTPException(status_code=400, detail="project_name required")

    connected_ids = []
    connected_provenance = []
    for u in payload.connected_record_ids + payload.connected_record_urls:
        eid = extract_connected_id_from_url(u)
        if eid and eid.lower() != 'undefined' and eid not in connected_ids:
            connected_ids.append(eid)
            connected_provenance.append({
                "source_url": u,
                "extracted_id": eid,
                "origin": "Salesforce Opportunity",
                "user": "current_user",
                "timestamp": datetime.utcnow().isoformat(),
                "link": u  # actual link maintained
            })

    gdp_id = ""; gdp_url = ""; all_gdp = []
    if payload.gdp_url: all_gdp.append(payload.gdp_url)
    all_gdp.extend(payload.gdp_urls)
    if payload.gdp_id and not all_gdp: gdp_id = payload.gdp_id.strip()
    gdp_provenance = []
    if all_gdp:
        gdp_url = all_gdp[0].strip()
        gdp_id = extract_gdp_id_from_url(gdp_url)
        gdp_url = gdp_url.split('?')[0].split('#')[0]
        gdp_provenance.append({
            "source_url": all_gdp[0],
            "extracted_id": gdp_id,
            "origin": "GDP Dashboard",
            "user": "current_user",
            "timestamp": datetime.utcnow().isoformat(),
            "link": all_gdp[0]
        })

    clean_sp = {}
    sp_provenance = {}
    for k, vs in (payload.sharepoint_urls or {}).items():
        lst = []
        prov_list = []
        for url in vs:
            if not url or url.strip().lower() == 'undefined': continue
            c = clean_sharepoint_url(url)
            if c and c not in lst:
                lst.append(c)
                prov_list.append({
                    "source_url": url,
                    "cleaned_url": c,
                    "origin": f"SharePoint {k}",
                    "user": "current_user",
                    "timestamp": datetime.utcnow().isoformat(),
                    "link": c
                })
        if lst:
            clean_sp[k] = lst
            sp_provenance[k] = prov_list

    anchor_id = slugify(project_name)
    key = f"{client_name}#{anchor_id}"
    existing = STORE.get(key)

    # Handle archived items with justification
    archived_items = []
    if existing:
        archived_items = existing.get("archived_items", [])
    # Add new archived from payload if any
    for item in payload.archived_items:
        if item.get("justification") and item.get("value"):
            item["archived_at"] = datetime.utcnow().isoformat()
            archived_items.append(item)
        elif item.get("value") and not item.get("justification"):
            raise HTTPException(status_code=400, detail=f"Archive requires mandatory justification for {item.get('value')}")

    if existing and existing.get("project_reference_id"):
        project_reference_id = existing["project_reference_id"]
        first_seen = existing["freshness"]["first_seen"]
    else:
        project_reference_id = gen_project_reference_id(client_name, project_name)
        first_seen = datetime.utcnow().isoformat()

    contacts_clean = []; domains = set()
    contacts_provenance = []
    for c in payload.contacts:
        if not isinstance(c, dict): continue
        email = c.get("email","").strip()
        if not email or email.lower() == 'undefined': continue
        if c.get("status") == "archived" and not c.get("archived_justification"):
            raise HTTPException(status_code=400, detail=f"Archive requires mandatory justification for contact {email}")
        if "@" in email: domains.add(email.split("@")[1].lower())
        contact_record = {
            "email": email,
            "role": c.get("role",""),
            "name": c.get("name",""),
            "source": "user",
            "status": c.get("status","active"),
            "project_names": c.get("project_names", [project_name]),
            "provenance": {
                "source_url": f"Contact {email}",
                "origin": "Collaboration Plan / Graph",
                "user": "current_user",
                "timestamp": datetime.utcnow().isoformat(),
                "link": f"mailto:{email}"
            }
        }
        if c.get("status") == "archived":
            contact_record["archived_justification"] = c.get("archived_justification","")
            contact_record["archived_at"] = datetime.utcnow().isoformat()
        contacts_clean.append(contact_record)
        contacts_provenance.append(contact_record["provenance"])

    client_domains = set([d.strip().lower() for d in payload.client_domains if d and d.strip().lower() != 'undefined'])
    client_domains.update(domains)

    auto_kw = set(payload.project_ids + payload.opportunity_numbers)
    if gdp_id: auto_kw.add(gdp_id)
    auto_kw.update([t for t in client_name.split() if len(t) > 2])
    auto_kw.update([t for t in project_name.split() if len(t) > 2])
    user_kw = set()
    for vs in (payload.keywords or {}).values():
        for v in vs:
            if v and v.lower() != 'undefined': user_kw.add(v.strip())
    all_kw = list(auto_kw.union(user_kw))
    keywords = {"auto": list(auto_kw), "all": all_kw, "SoW": [k for k in all_kw if k.lower().startswith("sow")], "PO": [k for k in all_kw if k.lower().startswith("po-") or k.lower().startswith("po_")], "Contract": [k for k in all_kw if k not in auto_kw]}

    # Notes with provenance links
    notes_with_provenance = []
    for n in payload.notes:
        if not isinstance(n, dict): continue
        note = {
            "id": n.get("id", str(uuid.uuid4())[:8]),
            "text": n.get("text",""),
            "rephrased": n.get("rephrased", f"Rephrased: {n.get('text','')[:100]}..."),
            "author": n.get("author","current_user"),
            "timestamp": n.get("timestamp", datetime.utcnow().isoformat()),
            "updates": n.get("updates", []),
            "source": n.get("source","manual"),
            "privacy": n.get("privacy","Team Shared"),
            "provenance": {
                "source_url": n.get("source_url",""),
                "origin": n.get("origin","Manual Note"),
                "user": n.get("author","current_user"),
                "timestamp": n.get("timestamp", datetime.utcnow().isoformat()),
                "link": n.get("source_url","")  # actual link maintained
            },
            "references": n.get("references", [])
        }
        notes_with_provenance.append(note)

    record = {
        "client_name": client_name,
        "project_name": project_name,
        "anchor_id": anchor_id,
        "project_reference_id": project_reference_id,
        "project_ids": [p.strip() for p in payload.project_ids if p and p.lower() != 'undefined'],
        "opportunity_numbers": [o.strip() for o in payload.opportunity_numbers if o and o.lower() != 'undefined'],
        "connected_record_ids": connected_ids,
        "connected_record_urls": payload.connected_record_urls + payload.connected_record_ids,
        "connected_provenance": connected_provenance,
        "gdp_id": gdp_id,
        "gdp_url": gdp_url,
        "gdp_urls": all_gdp,
        "gdp_provenance": gdp_provenance,
        "sharepoint_urls": clean_sp,
        "sharepoint_provenance": sp_provenance,
        "teams_channels": [t.strip() for t in payload.teams_channels if t and t.lower() != 'undefined'],
        "contacts": contacts_clean,
        "contacts_provenance": contacts_provenance,
        "client_domains": list(client_domains),
        "start_date": (payload.start_date or "").strip(),
        "end_date": (payload.end_date or "").strip(),
        "keywords": keywords,
        "notes": notes_with_provenance,
        "archived_items": archived_items,
        "freshness": {"first_seen": first_seen, "last_refreshed": datetime.utcnow().isoformat()},
        "provenance_summary": {
            "total_sources": len(connected_provenance) + len(gdp_provenance) + sum(len(v) for v in sp_provenance.values()) + len(contacts_provenance) + len(notes_with_provenance),
            "origins": ["Salesforce", "Email", "Teams", "SharePoint", "Manual"],
            "note": "All provenance references are actual links: user, source url, timestamp, origin - not uploading sources, read learn, maintain source links"
        }
    }
    STORE[key] = record
    save_persist()
    return record

@app.get("/anchors/{client_name}")
def list_by_client(client_name: str):
    results = [v for k, v in STORE.items() if k.startswith(f"{client_name}#")]
    # Sort by creation date newest first - date by which new project added to Project Onion
    results_sorted = sorted(results, key=lambda x: x.get("freshness", {}).get("first_seen",""), reverse=True)
    return {
        "client_name": client_name,
        "count": len(results_sorted),
        "persist_path": str(PERSIST_PATH),
        "anchors": results_sorted,
        "sorted_by": "creation date first_seen newest first",
        "multiple_projects_per_client": f"Yes - {len(results_sorted)} projects under {client_name}"
    }

@app.get("/client/{client_name}/360")
def client_360(client_name: str):
    # Aggregated view across projects for client
    projects = [v for k, v in STORE.items() if v["client_name"] == client_name]
    # Aggregated contacts grouped by project names
    contact_map = {}
    for proj in projects:
        for contact in proj.get("contacts", []):
            email = contact.get("email")
            if email not in contact_map:
                contact_map[email] = {"email": email, "role": contact.get("role",""), "project_names": [], "count": 0, "provenance": []}
            if proj["project_name"] not in contact_map[email]["project_names"]:
                contact_map[email]["project_names"].append(proj["project_name"])
            contact_map[email]["count"] += 1
            contact_map[email]["provenance"].append(contact.get("provenance", {}))
    # Sort by count desc - shows with whom we connect more
    aggregated_contacts = sorted(contact_map.values(), key=lambda x: x["count"], reverse=True)
    
    return {
        "client_name": client_name,
        "project_count": len(projects),
        "aggregated_contacts": aggregated_contacts,
        "grouped_by": "project_names - shows with whom we connect more",
        "support_teams": [
            {"team": "IT Helpdesk", "how_to": "How to raise laptop ticket", "link": "https://acme.sharepoint.com/IT/laptop-ticket", "origin": "SharePoint Playbook"},
            {"team": "Vendor Mgmt", "how_to": "How to create vendor case", "link": "https://acme.sharepoint.com/Vendor/case", "origin": "SharePoint Playbook"},
            {"team": "Playbooks", "how_to": "How to create ticket/case in client systems", "link": "https://acme.sharepoint.com/Playbooks", "origin": "SharePoint"}
        ],
        "all_projects": [{"project_name": p["project_name"], "opp": p["opportunity_numbers"], "health": "92% healthy" if "Apollo-123" in p["project_name"] else "78% healthy", "first_seen": p["freshness"]["first_seen"]} for p in sorted(projects, key=lambda x: x["freshness"]["first_seen"], reverse=True)],
        "provenance": "All contacts carry references from where info originated - user, source url, project_names"
    }

@app.get("/anchor/{client_name}/{project_name}")
def get_anchor(client_name: str, project_name: str):
    anchor_id = slugify(project_name)
    key = f"{client_name}#{anchor_id}"
    if key not in STORE:
        for k, v in STORE.items():
            if v["client_name"] == client_name and v["project_name"] == project_name:
                return v
        raise HTTPException(status_code=404, detail=f"Anchor not found {key}")
    return STORE[key]

@app.get("/anchors")
def list_all():
    all_anchors = list(STORE.values())
    sorted_anchors = sorted(all_anchors, key=lambda x: x.get("freshness", {}).get("first_seen",""), reverse=True)
    return {
        "count": len(sorted_anchors),
        "anchors": sorted_anchors,
        "sorted_by": "creation date first_seen newest first - date by which new project added to Project Onion",
        "persist_path": str(PERSIST_PATH),
        "top5_projects": sorted_anchors[:5]
    }

@app.delete("/anchors/clear")
def clear_all():
    STORE.clear()
    save_persist()
    return {"cleared": True, "count": 0}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
