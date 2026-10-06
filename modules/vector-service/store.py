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


# The PWA turns a Chroma distance into a similarity score, so the distance function has to
# be stated, not inherited. Chroma's default is squared L2; the PWA assumes cosine. Declared
# here so both ends agree, and reported on /health so a store built under the old default is
# visible instead of silently scoring wrong.
DISTANCE_SPACE = "cosine"
# How many neighbours a query returns. Fixed at 4 before, which truncated answers on larger
# projects. Configurable, clamped so a bad value cannot ask Chroma for everything.
DEFAULT_TOP_K = 6
MAX_TOP_K = 20


def configured_top_k(env: Dict[str, Any] = None) -> int:
    raw = (os.environ if env is None else env).get("ONION_VECTOR_TOP_K", "")
    try:
        k = int(str(raw).strip())
    except (TypeError, ValueError):
        return DEFAULT_TOP_K
    return max(1, min(MAX_TOP_K, k))


class VectorStore:
    def __init__(self, persist_directory="./chroma_data"):
        self.client = chromadb.PersistentClient(path=persist_directory)
        self.collection_name = "project_onion_rag"
        self.collection = self.client.get_or_create_collection(
            self.collection_name, metadata={"hnsw:space": DISTANCE_SPACE}
        )
        self.space = self.collection_space()

    def collection_space(self) -> str:
        """The distance function the collection was actually created with. get_or_create
        does not change an existing collection, so an older store keeps Chroma's L2 default
        and must be rebuilt before its scores mean anything."""
        try:
            meta = dict(getattr(self.collection, "metadata", None) or {})
        except Exception:
            return "unknown"
        space = str(meta.get("hnsw:space") or "l2")
        if space != DISTANCE_SPACE:
            logger.warning(
                "vector store collection %s uses distance space %r, expected %r: delete chroma_data and re-ingest",
                self.collection_name, space, DISTANCE_SPACE,
            )
        return space

    def stats(self) -> Dict[str, Any]:
        """Shown on /health so the app can say what the store holds and how it scores."""
        try:
            count = self.collection.count()
        except Exception:
            count = None
        return {
            "collection": self.collection_name,
            "count": count,
            "space": self.space,
            "expected_space": DISTANCE_SPACE,
            "space_ok": self.space == DISTANCE_SPACE,
            "top_k": configured_top_k(),
        }

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
            # No demo fallbacks: an unnamed client or author stays empty rather than
            # being stored as someone else's name.
            "client": str(card.get("client") or card.get("client_name") or ""),
            "project": project,
            "author": str(card.get("author") or card.get("contributor") or ""),
            "is_private": is_private_card(card),
        }
        # PRV-04: explicit privacy metadata on every stored card.
        metadata["privacy"] = "private" if metadata["is_private"] else "shared"
        metadata["persona_source"] = str(card.get("persona_source") or "client-supplied")
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

    def query_vector_store(self, query_text: str, project: str, active_persona: str, top_k: int = None) -> List[Dict]:
        """Query with privacy filter: project AND (not private OR author match).
        Defensive: empty/'default'/'all' project means wildcard (debug/demo)."""
        project = (project or "").strip()
        k = configured_top_k() if top_k is None else max(1, min(MAX_TOP_K, int(top_k)))
        persona_filter = {"$or": [{"is_private": False}, {"author": active_persona}]}
        where = persona_filter if project.lower() in ("", "default", "all") else {"$and": [{"project": project}, persona_filter]}
        results = self.collection.query(query_texts=[query_text], n_results=k, where=where)
        processed_results = []
        for i, document in enumerate(results['documents'][0]):
            processed_results.append({'document': document, 'metadata': results['metadatas'][0][i], 'distance': results['distances'][0][i], 'id': results['ids'][0][i]})
        return processed_results

# Global instance — keep single persistent client for the FastAPI process.
vector_store = VectorStore()
