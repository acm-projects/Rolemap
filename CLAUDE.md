# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## What Rolemap Is

AI-powered career planning app. Users select a target job, upload a resume and GitHub profile, and receive a skill-gap analysis, ordered learning roadmap, and daily tasks.

**Current state**: Next.js 15 frontend (App Router) + FastAPI backend. Frontend connects to `backend/routers/user_state.py` which serves mock data from `backend/data/mock_db.json` while the Neo4j pipelines are being integrated.

---

## Architecture Overview

Two data stores:
- **Neo4j** — Global knowledge graph (Jobs, Domains, Concepts, Tools, Resources + edges). Populated by the graph pipeline and job scraper.
- **PostgreSQL** — Per-user game state (roadmaps, skill state, streaks). Schema defined in `backend/structure.json`; not yet wired to code — frontend currently uses `mock_db.json`.

Backend is split into two folders under `backend/`:

### `backend/Using/` — API server (run this to serve the frontend)

| Module | Path | Purpose |
|--------|------|---------|
| **API server** | `Using/main.py` | FastAPI service; includes `user_state_router` + 4 graph endpoints |
| **User state router** | `Using/routers/user_state.py` | All frontend-facing endpoints; reads/writes `data/mock_db.json` |
| **Task generator** | `Using/Task_Gen/` | Generates learning + coding tasks per concept (v3: DuckDuckGo + Gemini) |
| **Quiz generator** | `Using/Quiz_Gen/` | Generates adaptive multiple-choice questions per checkpoint |
| **Project generator** | `Using/Project_Gen/` | Suggests real projects aligned to skill level + job |

### `backend/Creation/` — data pipelines (seed Neo4j, scrape jobs, analyze profiles)

| Module | Path | Purpose |
|--------|------|---------|
| **Graph pipeline** | `Creation/graph_engine/01_Seed_Base_Taxonomy/` | Seeds Neo4j from O*NET + roadmap.sh + LLM gap-fill |
| **Roadmap generator** | `Creation/graph_engine/04_Generate_Roadmaps/` | Topological sort over Neo4j → ordered learning path |
| **Graph integrity** | `Creation/graph_engine/03_Verify_Integrity/` | Validates Neo4j graph (cycles, orphans, missing edges) |
| **Island removal** | `Creation/graph_engine/06_Island_Removal/` | Merges disconnected graph clusters |
| **DB tools** | `Creation/graph_engine/05_Database_Tools/` | Neo4j backup + restore |
| **Job scraper** | `Creation/scraping/` | Scrapes LinkedIn/Jobright/Handshake/Indeed/InternList → Neo4j |
| **GitHub analyzer** | `Creation/github/` | Extracts skills/activity from a GitHub profile |
| **Resume parser** | `Creation/resume_parser/` | Extracts skills/experience from a PDF resume |

Roadmap generation (`graph_engine/04_Generate_Roadmaps/`) combines GitHub + resume outputs and runs topological sort over the Neo4j graph to produce an ordered learning path. The onboarding endpoint (`POST /api/v1/onboarding/generate`) orchestrates this full pipeline.

> **Note**: Large data caches (`data/roadmaps/`, `data/raw/`, `data/llm_prereqs/`) and generated outputs (`output/`) are stored in `backend/_archive/` and excluded from git.

---

## User Flow

1. **Sign in** (`/`) → Google or GitHub OAuth → redirect to `/OnBoarding/Major`
2. **Onboarding wizard** (5 steps): Major → Company → Resume upload → Preferences → `/Generate` (triggers `POST /api/v1/onboarding/generate` → runs GitHub + resume analysis + topological sort → redirect to `/dashboard`)
3. **Dashboard** (`/dashboard`) — XP, streak, leaderboard, roadmap cards
4. **Map** (`/map`) — ReactFlow graph of checkpoints + edges; clicking lesson opens `ConceptNodePanel`; clicking quiz goes to `/quiz`
5. **Tasks** (`/tasks`) — Daily task list; clicking a task fetches resources live via `GET /api/v1/tasks/resources?concept=X&subtopic=Y` (DuckDuckGo + Gemini); completing a task calls `PATCH /api/v1/tasks/{id}`
6. **Quiz** (`/quiz`) — Gemini-generated MCQ; pass (≥3/5) = confetti

---

## Frontend (`frontend/`)

**Stack**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4, NextAuth v5-beta, `@xyflow/react` for graph visualization, Shadcn/Radix UI components.

**Dev:**
```bash
cd frontend
npm install
npm run dev     # http://localhost:3000
npm run build
npm run lint
```

**Pages/Routes:**
- `/` — Landing page with OAuth sign-in
- `/OnBoarding/Major` → `/Company` → `/Resume` → `/Preferences` → `/Generate` — Onboarding wizard
- `/dashboard` — XP, streaks, roadmaps, leaderboard
- `/map` — ReactFlow visualization of the user's roadmap (custom pixel-art nodes)
- `/tasks` — Daily tasks with slide-over detail panel
- `/quiz` — Checkpoint knowledge checks with confetti on pass

**Auth** (`auth.ts`): NextAuth JWT sessions with Google + GitHub providers. On sign-in, redirects to `/OnBoarding/Major`. Session object exposes `provider` and `githubUsername`. Wrap pages in `providers.tsx` (`SessionProvider`).

**API client** (`lib/api.ts`): Central `apiFetch<T>()` helper against `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:8000`). Roadmap generation uses a 5-minute `AbortSignal.timeout`. All API types are defined here — keep them in sync with `backend/models.py`.

**Frontend env** (`frontend/.env.local`):
```
NEXT_PUBLIC_API_URL=http://localhost:8000
AUTH_SECRET=<jwt-signing-key>
NEXTAUTH_URL=http://localhost:3000
AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET
GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET
DATABASE_URL=<postgres-url>   # future use
```

---

## Backend API Server (`backend/Using/main.py`)

```bash
cd backend/Using
pip install -r requirements_api.txt
python main.py          # http://localhost:8000  |  /docs for Swagger
```

**Frontend-facing endpoints** (in `Using/routers/user_state.py`, all prefixed `/api/v1`):
- `GET  /users/me` — Current user XP/streaks
- `GET  /dashboard` — Aggregated dashboard data
- `GET  /roadmaps/{roadmap_id}/map` — Checkpoints + edges for ReactFlow
- `GET  /tasks` — Daily tasks + achievements
- `GET  /tasks/resources` — Live resource fetch (DuckDuckGo + Gemini) per concept/subtopic
- `PATCH /tasks/{task_id}` — Update task completion status
- `GET  /quiz/{checkpoint_id}` — Quiz questions
- `POST /onboarding/complete` — Mark onboarding done
- `POST /onboarding/generate` — Run full GitHub → Resume → Roadmap pipeline (slow, ~5 min)
- `POST /onboarding/resume` — Upload PDF to `data/uploads/`

**Graph/analysis endpoints** (in `main.py`):
- `GET  /api/v1/paths/prerequisites` — BFS shortest prerequisite path
- `POST /api/v1/roadmap/generate` — Kahn's topological sort roadmap
- `POST /api/v1/concepts/analyze` — Bidirectional BFS skill-gap analysis
- `POST /api/v1/tasks/generate` — DuckDuckGo + Gemini-curated tasks
- `GET  /health`

Pydantic schemas are in `Using/models.py`. Neo4j session injected via `Using/database.py`. Gemini key rotation: `main.py` cycles through `GEMINI_API_KEY`, `GEMINI_API_KEY_2`, … on rate-limit errors.

---

## Key Commands

**Graph pipeline (seed Neo4j):**
```bash
cd backend/Creation/graph_engine/01_Seed_Base_Taxonomy
python main.py                              # Full run (~5–10 min first time)
python main.py --skip-onet --skip-roadmapsh --skip-llm  # Reload Neo4j from cache only
```

> First run will re-clone `kamranahmedse/developer-roadmap` into `data/roadmaps/` (gitignored).
> O*NET API cache goes to `data/raw/` (gitignored). LLM prereqs cache to `data/llm_prereqs/` (gitignored).

**Job scraper:**
```bash
cd backend/Creation/scraping
python main.py --spider linkedin --limit 5  # Scrape + write to Neo4j
python main.py --spider all --no-llm        # Skip Gemini extraction
python import_csv.py --csv <file.csv> --dry-run  # Preview CSV import
```

**GitHub + Resume → Roadmap:**
```bash
cd backend/Creation/github && python main.py --username <user>
cd backend/Creation/resume_parser && python main.py --pdf <path>
cd backend/Creation/graph_engine/04_Generate_Roadmaps
python generator.py "Front-End Engineer" \
  --github ../../output/github_result.json \
  --resume ../../output/result.json \
  --out ../../output/roadmap.json
```

**Neo4j backup / restore:**
```bash
cd backend/Creation
python graph_engine/05_Database_Tools/backup_neo4j_json.py
python graph_engine/05_Database_Tools/restore_neo4j_json.py --snapshot ../output/backups/<file>.json --yes
```

---

## Environment Variables

**Backend** — place in `backend/.env`:
```
NEO4J_URI / NEO4J_USER / NEO4J_PASSWORD / NEO4J_DATABASE
GEMINI_API_KEY  (+ optional GEMINI_API_KEY_2 … _9 for rotation)
ONET_API_KEY    (preferred) or ONET_USERNAME + ONET_PASSWORD
OPENAI_API_KEY  (LLM gap-fill for jobs missing roadmap.sh slug)
GITHUB_TOKEN
```

---

## Neo4j Graph Schema

Nodes: `Job`, `Domain`, `Concept`, `Tool`, `Resource`, `Company`
Edges: `REQUIRES`, `PREREQUISITE_FOR`, `PART_OF`, `IMPLEMENTS`, `TEACHES`, `POSTED`

All writes are `MERGE`-based (idempotent). Scraped entities carry `source`, `import_batch`, `last_imported_at` metadata.

---

## Code Conventions

**Backend (Python 3.9+):**
- Type hints throughout, Google-style docstrings
- `snake_case` functions/variables, `PascalCase` classes, `UPPER_SNAKE_CASE` constants
- Use `logging` (not `print`) for flow control; catch specific exceptions
- Before adding a new synonym map or skill normalizer, check `scraping/matcher.py`
- Snapshot Neo4j before any destructive graph operation

**Frontend (TypeScript):**
- All API response types live in `lib/api.ts` — extend there, not inline
- New UI components go in `app/components/`; generic/reusable ones in `components/ui/`
- Follow the existing pixel-art node aesthetic (`RoadmapNode.tsx`) for map-related UI

---

## Further Reading

- `backend/structure.json` — Neo4j + PostgreSQL schema definition
- `AGENTS.md` — build/test commands and code-style guide
