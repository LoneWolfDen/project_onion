from http.server import SimpleHTTPRequestHandler, HTTPServer
import os
STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
STATIC_DIR = os.path.abspath(STATIC_DIR)
# Root-level SW only (correct scope for PWA install at /).
# Canonical file: modules/experience-pwa/sw.js — service.py serves its BYTES
# at /sw.js (see ROOT_SW branch). The old static/sw.js copy was REMOVED per
# Task 1 (no dual copies; single source of truth at module root).
ROOT_SW = os.path.abspath(os.path.join(os.path.dirname(__file__), "sw.js"))
class PWAHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=STATIC_DIR, **kwargs)
    def do_GET(self):
        # Strip query strings so module imports with ?v= cache-bust still resolve.
        # IMPORTANT: preserve query-stripped path only; /app/js/... -> /js/...
        # /app/js/main.js was 404 because startswith('/app') also matched '/appjs'.
        path_only = self.path.split('?', 1)[0]
        if path_only in ["/", "/app", "/app/"]:
            self.path = "/index.html"
        elif path_only in ["/sw.js", "/service-worker.js"]:
            # Root-scope SW (canonical file: modules/experience-pwa/sw.js).
            # Serve bytes directly with scope at / — no redirect (a redirect
            # would change the registration scope and break Background Sync).
            try:
                with open(ROOT_SW, "rb") as f:
                    body = f.read()
            except OSError:
                self.send_error(404, "sw.js not found")
                return
            try:
                self.send_response(200)
                self.send_header("Content-Type", "application/javascript")
                self.send_header("Content-Length", str(len(body)))
                self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
                self.end_headers()
                self.wfile.write(body)
            except (BrokenPipeError, ConnectionResetError):
                pass
            return
        elif path_only.startswith("/static/docs/"):
            # Nginx/prod builds mount docs under /static/docs/ — dev server
            # serves STATIC_DIR directly so strip the prefix for compat.
            self.path = path_only[len("/static"):] or "/index.html"
        elif path_only.startswith("/static/"):
            # Generic /static/* alias (prod parity: /static/js/... -> /js/...).
            self.path = path_only[len("/static"):] or "/index.html"
        elif path_only.startswith("/docs/"):
            # Legacy alias: /docs/* -> /static/docs/* file layout is docs/*.
            # Keep working for old bookmarks/guide links.
            self.path = path_only
        elif path_only.startswith("/app/"):
            # /app/js/... -> /js/... ; handles ESM relative fetch under /app route
            rest = path_only[len("/app"):] or "/index.html"
            self.path = rest
        try:
            return super().do_GET()
        except (BrokenPipeError, ConnectionResetError):
            # Browser cancelled a duplicate fetch (e.g. double-clicked doc link).
            # Benign — suppress so the console stays clean.
            return None
    def copyfile(self, source, outputfile):
        try:
            return super().copyfile(source, outputfile)
        except (BrokenPipeError, ConnectionResetError):
            return None
    def handle(self):
        try:
            return super().handle()
        except (BrokenPipeError, ConnectionResetError):
            return None
    def end_headers(self):
        # Cache-Control only. Do NOT add Content-Type here: SimpleHTTPRequestHandler
        # already sends exactly one via guess_type() (.js -> text/javascript which is
        # valid for ESM, .css -> text/css). Adding another creates DUPLICATE
        # Content-Type headers which makes strict ESM MIME checks fail and the UI
        # stays stuck on "Loading..." with no styling applied.
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        super().end_headers()
if __name__ == "__main__":
    os.chdir(os.path.dirname(__file__))
    idx_path = os.path.join(STATIC_DIR, "index.html")
    exists = os.path.exists(idx_path)
    size = os.path.getsize(idx_path) if exists else 0
    print(f"Serving PWA at http://localhost:8002/ and http://localhost:8002/app")
    print(f"Static dir: {STATIC_DIR} - exists: {exists} - size: {size} bytes")
    HTTPServer(("0.0.0.0", 8002), PWAHandler).serve_forever()
