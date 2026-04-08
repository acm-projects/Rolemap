# AGENTS.md — Coding Agent Guidelines for Rolemap

This file provides build, test, and code style guidelines for agentic developers (and humans) working in the Rolemap repository.

---

## What is Rolemap?

Rolemap is an AI-powered career planning backend that:
- Seeds a global skill graph in Neo4j
- Extracts user skills from GitHub + resume
- Scrapes live job postings and maps them to graph concepts
- Generates learning paths from skill gaps

**Current Stack:** Python-based CLI pipelines. 
**Planned Stack (per `backend/README.md`):** Next.js (React + TypeScript), Tailwind CSS, Node.js, Express, PostgreSQL, Prisma.

---

## Build & Test Commands

### Environment Setup
Each module manages its own dependencies.
```bash
# Install dependencies for a specific module
cd backend/<module>
pip install -r requirements.txt

# Modules: knowledge_graph, scraping, github, resume_parser, pathfinder
```

### Running Pipelines

**Knowledge Graph (Neo4j seeding)**
```bash
cd backend/graph_engine/01_Seed_Base_Taxonomy
python main.py                    # Full pipeline
python main.py --skip-onet        # Reuse cached O*NET data
python main.py --skip-roadmapsh   # Reuse cached roadmap.sh data
python main.py --skip-llm         # Reuse cached LLM output
```

**Scraping Pipeline**
```bash
cd backend/scraping
python main.py --spider linkedin --limit 5           # Scrape with LLM
python main.py --spider all --no-llm                 # Disable LLM extraction
python import_csv.py --csv output/file.csv --dry-run # Preview changes
```

**GitHub Analyzer & Resume Parser**
```bash
cd backend/github
python main.py --username <github_username>

cd ../resume_parser
python main.py --pdf <path_to_pdf>
```

**Pathfinder (Roadmap generation)**
```bash
cd backend/graph_engine/04_Generate_Roadmaps
python generator.py "Front-End Engineer" \
  --github ../output/github_result.json \
  --resume ../output/result.json \
  --out ../output/roadmap.json
```

### Testing Operations
```bash
# Test file location: backend/test_extraction.py
cd backend
python test_extraction.py

# Standalone local tuning area for LinkedIn normalization
cd backend/scraping/normalization_testing
python normalize_linkedin_csv.py --in in.csv --out out.csv --drop-noise
```

### Database Operations (Neo4j)
```bash
cd backend/graph_engine/05_Database_Tools
python backup_neo4j_json.py
python restore_neo4j_json.py --snapshot output/backups/<snapshot>.json --yes

cd scraping
python wipe_db.py # Wipe database (CAUTION)
```

---

## Code Style Guidelines

### Python Formatting & Types
- **Python version**: 3.9+
- **Type hints**: Use throughout (PEP 484).
- **Line length**: Aim for ≤100 characters.
- **Docstring style**: Google-style with `"""..."""` blocks.
- **Imports**: Order as stdlib → third-party → local.

### Naming Conventions
- **Variables/functions**: `snake_case` (e.g., `process_job`)
- **Classes**: `PascalCase` (e.g., `Neo4jWriter`)
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `MAX_RETRIES`)
- **Private**: Prefix with `_` (e.g., `_helper_function`)

### Error Handling & Logging
```python
import logging
logger = logging.getLogger(__name__)

try:
    data = fetch_from_api(url)
except requests.Timeout as e:
    logger.error(f"API timeout for {url}: {e}")
    return None
```
- Catch specific exceptions.
- Use built-in `logging` module; do not use `print()` for flow control.

### Dictionary/JSON Handling
- Use `.get()` with defaults: `user.get("email", "unknown")`.
- Validate structures: `assert isinstance(data, dict)`.
- Keys should be lowercase strings.

---

## Key Developer Notes & Architecture

1. **Idempotent Design**: Graph writes use `MERGE` for reproducibility.
2. **Metadata Tracking**: Graph entities carry `source` and `import_batch` fields for traceability.
3. **Normalize Early**: Skill synonyms and title matching happen in `scraping/matcher.py`.
4. **Skill Extraction Flow**:
   - LLM-based extraction (preferred, Gemini API) -> Fallback to rule-based matching.
   - For scraping quality iterations, validate in `backend/scraping/normalization_testing/` before promoting.
5. **Environment Variables**: Load with `python-dotenv`. Common vars: `NEO4J_URI`, `GEMINI_API_KEY`, `GITHUB_TOKEN`. Defined in `backend/.env`.

---

## References
- **Architecture**: `backend/CLAUDE.md` for pipeline documentation.
- **MVP & Tech Stack**: `backend/README.md`.
- **Job Taxonomy**: `backend/graph_engine/01_Seed_Base_Taxonomy/config/jobs.py`
