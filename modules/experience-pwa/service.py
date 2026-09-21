from http.server import SimpleHTTPRequestHandler, HTTPServer
import os

STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
STATIC_DIR = os.path.abspath(STATIC_DIR)

class PWAHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=STATIC_DIR, **kwargs)

    def do_GET(self):
        # Fix 404 for /app — map / and /app and /app/ to index.html
        # Restored old collar + ALL Clients + breadcrumb fix + edit overlay right after project name
        if self.path in ["/", "/app", "/app/"]:
            self.path = "/index.html"
        if self.path.startswith("/app?") or self.path.startswith("/app/?"):
            self.path = "/index.html"
        return super().do_GET()

    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        super().end_headers()

if __name__ == "__main__":
    os.chdir(os.path.dirname(__file__))
    idx_path = os.path.join(STATIC_DIR, "index.html")
    exists = os.path.exists(idx_path)
    size = os.path.getsize(idx_path) if exists else 0
    print(f"Serving PWA v0.17.1 at http://localhost:8002/ and http://localhost:8002/app")
    print(f"Fixes: edit overlay right after project name with Save/Cancel at bottom, old pastel collar #D6F5E8->#D6E8FF, ALL Clients kept, breadcrumb updates on client dropdown, Add new repeatable fields + empty + Add")
    print(f"Static dir: {STATIC_DIR} - index.html exists: {exists} - size: {size} bytes - should be ~230K+")
    print(f"Test data: data/seed/key_moments_test_data.json included — per project Key Moments dynamic")
    HTTPServer(("0.0.0.0", 8002), PWAHandler).serve_forever()
