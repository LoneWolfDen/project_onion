"""Server-side scope rules for the vector service (PRV-04). Pure functions: no Chroma, no FastAPI.

- Persona: when ONION_PERSONA is set the server decides who is asking ("server-derived") and the
  persona sent by the browser is ignored. When it is not set (single-user pilot) the browser's persona
  is honoured as a test aid and every response says so ("client-supplied"). The persona drop-down is
  not a security boundary in the pilot.
- Project: every ingest, list and ask needs a real project. Empty, "default" and "all" are refused
  unless ONION_ALLOW_ALL_PROJECTS=1 (debugging only).
- Privacy: the stored metadata states privacy explicitly, and a listing hides other people's private cards.
"""
import os
from typing import Any, Dict, List, Optional, Tuple

WILDCARDS = ("", "default", "all")


class ScopeError(ValueError):
    """The request is outside the allowed scope. Maps to HTTP 400/403."""


def _env(env: Optional[Dict[str, str]]) -> Dict[str, str]:
    return os.environ if env is None else env


def resolve_persona(requested: Optional[str], env: Optional[Dict[str, str]] = None) -> Tuple[str, str]:
    """Returns (persona, source) with source 'server-derived' or 'client-supplied'."""
    server = str(_env(env).get("ONION_PERSONA", "") or "").strip()
    if server:
        return server, "server-derived"
    asked = str(requested or "").strip()
    if not asked:
        raise ScopeError("A persona is required: set ONION_PERSONA on the server or send activePersona")
    return asked, "client-supplied"


def require_project(project: Optional[str], env: Optional[Dict[str, str]] = None) -> str:
    p = str(project or "").strip()
    if p.lower() in WILDCARDS and str(_env(env).get("ONION_ALLOW_ALL_PROJECTS", "") or "") != "1":
        raise ScopeError("A project is required (all-project access is off)")
    return p


def privacy_label(is_private: bool) -> str:
    return "private" if is_private else "shared"


def stamp_metadata(metadata: Dict[str, Any], persona_source: str) -> Dict[str, Any]:
    """Adds the explicit privacy metadata every stored card carries."""
    out = dict(metadata)
    out["privacy"] = privacy_label(bool(out.get("is_private")))
    out["persona_source"] = persona_source
    return out


def visible_to(metadata: Dict[str, Any], persona: str) -> bool:
    """A shared card is visible to the project; a private card only to its author."""
    if not metadata.get("is_private"):
        return True
    return str(metadata.get("author", "")) == persona


def filter_listing(cards: List[Dict[str, Any]], persona: str) -> List[Dict[str, Any]]:
    return [c for c in cards if visible_to(c.get("metadata") or {}, persona)]
