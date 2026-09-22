from http.server import SimpleHTTPRequestHandler, HTTPServer
import os
STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
STATIC_DIR = os.path.abspath(STATIC_DIR)
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
        elif path_only.startswith("/app/"):
            # /app/js/... -> /js/... ; handles ESM relative fetch under /app route
            rest = path_only[len("/app"):] or "/index.html"
            self.path = rest
        return super().do_GET()
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
    print(f"Serving PWA v20 clean at http://localhost:8002/ and http://localhost:8002/app")
    print(f"HDD good harness v0.18 clean + fixes: no Acme Corp, no self-ref notes, ALL Clients breadcrumb fix, Relationship link, Archive enabled, Ask filtering, Edit Save localStorage, PII Approve to save changes Private/Team Shared, single toggle, Edit stacked, PRJ ID single line, pastel simple")
    print(f"Static dir: {STATIC_DIR} - exists: {exists} - size: {size} bytes")
    HTTPServer(("0.0.0.0", 8002), PWAHandler).serve_forever()
