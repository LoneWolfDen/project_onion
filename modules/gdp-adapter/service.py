from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict
from datetime import datetime, timedelta
import hashlib, re

app = FastAPI(title="GDP Adapter", version="v0.9-gdp-export-active")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

STORE = {}  # key = gdp_id#client_name

class GDPCreate(BaseModel):
    gdp_id: str  # 8399
    client_name: str  # Acme Corp - PRIMARY FILTER
    project_ref_name: str  # Acme Corp DIP Discovery
    anchor_id: str  # ACME-DIP-DISCOVERY
    engagement_name: str  # from Engagement Data Export - Active - exact columns
    engagement_status: str  # Active
    opportunity_numbers: List[str] = []  # O-5030460
    connected_record_ids: List[str] = []  # 006Uj00000QOBkvIAH
    sharepoint_smps: List[str] = []  # acmespf
    budget: Optional[float] = None  # £129,768 - redacted to $XXXk in PII screener
    significance_raw: float = 0.5  # from GDP - maps to cards significance_score
    export_columns: Dict = {}  # exact columns from Engagement Data Export - Active
    freshness_days: int = 0

def hash_clip(*parts):
    return hashlib.sha256("|".join(parts).encode()).hexdigest()[:16]

@app.get("/")
def root():
    return {
        "service": "gdp-adapter",
        "status": "ok",
        "version": "v0.9-gdp-export-active",
        "port": 8003,
        "cors": "allow_origins * for PWA :8002",
        "export": "Engagement Data Export - Active - exact columns - full read on HEAD change",
        "eventbridge": "6h HEAD check for gdp_ids 8399 + sharepoint acmespf - full read on change",
        "levels": {
            "first_level": "Acme Corp PRIMARY FILTER",
            "second_level": "ACME-DIP-DISCOVERY anchor_id",
            "gdp_id": "8399 - maps to opportunity_numbers O-5030460 + connected_record_ids 006Uj..."
        },
        "significance_mapping": "GDP significance_raw 0.9 EXTENSION -> cards significance_score 0.9 show vs 0.25 CHASING hide"
    }

@app.put("/gdp/{gdp_id}")
def create_gdp(gdp_id: str, payload: GDPCreate):
    key = f"{payload.gdp_id}#{payload.client_name}"
    clip_id = hash_clip(payload.gdp_id, payload.client_name, payload.anchor_id)
    # Map GDP significance to cards significance
    if payload.significance_raw >= 0.9:
        bucket = "EXTENSION/APPROVAL 0.9-1.0 - show in timeline Laptop 50%->100%"
    elif payload.significance_raw >= 0.5:
        bucket = "MEDIUM"
    else:
        bucket = "CHASING 0.25 - noise filter hide"
    
    record = {
        "gdp_id": payload.gdp_id,
        "client_name": payload.client_name,
        "project_ref_name": payload.project_ref_name,
        "anchor_id": payload.anchor_id,
        "engagement_name": payload.engagement_name,
        "engagement_status": payload.engagement_status,
        "opportunity_numbers": payload.opportunity_numbers,
        "connected_record_ids": payload.connected_record_ids,
        "sharepoint_smps": payload.sharepoint_smps,
        "budget": payload.budget,
        "significance_raw": payload.significance_raw,
        "significance_mapped": payload.significance_raw,
        "weekly_bucket": bucket,
        "export_columns": payload.export_columns,
        "freshness": {"days": payload.freshness_days, "label": f"{payload.freshness_days}d ago" if payload.freshness_days>0 else "today", "color": "green" if payload.freshness_days<7 else "yellow" if payload.freshness_days<30 else "red", "last_refreshed": datetime.utcnow().isoformat()},
        "eventbridge_check": {"schedule": "6h HEAD check", "gdp_id": payload.gdp_id, "sharepoint": payload.sharepoint_smps, "last_head": datetime.utcnow().isoformat(), "full_read_on_change": True, "export": "Engagement Data Export - Active exact columns"},
        "level_info": {"first_level": f"{payload.client_name} PRIMARY FILTER", "second_level": f"{payload.project_ref_name} {payload.anchor_id}", "gdp": f"{payload.gdp_id} maps to O-5030460 + 006Uj..."},
        "clip_id": clip_id,
        "created_at": datetime.utcnow().isoformat()
    }
    STORE[key] = record
    return record

@app.get("/gdp/{gdp_id}")
def get_gdp(gdp_id: str):
    results = [v for k,v in STORE.items() if k.startswith(f"{gdp_id}#")]
    if not results:
        raise HTTPException(status_code=404, detail=f"GDP not found {gdp_id} - create with PUT first")
    return {"gdp_id": gdp_id, "count": len(results), "gdps": results}

@app.get("/gdps/{client_name}")
def list_by_client(client_name: str):
    results = [v for k,v in STORE.items() if v["client_name"]==client_name]
    return {"client_name": client_name, "count": len(results), "level": "First Level PRIMARY FILTER Acme Corp", "gdps": results}

@app.get("/gdps")
def list_all():
    return {"count": len(STORE), "gdps": list(STORE.values())}

@app.post("/ingest")
def ingest_gdp(payload: Dict):
    # Simulates full read on HEAD change - Engagement Data Export - Active exact columns
    gdp_id = payload.get("gdp_id", "8399")
    client_name = payload.get("client_name", "Acme Corp")
    key = f"{gdp_id}#{client_name}"
    # Exact columns from Engagement Data Export - Active - example
    export_columns = payload.get("export_columns", {
        "Engagement Name": "Acme Corp DIP Discovery",
        "Client": "Acme Corp",
        "Status": "Active",
        "GDP ID": gdp_id,
        "Opportunity Number": "O-5030460",
        "Connected Record ID": "006Uj00000QOBkvIAH",
        "SharePoint SMP": "acmespf",
        "Budget": "£129,768 - redacted to $XXXk in PII screener",
        "Engagement Data Export - Active - Exact Columns": ["Engagement Name", "Client", "Status", "GDP ID", "Opportunity Number", "Connected Record ID", "SharePoint SMP", "Budget", "Significance"]
    })
    record = {
        "gdp_id": gdp_id,
        "client_name": client_name,
        "project_ref_name": payload.get("project_ref_name", "Acme Corp DIP Discovery"),
        "anchor_id": payload.get("anchor_id", "ACME-DIP-DISCOVERY"),
        "engagement_name": export_columns.get("Engagement Name", "Acme Corp DIP Discovery"),
        "engagement_status": "Active",
        "opportunity_numbers": [export_columns.get("Opportunity Number", "O-5030460")],
        "connected_record_ids": [export_columns.get("Connected Record ID", "006Uj00000QOBkvIAH")],
        "sharepoint_smps": [export_columns.get("SharePoint SMP", "acmespf")],
        "export_columns": export_columns,
        "freshness": {"label": "today", "color": "green", "last_refreshed": datetime.utcnow().isoformat(), "head_check": "6h HEAD - full read on change"},
        "eventbridge_check": {"schedule": "6h HEAD", "full_read_on_change": True},
        "ingested_at": datetime.utcnow().isoformat()
    }
    STORE[key] = record
    return {"ingested": True, "gdp_id": gdp_id, "client_name": client_name, "record": record, "note": "Full read on HEAD change - Engagement Data Export - Active exact columns preserved"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003)