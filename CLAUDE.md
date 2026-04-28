# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## What Rolemap Is

AI-powered career planning app. Users select a target job, upload a resume and GitHub profile, and receive a skill-gap analysis, ordered learning roadmap, and daily tasks. Gamified with XP, streaks, a pixel-art character, and a cosmetics shop.

**Current state**: Next.js 15 frontend (App Router) + FastAPI backend. Frontend reads/writes `backend/Using/data/mock_db.json` via `backend/Using/routers/user_state.py` while Neo4j pipelines are being integrated.

---

## Architecture Overview

Two data stores:
- **Neo4j** — Global knowledge graph (Jobs, Domains, Concepts, Tools, Resources + edges). Populated by the graph pipeline and job scraper.
- **PostgreSQL** — Per-user game state (schema in `backend/structure.json`); not yet wired — frontend uses `mock_db.json`.

Backend split into two folders:

### `backend/Using/` — API server (run this to serve the frontend)

| Module | Path | Purpose |
|--------|------|---------|
| **API server** | `Using/main.py` | FastAPI; graph endpoints + Gemini key rotation |
| **User state router** | `Using/routers/user_state.py` | All frontend-facing endpoints; reads/writes `mock_db.json` |
| **Task generator** | `Using/Task_Gen/` | DuckDuckGo + Gemini curated resources per subtopic (V3) |
| **Quiz generator** | `Using/Quiz_Gen/quiz_generator.py` | Gemini MCQ generation |
| **Project generator** | `Using/Project_Gen/` | Project idea generation + GitHub repo evaluation |
| **GitHub analyzer** | `Using/github/` | Skill extraction from a GitHub profile (used by onboarding) |
| **Resume parser** | `Using/resume_parser/` | Skill extraction from a PDF resume (used by onboarding) |

### `backend/Creation/` — data pipelines (seed Neo4j, scrape jobs)

| Module | Path | Purpose |
|--------|------|---------|
| **Graph pipeline** | `Creation/graph_engine/01_Seed_Base_Taxonomy/` | Seeds Neo4j from O*NET + roadmap.sh + LLM gap-fill |
| **Roadmap generator** | `Creation/graph_engine/04_Generate_Roadmaps/` | Topological sort over Neo4j → ordered learning path |
| **Graph integrity** | `Creation/graph_engine/03_Verify_Integrity/` | Validates Neo4j graph |
| **Island removal** | `Creation/graph_engine/06_Island_Removal/` | Merges disconnected clusters |
| **DB tools** | `Creation/graph_engine/05_Database_Tools/` | Neo4j backup + restore |
| **Job scraper** | `Creation/scraping/` | Scrapes LinkedIn/Jobright/Handshake/Indeed → Neo4j |

`POST /api/v1/onboarding/generate` orchestrates: GitHub analyzer → resume parser → `backend/Using/generator.py` (wraps `Creation/graph_engine/04_Generate_Roadmaps/`) → Gemini batch content → writes checkpoints + edges to `mock_db.json`.

---

## User Flow

1. **Sign in** (`/`) → Google or GitHub OAuth → `/OnBoarding/Major`
2. **Onboarding** (5 steps): Major → Company → Resume upload → Preferences → `/Generate` (calls `POST /api/v1/onboarding/generate`, ~5 min) → `/dashboard`
3. **Dashboard** (`/dashboard`) — XP, streak, leaderboard, roadmap cards with minimaps
4. **Map** (`/map`) — ReactFlow graph of checkpoints; pixel-art nodes; clicking lesson opens `ConceptNodePanel`; clicking quiz goes to `/quiz`
5. **Tasks** (`/tasks`) — Daily resource list (Learning + Coding cards); skill decay review cards shown above daily tasks; completing all resources for a subtopic triggers "Done for the day" screen; `POST /tasks/advance` moves to next subtopic
6. **Quiz** (`/quiz`) — Gemini MCQ; 60% pass = confetti + XP + checkpoint unlock; `POST /quiz/{checkpoint_id}/submit`
7. **Shop** (`/shop`) — Pixel-art character cosmetics purchasable with XP; `PATCH /shop/appearance` saves equipped layers

---

## Gamification

XP events (defined in `user_state.py`):
- Resource completed: +5 XP
- Subtopic completed: +10 XP
- Lesson checkpoint: +50 XP
- Project checkpoint: +200 XP
- Quiz pass: +100 XP

Skill decay uses SM-2 spaced repetition on completed checkpoints. `GET /skills/decay` returns health (0–100) + `decay_level` (`fresh` / `review_soon` / `decaying` / `forgotten`). `POST /skills/decay/review` applies a SM-2 quality score (0–5) and advances `next_review`.

---

## Frontend (`frontend/`)

**Stack**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4, NextAuth v5-beta, `@xyflow/react`, Shadcn/Radix UI.

**Dev:**
```bash
cd frontend
npm install
npm run dev     # http://localhost:3000
npm run build
npm run lint
```

**Key files:**
- `lib/api.ts` — All API response types + `api.*` fetch helpers. Extend types here, never inline.
- `app/context/CharacterContext.tsx` — Global pixel-art character state (`charState`).
- `app/components/RoadmapNode.tsx` — Custom ReactFlow node (pixel-art aesthetic; follow this for any map UI).
- `app/components/ConceptNodePanel.tsx` — Slide-over panel for lesson/quiz checkpoints.
- `lib/layout.ts` — Dagre layout for ReactFlow map.

**Character system**: Layered PNG sprites served from `public/characters/`. Equipped layers (`skin`, `eyes`, `clothes`, `pants`, `shoes`, `hair`, `accessories`) + color variant indices stored in `mock_db → users[0].character` and mirrored to `localStorage` as `character_saved` / `character_saved_variants`. Die/sleep animations in `tasks/page.tsx` use fixed-position overlays with RAF loops.

**Auth** (`auth.ts`): NextAuth JWT with Google + GitHub. Session exposes `provider` and `githubUsername`. All pages wrapped in `providers.tsx`.

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

`.env` is loaded from `backend/.env` (one level up from `Using/`).

**User state endpoints** (`routers/user_state.py`, prefix `/api/v1`):
- `GET  /users/me` — User XP/streaks
- `GET  /users/me/character` — Equipped character layers
- `PATCH /users/me/character` — Save character
- `GET  /dashboard` — Aggregated dashboard data + roadmap minimaps
- `GET  /roadmaps/{roadmap_id}/map` — Checkpoints + edges for ReactFlow
- `GET  /tasks` — Daily resource tasks for current subtopic
- `POST /tasks/advance` — Clear `daily_done` flag, move to next subtopic
- `GET  /tasks/resources` — Live resource fetch (DuckDuckGo + Gemini) with cache
- `PATCH /tasks/{task_id}` — Update resource/subtopic completion; triggers XP, streak, checkpoint unlock, background pregen of next node's resources
- `GET  /quiz/{checkpoint_id}` — Gemini-generated quiz questions
- `POST /quiz/{checkpoint_id}/submit` — Score quiz; pass (≥60%) unlocks downstream checkpoints
- `POST /onboarding/complete` — Mark onboarding done
- `POST /onboarding/generate` — Full GitHub → Resume → Roadmap pipeline (~5 min)
- `POST /onboarding/resume` — Upload PDF to `data/uploads/`
- `GET  /skills/decay` — SM-2 decay rows for completed checkpoints
- `POST /skills/decay/review` — Apply SM-2 review (quality 0–5)
- `GET  /shop` — Catalog + user unlock state + XP
- `POST /shop/purchase` — Spend XP to unlock cosmetic
- `PATCH /shop/appearance` — Save equipped layers

**Graph/analysis endpoints** (`main.py`, prefix `/api/v1`):
- `GET  /paths/prerequisites` — BFS shortest prerequisite path
- `POST /roadmap/generate` — Kahn's topological sort roadmap
- `POST /concepts/analyze` — Bidirectional BFS skill-gap analysis
- `POST /tasks/generate` — DuckDuckGo + Gemini curated tasks (V3)
- `POST /quiz/generate` — Adaptive MCQ (difficulty 1–5)
- `POST /projects/generate` — Project idea for a concept set
- `POST /projects/evaluate` — Evaluate GitHub repo against concepts
- `GET  /health`

**Gemini key rotation**: `main.py` cycles through `GEMINI_API_KEY`, `GEMINI_API_KEY_2`, … on rate-limit. Model: `gemini-2.5-flash`.

---

## mock_db.json State

`backend/Using/data/mock_db.json` is the live per-user state file. Key top-level keys:

| Key | Purpose |
|-----|---------|
| `users[0]` | XP, streak, character, onboarding state |
| `user_gamification[0]` | Mirrors XP + streak for leaderboard |
| `roadmaps` | Roadmap records; `rm-generated` is the onboarding output |
| `roadmap_checkpoints` | Nodes with `progress`, `locked`, `kind` (`lesson`/`quiz`/`project`), `learning_goals` |
| `roadmap_edges` | Source → target edges |
| `user_subtopic_progress` | Per-subtopic completion (`subtopic__{cp_id}__{idx}`) |
| `user_resource_progress` | Per-resource completion (`resource__{cp_id}__{sub_idx}__{res_idx}`) |
| `task_resources_cache` | Cached DuckDuckGo+Gemini results per `concept`+`subtopic` |
| `quiz_questions` | Cached quiz questions per `checkpoint_id` |
| `user_shop` | Purchased item IDs + equipped layers + gender |
| `daily_done` | Boolean; set when all resources for a subtopic complete |

Reset: `python backend/Using/data/reset_mock_db.py`

---

## Key Commands

**Backend API:**
```bash
cd backend/Using
python main.py
```

**Graph pipeline (seed Neo4j):**
```bash
cd backend/Creation/graph_engine/01_Seed_Base_Taxonomy
python main.py
python main.py --skip-onet --skip-roadmapsh --skip-llm  # reload from cache
```

**Job scraper:**
```bash
cd backend/Creation/scraping
python main.py --spider linkedin --limit 5
python main.py --spider all --no-llm
```

**GitHub + Resume → Roadmap (manual):**
```bash
cd backend/Using
python github/main.py --username <user> --out output/github_result.json
python resume_parser/main.py --pdf <path> --out output/result.json
python generator.py "Front-End Engineer" \
  --github output/github_result.json \
  --resume output/result.json \
  --out output/roadmap.json
```

**Neo4j backup / restore:**
```bash
cd backend/Creation
python graph_engine/05_Database_Tools/backup_neo4j_json.py
python graph_engine/05_Database_Tools/restore_neo4j_json.py --snapshot ../output/backups/<file>.json --yes
```

---

## Environment Variables

**Backend** (`backend/.env`):
```
NEO4J_URI / NEO4J_USER / NEO4J_PASSWORD / NEO4J_DATABASE
GEMINI_API_KEY  (+ optional GEMINI_API_KEY_2 … _9 for rotation)
ONET_API_KEY    (preferred) or ONET_USERNAME + ONET_PASSWORD
OPENAI_API_KEY  (LLM gap-fill for jobs without roadmap.sh slug)
GITHUB_TOKEN
```

---

## Neo4j Graph Schema

Nodes: `Job`, `Domain`, `Concept`, `Tool`, `Resource`, `Company`
Edges: `REQUIRES`, `PREREQUISITE_FOR`, `PART_OF`, `IMPLEMENTS`, `TEACHES`, `POSTED`

All writes are `MERGE`-based (idempotent). Scraped entities carry `source`, `import_batch`, `last_imported_at`.

---

## Code Conventions

**Backend (Python 3.9+):**
- Type hints throughout, Google-style docstrings
- `snake_case` functions/variables, `PascalCase` classes, `UPPER_SNAKE_CASE` constants
- Use `logging` (not `print`) for flow control; catch specific exceptions
- Before adding a skill normalizer, check `scraping/matcher.py`
- Snapshot Neo4j before any destructive graph operation

**Frontend (TypeScript):**
- All API response types live in `lib/api.ts` — extend there, not inline
- New page-level components go in `app/components/`; generic/reusable ones in `components/ui/`
- Follow pixel-art node aesthetic (`RoadmapNode.tsx`) for map-related UI; teal palette `#2d5050` / `#4e8888` / `#7ab3b3` / `#d4e8e8` throughout

---

## Further Reading

- `backend/structure.json` — Neo4j + PostgreSQL schema definition
- `AGENTS.md` — additional build/test commands and code-style guide
- `backend/Using/data/shop_catalog.json` — cosmetic item definitions (categories: skin, eyes, clothes, pants, shoes, hair, accessories)
