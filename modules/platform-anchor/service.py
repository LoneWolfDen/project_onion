# platform-anchor/service.py — Anchor Service CRUD — O-5030460 business # vs 006Uj... ConnectedRecord — Testable API
# pip install fastapi uvicorn pydantic

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import hashlib
import re
from datetime import datetime

app = FastAPI(title="Project Onion Anchor Service", version="v0.5")

# In-memory store for local testing — replace with DynamoDB for prod
# PK: client_name, SK: anchor_id#opportunity_number#connected_record_id#smp#gdp_id
STORE = {}

OPPORTUNITY_REGEX = re.compile(r'O-\d+')
CONNECTED_REGEX = re.compile(r'006Uj[A-Za-z0-9]{15}')

class AnchorCreate(BaseModel):
    client_name: str  # PRIMARY FILTER — e.g., Ge Aviation Uk — from Client Master
    project_ref_name: str  # logical grouping e.g., GE Discovery
    opportunity_numbers: List[str] = []  # O-5030460 business # — from file names PS-v2026.2a-...-(O-5030460)-V6.3_ESC
    connected_record_ids: List[str] = []  # 006Uj00000QOBkvIAH Salesforce 18-char ID — from URL /Opportunity/006Uj.../view
    project_ids: List[str] = []
    gdp_ids: List[str] = []  # 8399
    sharepoint_smps: List[str] = []  # geadinspf
    teams_channels: List[str] = []
    onedrive_urls: List[str] = []

class AnchorResponse(AnchorCreate):
    anchor_id: str
    link_table: dict
    freshness: dict
    validation_prompt: Optional[str] = None
    created_at: str
    clip_id: str

def hash_id(*parts):
    return hashlib.sha256("|".join(parts).encode()).hexdigest()[:16]

def validate_opportunity_number(opp: str):
    if not OPPORTUNITY_REGEX.match(opp):
        # Allow O-5030460-Extension format
        if not re.match(r'O-\d+.*', opp):
            raise HTTPException(status_code=400, detail=f"Invalid OpportunityID format {opp} — expected O-5030460")

def validate_connected_id(cid: str):
    if not CONNECTED_REGEX.match(cid):
        raise HTTPException(status_code=400, detail=f"Invalid ConnectedRecord format {cid} — expected 006Uj00000QOBkvIAH")

@app.get("/")
def root():
    return {"service": "platform-anchor", "status": "ok", "tags": ["v0.4.1-readme-hdd"], "org_mapping": {"OpportunityID": "O-5030460 business #", "ConnectedRecord": "006Uj... Salesforce ID"}}

@app.put("/anchor/{client_name}/{project_ref_name}", response_model=AnchorResponse)
def create_or_update_anchor(client_name: str, project_ref_name: str, payload: AnchorCreate):
    # Validate
    for opp in payload.opportunity_numbers:
        validate_opportunity_number(opp)
    for cid in payload.connected_record_ids:
        validate_connected_id(cid)

    anchor_id = hash_id(client_name, project_ref_name)[:12]  # e.g., GE-Discovery hash
    # Actually use readable anchor_id: client-project_ref normalized
    readable_anchor = f"{client_name[:2].upper()}-{project_ref_name.replace(' ', '-')}"  # GE-Discovery
    
    # Check for existing — multi-multi validation
    existing_key = f"{client_name}#{readable_anchor}"
    existing = STORE.get(existing_key)
    
    validation_prompt = None
    if existing:
        # If new ConnectedRecord found linked to same SMP with same O-5030460 base — prompt Relevant? Yes/No/Edit
        new_cids = set(payload.connected_record_ids) - set(existing.get("connected_record_ids", []))
        new_smps = set(payload.sharepoint_smps) - set(existing.get("sharepoint_smps", []))
        if new_cids and existing.get("sharepoint_smps"):
            # Simulate finding OPP-8893 linked to same SharePoint geadinspf
            validation_prompt = f"We found new ConnectedRecord {list(new_cids)[0]} linked to same SharePoint {existing['sharepoint_smps'][0]} — Relevant? Yes/No/Edit — add to ProjectRef {readable_anchor}?"

    clip_id = hash_id(client_name, readable_anchor, "|".join(payload.opportunity_numbers), "|".join(payload.connected_record_ids))

    record = {
        "client_name": payload.client_name,
        "project_ref_name": payload.project_ref_name,
        "anchor_id": readable_anchor,
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
        "clip_id": clip_id
    }

    STORE[existing_key] = record
    return record

@app.get("/anchor/{client_name}/{project_ref_name}", response_model=AnchorResponse)
def get_anchor(client_name: str, project_ref_name: str):
    readable_anchor = f"{client_name[:2].upper()}-{project_ref_name.replace(' ', '-')}"
    key = f"{client_name}#{readable_anchor}"
    if key not in STORE:
        raise HTTPException(status_code=404, detail="Anchor not found — create with PUT first")
    return STORE[key]

@app.get("/anchors/{client_name}")
def list_anchors_by_client(client_name: str):
    # PRIMARY FILTER — Client Master dropdown — only returns anchors for this client
    results = [v for k, v in STORE.items() if k.startswith(f"{client_name}#")]
    return {"client_name": client_name, "count": len(results), "anchors": results}

@app.get("/search/opportunity/{opportunity_number}")
def search_by_opportunity_number(opportunity_number: str):
    # Search by business O-5030460 — users search by this
    results = [v for v in STORE.values() if opportunity_number in v.get("opportunity_numbers", [])]
    return {"opportunity_number": opportunity_number, "count": len(results), "anchors": results}

@app.get("/search/connected/{connected_record_id}")
def search_by_connected_record(connected_record_id: str):
    # Search by Salesforce 006Uj... — provenance by URL
    results = [v for v in STORE.values() if connected_record_id in v.get("connected_record_ids", [])]
    return {"connected_record_id": connected_record_id, "count": len(results), "anchors": results}

# Test endpoint for PII screener middleware check
@app.post("/test/pii-check")
def test_pii_check(payload: dict):
    # Simulate platform-pii-screener middleware — must call before any save — CI fails if module saves without calling it
    text = str(payload)
    pii_detected = any(x in text.lower() for x in ["@","£","8261003","alex","uk"])
    return {"pii_detected": pii_detected, "redacted_text": text[:100] + " REDACTED $XXXk EMP-XXXX User_A@client.com" if pii_detected else text[:100], "must_call_pii_screener_before_save": True}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)