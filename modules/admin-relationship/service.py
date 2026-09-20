from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional
import json, pathlib
from datetime import datetime

app = FastAPI(title="Admin Relationship - Editable Mapping", version="v0.11-relationship-model")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE = pathlib.Path(__file__).parent
MODEL_PATH = pathlib.Path("/Users/wolf/Developer/project_onion/data/seed/relationship_model.json")
# Fallback to local seed if not exists
LOCAL_MODEL = BASE.parent.parent / "data" / "seed" / "relationship_model.json"
if not MODEL_PATH.exists() and LOCAL_MODEL.exists():
    MODEL_PATH = LOCAL_MODEL

def load_model():
    if MODEL_PATH.exists():
        with open(MODEL_PATH) as f:
            return json.load(f)
    # Default empty model
    return {"version": "v0.11", "nodes": [], "edges": [], "reusable_config_pattern": {}}

def save_model(model):
    # For hackathon: save to data/seed/relationship_model.json - Data as Code versioned
    target = pathlib.Path("/Users/wolf/Developer/project_onion/data/seed/relationship_model.json")
    if not target.parent.exists():
        target.parent.mkdir(parents=True, exist_ok=True)
    with open(target, "w") as f:
        json.dump(model, f, indent=2)
    return target

class NodeUpdate(BaseModel):
    id: str
    label: Optional[str] = None
    primary_identifiers: Optional[List[str]] = None
    fields: Optional[List[Dict]] = None
    filter_keywords: Optional[List[Dict]] = None
    notes: Optional[str] = None

class EdgeUpdate(BaseModel):
    from_node: str
    to_node: str
    field: str
    condition: str  # EXACT, CONTAINS, DOMAIN, DATE_RANGE, TOKEN_OVERLAP, URL_CONTAINS
    label: str
    description: str

@app.get("/")
def root():
    model = load_model()
    return {
        "service": "admin-relationship",
        "status": "ok",
        "version": "v0.11-relationship-model",
        "port": 8005,
        "model_path": str(MODEL_PATH),
        "count": {"nodes": len(model.get("nodes", [])), "edges": len(model.get("edges", []))},
        "reusable_config": model.get("reusable_config_pattern", {}),
        "anti_hallucination": model.get("anti_hallucination", {}),
        "endpoints": {
            "GET /model": "Full relationship_model.json - Data as Code - source of truth",
            "PUT /node/{node_id}": "Update node fields, identifiers, filter_keywords - admin adds/maintain/update",
            "POST /node": "Add new node - new system",
            "PUT /edge": "Add/update edge - relationship with typed condition",
            "GET /nodes/{group}": "Filter nodes by group master/anchor/sharepoint/gdp/comm/connected",
            "GET /config/identifiers": "Primary + secondary identifiers - reusable not free text",
            "GET /config/filters": "Filter keywords typed EXACT CONTAINS DOMAIN DATE_RANGE TOKEN_OVERLAP URL_CONTAINS"
        }
    }

@app.get("/model")
def get_model():
    return load_model()

@app.get("/nodes/{group}")
def get_nodes_by_group(group: str):
    model = load_model()
    nodes = [n for n in model.get("nodes", []) if n.get("group") == group]
    return {"group": group, "count": len(nodes), "nodes": nodes}

@app.get("/config/identifiers")
def get_identifiers():
    model = load_model()
    pattern = model.get("reusable_config_pattern", {})
    return {
        "primary_identifiers": pattern.get("primary_identifiers", []),
        "secondary_identifiers": pattern.get("secondary_identifiers", []),
        "source": "Typed enum not free text - primary unique vs secondary ref - from relationship_model.json"
    }

@app.get("/config/filters")
def get_filters():
    model = load_model()
    pattern = model.get("reusable_config_pattern", {})
    return {
        "filter_keywords_typed": pattern.get("filter_keywords_typed", {}),
        "conditions_no_free_text": pattern.get("conditions_no_free_text", ""),
        "note": "Use typed enum EXACT CONTAINS DOMAIN DATE_RANGE TOKEN_OVERLAP URL_CONTAINS not free text"
    }

@app.put("/node/{node_id}")
def update_node(node_id: str, payload: NodeUpdate):
    model = load_model()
    nodes = model.get("nodes", [])
    found = None
    for n in nodes:
        if n["id"] == node_id:
            found = n
            if payload.label: n["label"] = payload.label
            if payload.primary_identifiers: n["primary_identifiers"] = payload.primary_identifiers
            if payload.fields: n["fields"] = payload.fields
            if payload.filter_keywords: n["filter_keywords"] = payload.filter_keywords
            if payload.notes: n["notes"] = payload.notes
            break
    if not found:
        raise HTTPException(status_code=404, detail=f"Node {node_id} not found")
    model["nodes"] = nodes
    model["generated_at"] = datetime.utcnow().isoformat()
    save_model(model)
    return {"updated": True, "node_id": node_id, "node": found, "model_path": str(MODEL_PATH), "note": "Committed to Git as Data as Code data/seed/relationship_model.json - versioned with tag - not DVC"}

@app.post("/node")
def add_node(payload: Dict):
    model = load_model()
    nodes = model.get("nodes", [])
    if any(n["id"] == payload.get("id") for n in nodes):
        raise HTTPException(status_code=400, detail=f"Node {payload.get('id')} already exists - use PUT to update")
    nodes.append(payload)
    model["nodes"] = nodes
    model["generated_at"] = datetime.utcnow().isoformat()
    save_model(model)
    return {"added": True, "node": payload, "count": len(nodes)}

@app.put("/edge")
def upsert_edge(payload: EdgeUpdate):
    model = load_model()
    edges = model.get("edges", [])
    # Remove existing edge from->to if exists
    edges = [e for e in edges if not (e.get("from") == payload.from_node and e.get("to") == payload.to_node)]
    new_edge = {
        "from": payload.from_node,
        "to": payload.to_node,
        "field": payload.field,
        "condition": payload.condition,
        "label": payload.label,
        "description": payload.description
    }
    # Validate condition enum
    allowed = ["EXACT", "CONTAINS", "DOMAIN", "DATE_RANGE", "TOKEN_OVERLAP", "URL_CONTAINS"]
    if payload.condition not in allowed:
        raise HTTPException(status_code=400, detail=f"Condition must be one of {allowed} - no free text")
    edges.append(new_edge)
    model["edges"] = edges
    model["generated_at"] = datetime.utcnow().isoformat()
    save_model(model)
    return {"upserted": True, "edge": new_edge, "count": len(edges)}

@app.get("/config/export/markdown")
def export_markdown():
    model = load_model()
    # Simple markdown export
    md = f"# RELATIONSHIP_MODEL Export {model.get('version')} {datetime.utcnow().isoformat()}\n\n"
    md += f"## Nodes {len(model.get('nodes', []))}\n"
    for n in model.get("nodes", []):
        md += f"- **{n['label']}** ({n['id']}) group {n.get('group')} — primary {n.get('primary_identifiers')} — fields {len(n.get('fields', []))}\n"
    md += f"\n## Edges {len(model.get('edges', []))}\n"
    for e in model.get("edges", []):
        md += f"- {e['from']} -> {e['to']} [{e['condition']}] {e['field']} — {e['label']}\n"
    return {"markdown": md}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8005)