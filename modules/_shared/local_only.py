"""Loopback-only guard for Continuum's local services (PRV-03).

Every service imports this instead of configuring CORS and host binding itself:

    sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "_shared"))
    import local_only
    local_only.apply(app)           # CORS limited to the local PWA, origin + Host checks
    local_only.run(app, 8000)       # binds 127.0.0.1 only

Remote access is a deliberate, documented change: set ONION_ALLOW_REMOTE=1 and
ONION_BIND_HOST to the address to listen on, and list the browser origins that
may call the service in ONION_PWA_ORIGINS. See docs/LOCAL_SERVICES.md.
"""
import os

LOOPBACK_HOSTS = {"127.0.0.1", "localhost", "::1", "[::1]"}
DEFAULT_PWA_ORIGINS = ["http://localhost:8002", "http://127.0.0.1:8002"]
UNSAFE_METHODS = {"POST", "PUT", "PATCH", "DELETE"}


def allow_remote():
    return os.environ.get("ONION_ALLOW_REMOTE") == "1"


def bind_host():
    """127.0.0.1 unless remote access was deliberately enabled."""
    requested = os.environ.get("ONION_BIND_HOST", "127.0.0.1")
    if requested in LOOPBACK_HOSTS:
        return requested if requested != "localhost" else "127.0.0.1"
    if not allow_remote():
        raise SystemExit(
            "Refusing to bind %r: Continuum services listen on loopback only. "
            "Set ONION_ALLOW_REMOTE=1 to change this deliberately (see docs/LOCAL_SERVICES.md)." % requested
        )
    return requested


def allowed_origins():
    raw = os.environ.get("ONION_PWA_ORIGINS", "")
    extra = [o.strip().rstrip("/") for o in raw.split(",") if o.strip()]
    if "*" in extra:
        raise SystemExit("ONION_PWA_ORIGINS must list exact origins; wildcards are not allowed.")
    return DEFAULT_PWA_ORIGINS + [o for o in extra if o not in DEFAULT_PWA_ORIGINS]


def origin_allowed(origin):
    return origin is None or origin.rstrip("/") in allowed_origins()


def host_allowed(host_header):
    """Reject Host headers that are not loopback names (DNS-rebinding defence)."""
    if allow_remote():
        return True
    if not host_header:
        return True
    host = host_header.strip()
    if host.startswith("["):  # [::1]:8000
        host = host.split("]")[0] + "]"
    else:
        host = host.split(":")[0]
    return host in LOOPBACK_HOSTS


def apply(app):
    """Attach CORS (local PWA only) and the origin/Host guard to a FastAPI app."""
    from fastapi.middleware.cors import CORSMiddleware
    from starlette.responses import JSONResponse

    @app.middleware("http")
    async def guard(request, call_next):
        if not host_allowed(request.headers.get("host")):
            return JSONResponse({"detail": "Host not allowed"}, status_code=400)
        if request.method in UNSAFE_METHODS and not origin_allowed(request.headers.get("origin")):
            return JSONResponse({"detail": "Origin not allowed"}, status_code=403)
        return await call_next(request)

    # Added after the guard so CORS is the outermost layer and answers preflights itself.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins(),
        allow_credentials=False,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type"],
    )
    return app


def run(app, port):
    import uvicorn
    uvicorn.run(app, host=bind_host(), port=port)
