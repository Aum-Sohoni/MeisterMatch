# MeisterMatch platform (prototype)

Reciprocal human-AI job matching for skilled trades in Latvia.
Bachelor thesis prototype — swipe-based, mutual matching, active-learning ranker.

## Layout

- `web/` — React + Vite + TypeScript frontend (swipe UI, Phase 1)
- `api/` — FastAPI backend (Node/TS API + Python ML service split lands in Phase 1)
- `shared/` — data contract (source of truth):
  - `schema.json` — JSON Schema for workers, jobs, swipes, matches, feedback
  - `contract.ts` — TypeScript mirror
- `scripts/seed.py` — deterministic synthetic data (30 workers + 20 jobs)
- `data/seed.json` — generated seed output (reproducible, seed 42)

`api/app/models.py` is the Pydantic mirror of the contract.

## Phase 0 commands

```powershell
# seed data
python scripts/seed.py

# frontend
cd web; npm install; npm run dev

# backend (Phase 1+)
pip install -r api/requirements.txt
uvicorn app.main:app --reload --app-dir api
```

## Roadmap

- **Phase 0** (done): repo, contract, seed data
- **Phase 1**: vertical slice — swipe API, mutual match, rule-based ranker, React swipe screen
- **Phase 2**: active-learning feedback loop (uncertainty sampling, seasonal re-training)
- **Phase 3**: evaluation vs. static baseline → thesis results chapter
- **Phase 4**: polish, LV/RU/EN, ethics, Anotācija (voice onboarding = future work)
