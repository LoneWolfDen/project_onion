from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import pathlib

app = FastAPI(title="Experience PWA", version="v0.8-mint-collapsible")

BASE = pathlib.Path(__file__).parent

@app.get("/")
def root():
    return {
        "service": "experience-pwa",
        "status": "ok",
        "version": "v0.8-mint-collapsible",
        "port": 8002,
        "pwa": "http://localhost:8002/app",
        "levels": {
            "first_level": "GE Aero PRIMARY FILTER dropdown NOT editable",
            "second_level": "GEAERO-DIP-DISCOVERY editable",
            "header": "GE Aero / GEAERO-DIP-DISCOVERY / O-5030460 / 006Uj00000QOBkvIAH / 2d ago green"
        },
        "endpoints": {
            "app": "/app - PWA UI mint collapsible",
            "api_proxy": "Calls :8000 anchor + :8001 cards"
        }
    }

@app.get("/app")
def serve_pwa():
    return FileResponse(BASE / "static" / "index.html")

# Mount static for css/js if needed
app.mount("/static", StaticFiles(directory=BASE / "static"), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)