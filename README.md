# MeisterMatch platform (prototype)

Reciprocal human-AI job matching for skilled trades in Latvia.
Bachelor thesis prototype — swipe-based, mutual matching, active-learning ranker.

## Layout

- `web/` — React + Vite + TypeScript swipe UI (worker deck + employer deck + matches)
- `api/` — Node + TypeScript + Express API (decks, swipes, mutual matches; :3001)
- `ml/` — FastAPI rank service, rule-based baseline with reasons (:8001)
- `shared/` — data contract (source of truth):
  - `schema.json` — JSON Schema for workers, jobs, swipes, matches, feedback
  - `contract.ts` — TypeScript mirror (incl. rank DTOs)
- `scripts/seed.py` — deterministic synthetic data (30 workers + 20 jobs)
- `data/seed.json` — generated seed output (reproducible, seed 42)
- `data/store.json` — runtime copy of the seed + swipes/matches (gitignored)

`ml/models.py` is the Pydantic mirror of the contract.

## Run (3 terminals)

```powershell
# 1. rank service
.\.venv\Scripts\python -m uvicorn main:app --app-dir ml --port 8001

# 2. api
cd api; npm install; npm run dev   # http://127.0.0.1:3001

# 3. frontend
cd web; npm install; npm run dev   # http://127.0.0.1:5173
```

## Roadmap

- **Phase 0** (done): repo, contract, seed data
- **Phase 1** (done): vertical slice — swipe API, mutual match, rule-based ranker, React swipe screen
- **Phase 2**: active-learning feedback loop (uncertainty sampling, seasonal re-training)
- **Phase 3**: evaluation vs. static baseline → thesis results chapter
- **Phase 4**: polish, LV/RU/EN, ethics, Anotācija (voice onboarding = future work)
