# MeisterMatch Platform — Architecture

Tinder-style swipe matching for skilled trades in Latvia. Bachelor thesis prototype.

## Stack

- **Frontend**: React 19 + Vite + TypeScript (web/)
- **Backend**: Node.js + Express + TypeScript (api/)
- **ML/Ranking**: Python + FastAPI (ml/)
- **Shared contract**: JSON Schema + TypeScript + Pydantic types (shared/)
- **Data**: Deterministic synthetic JSON seed (data/seed.json)

## File map

```
meistermatch-platform/
├── web/                    # React frontend
│   ├── src/
│   │   ├── App.tsx         # Main app: auth pages, swipe deck, chat
│   │   ├── App.css         # Tinder-style dark theme CSS
│   │   ├── api.ts          # HTTP client to the Node API
│   │   ├── contract.ts     # TypeScript types (mirrors shared/)
│   │   ├── main.tsx        # Entry point
│   │   └── index.css       # Design tokens (colors, font, base styles)
│   ├── index.html          # HTML shell + Inter font CDN
│   ├── package.json        # React + Vite deps
│   └── vite.config.ts      # Vite config
│
├── api/                    # Express backend
│   ├── src/
│   │   ├── server.ts       # Express app: auth, decks, swipes, matches, chat
│   │   ├── store.ts        # JSON-file store (seed copy + runtime)
│   │   └── auth.ts         # Simple session-based auth
│   ├── package.json        # Express + tsx deps
│   ├── tsconfig.json       # TypeScript config
│   └── requirements.txt    # (moved) — ml/requirements.txt
│
├── ml/                     # FastAPI ranking service
│   ├── main.py             # FastAPI app: /rank endpoint
│   ├── models.py           # Pydantic models
│   ├── ranker.py           # Interpretable scoring logic
│   ├── requirements.txt    # fastapi + uvicorn + pydantic
│   └── __init__.py         # (moved) — api/src/
│
├── shared/                 # Data contract (single source of truth)
│   ├── schema.json         # JSON Schema for all types
│   └── contract.ts         # TypeScript interfaces
│
├── scripts/
│   └── seed.py             # Deterministic synthetic data generator
│
├── data/
│   ├── seed.json           # Generated: 30 workers + 20 jobs
│   └── store.json          # Runtime copy (gitignored)
│
├── .gitignore
├── README.md
└── start-all.ps1           # One-command startup script
```

## How they connect

```
Browser (React)          Node/Express            FastAPI
    │                        │                       │
    │ GET /api/workers       │                       │
    │───────────────────────>│                       │
    │                        │ read data/store.json  │
    │                        │──────────────────────>│ (not needed here)
    │                        │<──────────────────────│
    │<───────────────────────│                       │
    │                        │                       │
    │ POST /api/deck/worker/w001  │                  │
    │───────────────────────>│                       │
    │                        │ POST /rank to ml      │
    │                        │──────────────────────>│
    │                        │<──────────────────────│
    │<───────────────────────│                       │
```

The Node API acts as the orchestrator. When a client requests a deck, the Node API
calls the FastAPI rank service (`http://127.0.0.1:8001/rank`), gets scored results,
and returns them to the client. Swipes and matches are stored in JSON files.
Chat messages are stored in `data/store.json` alongside matches.

## Running the prototype

### Single command (recommended)
```powershell
cd meistermatch-platform
.\start-all.ps1
```
This starts all three services at once. Opens `http://127.0.0.1:5173`.

### Manual (for debugging)
```powershell
# Terminal 1
.\.venv\Scripts\python -m uvicorn main:app --app-dir ml --port 8001

# Terminal 2
cd api
npm run dev

# Terminal 3
cd web
npm run dev
```

## Key design decisions

1. **Single source of truth**: `shared/contract.ts` and `shared/schema.json` define
   every type. `api/src/store.ts`, `ml/models.py`, and `web/src/contract.ts` all
   mirror this. No type drift between components.

2. **Interpretable ranking**: The ML service is a rule-based scorer (skills,
   district, availability, pay, experience). It is not a black-box model. Every
   score comes with human-readable reasons. This is the baseline the thesis
   evaluates against (Phase 2 active learning must beat it).

3. **JSON-file store**: `data/store.json` holds the runtime state (swipes, matches,
   users, chat). It starts as a copy of `data/seed.json`. This is fine for a
   prototype. Phase 2+ can swap in SQLite or Postgres behind the same interface.

4. **Tinder-style UX**: Full-screen cards, Like/Pass buttons, no menus or tabs.
   Matches unlock a chat. The thesis evaluators see the core interaction pattern
   working in one screen.

5. **Auth flow**: Login/signup pages before the main app. Simple session-based
   auth stored in `data/store.json`. No external identity provider needed for
   the prototype.
