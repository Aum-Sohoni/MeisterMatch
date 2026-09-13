"""MeisterMatch data contract v1 (Phase 0) — Pydantic mirror of shared/schema.json."""
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field

Trade = Literal["electrician", "plumber", "welder", "carpenter", "hvac"]
Language = Literal["lv", "ru", "en"]
Availability = Literal["immediate", "one_to_two_weeks", "date"]
Season = Literal["summer", "winter", "all_year"]


class Worker(BaseModel):
    id: str = Field(pattern=r"^w[0-9]{3}$")
    name: str
    trade: Trade
    skills: List[str]
    experience_years: int = Field(ge=0, le=60)
    district: str
    languages: List[Language]
    availability: Availability
    available_from: Optional[str] = None
    hourly_rate_eur: float = Field(gt=0)


class Job(BaseModel):
    id: str = Field(pattern=r"^j[0-9]{3}$")
    employer: str
    title: str
    trade: Trade
    required_skills: List[str]
    district: str
    pay_min_eur_h: float = Field(gt=0)
    pay_max_eur_h: float = Field(gt=0)
    start: Availability
    start_date: Optional[str] = None
    season: Season
    description_lv: str = ""


class Swipe(BaseModel):
    id: str
    actor_type: Literal["worker", "employer"]
    actor_id: str
    target_type: Literal["job", "worker"]
    target_id: str
    direction: Literal["like", "pass"]


class Match(BaseModel):
    id: str
    worker_id: str
    job_id: str


class Feedback(BaseModel):
    id: str
    worker_id: str
    job_id: str
    label: Literal["relevant", "irrelevant"]
    by: Literal["worker", "employer", "recruiter"]


class RankRequest(BaseModel):
    mode: Literal["jobs_for_worker", "workers_for_job"]
    worker: Optional[Worker] = None
    job: Optional[Job] = None
    candidates: List[Dict[str, Any]] = []
    limit: int = Field(default=10, ge=1, le=50)


class RankedItem(BaseModel):
    id: str
    score: int
    reasons: List[str]


class RankResponse(BaseModel):
    results: List[RankedItem]
