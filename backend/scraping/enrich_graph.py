"""
enrich_graph.py — Post-import graph enrichment pipeline.

Runs four enrichment steps against the Neo4j knowledge graph:

  Step 1: Delete orphaned Concept nodes (job names / blocked concepts
          that leaked into the Concept label with no REQUIRES edges).

  Step 2: Add :Tool dual-label + category property to curated Concept
          nodes. Delete the 40 O*NET Tool-only nodes (orphaned, irrelevant).

  Step 3: Compute RELATED_TO edges via Association Rule Mining.
          For each ordered (A, B) Concept pair sharing jobs:
            support    = shared_jobs / total_jobs
            confidence = shared_jobs / jobs_with_A
            lift       = confidence / (jobs_with_B / total_jobs)
          Threshold: confidence >= 0.5, support >= 0.05, shared_jobs >= 3.

  Step 4: Generate PREREQUISITE_FOR edges via Gemini LLM per domain,
          with DAG cycle detection before any writes.

Usage:
  python enrich_graph.py --step 1
  python enrich_graph.py --step 2
  python enrich_graph.py --step 3
  python enrich_graph.py --step 4
  python enrich_graph.py --all          # runs 1, 2, 3, 4 in order
  python enrich_graph.py --all --dry-run
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
from collections import defaultdict
from itertools import combinations
from pathlib import Path

from dotenv import load_dotenv
from neo4j import GraphDatabase

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

BACKEND_DIR = Path(__file__).parent.parent
load_dotenv(BACKEND_DIR / ".env")

NEO4J_URI = os.getenv("NEO4J_URI", "bolt://127.0.0.1:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "")

# Association rule thresholds for Step 3
# lift > 1.0 means co-occurrence is non-random; > 1.2 is a meaningful signal.
# Concepts appearing in > MAX_JOB_FRACTION of all jobs are "ubiquitous" and
# excluded as edge sources — they co-occur with everything by chance.
ARM_MIN_CONFIDENCE = 0.6
ARM_MIN_SUPPORT = 0.1
ARM_MIN_SHARED_JOBS = 5
ARM_MIN_LIFT = 1.2
ARM_MAX_JOB_FRACTION = 0.7   # skip concepts present in >70% of all jobs as source

# ---------------------------------------------------------------------------
# Step 2: Curated tool list with categories
# ---------------------------------------------------------------------------

TOOL_CATEGORIES: dict[str, str] = {
    # Languages
    "PYTHON": "language",
    "JAVASCRIPT": "language",
    "TYPESCRIPT": "language",
    "JAVA": "language",
    "C++": "language",
    "C#": "language",
    "C": "language",
    "GO": "language",
    "GOLANG": "language",
    "RUST": "language",
    "SWIFT": "language",
    "KOTLIN": "language",
    "R": "language",
    "RUBY": "language",
    "PHP": "language",
    "SCALA": "language",
    "PERL": "language",
    "LUA": "language",
    "DART": "language",
    "SHELL SCRIPTING": "language",
    "BASH": "language",
    "POWERSHELL": "language",
    "SQL": "language",
    "HTML": "language",
    "CSS": "language",
    "SASS": "language",
    "SCSS": "language",
    "MATLAB": "language",
    "ASSEMBLY": "language",
    # Frameworks & Libraries
    "REACT": "framework",
    "ANGULAR": "framework",
    "VUE.JS": "framework",
    "NEXT.JS": "framework",
    "NUXT.JS": "framework",
    "NODE.JS": "framework",
    "DJANGO": "framework",
    "FLASK": "framework",
    "FASTAPI": "framework",
    "SPRING": "framework",
    "SPRING BOOT": "framework",
    ".NET": "framework",
    "ASP.NET": "framework",
    "EXPRESS.JS": "framework",
    "SVELTE": "framework",
    "TAILWIND CSS": "framework",
    "BOOTSTRAP": "framework",
    "JQUERY": "framework",
    "FLUTTER": "framework",
    "REACT NATIVE": "framework",
    "REDUX": "framework",
    "GRAPHQL": "framework",
    "PYTORCH": "framework",
    "TENSORFLOW": "framework",
    "KERAS": "framework",
    "SCIKIT-LEARN": "framework",
    "HUGGING FACE": "framework",
    "LANGCHAIN": "framework",
    "UNITY": "framework",
    "UNREAL ENGINE": "framework",
    # Cloud Platforms
    "AWS": "cloud_platform",
    "AZURE": "cloud_platform",
    "GCP": "cloud_platform",
    "GOOGLE CLOUD PLATFORM": "cloud_platform",
    "AMAZON WEB SERVICES": "cloud_platform",
    "HEROKU": "cloud_platform",
    "VERCEL": "cloud_platform",
    "NETLIFY": "cloud_platform",
    "CLOUDFLARE": "cloud_platform",
    "DIGITALOCEAN": "cloud_platform",
    # DevOps & Infrastructure
    "DOCKER": "devops",
    "KUBERNETES": "devops",
    "TERRAFORM": "devops",
    "ANSIBLE": "devops",
    "JENKINS": "devops",
    "GITHUB ACTIONS": "devops",
    "GITLAB CI/CD": "devops",
    "GITLAB": "devops",
    "CIRCLECI": "devops",
    "TRAVIS CI": "devops",
    "PUPPET": "devops",
    "CHEF": "devops",
    "VAGRANT": "devops",
    "HELM": "devops",
    "ISTIO": "devops",
    "PROMETHEUS": "devops",
    "GRAFANA": "devops",
    "NAGIOS": "devops",
    "DATADOG": "devops",
    "SPLUNK": "devops",
    "ELK STACK": "devops",
    "ELASTICSEARCH": "devops",
    "LOGSTASH": "devops",
    "KIBANA": "devops",
    "PAGERDUTY": "devops",
    "ARGOCD": "devops",
    "FLUX": "devops",
    "PULUMI": "devops",
    "GIT": "devops",
    "GITHUB": "devops",
    "NGINX": "devops",
    "APACHE": "devops",
    # Databases
    "POSTGRESQL": "database",
    "MYSQL": "database",
    "MONGODB": "database",
    "REDIS": "database",
    "CASSANDRA": "database",
    "DYNAMODB": "database",
    "SQLITE": "database",
    "ORACLE": "database",
    "SQL SERVER": "database",
    "NEO4J": "database",
    "FIREBASE": "database",
    "COUCHDB": "database",
    "MARIADB": "database",
    "PINECONE": "database",
    "WEAVIATE": "database",
    "QDRANT": "database",
    "SNOWFLAKE": "database",
    "BIGQUERY": "database",
    "REDSHIFT": "database",
    "SUPABASE": "database",
    # Data & ML Tools
    "PANDAS": "data_tool",
    "NUMPY": "data_tool",
    "SPARK": "data_tool",
    "APACHE SPARK": "data_tool",
    "HADOOP": "data_tool",
    "KAFKA": "data_tool",
    "APACHE KAFKA": "data_tool",
    "AIRFLOW": "data_tool",
    "APACHE AIRFLOW": "data_tool",
    "DASK": "data_tool",
    "TABLEAU": "data_tool",
    "POWER BI": "data_tool",
    "LOOKER": "data_tool",
    "D3.JS": "data_tool",
    "MATPLOTLIB": "data_tool",
    "SEABORN": "data_tool",
    "PLOTLY": "data_tool",
    "JUPYTER": "data_tool",
    "DATABRICKS": "data_tool",
    "DBT": "data_tool",
    "DBTCLOUD": "data_tool",
    "FLINK": "data_tool",
    "DASK": "data_tool",
    "RAY": "data_tool",
    "MLFLOW": "data_tool",
    "WEIGHTS & BIASES": "data_tool",
    "WANDB": "data_tool",
    "OPENCV": "data_tool",
    "NLTK": "data_tool",
    "SPACY": "data_tool",
    "EXCEL": "data_tool",
    # Security Tools
    "BURP SUITE": "security_tool",
    "WIRESHARK": "security_tool",
    "METASPLOIT": "security_tool",
    "NMAP": "security_tool",
    "OWASP ZAP": "security_tool",
    "NESSUS": "security_tool",
    "SNORT": "security_tool",
    "HASHICORP VAULT": "security_tool",
    "CROWDSTRIKE": "security_tool",
    "SENTINEL": "security_tool",
    "QUALYS": "security_tool",
    "TENABLE": "security_tool",
    # PM & Collaboration Tools
    "JIRA": "pm_tool",
    "CONFLUENCE": "pm_tool",
    "TRELLO": "pm_tool",
    "ASANA": "pm_tool",
    "MONDAY.COM": "pm_tool",
    "MIRO": "pm_tool",
    "NOTION": "pm_tool",
    "MICROSOFT PROJECT": "pm_tool",
    "SLACK": "pm_tool",
    "FIGMA": "pm_tool",
    "LINEAR": "pm_tool",
    "PRODUCTBOARD": "pm_tool",
}


# ---------------------------------------------------------------------------
# Connection helper
# ---------------------------------------------------------------------------

def get_driver():
    return GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))


# ---------------------------------------------------------------------------
# Step 1: Delete orphaned Concept nodes
# ---------------------------------------------------------------------------

def step1_delete_orphaned_concepts(driver, dry_run: bool = False) -> None:
    print("\n=== Step 1: Delete orphaned Concept nodes ===")
    with driver.session() as s:
        orphans = s.run(
            "MATCH (c:Concept) WHERE NOT (c)<-[:REQUIRES]-() "
            "RETURN c.name AS name ORDER BY c.name"
        ).data()

    print(f"Found {len(orphans)} orphaned Concept nodes (no REQUIRES edges):")
    for r in orphans:
        print(f"  - {r['name']}")

    if not orphans:
        print("Nothing to delete.")
        return

    if dry_run:
        print("[dry-run] Would delete the above nodes.")
        return

    with driver.session() as s:
        result = s.run(
            "MATCH (c:Concept) WHERE NOT (c)<-[:REQUIRES]-() "
            "DETACH DELETE c RETURN count(c) AS deleted"
        )
        deleted = result.single()["deleted"]
    print(f"Deleted {deleted} orphaned Concept nodes.")

    # Verify
    with driver.session() as s:
        remaining = s.run(
            "MATCH (c:Concept) WHERE NOT (c)<-[:REQUIRES]-() RETURN count(c) AS n"
        ).single()["n"]
    print(f"Verification: {remaining} orphaned Concept nodes remain (expected 0).")


# ---------------------------------------------------------------------------
# Step 2: Add :Tool dual-label + delete O*NET Tool nodes
# ---------------------------------------------------------------------------

def step2_label_tools(driver, dry_run: bool = False) -> None:
    print("\n=== Step 2: Add :Tool label to curated Concept nodes ===")

    # Check which curated tool names exist in the graph
    with driver.session() as s:
        existing = {
            r["name"]
            for r in s.run(
                "MATCH (c:Concept) RETURN c.name AS name"
            ).data()
        }

    matches = {name: cat for name, cat in TOOL_CATEGORIES.items() if name in existing}
    missing = {name: cat for name, cat in TOOL_CATEGORIES.items() if name not in existing}

    print(f"Curated tool list: {len(TOOL_CATEGORIES)} entries")
    print(f"  Found in graph: {len(matches)}")
    print(f"  Not in graph (skipped): {len(missing)}")
    if missing:
        print("  Missing tools:")
        for name in sorted(missing):
            print(f"    - {name}")

    if dry_run:
        print("[dry-run] Would label the above found Concept nodes as :Tool.")
    else:
        labeled = 0
        with driver.session() as s:
            for name, category in matches.items():
                s.run(
                    "MATCH (c:Concept {name: $name}) SET c:Tool, c.category = $category",
                    name=name,
                    category=category,
                )
                labeled += 1
        print(f"Labeled {labeled} Concept nodes as :Tool with category.")

    # Check O*NET Tool-only nodes
    print("\n--- Deleting O*NET Tool-only nodes (not :Concept) ---")
    with driver.session() as s:
        onet_tools = s.run(
            "MATCH (t:Tool) WHERE NOT t:Concept RETURN t.name AS name ORDER BY name"
        ).data()
    print(f"Found {len(onet_tools)} O*NET Tool-only nodes:")
    for r in onet_tools[:10]:
        print(f"  - {r['name']}")
    if len(onet_tools) > 10:
        print(f"  ... and {len(onet_tools) - 10} more")

    if dry_run:
        print("[dry-run] Would delete the above O*NET Tool-only nodes.")
    else:
        with driver.session() as s:
            result = s.run(
                "MATCH (t:Tool) WHERE NOT t:Concept DETACH DELETE t RETURN count(t) AS deleted"
            )
            deleted = result.single()["deleted"]
        print(f"Deleted {deleted} O*NET Tool-only nodes.")

    # Summary
    with driver.session() as s:
        dual = s.run("MATCH (c:Concept:Tool) RETURN count(c) AS n").single()["n"]
        by_cat = s.run(
            "MATCH (c:Concept:Tool) RETURN c.category AS cat, count(c) AS n ORDER BY n DESC"
        ).data()
    print(f"\nVerification: {dual} Concept nodes now also carry :Tool label.")
    print("Breakdown by category:")
    for r in by_cat:
        print(f"  {r['cat']}: {r['n']}")


# ---------------------------------------------------------------------------
# Step 3: RELATED_TO edges via Association Rule Mining
# ---------------------------------------------------------------------------

def step3_compute_related_to(driver, dry_run: bool = False) -> None:
    print("\n=== Step 3: Compute RELATED_TO edges (Association Rule Mining) ===")
    print(f"Thresholds: confidence>={ARM_MIN_CONFIDENCE}, support>={ARM_MIN_SUPPORT}, "
          f"shared_jobs>={ARM_MIN_SHARED_JOBS}, lift>={ARM_MIN_LIFT}, "
          f"source concepts in <={ARM_MAX_JOB_FRACTION*100:.0f}% of jobs")

    # Push all computation into Neo4j — avoids O(n^2) Python loop over 1344 concepts.
    # The query computes, for each ordered pair (a, b) sharing at least one job:
    #   shared_jobs  = |jobs(a) ∩ jobs(b)|
    #   support      = shared_jobs / total_jobs
    #   confidence   = shared_jobs / |jobs(a)|   (asymmetric: "a implies b")
    #   lift         = confidence / (|jobs(b)| / total_jobs)
    # Ubiquitous source concepts (present in >70% of jobs) are excluded —
    # they co-occur with everything by chance and generate low-signal edges.
    # lift > 1.2 ensures the co-occurrence is meaningfully non-random.

    with driver.session() as s:
        total_jobs = s.run("MATCH (j:Job) RETURN count(j) AS n").single()["n"]
        max_jobs_for_source = int(total_jobs * ARM_MAX_JOB_FRACTION)
        print(f"Total jobs: {total_jobs}  (ubiquitous source threshold: >{max_jobs_for_source} jobs)")

        print("Running ARM query in Neo4j (may take 10-60 seconds)...")
        result = s.run(
            """
            // Pre-compute per-concept job counts
            MATCH (j:Job)-[:REQUIRES]->(c:Concept)
            WITH c, count(DISTINCT j) AS jobs_c, collect(DISTINCT j.display_name) AS job_list

            // Exclude ubiquitous source concepts (appear in too many jobs to be informative)
            WITH collect({concept: c, job_count: jobs_c, jobs: job_list}) AS all_concepts
            UNWIND all_concepts AS a_data
            UNWIND all_concepts AS b_data

            // Skip identity pairs, filter ubiquitous sources, count shared jobs
            WITH a_data, b_data,
                 [x IN a_data.jobs WHERE x IN b_data.jobs] AS shared
            WHERE a_data.concept <> b_data.concept
              AND a_data.job_count <= $max_jobs_source
              AND size(shared) >= $min_shared

            // Compute metrics
            WITH a_data.concept AS a, b_data.concept AS b,
                 a_data.job_count AS count_a,
                 b_data.job_count AS count_b,
                 size(shared) AS shared_jobs,
                 toFloat(size(shared)) / $total_jobs             AS support,
                 toFloat(size(shared)) / a_data.job_count        AS confidence,
                 toFloat(size(shared)) / a_data.job_count
                   / (toFloat(b_data.job_count) / $total_jobs)   AS lift

            WHERE confidence >= $min_conf
              AND support    >= $min_supp
              AND toFloat(size(shared)) / a_data.job_count
                    / (toFloat(b_data.job_count) / $total_jobs) >= $min_lift

            RETURN a.name AS from_name,
                   b.name AS to_name,
                   round(confidence * 10000) / 10000 AS confidence,
                   round(support    * 10000) / 10000 AS support,
                   round(lift       * 10000) / 10000 AS lift,
                   shared_jobs
            ORDER BY lift DESC, confidence DESC
            """,
            total_jobs=float(total_jobs),
            max_jobs_source=max_jobs_for_source,
            min_shared=ARM_MIN_SHARED_JOBS,
            min_conf=ARM_MIN_CONFIDENCE,
            min_supp=ARM_MIN_SUPPORT,
            min_lift=ARM_MIN_LIFT,
        )
        edges = result.data()

    print(f"ARM query complete: {len(edges)} edges pass thresholds "
          f"(conf>={ARM_MIN_CONFIDENCE}, supp>={ARM_MIN_SUPPORT}, shared>={ARM_MIN_SHARED_JOBS})")

    if not edges:
        print("No edges to write.")
        return

    # Show top 20 by confidence
    top = sorted(edges, key=lambda e: e["confidence"], reverse=True)[:20]
    print("\nTop 20 edges by confidence:")
    print(f"  {'FROM':<30} {'TO':<30} {'CONF':>6} {'SUPP':>6} {'LIFT':>6} {'JOBS':>5}")
    for e in top:
        print(f"  {e['from_name']:<30} {e['to_name']:<30} {e['confidence']:>6.3f} "
              f"{e['support']:>6.3f} {e['lift']:>6.3f} {e['shared_jobs']:>5}")

    if dry_run:
        print(f"\n[dry-run] Would write {len(edges)} RELATED_TO edges.")
        return

    # Write in batches
    print(f"\nWriting {len(edges)} RELATED_TO edges to Neo4j...")
    BATCH = 500
    written = 0
    with driver.session() as s:
        # Delete existing RELATED_TO edges first (clean re-compute)
        deleted = s.run("MATCH ()-[r:RELATED_TO]->() DELETE r RETURN count(r) AS n").single()["n"]
        if deleted:
            print(f"  Deleted {deleted} stale RELATED_TO edges before re-writing.")

        for i in range(0, len(edges), BATCH):
            batch = edges[i : i + BATCH]
            s.run(
                """
                UNWIND $rows AS row
                MATCH (a:Concept {name: row.from_name})
                MATCH (b:Concept {name: row.to_name})
                MERGE (a)-[r:RELATED_TO]->(b)
                SET r.confidence  = row.confidence,
                    r.support     = row.support,
                    r.lift        = row.lift,
                    r.shared_jobs = row.shared_jobs,
                    r.source      = 'arm'
                """,
                rows=batch,
            )
            written += len(batch)
            print(f"  Wrote {written}/{len(edges)} edges...")

    # Verify
    with driver.session() as s:
        count = s.run("MATCH ()-[r:RELATED_TO]->() RETURN count(r) AS n").single()["n"]
    print(f"Verification: {count} RELATED_TO edges in graph.")

    # Spot-check PYTHON
    with driver.session() as s:
        spot = s.run(
            "MATCH (a:Concept {name: 'PYTHON'})-[r:RELATED_TO]->(b) "
            "RETURN b.name AS name, r.confidence AS conf, r.lift AS lift "
            "ORDER BY r.confidence DESC LIMIT 10"
        ).data()
    print("\nSpot-check: PYTHON -> ? (top 10 by confidence):")
    for r in spot:
        print(f"  {r['name']:<35} conf={r['conf']:.3f}  lift={r['lift']:.3f}")


# ---------------------------------------------------------------------------
# Step 4: PREREQUISITE_FOR edges via LLM + DAG cycle detection
# ---------------------------------------------------------------------------

def _topological_sort_check(nodes: set, edges: list[tuple]) -> list[tuple]:
    """
    Returns a list of edges that form cycles using Kahn's algorithm.
    Cycles are detected by finding nodes that never reach in-degree 0.
    Returns the list of 'extra' edges to remove (LLM-sourced preferred).
    """
    from collections import deque

    adj: dict[str, set] = defaultdict(set)
    in_degree: dict[str, int] = defaultdict(int)

    for u, v, source in edges:
        if v not in adj[u]:
            adj[u].add(v)
            in_degree[v] += 1
        in_degree.setdefault(u, in_degree.get(u, 0))

    queue = deque(n for n in nodes if in_degree.get(n, 0) == 0)
    visited = set()

    while queue:
        node = queue.popleft()
        visited.add(node)
        for neighbor in adj.get(node, []):
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                queue.append(neighbor)

    cycle_nodes = nodes - visited
    if not cycle_nodes:
        return []  # No cycles

    # Find edges that are part of cycles (both endpoints in cycle_nodes)
    # Prefer removing LLM edges over existing roadmap.sh edges
    cycle_edges = [
        (u, v, src) for u, v, src in edges
        if u in cycle_nodes and v in cycle_nodes
    ]
    return cycle_edges


def _call_gemini(prompt: str, api_keys: list[str], model: str = "gemini-2.5-flash") -> str:
    """Call Gemini API with key rotation on 429.

    Returns raw text response, or empty string if all keys are rate-limited
    (caller should skip this chunk and retry on the next run).
    """
    from google import genai
    from google.genai import types

    for attempt, api_key in enumerate(api_keys):
        try:
            client = genai.Client(api_key=api_key)
            response = client.models.generate_content(
                model=model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.1,
                    max_output_tokens=8192,
                ),
            )
            return response.text or ""
        except Exception as e:
            err = str(e)
            if "429" in err or "RESOURCE_EXHAUSTED" in err:
                if attempt < len(api_keys) - 1:
                    print(f"\n  [rate limit on key {attempt+1}] rotating to key {attempt+2}...", end=" ", flush=True)
                    time.sleep(3)
                else:
                    # All keys exhausted — skip this chunk rather than blocking.
                    # The cache + re-run design means we can pick it up next run.
                    print(f"\n  [rate limit on all {len(api_keys)} key(s)] skipping chunk (retry tomorrow).", flush=True)
                    return ""
            else:
                print(f"\n  [Gemini error] {e}")
                return ""
    return ""


def _parse_prereq_json(text: str) -> list[dict]:
    """Extract JSON array of {from, to} dicts from LLM response."""
    # Strip markdown code fences if present
    text = re.sub(r"```(?:json)?\s*", "", text)
    text = re.sub(r"```\s*", "", text)
    text = text.strip()

    # Try to find a JSON array
    match = re.search(r"\[.*\]", text, re.DOTALL)
    if not match:
        return []
    try:
        data = json.loads(match.group())
        if isinstance(data, list):
            return [
                d for d in data
                if isinstance(d, dict) and "from" in d and "to" in d
            ]
    except json.JSONDecodeError:
        pass
    return []


def step4_generate_prerequisites(driver, dry_run: bool = False) -> None:
    print("\n=== Step 4: Generate PREREQUISITE_FOR edges via LLM ===")

    # Find Gemini API keys (collect all available for rotation)
    api_keys = []
    for k in ["GEMINI_API_KEY"] + [f"GEMINI_API_KEY_{i}" for i in range(2, 10)]:
        val = os.getenv(k)
        if val and val.strip():
            api_keys.append(val.strip())
    if not api_keys:
        print("ERROR: No Gemini API key found in environment. Set GEMINI_API_KEY.")
        sys.exit(1)
    print(f"Using {len(api_keys)} Gemini API key(s) with rotation on rate limit.")

    # Load graph state
    with driver.session() as s:
        # Get concepts per domain (via Job→Concept REQUIRES edges)
        domain_concepts_raw = s.run(
            """
            MATCH (j:Job)-[:REQUIRES]->(c:Concept)
            RETURN j.domain AS domain, collect(DISTINCT c.name) AS concepts
            """
        ).data()

        # Get existing PREREQUISITE_FOR edges (to avoid re-generating and check conflicts)
        existing_prereqs = s.run(
            """
            MATCH (a:Concept)-[r:PREREQUISITE_FOR]->(b:Concept)
            RETURN a.name AS from_name, b.name AS to_name,
                   coalesce(r.source, 'roadmapsh') AS source
            """
        ).data()

    # Build domain -> concept list
    domain_concepts: dict[str, list[str]] = {}
    for row in domain_concepts_raw:
        if row["domain"]:
            domain_concepts[row["domain"]] = sorted(row["concepts"])

    print(f"Domains with concepts: {list(domain_concepts.keys())}")
    for domain, concepts in domain_concepts.items():
        print(f"  {domain}: {len(concepts)} concepts")

    # Build existing edge set (as frozenset for fast lookup)
    existing_set: set[tuple] = {
        (r["from_name"], r["to_name"]) for r in existing_prereqs
    }
    print(f"\nExisting PREREQUISITE_FOR edges: {len(existing_set)}")

    # Generate new edges per domain via LLM
    # Concept lists can be 100-600 items — chunk into batches of CHUNK_SIZE
    # so each prompt fits comfortably in 8k output tokens.
    # For each chunk we send only the subset; the LLM can only reference
    # concepts within that chunk, keeping pairs valid by construction.
    CHUNK_SIZE = 80
    all_new_edges: list[dict] = []  # {from, to, domain, source}
    cache_dir = BACKEND_DIR / "knowledge_graph" / "data" / "llm_prereqs"
    cache_dir.mkdir(parents=True, exist_ok=True)

    for domain, concepts in domain_concepts.items():
        print(f"\n--- Processing domain: {domain} ({len(concepts)} concepts) ---")
        domain_slug = domain.lower().replace(" ", "_").replace("&", "and")
        cache_file = cache_dir / f"{domain_slug}_prereqs.json"

        if cache_file.exists():
            print(f"  Loading from cache: {cache_file.name}")
            with open(cache_file, encoding="utf-8") as f:
                pairs = json.load(f)
        else:
            if dry_run:
                print(f"  [dry-run] Would call Gemini in chunks of {CHUNK_SIZE}.")
                continue

            pairs = []
            chunks = [concepts[i:i+CHUNK_SIZE] for i in range(0, len(concepts), CHUNK_SIZE)]
            print(f"  Splitting into {len(chunks)} chunks of ~{CHUNK_SIZE}...")

            # Per-chunk cache so rate-limit interruptions don't lose progress
            chunk_cache_dir = cache_dir / f"{domain_slug}_chunks"
            chunk_cache_dir.mkdir(parents=True, exist_ok=True)
            rate_limited = False

            for chunk_idx, chunk in enumerate(chunks):
                chunk_cache_file = chunk_cache_dir / f"chunk_{chunk_idx:03d}.json"
                if chunk_cache_file.exists():
                    with open(chunk_cache_file, encoding="utf-8") as cf:
                        chunk_pairs = json.load(cf)
                    print(f"  Chunk {chunk_idx+1}/{len(chunks)} ({len(chunk)} concepts)... loaded from cache ({len(chunk_pairs)} pairs)")
                    pairs.extend(chunk_pairs)
                    continue

                if rate_limited:
                    print(f"  Chunk {chunk_idx+1}/{len(chunks)} skipped (rate limited — re-run to continue).")
                    continue

                concept_list = "\n".join(f"- {c}" for c in chunk)
                prompt = f"""You are a curriculum expert building a prerequisite graph for the "{domain}" domain.

Below is a subset of concepts/skills from this domain:

{concept_list}

Identify TRUE prerequisite relationships between these concepts.
A prerequisite means: concept A MUST be learned/understood BEFORE concept B is learnable.

Rules:
1. Only output pairs where BOTH concepts appear in the list above (use exact spelling from the list).
2. Include foundational prerequisites even if "obvious" (e.g., PYTHON -> PYTORCH, LINEAR ALGEBRA -> MACHINE LEARNING).
3. Do NOT include alternatives or siblings (e.g., REACT vs ANGULAR are not prerequisites of each other).
4. Do NOT include vague relationships like "familiarity helps" -- only hard prerequisites.
5. Direction: "from" is the prerequisite (must learn first), "to" is what requires it.
6. If there are no clear prerequisite relationships among these concepts, return an empty array [].

Output ONLY a JSON array of objects with exactly these keys:
{{"from": "CONCEPT_A", "to": "CONCEPT_B"}}

Only output the raw JSON array, no markdown fences, no explanation.
"""
                print(f"  Chunk {chunk_idx+1}/{len(chunks)} ({len(chunk)} concepts)...", end=" ", flush=True)
                time.sleep(2)  # Rate limit between chunks
                raw = _call_gemini(prompt, api_keys)
                if not raw:
                    # Rate limited or error — mark so remaining chunks are skipped
                    rate_limited = True
                    print(f"  Chunk {chunk_idx+1}/{len(chunks)} skipped (rate limited — re-run to continue).")
                    continue
                chunk_pairs = _parse_prereq_json(raw)
                print(f"got {len(chunk_pairs)} pairs")
                # Cache this chunk immediately
                with open(chunk_cache_file, "w", encoding="utf-8") as cf:
                    json.dump(chunk_pairs, cf, indent=2, ensure_ascii=False)
                pairs.extend(chunk_pairs)

            # Only write the domain cache file when ALL chunks are done
            all_chunk_files = list(chunk_cache_dir.glob("chunk_*.json"))
            if len(all_chunk_files) == len(chunks) and not rate_limited:
                with open(cache_file, "w", encoding="utf-8") as f:
                    json.dump(pairs, f, indent=2, ensure_ascii=False)
                print(f"  Cached {len(pairs)} total pairs to: {cache_file.name}")
            elif rate_limited:
                completed = sum(1 for i in range(len(chunks)) if (chunk_cache_dir / f"chunk_{i:03d}.json").exists())
                print(f"  Partial progress: {completed}/{len(chunks)} chunks cached. Re-run to continue.")

        # Validate pairs: both concepts must exist in this domain's list
        concept_set = set(concepts)
        valid_pairs = []
        for p in pairs:
            from_c = str(p.get("from", "")).strip().upper()
            to_c = str(p.get("to", "")).strip().upper()
            if from_c in concept_set and to_c in concept_set and from_c != to_c:
                valid_pairs.append({"from": from_c, "to": to_c})
            else:
                # Try case-insensitive match against concept set
                from_match = next((c for c in concept_set if c.upper() == from_c), None)
                to_match = next((c for c in concept_set if c.upper() == to_c), None)
                if from_match and to_match and from_match != to_match:
                    valid_pairs.append({"from": from_match, "to": to_match})

        print(f"  Valid pairs (both in domain): {len(valid_pairs)}")

        for p in valid_pairs:
            all_new_edges.append({"from": p["from"], "to": p["to"], "domain": domain, "source": "llm_prereq"})

    if dry_run:
        return

    print(f"\nTotal new edges proposed by LLM: {len(all_new_edges)}")

    # Deduplicate new edges
    seen_new: set[tuple] = set()
    deduped_new: list[dict] = []
    for e in all_new_edges:
        key = (e["from"], e["to"])
        if key not in seen_new:
            seen_new.add(key)
            deduped_new.append(e)
    print(f"After deduplication: {len(deduped_new)} unique new edges")

    # Filter out edges already in graph
    truly_new = [e for e in deduped_new if (e["from"], e["to"]) not in existing_set]
    print(f"Truly new (not already in graph): {len(truly_new)}")

    # DAG cycle detection
    print("\nRunning DAG cycle detection...")
    all_nodes: set[str] = set()
    all_edges_for_check: list[tuple] = []

    # Add existing edges
    for r in existing_prereqs:
        all_nodes.add(r["from_name"])
        all_nodes.add(r["to_name"])
        all_edges_for_check.append((r["from_name"], r["to_name"], r["source"]))

    # Add new edges
    for e in truly_new:
        all_nodes.add(e["from"])
        all_nodes.add(e["to"])
        all_edges_for_check.append((e["from"], e["to"], e["source"]))

    cycle_edges = _topological_sort_check(all_nodes, all_edges_for_check)

    if cycle_edges:
        print(f"WARNING: {len(cycle_edges)} edges are part of cycles:")
        cycle_set: set[tuple] = set()
        for u, v, src in cycle_edges:
            print(f"  ({u}) -> ({v})  [source: {src}]")
            cycle_set.add((u, v))

        # Remove LLM edges first; if cycle persists, remove roadmap.sh edges
        truly_new_clean = [e for e in truly_new if (e["from"], e["to"]) not in cycle_set]
        removed = len(truly_new) - len(truly_new_clean)
        print(f"Removed {removed} new LLM edges that were part of cycles.")
        truly_new = truly_new_clean

        # Re-check with remaining edges
        all_edges_recheck = [
            (u, v, src) for u, v, src in all_edges_for_check
            if (u, v) not in cycle_set or src != "llm_prereq"
        ]
        remaining_cycles = _topological_sort_check(all_nodes, all_edges_recheck)
        if remaining_cycles:
            print(f"WARNING: {len(remaining_cycles)} cycles remain in existing edges (not removing).")
        else:
            print("DAG check passed after removing new cycle edges.")
    else:
        print("DAG check passed — no cycles detected.")

    if not truly_new:
        print("No new edges to write.")
        return

    # Write to Neo4j
    print(f"\nWriting {len(truly_new)} new PREREQUISITE_FOR edges...")
    BATCH = 500
    written = 0
    with driver.session() as s:
        for i in range(0, len(truly_new), BATCH):
            batch = truly_new[i : i + BATCH]
            s.run(
                """
                UNWIND $rows AS row
                MATCH (a:Concept {name: row.from_name})
                MATCH (b:Concept {name: row.to_name})
                MERGE (a)-[r:PREREQUISITE_FOR]->(b)
                ON CREATE SET r.source = row.source,
                              r.domain = row.domain
                """,
                rows=[{"from_name": e["from"], "to_name": e["to"],
                        "source": e["source"], "domain": e["domain"]}
                      for e in batch],
            )
            written += len(batch)
            print(f"  Wrote {written}/{len(truly_new)} edges...")

    # Verify
    with driver.session() as s:
        total = s.run("MATCH ()-[r:PREREQUISITE_FOR]->() RETURN count(r) AS n").single()["n"]
        by_source = s.run(
            "MATCH ()-[r:PREREQUISITE_FOR]->() "
            "RETURN coalesce(r.source, 'roadmapsh') AS src, count(r) AS n ORDER BY n DESC"
        ).data()
    print(f"\nVerification: {total} PREREQUISITE_FOR edges total.")
    print("By source:")
    for r in by_source:
        print(f"  {r['src']}: {r['n']}")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Post-import graph enrichment pipeline",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--step", type=int, choices=[1, 2, 3, 4], help="Run a single step")
    group.add_argument("--all", action="store_true", help="Run all steps in order (1→2→3→4)")
    parser.add_argument("--dry-run", action="store_true", help="Preview changes without writing")
    args = parser.parse_args()

    driver = get_driver()
    try:
        steps_to_run = [args.step] if args.step else [1, 2, 3, 4]
        for step in steps_to_run:
            if step == 1:
                step1_delete_orphaned_concepts(driver, dry_run=args.dry_run)
            elif step == 2:
                step2_label_tools(driver, dry_run=args.dry_run)
            elif step == 3:
                step3_compute_related_to(driver, dry_run=args.dry_run)
            elif step == 4:
                step4_generate_prerequisites(driver, dry_run=args.dry_run)
        print("\nDone.")
    finally:
        driver.close()


if __name__ == "__main__":
    main()
