"""Deterministic synthetic seed data: 30 workers + 20 jobs (Riga trades market).

Usage:  python scripts/seed.py
Output: data/seed.json  (validates against shared/schema.json shapes)

Seed is fixed (42) so evaluation results in the thesis are reproducible.
"""
import json
import random
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

SEED = 42
OUT = Path(__file__).resolve().parent.parent / "data" / "seed.json"

DISTRICTS = [
    "Centrs", "Purvciems", "Plavnieki", "Imanta", "Ziepniekkalns",
    "Kengarags", "Jugla", "Teika", "Agenskalns", "Sarkandaugava",
]

TRADES = {
    "electrician": ["wiring", "lighting", "panel-install", "fault-diagnosis", "ev-charger"],
    "plumber": ["pipe-fitting", "heating", "bathroom-install", "leak-repair"],
    "welder": ["mig", "tig", "arc-welding", "metal-fabrication"],
    "carpenter": ["framing", "roofing", "flooring", "furniture"],
    "hvac": ["ventilation", "ac-install", "heat-pump", "maintenance"],
}

NAMES = [
    "Janis Berzins", "Aleksandrs Petrovs", "Maris Ozols", "Dmitrijs Ivanovs",
    "Kaspars Liepins", "Arturs Kalnins", "Sergejs Kuznecovs", "Edgars Jansons",
    "Olegs Sokolovs", "Raimonds Eglitis", "Viktors Morozovs", "Guntis Abolins",
    "Andrejs Smirnovs", "Uldis Vitols", "Igors Fedorovs", "Normunds Priede",
    "Vitalijs Orlovs", "Aivars Kruminsh", "Deniss Volkovs", "Mareks Strazdins",
    "Juris Kalns", "Pavels Grigorjevs", "Ivars Meija", "Ruslans Jegorovs",
    "Ainars Plavins", "Stanislavs Kozlovs", "Vilnis Auzins", "Mihails Zaharovs",
    "Gatis Riekstins", "Anton Zagorodnijs",
]

EMPLOYERS = [
    "SIA Rigas Elektriba", "SIA Baltijas Būve", "SIA Juglas Siltums",
    "SIA Kengaraga Metāls", "SIA Pārdaugavas Nami", "SIA Ziemelu Jumti",
]

JOB_TITLES = {
    "electrician": ["Dzivoklu elektroinstalacija Purvciema", "Biroja apgaismojums Centra"],
    "plumber": ["Apkures montaza Jugla", "Vannasistabas remonts Imanta"],
    "welder": ["Metalkonstrukciju metinasana Kengaraga", "Margu izgatavosana Sarkandaugava"],
    "carpenter": ["Jumta konstrukcija Ziepniekkalns", "Grīdu ieklasana Teika"],
    "hvac": ["Ventilacija noliktavai Plavniekos", "Siltumsuknu uzstadisana Agenskalna"],
}


def make_workers(rng: random.Random):
    workers = []
    for i in range(30):
        trade = list(TRADES)[i % len(TRADES)]
        pool = TRADES[trade]
        skills = sorted(rng.sample(pool, rng.randint(2, len(pool))))
        exp = rng.randint(1, 25)
        langs = ["lv"]
        if rng.random() < 0.45:
            langs.append("ru")
        if rng.random() < 0.20:
            langs.append("en")
        avail = rng.choices(
            ["immediate", "one_to_two_weeks", "date"], weights=[5, 3, 2]
        )[0]
        workers.append({
            "id": f"w{i + 1:03d}",
            "name": NAMES[i],
            "trade": trade,
            "skills": skills,
            "experience_years": exp,
            "district": rng.choice(DISTRICTS),
            "languages": langs,
            "availability": avail,
            "available_from": "2026-10-01" if avail == "date" else None,
            "hourly_rate_eur": round(12 + exp * 0.5 + rng.uniform(0, 2), 2),
        })
    return workers


def make_jobs(rng: random.Random):
    jobs = []
    for i in range(20):
        trade = list(TRADES)[i % len(TRADES)]
        pool = TRADES[trade]
        titles = JOB_TITLES[trade]
        req = sorted(rng.sample(pool, rng.randint(1, 3)))
        pay_min = round(rng.uniform(12, 18), 2)
        start = rng.choices(
            ["immediate", "one_to_two_weeks", "date"], weights=[5, 3, 2]
        )[0]
        jobs.append({
            "id": f"j{i + 1:03d}",
            "employer": rng.choice(EMPLOYERS),
            "title": titles[(i // len(TRADES)) % len(titles)],
            "trade": trade,
            "required_skills": req,
            "district": rng.choice(DISTRICTS),
            "pay_min_eur_h": pay_min,
            "pay_max_eur_h": round(pay_min + rng.uniform(2, 6), 2),
            "start": start,
            "start_date": "2026-10-05" if start == "date" else None,
            "season": rng.choices(
                ["summer", "winter", "all_year"], weights=[4, 3, 3]
            )[0],
            "description_lv": f"Steidzami vajadzīgs: {trade}. Prasmes: {', '.join(req)}.",
        })
    return jobs


def main() -> None:
    rng = random.Random(SEED)
    data = {
        "workers": make_workers(rng),
        "jobs": make_jobs(rng),
        "swipes": [],
        "matches": [],
        "feedback": [],
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    trades = {}
    for w in data["workers"]:
        trades[w["trade"]] = trades.get(w["trade"], 0) + 1
    print(f"seed={SEED} workers={len(data['workers'])} jobs={len(data['jobs'])} -> {OUT}")
    print("workers by trade:", trades)


if __name__ == "__main__":
    main()
