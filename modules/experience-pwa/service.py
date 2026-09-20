from http.server import SimpleHTTPRequestHandler, HTTPServer
import os

# Absolute path to static folder
STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
STATIC_DIR = os.path.abspath(STATIC_DIR)

class PWAHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=STATIC_DIR, **kwargs)
    
    def do_GET(self):
        # Map / and /app and /app/ to index.html - this was causing 404
        # Your previous FastAPI version had route for /app, http.server needs explicit mapping
        if self.path in ["/", "/app", "/app/"]:
            self.path = "/index.html"
        # Also handle /app?query params
        if self.path.startswith("/app?") or self.path.startswith("/app/?"):
            self.path = "/index.html"
        return super().do_GET()
    
    def end_headers(self):
        # No cache for dev
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        super().end_headers()

if __name__ == "__main__":
    os.chdir(os.path.dirname(__file__))
    idx_path = os.path.join(STATIC_DIR, "index.html")
    exists = os.path.exists(idx_path)
    size = os.path.getsize(idx_path) if exists else 0
    print(f"Serving PWA v0.16 at http://localhost:8002/ and http://localhost:8002/app")
    print(f"Archive with justification, sorted by creation, provenance actual links, Client 360 grouped, 1 column Key Moments, Smart Assistant priority")
    print(f"Static dir: {STATIC_DIR}")
    print(f"index.html exists: {exists} - size: {size} bytes - should be ~224K")
    if not exists:
        print(f"ERROR: index.html missing in {STATIC_DIR} - check ls modules/experience-pwa/static/")
    else:
        print(f"OK - Open http://localhost:8002/ or http://localhost:8002/app - both will serve index.html")
    HTTPServer(("0.0.0.0", 8002), PWAHandler).serve_forever()
