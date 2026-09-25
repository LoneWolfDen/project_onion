import os
import chromadb
from chromadb.config import Settings
from typing import Dict, List, Any
import hashlib


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
        metadata = {
            "client": card.get("client", card.get("client_name", "Acme Corp")),
            "project": card.get("project", card.get("project_name", "Apollo-123")),
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

    def query_vector_store(self, query_text: str, project: str, active_persona: str, top_k: int = 4) -> List[Dict]:
        """Query with privacy filter: project AND (not private OR author match)."""
        where = {"$and": [{"project": project}, {"$or": [{"is_private": False}, {"author": active_persona}]}]}
        results = self.collection.query(query_texts=[query_text], n_results=top_k, where=where)
        processed_results = []
        for i, document in enumerate(results['documents'][0]):
            processed_results.append({'document': document, 'metadata': results['metadatas'][0][i], 'distance': results['distances'][0][i], 'id': results['ids'][0][i]})
        return processed_results

# Global instance — keep single persistent client for the FastAPI process.
vector_store = VectorStore()
