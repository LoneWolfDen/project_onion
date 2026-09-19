# platform-anchor/service.py — v0.6 — Corrected naming GE Aero + GE Aero DIP Discovery
# First Level = Client Master PRIMARY FILTER dropdown NOT editable = GE Aero
# Second Level = ProjectRef logical grouping UNDER Client editable = GE Aero DIP Discovery
# anchor_id = slugified GEAERO-DIP-DISCOVERY

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import hashlib
import re
from datetime import datetime

app = FastAPI(title="Project Onion Anchor Service", version="v0.6-corrected-naming")

STORE = {}

OPPORTUNITY_REGEX = re.compile(r'O-\d+')
CONNECTED_REGEX = re.compile(r'^006[A-Za-z0-9]{15}$')

def slugify(text: str) -> str:
    # GE Aero DIP Discovery -> GEAERO-DIP-DISCOVERY
    import re as re2
    text = text.upper()
    text = re2.sub(r'[^A-Z0-9]+', '-', text)
    text = re2.sub(r'-+', '-', text).strip('-')
    return text

class AnchorCreate(BaseModel):
    client_name: str  # GE Aero — PRIMARY FILTER dropdown — NOT editable — from Client Master
    project_ref_name: str  # GE Aero DIP Discovery — second level editable — user can rename
    opportunity_numbers: List[str] = []  # O-5030460 business #
    connected_record_ids: List[str] = []  # 006Uj00000QOBkvIAH Salesforce 18-char
    project_ids: List[str] = []
    gdp_ids: List[str] = []
    sharepoint_smps: List[str] = []
    teams_channels: List[str] = []
    onedrive_urls: List[str] = []

class AnchorResponse(AnchorCreate):
    anchor_id: str  # GEAERO-DIP-DISCOVERY — slugified client + project_ref — readable
    link_table: dict
    freshness: dict
    validation_prompt: Optional[str] = None
    created_at: str
    clip_id: str
    level_info: dict

def hash_id(*parts):
    return hashlib.sha256("|".join(parts).encode()).hexdigest()[:16]

def validate_opportunity_number(opp: str):
    if not re.match(r'O-\d+', opp):
        raise HTTPException(status_code=400, detail=f"Invalid OpportunityID {opp} expected O-5030460")

def validate_connected_id(cid: str):
    cid = cid.strip()
    if not CONNECTED_REGEX.match(cid):
        if not re.match(r'^006[A-Za-z0-9]{12,15}$', cid):
            raise HTTPException(status_code=400, detail=f"Invalid ConnectedRecord {cid} expected 006Uj00000QOBkvIAH 18 chars")
    return cid

@app.get("/")
def root():
    return {
        "service": "platform-anchor",
        "status": "ok",
        "version": "v0.6-corrected-naming",
        "levels": {
            "first_level": "Client Master = GE Aero = PRIMARY FILTER = dropdown = NOT editable",
            "second_level": "ProjectRef = GE Aero DIP Discovery = logical grouping UNDER Client = editable"
        },
        "org_mapping": {"OpportunityID": "O-5030460 business #", "ConnectedRecord": "006Uj... Salesforce ID"},
        "example": {"client_name": "GE Aero", "project_ref_name": "GE Aero DIP Discovery", "anchor_id": "GEAERO-DIP-DISCOVERY"}
    }

@app.put("/anchor/{client_name}/{project_ref_name}", response_model=AnchorResponse)
def create_or_update_anchor(client_name: str, project_ref_name: str, payload: AnchorCreate):
    for opp in payload.opportunity_numbers:
        validate_opportunity_number(opp)
    payload.connected_record_ids = [validate_connected_id(cid) for cid in payload.connected_record_ids]

    # Corrected anchor_id: slugified client + project_ref — e.g., GEAERO-DIP-DISCOVERY
    anchor_id = slugify(f"{client_name} {project_ref_name}")
    # For backward compat with GE Discovery -> GEAERO-DIP-DISCOVERY
    # If client_name == GE Aero and project_ref_name == GE Aero DIP Discovery -> GEAERO-GE-AERO-DIP-DISCOVERY -> simplify to GEAERO-DIP-DISCOVERY
    # Keep full slug for uniqueness
    existing_key = f"{payload.client_name}#{anchor_id}"
    existing = STORE.get(existing_key)
    
    validation_prompt = None
    if existing:
        new_cids = set(payload.connected_record_ids) - set(existing.get("connected_record_ids", []))
        if new_cids and existing.get("sharepoint_smps"):
            validation_prompt = f"We found new ConnectedRecord {list(new_cids)[0]} linked to same SharePoint {existing['sharepoint_smps'][0]} — Relevant? Yes/No/Edit — add to ProjectRef {anchor_id}?"

    clip_id = hash_id(payload.client_name, anchor_id, "|".join(payload.opportunity_numbers), "|".join(payload.connected_record_ids))

    record = {
        "client_name": payload.client_name,
        "project_ref_name": payload.project_ref_name,
        "anchor_id": anchor_id,
        "opportunity_numbers": payload.opportunity_numbers,
        "connected_record_ids": payload.connected_record_ids,
        "project_ids": payload.project_ids,
        "gdp_ids": payload.gdp_ids,
        "sharepoint_smps": payload.sharepoint_smps,
        "teams_channels": payload.teams_channels,
        "onedrive_urls": payload.onedrive_urls,
        "link_table": {
            "opportunity_numbers": payload.opportunity_numbers,
            "connected_record_ids": payload.connected_record_ids,
            "project_ids": payload.project_ids,
            "gdp_ids": payload.gdp_ids,
            "sharepoint_smps": payload.sharepoint_smps
        },
        "freshness": {"first_seen": existing["freshness"]["first_seen"] if existing else datetime.utcnow().isoformat(), "last_refreshed": datetime.utcnow().isoformat()},
        "validation_prompt": validation_prompt,
        "created_at": datetime.utcnow().isoformat(),
        "clip_id": clip_id,
        "level_info": {
            "first_level": f"Client Master = {payload.client_name} = PRIMARY FILTER dropdown NOT editable",
            "second_level": f"ProjectRef = {payload.project_ref_name} = editable, anchor_id = {anchor_id}"
        }
    }

    STORE[existing_key] = record
    return record

@app.get("/anchor/{client_name}/{project_ref_name}")
def get_anchor(client_name: str, project_ref_name: str):
    anchor_id = slugify(f"{client_name} {project_ref_name}")
    key = f"{client_name}#{anchor_id}"
    if key not in STORE:
        # Try legacy key format for GE Discovery
        legacy_key = f"{client_name}#GE-GE-Discovery"
        if legacy_key in STORE:
            return STORE[legacy_key]
        raise HTTPException(status_code=404, detail=f"Anchor not found {anchor_id} — create with PUT first — client {client_name} is PRIMARY FILTER")
    return STORE[key]

@app.get("/anchors/{client_name}")
def list_anchors_by_client(client_name: str):
    results = [v for k, v in STORE.items() if k.startswith(f"{client_name}#")]
    return {"client_name": client_name, "count": len(results), "level": "First Level = Client Master = PRIMARY FILTER dropdown NOT editable", "anchors": results}

@app.get("/search/opportunity/{opportunity_number}")
def search_by_opportunity_number(opportunity_number: str):
    results = [v for v in STORE.values() if opportunity_number in v.get("opportunity_numbers", [])]
    return {"opportunity_number": opportunity_number, "count": len(results), "note": "Users search by business O-5030460 from file names PS-v2026.2a-...-(O-5030460)-V6.3_ESC", "anchors": results}

@app.get("/search/connected/{connected_record_id}")
def search_by_connected_record(connected_record_id: str):
    results = [v for v in STORE.values() if connected_record_id in v.get("connected_record_ids", [])]
    return {"connected_record_id": connected_record_id, "count": len(results), "note": "Provenance by Salesforce URL /Opportunity/006Uj.../view", "anchors": results}

@app.post("/test/pii-check")
def test_pii_check(payload: dict):
    text = str(payload)
    pii_detected = any(x in text.lower() for x in ["@","£","8261003","alex","uk"])
    return {"pii_detected": pii_detected, "redacted_text": text[:100] + " REDACTED $XXXk EMP-XXXX User_A@client.com" if pii_detected else text[:100], "must_call_pii_screener_before_save": True}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)