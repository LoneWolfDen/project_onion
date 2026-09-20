from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import hashlib, re
from datetime import datetime

app = FastAPI(title="Anchor Service", version="v0.8.1-cors-fix")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

STORE = {}
CONNECTED_REGEX = re.compile(r'^006[A-Za-z0-9]{15}$')

def slugify(t: str) -> str:
    t = t.upper()
    t = re.sub(r'[^A-Z0-9]+', '-', t)
    t = re.sub(r'-+', '-', t).strip('-')
    return t

class AnchorCreate(BaseModel):
    client_name: str
    project_ref_name: str
    opportunity_numbers: List[str] = []
    connected_record_ids: List[str] = []
    project_ids: List[str] = []
    gdp_ids: List[str] = []
    sharepoint_smps: List[str] = []
    teams_channels: List[str] = []
    onedrive_urls: List[str] = []

def hash_id(*parts):
    return hashlib.sha256("|".join(parts).encode()).hexdigest()[:16]

def validate_connected_id(cid: str):
    cid = cid.strip()
    if not CONNECTED_REGEX.match(cid):
        if not re.match(r'^006[A-Za-z0-9]{12,15}$', cid):
            raise HTTPException(status_code=400, detail=f"Invalid ConnectedRecord {cid}")
    return cid

@app.get("/")
def root():
    return {
        "service": "platform-anchor",
        "status": "ok",
        "version": "v0.8.1-cors-fix",
        "cors": "allow_origins * enabled for PWA :8002",
        "levels": {"first_level": "GE Aero PRIMARY FILTER dropdown NOT editable", "second_level": "GE Aero DIP Discovery editable GEAERO-DIP-DISCOVERY"},
        "org_mapping": {"OpportunityID": "O-5030460 business #", "ConnectedRecord": "006Uj... Salesforce ID"}
    }

@app.put("/anchor/{client_name}/{project_ref_name}")
def create_anchor(client_name: str, project_ref_name: str, payload: AnchorCreate):
    payload.connected_record_ids = [validate_connected_id(cid) for cid in payload.connected_record_ids]
    anchor_id = slugify(f"{client_name} {project_ref_name}")
    key = f"{payload.client_name}#{anchor_id}"
    existing = STORE.get(key)
    clip_id = hash_id(payload.client_name, anchor_id, "|".join(payload.opportunity_numbers))
    record = {
        "client_name": payload.client_name,
        "project_ref_name": payload.project_ref_name,
        "anchor_id": anchor_id,
        "opportunity_numbers": payload.opportunity_numbers,
        "connected_record_ids": payload.connected_record_ids,
        "project_ids": payload.project_ids,
        "gdp_ids": payload.gdp_ids,
        "sharepoint_smps": payload.sharepoint_smps,
        "link_table": {"opportunity_numbers": payload.opportunity_numbers, "connected_record_ids": payload.connected_record_ids},
        "freshness": {"first_seen": existing["freshness"]["first_seen"] if existing else datetime.utcnow().isoformat(), "last_refreshed": datetime.utcnow().isoformat()},
        "clip_id": clip_id,
        "level_info": {"first_level": f"{payload.client_name} PRIMARY FILTER", "second_level": f"{payload.project_ref_name} editable {anchor_id}"}
    }
    STORE[key] = record
    return record

@app.get("/anchors/{client_name}")
def list_by_client(client_name: str):
    results = [v for k, v in STORE.items() if k.startswith(f"{client_name}#")]
    return {"client_name": client_name, "count": len(results), "anchors": results}

@app.get("/anchor/{client_name}/{project_ref_name}")
def get_anchor(client_name: str, project_ref_name: str):
    anchor_id = slugify(f"{client_name} {project_ref_name}")
    key = f"{client_name}#{anchor_id}"
    if key not in STORE:
        raise HTTPException(status_code=404, detail="Anchor not found")
    return STORE[key]

@app.get("/search/opportunity/{opportunity_number}")
def search_opp(opportunity_number: str):
    results = [v for v in STORE.values() if opportunity_number in v.get("opportunity_numbers", [])]
    return {"opportunity_number": opportunity_number, "count": len(results), "anchors": results}

@app.get("/search/connected/{connected_record_id}")
def search_conn(connected_record_id: str):
    results = [v for v in STORE.values() if connected_record_id in v.get("connected_record_ids", [])]
    return {"connected_record_id": connected_record_id, "count": len(results), "anchors": results}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)