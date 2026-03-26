# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## What Rolemap Is

AI-powered career planning app. Users select a target job, upload a resume and GitHub profile, and receive a skill-gap analysis, ordered learning roadmap, and daily tasks.

**Current state**: Python-first backend (CLI pipelines + FastAPI service). Frontend and PostgreSQL game engine are planned but not yet implemented.

---

## Architecture Overview

Two data stores:
- **Neo4j** — Global knowledge graph (Jobs, Domains, Concepts, Tools, Resources + edges). Populated by the graph pipeline and job scraper.
- **PostgreSQL** — Per-user game state (roadmaps, skill state, streaks). Schema defined in `backend/structure.json`; no production code yet.

Five core backend modules (all under `backend/`):

| Module | Path | Purpose |
|--------|------|---------|
| **API server** | `main.py` | FastAPI service; 4 endpoints + health check |
| **Graph pipeline** | `graph_engine/01_Seed_Base_Taxonomy/` | Seeds Neo4j from O*NET + roadmap.sh + LLM gap-fill |
| **Job scraper** | `scraping/` | Scrapes LinkedIn/Jobright/Handshake/Indeed/InternList → Neo4j |
| **GitHub analyzer** | `github/` | Extracts skills/activity from a GitHub profile |
| **Resume parser** | `resume_parser/` | Extracts skills/experience from a PDF resume |

Roadmap generation (`graph_engine/04_Generate_Roadmaps/`) combines GitHub + resume outputs and runs topological sort over the Neo4j graph to produce an ordered learning path.

---

## API Server (`backend/main.py`)

```bash
cd backend
pip install -r requirements_api.txt
python main.py          # http://localhost:8000  |  /docs for Swagger
```

Endpoints:
- `GET  /api/v1/paths/prerequisites` — BFS shortest prerequisite path between two concepts
- `POST /api/v1/roadmap/generate` — Kahn's topological sort roadmap for a target job
- `POST /api/v1/concepts/analyze` — Bidirectional BFS skill-gap analysis
- `POST /api/v1/tasks/generate` — DuckDuckGo + Gemini-curated learning tasks
- `GET  /health`

Pydantic schemas are in `backend/models.py`. Neo4j session is injected via `backend/database.py`.

Gemini API key rotation: `main.py` cycles through `GEMINI_API_KEY`, `GEMINI_API_KEY_2`, … on rate-limit errors.

---

## Key Commands

**Graph pipeline (seed Neo4j):**
```bash
cd backend/graph_engine/01_Seed_Base_Taxonomy
python main.py                              # Full run (~5–10 min first time)
python main.py --skip-onet --skip-roadmapsh --skip-llm  # Reload Neo4j from cache only
```

**Job scraper:**
```bash
cd backend/scraping
python main.py --spider linkedin --limit 5  # Scrape + write to Neo4j
python main.py --spider all --no-llm        # Skip Gemini extraction
python import_csv.py --csv output/file.csv --dry-run  # Preview CSV import
```

**GitHub + Resume → Roadmap:**
```bash
cd backend/github && python main.py --username <user>
cd backend/resume_parser && python main.py --pdf <path>
cd backend/graph_engine/04_Generate_Roadmaps
python generator.py "Front-End Engineer" \
  --github ../output/github_result.json \
  --resume ../output/result.json \
  --out ../output/roadmap.json
```

**Neo4j backup / restore:**
```bash
cd backend
python graph_engine/05_Database_Tools/backup_neo4j_json.py
python graph_engine/05_Database_Tools/restore_neo4j_json.py --snapshot output/backups/<file>.json --yes
```

**Tests:**
```bash
cd backend && python test_extraction.py
cd backend/scraping/normalization_testing && python normalize_linkedin_csv.py --in in.csv --out out.csv
cd backend/Task_Gen && python test_runner.py
```

---

## Environment Variables

Place in `backend/.env` (loaded via `python-dotenv`):

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

- Python 3.9+, type hints throughout, Google-style docstrings
- `snake_case` functions/variables, `PascalCase` classes, `UPPER_SNAKE_CASE` constants
- Use `logging` (not `print`) for flow control; catch specific exceptions
- Before adding a new synonym map or skill normalizer, check `scraping/matcher.py` — the canonical location for skill synonyms and title/concept matching
- Validate scraping logic changes in `scraping/normalization_testing/` before promoting to the live pipeline
- Snapshot Neo4j before any destructive graph operation

---

## Further Reading

- `backend/CLAUDE.md` — deep implementation notes for each pipeline
- `AGENTS.md` — build/test commands and code-style guide
- `backend/API_SPECIFICATION.md` — full API endpoint design
- `backend/structure.json` — Neo4j + PostgreSQL schema definition
