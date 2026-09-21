from http.server import SimpleHTTPRequestHandler, HTTPServer
import os
STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
STATIC_DIR = os.path.abspath(STATIC_DIR)
class PWAHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=STATIC_DIR, **kwargs)
    def do_GET(self):
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
    print(f"Serving PWA v0.18.0 clean at http://localhost:8002/ and http://localhost:8002/app")
    print(f"Fixes: separate collapses Project overview + Key Moments + Status cards, Status expand restored, Client 360 stable, Edit back overlay, pastel simple #D6F5E8->#D6E8FF, ALL Clients, breadcrumb fix")
    print(f"Static dir: {STATIC_DIR} - index.html exists: {exists} - size: {size} bytes")
    HTTPServer(("0.0.0.0", 8002), PWAHandler).serve_forever()
