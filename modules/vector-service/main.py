from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List, Any, Optional
import json

from store import vector_store

app = FastAPI(title="Project Onion Vector Service", version="1.0.1-privacyfix")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8002", "http://localhost:8000", "*"],  # Allow all for hackathon
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class CardPayload(BaseModel):
    id: str
    author: str = "Walter"
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
    """Health check endpoint"""
    return {"status": "ok", "engine": "ChromaDB"}

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
        card_id = vector_store.ingest_card(payload)
        stored_private = "private" in str(payload.get("privacy", "") or "").lower() or str(payload.get("privacy", "") or "").strip().lower() in ("my notes", "my_notes", "my-notes", "mynotes") or bool(payload.get("is_private") or payload.get("isPrivate"))
        return {"status": "success", "id": card_id, "is_private": stored_private}
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

@app.post("/ask")
async def ask_question(request: AskRequest):
    """Query the vector store with semantic search"""
    try:
        # Get top matches from vector store
        results = vector_store.query_vector_store(
            query_text=request.query,
            project=request.project,
            active_persona=request.activePersona,
            top_k=4
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
        
        # Simple answer placeholder (in a real implementation, this would be the LLM response)
        answer = f"Found {len(retrieved)} relevant results for your query. See citations below."
        
        return {
            "answer": answer,
            "citations": citations,
            "retrieved": retrieved,
            "engine": "chromadb"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing query: {str(e)}")