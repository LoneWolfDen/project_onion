from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
import pathlib

app = FastAPI(title="Connected Bookmarklet", version="v0.10-bookmarklet")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE = pathlib.Path(__file__).parent

@app.get("/")
def root():
    return {
        "service": "connected-bookmarklet",
        "status": "ok",
        "version": "v0.10-bookmarklet",
        "port": 8004,
        "bookmarklet": "Captures O-5030460 + 006Uj... from /Opportunity/006Uj.../view",
        "install": "http://localhost:8004/install"
    }

@app.get("/install", response_class=HTMLResponse)
def install():
    js_path = BASE / "bookmarklet.js"
    js_code = js_path.read_text() if js_path.exists() else "javascript:alert('not found')"
    html = """<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Project Onion Bookmarklet v0.10</title>
    <style>body{font-family:sans-serif;max-width:800px;margin:40px auto;padding:20px;background:#fafcfe}
    .card{background:white;border:1px solid #e0e8f0;border-radius:12px;padding:20px;margin-bottom:16px}
    .bookmarklet{display:inline-block;padding:12px 20px;background:#D6E8FF;border:2px dashed #7aa7e6;border-radius:8px;text-decoration:none;color:#1a2b3c;font-weight:600}
    code{background:#f6f8fa;padding:2px 6px;border-radius:4px;font-size:12px}
    </style></head><body>
    <h1>Project Onion - Connected Bookmarklet v0.10</h1>
    <div class="card"><h3>Drag to bookmarks bar:</h3><p><a class="bookmarklet" href="__JS__">Onion Capture O-5030460 + 006Uj...</a></p></div>
    <div class="card"><h3>How it works</h3><ul style="font-size:13px;line-height:1.6">
    <li>Go to /Opportunity/006Uj00000QOBkvIAH/view - extracts 006Uj... 18-char regex ^006[A-Za-z0-9]{15}$</li>
    <li>Find O-5030460 from PS-v2026.2a-Acme-Corp-(O-5030460)-V6.3_ESC - regex O-\d{7}</li>
    <li>SharePoint acmespf + GDP 8399 - maps to O-5030460 + 006Uj...</li>
    <li>Dedupe V6.3_ESC vs V6.2 - doc vs timeline separate</li>
    <li>Validation Relevant? Yes/No/Edit if same SharePoint linked to different ConnectedRecord</li>
    <li>POST to :8000 PUT /anchor/Acme Corp/Acme Corp DIP Discovery - multi-multi preserved</li>
    <li>Open PWA http://localhost:8002/app</li></ul></div>
    </body></html>"""
    html = html.replace("__JS__", js_code.replace('"', '&quot;'))
    return HTMLResponse(content=html)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8004)