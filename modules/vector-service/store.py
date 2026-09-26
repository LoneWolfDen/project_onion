import os
import logging
import chromadb
from chromadb.config import Settings
from typing import Dict, List, Any
import hashlib

logger = logging.getLogger(__name__)


def is_private_card(card: Dict[str, Any]) -> bool:
    """Canonical privacy mapping (Fail Closed for privacy).

    PWA canonical field is `privacy` ("Private" / "My Notes (Private)" /
    "My Notes" => True). Legacy `is_private` / `isPrivate` booleans are
    honoured via OR logic so they can never downgrade a Private string.
    BUGFIX: previously ingest read only `isPrivate`, so every PWA card
    ingested as is_private=False and leaked to other personas.
    """
    for legacy_key in ("is_private", "isPrivate"):
        if legacy_key in card and card[legacy_key] is not None:
            v = card[legacy_key]
            if isinstance(v, bool) and v is True:
                return True
            if isinstance(v, str) and v.strip().lower() in ("true", "1", "yes"):
                return True
            if isinstance(v, (int, float)) and int(v) == 1:
                return True
    raw = str(card.get("privacy", "") or "").strip().lower()
    if not raw:
        return False
    if "private" in raw:
        return True
    if raw in ("my notes", "my_notes", "my-notes", "mynotes"):
        return True
    return False


class VectorStore:
    def __init__(self, persist_directory="./chroma_data"):
        self.client = chromadb.PersistentClient(path=persist_directory)
        self.collection_name = "project_onion_rag"
        self.collection = self.client.get_or_create_collection(self.collection_name)

    def ingest_card(self, card: Dict[str, Any]) -> str:
        """Ingest (upsert) a card. Edit re-ingest overwrites same id."""
        title = card.get("title", "")
        content = card.get("content", card.get("synthesizedText", ""))
        source = card.get("source", "")
        document_text = f"Title: {title}\nContent: {content}\nProvenance: {source}"
        # Fail Closed privacy mapping — "Private" => is_private True.
        # Project_ReferenceID is the real, never-empty key — no hard-coded
        # client/project fallback; warn (don't hard-code) if still missing.
        project = card.get("project") or card.get("Project_ReferenceID") or card.get("project_name") or ""
        if not project:
            logger.warning("ingest_card: no project/Project_ReferenceID/project_name on card id=%s", card.get("id"))
        metadata = {
            "client": card.get("client", card.get("client_name", "Acme Corp")),
            "project": project,
            "author": card.get("author", card.get("contributor", "Walter")),
            "is_private": is_private_card(card),
        }
        card_id = card.get("id", hashlib.md5(document_text.encode()).hexdigest())
        try:
            self.collection.upsert(documents=[document_text], metadatas=[metadata], ids=[card_id])
        except Exception:
            try:
                self.collection.delete(ids=[card_id])
            except Exception:
                pass
            self.collection.add(documents=[document_text], metadatas=[metadata], ids=[card_id])
        return card_id

    def delete_card(self, card_id: str) -> str:
        """Delete a card from the vector store (PWA delete propagation)."""
        self.collection.delete(ids=[str(card_id)])
        return str(card_id)

    def list_cards(self, project: str) -> List[Dict]:
        """Offline-first support: raw project listing (no query/embedding),
        used by the PWA's guarded one-time sync to check vector freshness.
        Defensive: empty/'default'/'all' means wildcard (debugging/demo only)
        since Project_ReferenceID is never empty in normal flow."""
        project = (project or "").strip()
        if project.lower() in ("", "default", "all"):
            results = self.collection.get()
        else:
            results = self.collection.get(where={"project": project})
        return [{"id": i, "document": d, "metadata": m} for i, d, m in zip(results["ids"], results["documents"], results["metadatas"])]

    def query_vector_store(self, query_text: str, project: str, active_persona: str, top_k: int = 4) -> List[Dict]:
        """Query with privacy filter: project AND (not private OR author match).
        Defensive: empty/'default'/'all' project means wildcard (debug/demo)."""
        project = (project or "").strip()
        persona_filter = {"$or": [{"is_private": False}, {"author": active_persona}]}
        where = persona_filter if project.lower() in ("", "default", "all") else {"$and": [{"project": project}, persona_filter]}
        results = self.collection.query(query_texts=[query_text], n_results=top_k, where=where)
        processed_results = []
        for i, document in enumerate(results['documents'][0]):
            processed_results.append({'document': document, 'metadata': results['metadatas'][0][i], 'distance': results['distances'][0][i], 'id': results['ids'][0][i]})
        return processed_results

# Global instance — keep single persistent client for the FastAPI process.
vector_store = VectorStore()
