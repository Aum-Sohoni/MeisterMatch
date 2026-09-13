"""MeisterMatch ML service (Phase 1) — interpretable ranking with reasons."""
from fastapi import FastAPI, HTTPException

from models import Job, RankedItem, RankRequest, RankResponse, Worker
from ranker import score_jobs_for_worker, score_workers_for_job

app = FastAPI(title="MeisterMatch ML", version="0.1.0")


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "meistermatch-ml", "phase": 1}


@app.post("/rank", response_model=RankResponse)
def rank(req: RankRequest) -> RankResponse:
    if req.mode == "jobs_for_worker":
        if req.worker is None:
            raise HTTPException(400, "worker is required for jobs_for_worker")
        jobs = [Job(**c).model_dump() for c in req.candidates]
        results = score_jobs_for_worker(req.worker.model_dump(), jobs)
    else:
        if req.job is None:
            raise HTTPException(400, "job is required for workers_for_job")
        workers = [Worker(**c).model_dump() for c in req.candidates]
        results = score_workers_for_job(req.job.model_dump(), workers)
    return RankResponse(results=[RankedItem(**r) for r in results[: req.limit]])
