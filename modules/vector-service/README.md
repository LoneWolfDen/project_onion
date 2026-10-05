# Vector service

The Chroma store (`chroma_data/`) is runtime state and is not tracked in git.
It is created on first start in the directory the service is launched from.

To (re)create demo data: `pip install -r requirements.txt && python seed.py`.
To reset: stop the service and delete `chroma_data/`.
