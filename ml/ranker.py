"""Rule-based interpretable ranker v1 (Phase 1 baseline).

Scores 0-100 with human-readable reasons. This is the static baseline that
Phase 2's active-learning loop must beat (thesis evaluation).
"""
from typing import Any, Dict, List


def _skill_points(required: List[str], offered: List[str]) -> tuple:
    if not required:
        return 25, "No specific skills required"
    have = set(required) & set(offered)
    ratio = len(have) / len(required)
    pts = round(50 * ratio)
    if ratio == 1:
        reason = f"All required skills match ({', '.join(sorted(have))})"
    elif have:
        reason = f"Partial skills match ({', '.join(sorted(have))})"
    else:
        reason = "No required skills match"
    return pts, reason


def _availability_points(worker_avail: str, job_start: str) -> tuple:
    if worker_avail == job_start:
        return 10, "Availability matches job start"
    if worker_avail == "immediate" or job_start == "immediate":
        return 4, "Availability partly overlaps job start"
    return 0, "Availability does not match job start"


def _experience_points(years: int) -> tuple:
    if years >= 5:
        return 10, f"Experienced ({years} yrs)"
    if years >= 1:
        return 5, f"Some experience ({years} yrs)"
    return 2, "New to the trade"


def score_jobs_for_worker(worker: Dict[str, Any], jobs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    scored = []
    for job in jobs:
        if job["trade"] != worker["trade"]:
            continue
        reasons: List[str] = []
        total = 0
        pts, why = _skill_points(job["required_skills"], worker["skills"])
        total += pts
        reasons.append(why)
        if job["district"] == worker["district"]:
            total += 15
            reasons.append(f"Same district ({job['district']})")
        pts, why = _availability_points(worker["availability"], job["start"])
        total += pts
        reasons.append(why)
        if job["pay_max_eur_h"] >= worker["hourly_rate_eur"]:
            total += 15
            reasons.append(f"Pays your rate (up to {job['pay_max_eur_h']} EUR/h)")
        elif job["pay_min_eur_h"] >= worker["hourly_rate_eur"] * 0.9:
            total += 8
            reasons.append("Pay close to your rate")
        else:
            reasons.append("Pay below your rate")
        pts, why = _experience_points(worker["experience_years"])
        total += pts
        reasons.append(why)
        scored.append({"id": job["id"], "score": min(total, 100), "reasons": reasons})
    scored.sort(key=lambda r: r["score"], reverse=True)
    return scored


def score_workers_for_job(job: Dict[str, Any], workers: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    scored = []
    for worker in workers:
        if worker["trade"] != job["trade"]:
            continue
        reasons: List[str] = []
        total = 0
        pts, why = _skill_points(job["required_skills"], worker["skills"])
        total += pts
        reasons.append(why)
        if worker["district"] == job["district"]:
            total += 15
            reasons.append(f"Local ({worker['district']})")
        pts, why = _availability_points(worker["availability"], job["start"])
        total += pts
        reasons.append(why)
        if worker["hourly_rate_eur"] <= job["pay_max_eur_h"]:
            total += 15
            reasons.append(f"Within budget ({worker['hourly_rate_eur']} EUR/h)")
        elif worker["hourly_rate_eur"] <= job["pay_max_eur_h"] * 1.1:
            total += 8
            reasons.append("Rate slightly above budget")
        else:
            reasons.append("Rate above budget")
        pts, why = _experience_points(worker["experience_years"])
        total += pts
        reasons.append(why)
        scored.append({"id": worker["id"], "score": min(total, 100), "reasons": reasons})
    scored.sort(key=lambda r: r["score"], reverse=True)
    return scored
