"""MeisterMatch API (Phase 0) — health endpoint only. Swipe/match/rank routes land in Phase 1."""
from fastapi import FastAPI

app = FastAPI(title="MeisterMatch API", version="0.1.0")


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "meistermatch-api", "phase": 0}
