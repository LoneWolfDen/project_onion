from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Dict, List, Any, Optional
import json

from store import vector_store, DISTANCE_SPACE, configured_top_k
import sys
from pathlib import Path as _P
sys.path.insert(0, str(_P(__file__).resolve().parents[1] / "_shared"))
import local_only
import scope

app = FastAPI(title="Project Onion Vector Service", version="1.0.1-privacyfix")

# CORS limited to the local PWA; origin and Host guard (PRV-03)
local_only.apply(app)

class CardPayload(BaseModel):
    id: str
    author: str = ""
    client: Optional[str] = None
    client_name: Optional[str] = None
    project: Optional[str] = None
    project_name: Optional[str] = None
    projectId: Optional[str] = None
    Project_ReferenceID: Optional[str] = None
    opportunity_id: Optional[str] = None
    contributor: Optional[str] = None
    type: Optional[str] = "Note"
    title: str = ""
    detail: Optional[str] = ""
    content: Optional[str] = ""
    synthesizedText: Optional[str] = None
    source: Optional[str] = ""
    timestamp: Optional[str] = "Just now"
    piiStatus: Optional[str] = "Clean"
    privacy: Optional[str] = "Team Shared"
    is_private: Optional[bool] = None
    isPrivate: Optional[bool] = None
    syncStatus: Optional[str] = "pending_upload"
    impactScore: Optional[float] = 0.5
    tags: List[str] = []
    created_at: Optional[str] = None

class AskRequest(BaseModel):
    query: str
    project: str
    activePersona: str
    privacyMode: str

class AskResponse(BaseModel):
    answer: str
    citations: List[str]
    retrieved: List[Dict[str, Any]]
    engine: str

@app.get("/health")
async def health_check():
    """Health check. Reports what the store holds and which distance space it was built
    with, so the PWA can score distances correctly and a store built under Chroma's old
    L2 default shows up instead of scoring wrong in silence."""
    return {"status": "ok", "engine": "ChromaDB", "space": DISTANCE_SPACE, "store": vector_store.stats()}

@app.post("/ingest")
async def ingest_card(card: CardPayload):
    """Ingest (upsert) a card into the vector store.

    Mapping fix: `privacy: "Private"` (or "My Notes (Private)" / "My Notes")
    MUST land in Chroma as is_private=True — enforced in store.is_private_card.
    Accepts both PWA field names (client_name/project_name) and vector names
    (client/project) so PWA payloads ingest without 422 errors.
    """
    try:
        payload = card.dict(exclude_none=False)
        # Normalise PWA aliases so store sees canonical keys.
        if not payload.get("client") and payload.get("client_name"):
            payload["client"] = payload["client_name"]
        if not payload.get("project") and payload.get("project_name"):
            payload["project"] = payload["project_name"]
        project = scope.require_project(payload.get("project") or payload.get("Project_ReferenceID") or payload.get("project_name"))
        payload["project"] = project
        persona, persona_source = scope.resolve_persona(payload.get("author"))
        if persona_source == "server-derived":
            payload["author"] = persona
        payload["persona_source"] = persona_source
        card_id = vector_store.ingest_card(payload)
        stored_private = "private" in str(payload.get("privacy", "") or "").lower() or str(payload.get("privacy", "") or "").strip().lower() in ("my notes", "my_notes", "my-notes", "mynotes") or bool(payload.get("is_private") or payload.get("isPrivate"))
        return {"status": "success", "id": card_id, "is_private": stored_private}
    except scope.ScopeError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error ingesting card: {str(e)}")


class DeletePayload(BaseModel):
    id: str


@app.delete("/delete")
async def delete_card(payload: DeletePayload):
    """Delete a card from the vector store (PWA delete propagation)."""
    try:
        card_id = vector_store.delete_card(payload.id)
        return {"status": "success", "id": card_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting card: {str(e)}")


@app.post("/delete")
async def delete_card_post(payload: DeletePayload):
    """POST alias for delete (sendBeacon / form-friendly clients)."""
    try:
        card_id = vector_store.delete_card(payload.id)
        return {"status": "success", "id": card_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting card: {str(e)}")

@app.post("/list")
async def list_cards(request: AskRequest):
    """Offline-first support: raw project card listing (no embedding query).
    Used by the PWA's guarded one-time sync (index.html) to check whether
    Chroma has data before ever overwriting FailoverDB local state."""
    try:
        project = scope.require_project(request.project)
        persona, persona_source = scope.resolve_persona(request.activePersona)
        cards = scope.filter_listing(vector_store.list_cards(project=project), persona)
        return {"count": len(cards), "cards": cards, "engine": "chromadb", "persona_source": persona_source}
    except scope.ScopeError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing cards: {str(e)}")

@app.post("/ask")
async def ask_question(request: AskRequest):
    """Query the vector store with semantic search"""
    try:
        # Get top matches from vector store
        project = scope.require_project(request.project)
        persona, persona_source = scope.resolve_persona(request.activePersona)
        results = vector_store.query_vector_store(
            query_text=request.query,
            project=project,
            active_persona=persona,
            top_k=configured_top_k(),
        )
        
        # Format response
        retrieved = [
            {
                "id": result["id"],
                "document": result["document"],
                "metadata": result["metadata"],
                "distance": result["distance"]
            }
            for result in results
        ]
        
        # Create citations from IDs
        citations = [result["id"] for result in retrieved]
        
        # This endpoint retrieves; it does not answer. Saying so keeps the PWA from
        # presenting a retrieval count as an AI answer (trust rule: no composed text here).
        answer = f"Retrieved {len(retrieved)} card(s) by similarity. No answer was composed."

        return {
            "answer": answer,
            "citations": citations,
            "retrieved": retrieved,
            "engine": "chromadb",
            "space": vector_store.space,
            "top_k": configured_top_k(),
            "persona_source": persona_source
        }
    except scope.ScopeError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing query: {str(e)}")