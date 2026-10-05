"""PRV-04 end to end through the FastAPI app, with Chroma replaced by an in-memory stub.
Needs: pip install fastapi httpx"""
import importlib
import os
import sys
import types
import unittest
from pathlib import Path

MOD = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(MOD))
sys.path.insert(0, str(MOD.parent / "_shared"))


class FakeCollection:
    def __init__(self):
        self.rows = {}

    def upsert(self, documents, metadatas, ids):
        for d, m, i in zip(documents, metadatas, ids):
            self.rows[i] = (d, m)

    add = upsert

    def delete(self, ids):
        for i in ids:
            self.rows.pop(i, None)

    def get(self, where=None):
        items = [(i, d, m) for i, (d, m) in self.rows.items() if not where or m.get("project") == where["project"]]
        return {"ids": [i for i, _, _ in items], "documents": [d for _, d, _ in items], "metadatas": [m for _, _, m in items]}


fake = types.ModuleType("chromadb")
fake.PersistentClient = lambda path: types.SimpleNamespace(get_or_create_collection=lambda n: FakeCollection())
cfg = types.ModuleType("chromadb.config")
cfg.Settings = object
sys.modules.setdefault("chromadb", fake)
sys.modules.setdefault("chromadb.config", cfg)

from fastapi.testclient import TestClient  # noqa: E402

HDR = {"Origin": "http://localhost:8002", "Host": "localhost:8006"}


def load_app():
    for m in ("main", "store"):
        sys.modules.pop(m, None)
    return importlib.import_module("main")


class ApiTests(unittest.TestCase):
    def setUp(self):
        os.environ.pop("ONION_PERSONA", None)
        os.environ.pop("ONION_ALLOW_ALL_PROJECTS", None)
        self.main = load_app()
        self.c = TestClient(self.main.app, base_url="http://localhost:8006")

    def post(self, path, body):
        return self.c.post(path, json=body, headers={"Origin": "http://localhost:8002"})

    def ingest(self, id, author, privacy, project="P-1"):
        return self.post("/ingest", {"id": id, "author": author, "privacy": privacy, "project_name": project, "Project_ReferenceID": project, "title": id})

    def test_ingest_without_project_is_refused(self):
        r = self.post("/ingest", {"id": "x", "title": "x"})
        self.assertEqual(r.status_code, 400)

    def test_list_and_ask_refuse_wildcards(self):
        for path in ("/list", "/ask"):
            r = self.post(path, {"query": "q", "project": "all", "activePersona": "Ana", "privacyMode": "Both"})
            self.assertEqual(r.status_code, 400, path)

    def test_stored_metadata_has_explicit_privacy(self):
        self.ingest("a", "Ana", "Private")
        meta = self.main.vector_store.collection.rows["a"][1]
        self.assertEqual((meta["privacy"], meta["is_private"], meta["persona_source"]), ("private", True, "client-supplied"))

    def test_listing_hides_other_peoples_private_cards(self):
        self.ingest("shared", "Bo", "Team Shared"); self.ingest("mine", "Ana", "Private"); self.ingest("theirs", "Bo", "Private")
        r = self.post("/list", {"query": "", "project": "P-1", "activePersona": "Ana", "privacyMode": "Both"}).json()
        self.assertEqual(sorted(c["id"] for c in r["cards"]), ["mine", "shared"])
        self.assertEqual(r["persona_source"], "client-supplied")

    def test_server_derived_persona_ignores_the_browser(self):
        os.environ["ONION_PERSONA"] = "Ana"
        self.ingest("mine", "Zed", "Private")
        self.assertEqual(self.main.vector_store.collection.rows["mine"][1]["author"], "Ana")
        r = self.post("/list", {"query": "", "project": "P-1", "activePersona": "Bo", "privacyMode": "Both"}).json()
        self.assertEqual([c["id"] for c in r["cards"]], ["mine"])
        self.assertEqual(r["persona_source"], "server-derived")


if __name__ == "__main__":
    unittest.main()
