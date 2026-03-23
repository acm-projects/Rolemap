"""
Data processor — transforms raw scraped data into normalised node/edge dicts
ready for Neo4j loading.

Node types produced:
  - Domain   {id, name}
  - Job      {id, display_name, description}
  - Concept  {id, name}
  - Tool     {id, name}

Edge types produced:
  - REQUIRES:         {job_id, concept_id, weight, is_core}
  - PREREQUISITE_FOR: {from_concept_id, to_concept_id}
  - PART_OF:          {concept_id, domain_id}
  - IMPLEMENTS:       {tool_id, concept_id, industry_standard, deprecated}
"""

import re
import uuid
from typing import Any

from config.jobs import DOMAIN_KEYWORDS, DOMAINS, JOBS

# ---------------------------------------------------------------------------
# Normalisation
# ---------------------------------------------------------------------------

SYNONYMS: dict[str, str] = {
    "react.js": "react",
    "reactjs": "react",
    "postgresql": "postgres",
    "node.js": "nodejs",
    "node js": "nodejs",
    "aws": "amazon web services",
    "gcp": "google cloud platform",
    "js": "javascript",
    "ts": "typescript",
    "k8s": "kubernetes",
    "tf": "terraform",
    "scikit-learn": "scikit learn",
    "sklearn": "scikit learn",
    "pytorch": "pytorch",
    "tensorflow": "tensorflow",
    "vue.js": "vue",
    "vuejs": "vue",
    "next.js": "nextjs",
    "nuxt.js": "nuxtjs",
    "express.js": "express",
    "expressjs": "express",
    "mongodb": "mongodb",
    "mongo db": "mongodb",
    "mysql": "mysql",
    "ms sql": "sql server",
    "microsoft sql server": "sql server",
    "azure devops": "azure devops",
    "github actions": "github actions",
    "ci/cd": "cicd",
    "ci cd": "cicd",
}


def normalise(s: str) -> str:
    """Lowercase, strip punctuation except spaces, collapse whitespace."""
    s = s.lower()
    s = re.sub(r"[^\w\s]", "", s)
    return s.strip()


def canonical(s: str) -> str:
    """Normalise then apply synonym map."""
    n = normalise(s)
    return SYNONYMS.get(n, n)


def _levenshtein(a: str, b: str) -> int:
    """Standard Levenshtein distance."""
    if a == b:
        return 0
    if len(a) < len(b):
        a, b = b, a
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a):
        curr = [i + 1]
        for j, cb in enumerate(b):
            curr.append(min(prev[j] + (ca != cb), curr[j] + 1, prev[j + 1] + 1))
        prev = curr
    return prev[-1]


def fuzzy_match(target: str, candidates: set[str], max_dist: int = 2) -> str | None:
    """Return the closest candidate within max_dist Levenshtein, or None."""
    best: str | None = None
    best_dist = max_dist + 1
    for c in candidates:
        d = _levenshtein(target, c)
        if d < best_dist:
            best_dist = d
            best = c
    return best if best_dist <= max_dist else None


# ---------------------------------------------------------------------------
# ID generation helpers
# ---------------------------------------------------------------------------

def _make_id() -> str:
    return str(uuid.uuid4())


# ---------------------------------------------------------------------------
# Node builders
# ---------------------------------------------------------------------------

def build_domain_nodes() -> list[dict]:
    return [{"id": _make_id(), "name": d} for d in DOMAINS]


def build_job_nodes(onet_overviews: dict[str, dict]) -> list[dict]:
    """
    Build Job nodes from config + O*NET overview descriptions.
    onet_overviews: {soc_code: overview_dict}
    """
    seen: dict[str, dict] = {}  # display_name → node (deduplicate)

    for job in JOBS:
        name = job["display_name"]
        if name in seen:
            continue

        overview = onet_overviews.get(job["soc_code"], {})
        description = (
            overview.get("what_they_do", "")
            or overview.get("title", name)
        )

        seen[name] = {
            "id": _make_id(),
            "display_name": name,
            "description": description,
            "soc_code": job["soc_code"],
            "domain": job["domain"],
        }

    return list(seen.values())


def build_concept_nodes(
    roadmap_data: dict[str, dict],
    llm_concepts: dict[str, list[dict]],
) -> list[dict]:
    """
    Deduplicate and merge concepts from roadmap.sh + LLM gap-fill.
    Returns list of {id, name} dicts with a _canonical key for edge resolution.
    """
    canonical_map: dict[str, dict] = {}  # canonical_name → node

    def _add(name: str) -> str:
        """Add concept if not already present. Returns canonical key."""
        key = canonical(name)
        if key not in canonical_map:
            canonical_map[key] = {"id": _make_id(), "name": name, "_canonical": key}
        return key

    # From roadmap.sh
    for slug, data in roadmap_data.items():
        for concept in data.get("concepts", []):
            _add(concept["name"])

    # From LLM gap-fill
    for job_name, concepts in llm_concepts.items():
        for concept in concepts:
            _add(concept["name"])

    return list(canonical_map.values())


def build_tool_nodes(tools_by_soc: dict[str, list[dict]]) -> list[dict]:
    """
    Deduplicate tool nodes across all SOC codes.
    tools_by_soc: {soc_code: [{name, hot_technology, in_demand}, ...]}
    """
    canonical_map: dict[str, dict] = {}

    for soc, tools in tools_by_soc.items():
        for tool in tools:
            name = tool["name"]
            key = canonical(name)
            if key not in canonical_map:
                canonical_map[key] = {"id": _make_id(), "name": name, "_canonical": key}

    return list(canonical_map.values())


# ---------------------------------------------------------------------------
# Edge builders
# ---------------------------------------------------------------------------

def build_requires_edges(
    job_nodes: list[dict],
    concept_nodes: list[dict],
    roadmap_data: dict[str, dict],
) -> list[dict]:
    """
    Job -[REQUIRES]-> Concept
    Derived from: each concept in a job's roadmap.sh data.
    Weight = 0.8 for all roadmap.sh concepts (no granular importance score available).
    """
    # Build lookup tables
    job_by_name: dict[str, dict] = {j["display_name"]: j for j in job_nodes}
    canonical_to_concept: dict[str, dict] = {c["_canonical"]: c for c in concept_nodes}
    candidate_keys = set(canonical_to_concept.keys())

    # Map roadmap slug → list of job display_names
    slug_to_jobs: dict[str, list[str]] = {}
    for job in JOBS:
        slug = job.get("roadmap_slug")
        if slug:
            slug_to_jobs.setdefault(slug, []).append(job["display_name"])

    edges: list[dict] = []
    seen: set[tuple[str, str]] = set()

    for slug, data in roadmap_data.items():
        job_names = slug_to_jobs.get(slug, [])
        for concept_raw in data.get("concepts", []):
            ckey = canonical(concept_raw["name"])
            concept_node = canonical_to_concept.get(ckey)
            if not concept_node:
                # fuzzy fallback
                matched = fuzzy_match(ckey, candidate_keys)
                if matched:
                    concept_node = canonical_to_concept[matched]
                else:
                    continue

            for job_name in job_names:
                job_node = job_by_name.get(job_name)
                if not job_node:
                    continue
                key = (job_node["id"], concept_node["id"])
                if key not in seen:
                    seen.add(key)
                    edges.append(
                        {
                            "job_id": job_node["id"],
                            "concept_id": concept_node["id"],
                            "weight": 0.8,
                            "is_core": False,
                        }
                    )

    return edges


def build_prerequisite_edges(
    concept_nodes: list[dict],
    roadmap_data: dict[str, dict],
    llm_concepts: dict[str, list[dict]],
) -> list[dict]:
    """
    Concept -[PREREQUISITE_FOR]-> Concept
    Sources: roadmap.sh edges + LLM prereqs arrays.
    """
    canonical_to_concept: dict[str, dict] = {c["_canonical"]: c for c in concept_nodes}
    candidate_keys = set(canonical_to_concept.keys())

    def _resolve(name: str) -> dict | None:
        key = canonical(name)
        node = canonical_to_concept.get(key)
        if not node:
            matched = fuzzy_match(key, candidate_keys)
            if matched:
                return canonical_to_concept[matched]
        return node

    edges: list[dict] = []
    seen: set[tuple[str, str]] = set()

    def _add_edge(from_name: str, to_name: str) -> None:
        src = _resolve(from_name)
        tgt = _resolve(to_name)
        if src and tgt and src["id"] != tgt["id"]:
            key = (src["id"], tgt["id"])
            if key not in seen:
                seen.add(key)
                edges.append({"from_concept_id": src["id"], "to_concept_id": tgt["id"]})

    # From roadmap.sh
    for slug, data in roadmap_data.items():
        for edge in data.get("prereq_edges", []):
            _add_edge(edge["from"], edge["to"])

    # From LLM gap-fill
    for job_name, concepts in llm_concepts.items():
        for concept in concepts:
            for prereq_name in concept.get("prereqs", []):
                _add_edge(prereq_name, concept["name"])

    return edges


def build_part_of_edges(
    concept_nodes: list[dict],
    domain_nodes: list[dict],
) -> list[dict]:
    """
    Concept -[PART_OF]-> Domain
    Assigned via keyword lookup on concept name.
    """
    domain_by_name: dict[str, dict] = {d["name"]: d for d in domain_nodes}

    # Build canonical keyword → domain map
    keyword_to_domain: dict[str, str] = {}
    for domain_name, keywords in DOMAIN_KEYWORDS.items():
        for kw in keywords:
            keyword_to_domain[kw] = domain_name

    edges: list[dict] = []
    seen: set[tuple[str, str]] = set()

    for concept in concept_nodes:
        c_norm = normalise(concept["name"])
        matched_domain: str | None = None

        for kw, domain_name in keyword_to_domain.items():
            if kw in c_norm:
                matched_domain = domain_name
                break

        if not matched_domain:
            # Default to Software Engineering for unclassified concepts
            matched_domain = "Software Engineering"

        domain_node = domain_by_name.get(matched_domain)
        if not domain_node:
            continue

        key = (concept["id"], domain_node["id"])
        if key not in seen:
            seen.add(key)
            edges.append({"concept_id": concept["id"], "domain_id": domain_node["id"]})

    return edges


def build_implements_edges(
    tool_nodes: list[dict],
    concept_nodes: list[dict],
    tools_by_soc: dict[str, list[dict]],
) -> list[dict]:
    """
    Tool -[IMPLEMENTS]-> Concept
    Resolved by matching tool canonical name against concept canonical name.
    A tool implements a concept when their canonical names match or are within
    Levenshtein distance 2.
    """
    tool_by_canonical: dict[str, dict] = {t["_canonical"]: t for t in tool_nodes}
    canonical_to_concept: dict[str, dict] = {c["_canonical"]: c for c in concept_nodes}
    concept_keys = set(canonical_to_concept.keys())

    edges: list[dict] = []
    seen: set[tuple[str, str]] = set()

    for tool in tool_nodes:
        tkey = tool["_canonical"]
        # Direct match
        concept = canonical_to_concept.get(tkey)
        if not concept:
            concept_match = fuzzy_match(tkey, concept_keys)
            if concept_match:
                concept = canonical_to_concept[concept_match]

        if not concept:
            continue

        key = (tool["id"], concept["id"])
        if key not in seen:
            seen.add(key)
            edges.append(
                {
                    "tool_id": tool["id"],
                    "concept_id": concept["id"],
                    "industry_standard": False,
                    "deprecated": False,
                }
            )

    # Enrich industry_standard / deprecated from O*NET flags
    tool_name_to_node: dict[str, dict] = {t["name"]: t for t in tool_nodes}
    tool_id_to_flags: dict[str, dict] = {}
    for soc, tools in tools_by_soc.items():
        for tool_raw in tools:
            t_node = tool_name_to_node.get(tool_raw["name"])
            if t_node:
                flags = tool_id_to_flags.setdefault(t_node["id"], {"industry_standard": False, "deprecated": False})
                if tool_raw.get("hot_technology"):
                    flags["industry_standard"] = True

    for edge in edges:
        flags = tool_id_to_flags.get(edge["tool_id"], {})
        edge["industry_standard"] = flags.get("industry_standard", False)
        edge["deprecated"] = flags.get("deprecated", False)

    return edges


# ---------------------------------------------------------------------------
# Top-level processor
# ---------------------------------------------------------------------------

def process_all(
    onet_overviews: dict[str, dict],
    tools_by_soc: dict[str, list[dict]],
    roadmap_data: dict[str, dict],
    llm_concepts: dict[str, list[dict]],
) -> dict[str, Any]:
    """
    Build all node and edge collections from raw data.

    Returns a dict with keys:
        domains, jobs, concepts, tools,
        requires_edges, prereq_edges, part_of_edges, implements_edges
    """
    print("\n[processor] Building nodes...")
    domains = build_domain_nodes()
    print(f"  Domains:  {len(domains)}")

    jobs = build_job_nodes(onet_overviews)
    print(f"  Jobs:     {len(jobs)}")

    concepts = build_concept_nodes(roadmap_data, llm_concepts)
    print(f"  Concepts: {len(concepts)}")

    tools = build_tool_nodes(tools_by_soc)
    print(f"  Tools:    {len(tools)}")

    print("\n[processor] Building edges...")
    requires = build_requires_edges(jobs, concepts, roadmap_data)
    print(f"  REQUIRES:         {len(requires)}")

    prereqs = build_prerequisite_edges(concepts, roadmap_data, llm_concepts)
    print(f"  PREREQUISITE_FOR: {len(prereqs)}")

    part_of = build_part_of_edges(concepts, domains)
    print(f"  PART_OF:          {len(part_of)}")

    implements = build_implements_edges(tools, concepts, tools_by_soc)
    print(f"  IMPLEMENTS:       {len(implements)}")

    return {
        "domains": domains,
        "jobs": jobs,
        "concepts": concepts,
        "tools": tools,
        "requires_edges": requires,
        "prereq_edges": prereqs,
        "part_of_edges": part_of,
        "implements_edges": implements,
    }
