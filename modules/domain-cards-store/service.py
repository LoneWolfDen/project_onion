from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict
from datetime import datetime
import hashlib, re

app = FastAPI(title="Cards Store", version="v0.8.1-cors-fix")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

STORE = {}

class CardCreate(BaseModel):
    client_name: str
    project_ref_name: str
    anchor_id: str
    card_type: str
    title: str
    week: Optional[str] = None
    significance_score: float = 0.5
    source_rows: List[str] = []
    content: str
    freshness_days: int = 0
    opportunity_numbers: List[str] = []
    connected_record_ids: List[str] = []
    gdp_id: Optional[str] = None
    sharepoint_smp: Optional[str] = None

def hash_clip(*parts):
    return hashlib.sha256("|".join(parts).encode()).hexdigest()[:16]

@app.get("/")
def root():
    return {
        "service": "domain-cards-store",
        "status": "ok",
        "version": "v0.8.1-cors-fix",
        "cors": "allow_origins * enabled for PWA :8002",
        "freshness": "2d ago green >1 month red Stale",
        "weekly_bucket": "0.9 EXTENSION show vs 0.25 CHASING hide"
    }

@app.put("/card/{client_name}/{anchor_id}/{card_id}")
def create_card(client_name: str, anchor_id: str, card_id: str, payload: CardCreate):
    key = f"{payload.client_name}#{payload.anchor_id}#{card_id}"
    days = payload.freshness_days
    if days <= 2:
        label, color, pastel = f"{days if days>0 else 'today'}" + (f"d ago" if days>0 else ""), "green", "#D6F5E8"
        if days==0:
            label="today"
    elif days < 30:
        label, color, pastel = f"{days}d ago", "yellow", "#FFF5D6"
    else:
        label, color, pastel = f"{days}d ago Stale", "red", "#FFD6D6"
    bucket = "HIGH EXTENSION show" if payload.significance_score>=0.9 else "MEDIUM" if payload.significance_score>=0.5 else "LOW CHASING hide"
    show = payload.significance_score>=0.5
    clip_id = hash_clip(payload.client_name, payload.anchor_id, card_id, "|".join(payload.source_rows))
    record = {
        "client_name": payload.client_name,
        "project_ref_name": payload.project_ref_name,
        "anchor_id": payload.anchor_id,
        "card_id": card_id,
        "pk": payload.anchor_id,
        "sk": card_id,
        "gsi_client_name": payload.client_name,
        "card_type": payload.card_type,
        "title": payload.title,
        "week": payload.week,
        "significance_score": payload.significance_score,
        "source_rows": payload.source_rows,
        "content": payload.content,
        "opportunity_numbers": payload.opportunity_numbers,
        "connected_record_ids": payload.connected_record_ids,
        "gdp_id": payload.gdp_id,
        "sharepoint_smp": payload.sharepoint_smp,
        "freshness": {"days": days, "label": label, "color": color, "pastel": pastel, "last_refreshed": datetime.utcnow().isoformat()},
        "weekly_bucket": {"significance": payload.significance_score, "bucket": bucket, "show_in_timeline": show, "week": payload.week},
        "pastel_tokens": {"--pastel-blue": "#D6E8FF", "--pastel-mint": "#D6F5E8"},
        "clip_id": clip_id,
        "created_at": datetime.utcnow().isoformat()
    }
    STORE[key]=record
    return record

@app.get("/cards/{client_name}")
def list_by_client(client_name: str):
    results=[v for k,v in STORE.items() if k.startswith(f"{client_name}#")]
    return {"client_name": client_name, "count": len(results), "cards": results}

@app.get("/cards/{client_name}/{anchor_id}")
def list_by_anchor(client_name: str, anchor_id: str):
    results=[v for k,v in STORE.items() if k.startswith(f"{client_name}#{anchor_id}#")]
    return {"client_name": client_name, "anchor_id": anchor_id, "count": len(results), "cards": results}

@app.get("/cards/{client_name}/{anchor_id}/timeline")
def list_timeline(client_name: str, anchor_id: str):
    all_cards=[v for k,v in STORE.items() if k.startswith(f"{client_name}#{anchor_id}#") and v["card_type"]=="timeline" and v["weekly_bucket"]["show_in_timeline"]]
    return {"client_name": client_name, "anchor_id": anchor_id, "count": len(all_cards), "timeline": sorted(all_cards, key=lambda x: x.get("week",""))}

@app.get("/card/{client_name}/{anchor_id}/{card_id}")
def get_card(client_name: str, anchor_id: str, card_id: str):
    key=f"{client_name}#{anchor_id}#{card_id}"
    if key not in STORE:
        raise HTTPException(status_code=404, detail="Card not found")
    return STORE[key]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)