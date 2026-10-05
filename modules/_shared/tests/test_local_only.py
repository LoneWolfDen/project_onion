"""Run: python3 -m unittest discover -s modules/_shared/tests -v
Needs: pip install fastapi httpx
PRV-03: services answer only the local PWA origin and loopback Host names,
and refuse to bind off-loopback unless remote access is deliberately enabled."""
import importlib.util
import os
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "modules" / "_shared"))
import local_only  # noqa: E402

from fastapi import FastAPI  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

GOOD = "http://localhost:8002"
EVIL = "http://evil.example"


def tiny_app():
    app = FastAPI()
    hits = []

    @app.get("/ping")
    def ping():
        return {"ok": True}

    @app.delete("/wipe")
    def wipe():
        hits.append("wipe")
        return {"wiped": True}

    @app.post("/write")
    def write():
        hits.append("write")
        return {"ok": True}

    local_only.apply(app)
    return app, hits


def load_service(rel):
    path = ROOT / rel
    sys.path.insert(0, str(path.parent))
    spec = importlib.util.spec_from_file_location("svc_" + path.parent.name.replace("-", "_"), path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


class EnvCase(unittest.TestCase):
    def setUp(self):
        self._saved = {k: os.environ.pop(k, None) for k in ("ONION_ALLOW_REMOTE", "ONION_BIND_HOST", "ONION_PWA_ORIGINS")}

    def tearDown(self):
        for k, v in self._saved.items():
            os.environ.pop(k, None)
            if v is not None:
                os.environ[k] = v


class BindTests(EnvCase):
    def test_default_binds_loopback(self):
        self.assertEqual(local_only.bind_host(), "127.0.0.1")

    def test_wildcard_and_lan_addresses_are_refused(self):
        for bad in ("0.0.0.0", "192.168.1.20", "::"):
            os.environ["ONION_BIND_HOST"] = bad
            with self.assertRaises(SystemExit):
                local_only.bind_host()

    def test_remote_needs_a_deliberate_flag(self):
        os.environ["ONION_BIND_HOST"] = "192.168.1.20"
        os.environ["ONION_ALLOW_REMOTE"] = "1"
        self.assertEqual(local_only.bind_host(), "192.168.1.20")

    def test_wildcard_origin_cannot_be_configured(self):
        os.environ["ONION_PWA_ORIGINS"] = "*"
        with self.assertRaises(SystemExit):
            local_only.allowed_origins()

    def test_extra_origin_is_exact(self):
        os.environ["ONION_PWA_ORIGINS"] = "https://pwa.internal/"
        self.assertIn("https://pwa.internal", local_only.allowed_origins())
        self.assertFalse(local_only.origin_allowed("https://pwa.internal.evil.example"))


class GuardTests(EnvCase):
    def setUp(self):
        super().setUp()
        self.app, self.hits = tiny_app()
        self.c = TestClient(self.app, base_url="http://localhost:8000")

    def test_local_pwa_origin_gets_cors_headers(self):
        r = self.c.get("/ping", headers={"Origin": GOOD})
        self.assertEqual(r.headers.get("access-control-allow-origin"), GOOD)

    def test_other_origin_gets_no_cors_headers(self):
        r = self.c.get("/ping", headers={"Origin": EVIL})
        self.assertIsNone(r.headers.get("access-control-allow-origin"))

    def test_destructive_calls_from_other_origins_are_rejected_and_not_run(self):
        for method, path in (("DELETE", "/wipe"), ("POST", "/write")):
            r = self.c.request(method, path, headers={"Origin": EVIL})
            self.assertEqual(r.status_code, 403, path)
        self.assertEqual(self.hits, [])

    def test_destructive_calls_from_the_local_pwa_work(self):
        self.assertEqual(self.c.delete("/wipe", headers={"Origin": GOOD}).status_code, 200)
        self.assertEqual(self.hits, ["wipe"])

    def test_local_scripts_without_an_origin_work(self):
        self.assertEqual(self.c.post("/write").status_code, 200)

    def test_preflight_from_other_origin_is_refused(self):
        r = self.c.options("/wipe", headers={"Origin": EVIL, "Access-Control-Request-Method": "DELETE"})
        self.assertNotEqual(r.status_code, 200)
        self.assertIsNone(r.headers.get("access-control-allow-origin"))

    def test_non_loopback_host_header_is_rejected(self):
        c = TestClient(self.app, base_url="http://attacker.example")
        self.assertEqual(c.get("/ping").status_code, 400)

    def test_ipv4_loopback_host_is_accepted(self):
        c = TestClient(self.app, base_url="http://127.0.0.1:8000")
        self.assertEqual(c.get("/ping").status_code, 200)


class RealServiceTests(EnvCase):
    SERVICES = [
        "modules/platform-anchor/service.py",
        "modules/domain-cards-store/service.py",
        "modules/gdp-adapter/service.py",
        "modules/connected-bookmarklet/service.py",
        "modules/admin-relationship/service.py",
    ]

    def test_each_service_is_loopback_and_origin_guarded(self):
        for rel in self.SERVICES:
            with self.subTest(service=rel):
                mod = load_service(rel)
                c = TestClient(mod.app, base_url="http://localhost:9000")
                r = c.get("/", headers={"Origin": EVIL})
                self.assertIsNone(r.headers.get("access-control-allow-origin"), rel)
                r = c.get("/", headers={"Origin": GOOD})
                self.assertEqual(r.headers.get("access-control-allow-origin"), GOOD, rel)
                self.assertEqual(TestClient(mod.app, base_url="http://attacker.example").get("/").status_code, 400, rel)

    def test_anchor_clear_endpoint_rejects_foreign_origin(self):
        mod = load_service("modules/platform-anchor/service.py")
        c = TestClient(mod.app, base_url="http://localhost:8000")
        self.assertEqual(c.delete("/anchors/clear", headers={"Origin": EVIL}).status_code, 403)

    def test_no_service_source_binds_wildcard_or_allows_star_cors(self):
        for rel in self.SERVICES + ["modules/vector-service/main.py", "modules/experience-pwa/service.py"]:
            text = (ROOT / rel).read_text()
            self.assertNotIn('"0.0.0.0"', text, rel)
            self.assertNotIn('allow_origins=["*"]', text, rel)
            self.assertNotIn('"*"]', text.split("local_only")[0] if "local_only" in text else text, rel)


if __name__ == "__main__":
    unittest.main()
