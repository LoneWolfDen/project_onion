from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict
import hashlib, re, uuid, json, os
from datetime import datetime
from pathlib import Path

app = FastAPI(title="Anchor Service + Registration", version="v0.12.3-thorough-fix")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

STORE = {}
CONNECTED_REGEX = re.compile(r'^006[A-Za-z0-9]{15}$')

# v0.12.3: Persistence to survive restart - Data as Code - not just in-memory
PERSIST_PATH = Path(__file__).parent.parent.parent / "data" / "seed" / "anchors_persist.json"
# Fallback for local dev
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

def load_persist():
    global STORE
    if PERSIST_PATH.exists():
        try:
            with open(PERSIST_PATH) as f:
                data = json.load(f)
                STORE = data.get("store", {})
                print(f"[PERSIST] Loaded {len(STORE)} anchors from {PERSIST_PATH}")
        except Exception as e:
            print(f"[PERSIST] Failed to load {PERSIST_PATH}: {e}")
            STORE = {}

def save_persist():
    try:
        with open(PERSIST_PATH, "w") as f:
            json.dump({"store": STORE, "saved_at": datetime.utcnow().isoformat(), "version": "v0.12.3"}, f, indent=2)
        print(f"[PERSIST] Saved {len(STORE)} anchors to {PERSIST_PATH}")
    except Exception as e:
        print(f"[PERSIST] Failed to save {PERSIST_PATH}: {e}")

# Load on startup
load_persist()

class AnchorCreate(BaseModel):
    client_name: str
    project_name: str
    project_ref_name: Optional[str] = None
    project_ids: List[str] = []
    opportunity_numbers: List[str] = []
    connected_record_ids: List[str] = []
    gdp_id: Optional[str] = None
    gdp_url: Optional[str] = None
    sharepoint_urls: Dict[str, List[str]] = {}
    teams_channels: List[str] = []
    contacts: List[Dict] = []
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    keywords: Dict[str, List[str]] = {}
    client_domains: List[str] = []
    project_ids_legacy: List[str] = []
    gdp_ids: List[str] = []
    sharepoint_smps: List[str] = []

def validate_connected_id(cid: str):
    cid = cid.strip()
    if not CONNECTED_REGEX.match(cid):
        if not re.match(r'^006[A-Za-z0-9]{12,15}$', cid):
            raise HTTPException(status_code=400, detail=f"Invalid ConnectedRecord {cid}")
    return cid

@app.get("/")
def root():
    return {
        "service": "platform-anchor + registration",
        "status": "ok",
        "version": "v0.12.3-thorough-fix",
        "port": 8000,
        "persist_path": str(PERSIST_PATH),
        "store_count": len(STORE),
        "fix": "v0.12.3 thorough fix - persistence to anchors_persist.json survives restart - clean field labels - existing as actual value not grey placeholder - GDP ID 8399 not 0000 - no undefined - no verbose label",
        "instructions_if_anchor_missing": "If count 0 after restart, run python modules/platform-anchor/seed_clients.py --file data/seed/clients.json --only-dip - then reload PWA"
    }

@app.put("/anchor/{client_name}/{project_name}")
def create_anchor(client_name: str, project_name: str, payload: AnchorCreate):
    client_name = payload.client_name or client_name
    project_name = payload.project_name or project_name
    if not project_name:
        raise HTTPException(status_code=400, detail="project_name required")
    payload.connected_record_ids = [validate_connected_id(cid) for cid in payload.connected_record_ids]
    if payload.project_ids_legacy:
        payload.project_ids = list(set(payload.project_ids + payload.project_ids_legacy))
    if payload.gdp_ids:
        if payload.gdp_id and payload.gdp_id not in payload.gdp_ids:
            payload.gdp_ids.append(payload.gdp_id)
        elif not payload.gdp_id and payload.gdp_ids:
            payload.gdp_id = payload.gdp_ids[0]
    if payload.sharepoint_smps and not payload.sharepoint_urls:
        payload.sharepoint_urls = {"planning_documents": payload.sharepoint_smps}
    anchor_id = slugify(project_name)
    key = f"{client_name}#{anchor_id}"
    existing = STORE.get(key)
    if existing and existing.get("project_reference_id"):
        project_reference_id = existing["project_reference_id"]
        first_seen = existing["freshness"]["first_seen"]
    else:
        project_reference_id = gen_project_reference_id(client_name, project_name)
        first_seen = datetime.utcnow().isoformat()
    gdp_id = payload.gdp_id.strip() if payload.gdp_id else ""
    if not gdp_id and payload.gdp_url:
        m = re.search(r'/project-details/(\d+)', payload.gdp_url)
        if m:
            gdp_id = m.group(1)
    clean_sp = {}
    for k, vs in (payload.sharepoint_urls or {}).items():
        clean = [v.strip() for v in vs if v and v.strip() and v.strip().lower() != 'undefined']
        if clean:
            clean_sp[k] = clean
    record = {
        "client_name": client_name,
        "project_name": project_name,
        "project_ref_name": project_name,
        "anchor_id": anchor_id,
        "project_reference_id": project_reference_id,
        "project_ids": [p.strip() for p in payload.project_ids if p and p.strip().lower() != 'undefined'],
        "opportunity_numbers": [o.strip() for o in payload.opportunity_numbers if o and o.strip().lower() != 'undefined'],
        "connected_record_ids": [c.strip() for c in payload.connected_record_ids if c and c.strip().lower() != 'undefined'],
        "gdp_id": gdp_id,
        "gdp_url": (payload.gdp_url or "").strip(),
        "gdp_ids": [gdp_id] if gdp_id else [],
        "sharepoint_urls": clean_sp,
        "teams_channels": [t.strip() for t in payload.teams_channels if t and t.strip().lower() != 'undefined'],
        "contacts": payload.contacts,
        "start_date": (payload.start_date or "").strip(),
        "end_date": (payload.end_date or "").strip(),
        "keywords": payload.keywords,
        "client_domains": [d.strip() for d in payload.client_domains if d and d.strip().lower() != 'undefined'],
        "freshness": {"first_seen": first_seen, "last_refreshed": datetime.utcnow().isoformat()},
    }
    STORE[key] = record
    save_persist()
    return record

@app.get("/anchors/{client_name}")
def list_by_client(client_name: str):
    results = [v for k, v in STORE.items() if k.startswith(f"{client_name}#")]
    return {"client_name": client_name, "count": len(results), "persist_path": str(PERSIST_PATH), "anchors": results, "note": "If count 0 after restart, run seed_clients.py --only-dip"}

@app.get("/anchor/{client_name}/{project_name}")
def get_anchor(client_name: str, project_name: str):
    anchor_id = slugify(project_name)
    key = f"{client_name}#{anchor_id}"
    if key not in STORE:
        for k, v in STORE.items():
            if v["client_name"] == client_name and v["project_name"] == project_name:
                return v
        raise HTTPException(status_code=404, detail=f"Anchor not found {key} - run seed_clients.py --only-dip if empty after restart")
    return STORE[key]

@app.get("/registration/fields")
def registration_fields():
    # v0.12.3: Clean field labels - no verbose example in label - helper below
    return {
        "version": "v0.12.3-clean-labels",
        "client_master": {"label": "Client Master (Account Name)", "field": "client_name", "helper": "First Level PRIMARY FILTER - dropdown from Connected - unique - NOT editable", "editable": False},
        "fields": [
            {"label": "Project Name", "field": "project_name", "helper": "Second Level - short anchor_id only - e.g. Agentic FullMigration - user provides after selecting client", "required": True},
            {"label": "Project Reference ID", "field": "project_reference_id", "helper": "Auto generated PRJ- + 12 hex - UniqueID for multiple IDs - read only", "auto": True},
            {"label": "Project IDs", "field": "project_ids", "helper": "e.g. 99974052, 0000606071 - multiple comma separated - PRIMARY_UNIQUE", "multiple": True},
            {"label": "Opportunity IDs", "field": "opportunity_numbers", "helper": "e.g. O-5030460, O-5552629 - Extension same GDP - multiple", "multiple": True},
            {"label": "Connected Record IDs", "field": "connected_record_ids", "helper": "e.g. 006Uj00000QOBkvIAH - 18-char ^006... - multiple", "multiple": True},
            {"label": "GDP ID", "field": "gdp_id", "helper": "e.g. 8399 - parsed from GDP URL /project-details/{id} - unique but multiple Project IDs still apply", "multiple": False},
            {"label": "GDP URL", "field": "gdp_url", "helper": "e.g. https://gdp.allegisgroup.com/gdp/#/dashboard/project-details/7189 - user gives URL -> parse ID"},
            {"label": "Collaboration Plan URL", "field": "sharepoint_urls.communications", "helper": "Communications - Collaboration Plan docx URL"},
            {"label": "Risk Log URL", "field": "sharepoint_urls.planning_documents[0]", "helper": "Planning Documents - Risk Log xlsx URL - SharePoint URL config"},
            {"label": "ESC File URL", "field": "sharepoint_urls.planning_documents[1]", "helper": "Planning Documents - ESC xlsm URL - PS-v2026.4 (O-5552629)_ESC.xlsm"},
            {"label": "SharePoint Site URL", "field": "sharepoint_urls.solution_documents", "helper": "Solution Documents - site URL"},
            {"label": "Teams Channels", "field": "teams_channels", "helper": "Dedicated channels - Pre-sales, Delivery, Closeout - multiple", "multiple": True},
            {"label": "Contacts", "field": "contacts", "helper": "From collaboration*.docx + scan - user marks relevant/not + adds - multiple", "multiple": True},
            {"label": "Client Domains", "field": "client_domains", "helper": "e.g. allegisgroup.com, ge.com - From/To domains", "multiple": True},
            {"label": "Start Date", "field": "start_date", "helper": "e.g. 01/02/2024 - Anchor start - mutable Extension new Opp same GDP", "type": "date"},
            {"label": "End Date", "field": "end_date", "helper": "e.g. 01/09/2027 - Anchor end", "type": "date"},
            {"label": "Keywords (SoW, PO, Contract)", "field": "keywords", "helper": "e.g. SoW-2024-001, PO-88921 - typed - no free text", "multiple": True},
        ]
    }

@app.delete("/anchors/clear")
def clear_all():
    STORE.clear()
    save_persist()
    return {"cleared": True, "count": 0}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)