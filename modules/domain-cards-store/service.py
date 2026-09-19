# domain-cards-store/service.py — Cards Store — freshness + weekly bucket — corrected naming GE Aero

from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta
import re

app = FastAPI(title="Cards Store", version="v0.6-corrected-naming")

STORE = {}

def slugify(text: str) -> str:
    import re as re2
    text = text.upper()
    text = re2.sub(r'[^A-Z0-9]+', '-', text)
    text = re2.sub(r'-+', '-', text).strip('-')
    return text

class CardCreate(BaseModel):
    client_name: str  # GE Aero — PRIMARY FILTER dropdown NOT editable
    project_ref_name: str  # GE Aero DIP Discovery — second level editable
    anchor_id: str  # GEAERO-DIP-DISCOVERY
    card_type: str  # timeline, doc, budget, stakeholder
    title: str
    week: Optional[str] = None  # Week 33 — for weekly bucket
    significance_score: float = 0.5  # 0.9-1.0 EXTENSION/APPROVAL, 0.25 CHASING — noise filter
    source_rows: List[str] = []  # Row12+Row18 — multi-row intelligence hash
    content: str
    freshness_days: int = 0  # 0 = today, 2 = 2d ago green, 30+ = >1 month red Stale

@app.get("/")
def root():
    return {
        "service": "domain-cards-store",
        "status": "ok",
        "levels": {
            "first_level": "Client Master GE Aero PRIMARY FILTER dropdown NOT editable",
            "second_level": "ProjectRef GE Aero DIP Discovery editable anchor_id GEAERO-DIP-DISCOVERY"
        },
        "freshness": "2d ago green >1 month red Stale",
        "weekly_bucket": "significance 0.9-1.0 EXTENSION/APPROVAL vs 0.25 CHASING — noise filter"
    }

@app.put("/card/{client_name}/{anchor_id}/{card_id}")
def create_card(client_name: str, anchor_id: str, card_id: str, payload: CardCreate):
    key = f"{client_name}#{anchor_id}#{card_id}"
    freshness_label = "today"
    freshness_color = "green"
    if payload.freshness_days == 1:
        freshness_label = "1d ago"
        freshness_color = "green"
    elif payload.freshness_days == 2:
        freshness_label = "2d ago"
        freshness_color = "green"
    elif payload.freshness_days >= 30:
        freshness_label = f"{payload.freshness_days}d ago Stale"
        freshness_color = "red"
    else:
        freshness_label = f"{payload.freshness_days}d ago"
        freshness_color = "green" if payload.freshness_days < 7 else "yellow"

    record = {
        "client_name": payload.client_name,
        "project_ref_name": payload.project_ref_name,
        "anchor_id": payload.anchor_id,
        "card_id": card_id,
        "card_type": payload.card_type,
        "title": payload.title,
        "week": payload.week,
        "significance_score": payload.significance_score,
        "source_rows": payload.source_rows,
        "content": payload.content,
        "freshness": {"days": payload.freshness_days, "label": freshness_label, "color": freshness_color, "last_refreshed": datetime.utcnow().isoformat()},
        "level_info": {
            "first_level": f"Client Master {payload.client_name} PRIMARY FILTER",
            "second_level": f"ProjectRef {payload.project_ref_name} editable anchor_id {payload.anchor_id}"
        },
        "pastel_tokens": {"--pastel-blue": "#D6E8FF", "--pastel-mint": "#D6F5E8", "--pastel-yellow": "#FFF5D6"}
    }
    STORE[key] = record
    return record

@app.get("/cards/{client_name}")
def list_cards_by_client(client_name: str):
    results = [v for k, v in STORE.items() if k.startswith(f"{client_name}#")]
    return {"client_name": client_name, "count": len(results), "level": "First Level PRIMARY FILTER", "cards": results}

@app.get("/cards/{client_name}/{anchor_id}")
def list_cards_by_anchor(client_name: str, anchor_id: str):
    results = [v for k, v in STORE.items() if k.startswith(f"{client_name}#{anchor_id}#")]
    return {"client_name": client_name, "anchor_id": anchor_id, "count": len(results), "level": "Second Level ProjectRef editable", "cards": results}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)