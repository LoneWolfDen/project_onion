# Local services: loopback only

Continuum's optional services (anchor 8000, cards 8001, PWA host 8002, GDP adapter 8003, bookmarklet 8004, relationship admin 8005, vector 8006) are for the person running them. By default:

- they listen on `127.0.0.1` only, so other machines cannot reach them;
- browsers may call them only from the local PWA (`http://localhost:8002` or `http://127.0.0.1:8002`); there is no wildcard CORS;
- POST, PUT, PATCH and DELETE calls that carry any other `Origin` are refused with 403 before the endpoint runs (this covers destructive endpoints such as `DELETE /anchors/clear`);
- requests whose `Host` header is not a loopback name are refused with 400 (protection against DNS rebinding);
- scripts such as `curl` on the same machine, which send no `Origin`, keep working.

The shared code is `modules/_shared/local_only.py`; every service uses it, so there is one place to review.

## Allowing remote access (deliberate change)

Only do this on a trusted network and with the authentication that item PRV-04 will add for the vector service.

```bash
export ONION_ALLOW_REMOTE=1
export ONION_BIND_HOST=192.168.1.20          # the address to listen on
export ONION_PWA_ORIGINS=https://pwa.example # exact origins, comma separated; "*" is rejected
```

Without `ONION_ALLOW_REMOTE=1`, any `ONION_BIND_HOST` other than a loopback address stops the service with an error. With it, the Host check is relaxed and the listed origins are added to the allowed list.

The vector service (`modules/vector-service/main.py`) is normally started with uvicorn directly, which takes `--host`. Start it with `--host 127.0.0.1`; its CORS and origin guard are already applied by the shared helper.

## Checks

- `python3 -m unittest discover -s modules/_shared/tests -v` (needs `pip install fastapi httpx`) covers the helper and each service. CI runs it.
- `node scripts/check-repo.mjs` fails if a service source binds `0.0.0.0` or allows `*` CORS.

## Vector service scope (PRV-04)

- **Project is required** on `/ingest`, `/list` and `/ask`. Empty, `default` and `all` are refused (HTTP 400). For debugging only, start with `ONION_ALLOW_ALL_PROJECTS=1`.
- **Persona.** Set `ONION_PERSONA=<name>` and the server decides who is asking (`persona_source: "server-derived"`); the persona sent by the browser is ignored and ingested cards are authored as that persona. Without it (single-user pilot) the browser's persona is used as a test aid and responses say `"client-supplied"`. The persona drop-down is not a security boundary in the pilot.
- **Privacy metadata.** Every stored card carries `privacy` (`private` or `shared`), `is_private` and `persona_source`. `/list` hides other people's private cards, as `/ask` already did.
- Tests: `python -m unittest discover -s modules/vector-service/tests -v` (needs `pip install fastapi httpx`; Chroma is stubbed).
