"""
Rolemap Knowledge Graph Pipeline Orchestrator

Usage:
  python main.py                     # full pipeline
  python main.py --skip-onet         # reuse cached O*NET responses
  python main.py --skip-roadmapsh    # reuse cached roadmap.sh parse
  python main.py --skip-llm          # reuse cached LLM output
  python main.py --neo4j-only        # skip all scraping, load cached data only

Environment:
  Copy .env.example to .env and fill in credentials before running.
"""

import argparse
import json
import sys
from pathlib import Path

# Add knowledge_graph root to path so imports resolve correctly
sys.path.insert(0, str(Path(__file__).parent))

from dotenv import load_dotenv

load_dotenv()


# ---------------------------------------------------------------------------
# Argument parsing
# ---------------------------------------------------------------------------

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Rolemap knowledge graph pipeline"
    )
    parser.add_argument(
        "--skip-onet",
        action="store_true",
        help="Reuse cached O*NET responses (skip API calls)",
    )
    parser.add_argument(
        "--skip-roadmapsh",
        action="store_true",
        help="Reuse cached roadmap.sh parse (skip git clone/pull)",
    )
    parser.add_argument(
        "--skip-llm",
        action="store_true",
        help="Reuse cached LLM output (skip OpenAI calls)",
    )
    parser.add_argument(
        "--neo4j-only",
        action="store_true",
        help="Skip all scraping; load from cached data only",
    )
    return parser.parse_args()


# ---------------------------------------------------------------------------
# Step helpers
# ---------------------------------------------------------------------------

def step_onet(jobs, skip: bool) -> tuple[dict, dict]:
    """
    Returns:
        onet_overviews:  {soc_code: overview_dict}
        tools_by_soc:    {soc_code: [tool_dict, ...]}
    """
    from scraper.onet_client import fetch_job_overview, fetch_technology_skills

    print("\n=== Step 1: O*NET Technology Skills ===")
    use_cache = skip

    onet_overviews: dict = {}
    tools_by_soc: dict = {}
    seen_socs: set[str] = set()

    for job in jobs:
        soc = job["soc_code"]
        if soc in seen_socs:
            continue
        seen_socs.add(soc)

        try:
            overview = fetch_job_overview(soc, use_cache=use_cache)
            onet_overviews[soc] = overview
        except Exception as exc:
            print(f"  [O*NET] WARNING: Could not fetch overview for {soc}: {exc}")
            onet_overviews[soc] = {}

        try:
            tools = fetch_technology_skills(soc, use_cache=use_cache)
            tools_by_soc[soc] = tools
            print(f"  [O*NET] {soc}: {len(tools)} tools")
        except Exception as exc:
            print(f"  [O*NET] WARNING: Could not fetch tools for {soc}: {exc}")
            tools_by_soc[soc] = []

    total_tools = sum(len(v) for v in tools_by_soc.values())
    print(f"  O*NET complete: {len(seen_socs)} SOC codes, {total_tools} tool records")
    return onet_overviews, tools_by_soc


def step_roadmapsh(jobs, skip: bool) -> dict:
    """
    Returns:
        roadmap_data: {slug: {slug, concepts, prereq_edges}}
    """
    from scraper.roadmapsh_parser import ensure_repo, parse_all_roadmaps

    print("\n=== Step 2: roadmap.sh Parsing ===")

    slugs = list({job["roadmap_slug"] for job in jobs if job.get("roadmap_slug")})
    repo_path = ensure_repo(use_cache=skip)
    roadmap_data = parse_all_roadmaps(slugs, repo_path, use_cache=skip)

    total_concepts = sum(len(v["concepts"]) for v in roadmap_data.values())
    total_edges = sum(len(v["prereq_edges"]) for v in roadmap_data.values())
    print(
        f"  roadmap.sh complete: {len(roadmap_data)} roadmaps, "
        f"{total_concepts} raw concepts, {total_edges} prereq edges"
    )
    return roadmap_data


def step_llm_gap_fill(jobs, tools_by_soc, skip: bool) -> dict:
    """
    Returns:
        llm_concepts: {job_display_name: [concept_dict, ...]}
    """
    from pipeline.concept_builder import run_gap_fill

    print("\n=== Step 3: LLM Gap-Fill ===")

    # Build tool name lists by SOC
    tools_names_by_soc = {
        soc: [t["name"] for t in tools]
        for soc, tools in tools_by_soc.items()
    }

    llm_concepts = run_gap_fill(jobs, tools_names_by_soc, use_cache=skip)
    total = sum(len(v) for v in llm_concepts.values())
    print(f"  LLM gap-fill complete: {total} concepts generated")
    return llm_concepts


def step_process(onet_overviews, tools_by_soc, roadmap_data, llm_concepts) -> dict:
    from pipeline.processor import process_all

    print("\n=== Step 4: Processing ===")
    return process_all(onet_overviews, tools_by_soc, roadmap_data, llm_concepts)


def step_load(graph_data) -> None:
    from loader.neo4j_loader import load_all
    from scraper.resource_scraper import load_resources

    print("\n=== Step 5: Loading into Neo4j ===")
    resources = load_resources()
    load_all(graph_data, resources)


# ---------------------------------------------------------------------------
# Cache helpers for --neo4j-only mode
# ---------------------------------------------------------------------------

RAW_DIR = Path(__file__).parent / "data" / "raw"


def _load_cached_tools() -> dict:
    """Load all cached *_tools.json files from data/raw/."""
    tools_by_soc: dict = {}
    for p in RAW_DIR.glob("*_tools.json"):
        soc = p.stem.replace("_tools", "")
        with p.open() as f:
            tools_by_soc[soc] = json.load(f)
    return tools_by_soc


def _load_cached_overviews() -> dict:
    overviews: dict = {}
    for p in RAW_DIR.glob("*_overview.json"):
        soc = p.stem.replace("_overview", "")
        with p.open() as f:
            overviews[soc] = json.load(f)
    return overviews


def _load_cached_roadmaps() -> dict:
    roadmap_data: dict = {}
    for p in RAW_DIR.glob("*_concepts.json"):
        slug = p.stem.replace("_concepts", "")
        with p.open() as f:
            roadmap_data[slug] = json.load(f)
    return roadmap_data


def _load_cached_llm() -> dict:
    llm_concepts: dict = {}
    llm_dir = Path(__file__).parent / "data" / "llm_concepts"
    for p in llm_dir.glob("*.json"):
        with p.open() as f:
            llm_concepts[p.stem] = json.load(f)
    return llm_concepts


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    args = parse_args()
    neo4j_only = args.neo4j_only

    from config.jobs import JOBS

    if neo4j_only:
        print("=== --neo4j-only mode: loading from cache ===")
        onet_overviews = _load_cached_overviews()
        tools_by_soc = _load_cached_tools()
        roadmap_data = _load_cached_roadmaps()
        llm_concepts = _load_cached_llm()
    else:
        onet_overviews, tools_by_soc = step_onet(
            JOBS, skip=args.skip_onet
        )
        roadmap_data = step_roadmapsh(
            JOBS, skip=args.skip_roadmapsh
        )
        llm_concepts = step_llm_gap_fill(
            JOBS, tools_by_soc, skip=args.skip_llm
        )

    graph_data = step_process(onet_overviews, tools_by_soc, roadmap_data, llm_concepts)
    step_load(graph_data)

    print("\n=== Pipeline complete ===")
    print(f"  Domains:  {len(graph_data['domains'])}")
    print(f"  Jobs:     {len(graph_data['jobs'])}")
    print(f"  Concepts: {len(graph_data['concepts'])}")
    print(f"  Tools:    {len(graph_data['tools'])}")
    print(
        f"\n  To verify, open Neo4j Browser at http://localhost:7474 and run:\n"
        f"    MATCH (c:Concept) RETURN c.name LIMIT 30\n"
        f"    MATCH p=(c1:Concept)-[:PREREQUISITE_FOR*1..4]->(c2:Concept) RETURN p LIMIT 20\n"
        f"    MATCH (j:Job {{display_name:'Front-End Engineer'}})-[:REQUIRES]->(c:Concept) RETURN c.name\n"
    )


if __name__ == "__main__":
    main()
