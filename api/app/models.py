"""MeisterMatch data contract v1 (Phase 0) — Pydantic mirror of shared/schema.json."""
from typing import List, Literal, Optional

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
