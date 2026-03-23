"""
sandbox/pathfinder.py — Weighted learning-path finder using the seeded graph.

Two algorithms, run with --algo:

  kahn      Priority-weighted Kahn's (default)
            Among all currently-unlocked skills, always pick the one with the
            highest REQUIRES weight. Answers: "what should I learn first based
            on what matters most to the job?"

  dijkstra  Critical-path effort ordering
            Computes the earliest you can finish each concept given its
            prerequisite chain and effort cost, then sorts by that time.
            Answers: "what is the fastest route through the graph in terms
            of total hours invested?" — quick wins come first.

  both      Runs both and prints them side-by-side so differences are visible.

Usage:
  python pathfinder.py                                          # interactive
  python pathfinder.py --job "Front-End Engineer" --known ""
  python pathfinder.py --job "Back-End Engineer"  --known "JavaScript Fundamentals,Git & Version Control"
  python pathfinder.py --algo both --job "Front-End Engineer" --known ""
  python pathfinder.py --compare                               # FE vs BE, both algos
"""

import argparse
import heapq
import os
import sys
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "knowledge_graph"))

from dotenv import load_dotenv
from neo4j import GraphDatabase

load_dotenv(Path(__file__).parent / ".env")
load_dotenv(Path(__file__).parent.parent / ".env")                       # repo root
load_dotenv(Path(__file__).parent.parent / "knowledge_graph" / ".env")  # fallback

AVAILABLE_JOBS = ["Front-End Engineer", "Back-End Engineer"]


# ─────────────────────────────────────────────────────────────────────────────
# Neo4j queries
# ─────────────────────────────────────────────────────────────────────────────

def _driver():
    uri  = os.environ.get("NEO4J_URI",      "bolt://localhost:7687")
    user = os.environ.get("NEO4J_USER",     "neo4j")
    pw   = os.environ.get("NEO4J_PASSWORD", "")
    if not pw:
        raise EnvironmentError("NEO4J_PASSWORD must be set in .env")
    return GraphDatabase.driver(uri, auth=(user, pw))


def fetch_job_concepts(session, job_name: str) -> dict[str, dict]:
    """Returns {concept_name: {weight, is_core}} for all concepts the job requires."""
    result = session.run(
        """
        MATCH (j:Job:Sandbox {display_name: $job})-[r:REQUIRES]->(c:Concept:Sandbox)
        RETURN c.name AS name, r.weight AS weight, r.is_core AS is_core
        """,
        job=job_name,
    )
    return {
        row["name"]: {"weight": row["weight"], "is_core": row["is_core"]}
        for row in result
    }


def fetch_prereq_graph(session) -> tuple[dict[str, list[str]], dict[str, list[str]]]:
    """
    Returns two adjacency lists for the full :Sandbox concept graph:
      prereqs[skill]    = list of skills that must come BEFORE skill (incoming)
      dependents[skill] = list of skills that skill unlocks (outgoing)
    """
    result = session.run(
        """
        MATCH (a:Concept:Sandbox)-[:PREREQUISITE_FOR]->(b:Concept:Sandbox)
        RETURN a.name AS prerequisite, b.name AS advanced
        """
    )
    prereqs:    dict[str, list[str]] = defaultdict(list)
    dependents: dict[str, list[str]] = defaultdict(list)
    for row in result:
        prereqs[row["advanced"]].append(row["prerequisite"])
        dependents[row["prerequisite"]].append(row["advanced"])
    return dict(prereqs), dict(dependents)


def fetch_effort_map(session) -> dict[str, int]:
    """Returns {concept_name: effort_hours} from the Concept.effort property."""
    result = session.run(
        "MATCH (c:Concept:Sandbox) RETURN c.name AS name, c.effort AS effort"
    )
    return {row["name"]: (row["effort"] or 10) for row in result}


def fetch_tools_for_concepts(session, concept_names: list[str]) -> dict[str, list[str]]:
    """
    Returns {concept_name: [tool_name, ...]} for the given concepts.
    Marks industry-standard tools with a * suffix.
    """
    result = session.run(
        """
        MATCH (t:Tool:Sandbox)-[r:IMPLEMENTS]->(c:Concept:Sandbox)
        WHERE c.name IN $names
        RETURN c.name AS concept, t.name AS tool, r.industry_standard AS std
        ORDER BY r.industry_standard DESC, t.name
        """,
        names=concept_names,
    )
    tools_map: dict[str, list[str]] = defaultdict(list)
    for row in result:
        label = row["tool"] + ("*" if row["std"] else "")
        tools_map[row["concept"]].append(label)
    return dict(tools_map)


def fetch_all_concept_names(session) -> list[str]:
    result = session.run("MATCH (c:Concept:Sandbox) RETURN c.name AS name ORDER BY name")
    return [row["name"] for row in result]


# ─────────────────────────────────────────────────────────────────────────────
# Shared: compute the gap (concepts needed but not yet known)
# ─────────────────────────────────────────────────────────────────────────────

def find_needed_concepts(
    job_concepts: dict[str, dict],
    prereqs:      dict[str, list[str]],
    known_skills: set[str],
) -> dict[str, float]:
    """
    BFS backward from job's required concepts to collect ALL concepts needed
    (direct requirements + transitive prerequisites).

    Returns {concept_name: effective_weight} excluding known skills.
    Prerequisites inherit weight = 0.95 × the weight of what they unblock
    (so importance flows backward through the chain).
    """
    weight_map: dict[str, float] = {}
    queue = list(job_concepts.keys())
    for name, meta in job_concepts.items():
        weight_map[name] = meta["weight"]
    visited: set[str] = set(job_concepts.keys())

    while queue:
        current = queue.pop()
        for prereq in prereqs.get(current, []):
            inherited = weight_map[current] * 0.95
            if prereq not in visited:
                visited.add(prereq)
                queue.append(prereq)
                weight_map[prereq] = inherited
            else:
                weight_map[prereq] = max(weight_map.get(prereq, 0.0), inherited)

    return {name: w for name, w in weight_map.items() if name not in known_skills}


# ─────────────────────────────────────────────────────────────────────────────
# Algorithm 1 — Kahn's (importance-first)
# ─────────────────────────────────────────────────────────────────────────────

def compute_kahns_path(
    gap_skills:   dict[str, float],
    prereqs:      dict[str, list[str]],
    known_skills: set[str],
    job_concepts: dict[str, dict],
    effort_map:   dict[str, int],
) -> list[dict]:
    """
    Priority-weighted Kahn's topological sort.

    At each step: pick the highest-weight currently-unlocked skill.
    A skill is unlocked when every prerequisite in the gap is already placed,
    or was already known.
    """
    resolved  = set(known_skills)
    remaining = set(gap_skills.keys())
    heap: list[tuple[float, str]] = []

    def _push_if_unlocked(skill: str) -> None:
        if skill not in remaining:
            return
        if all(p in resolved or p not in gap_skills for p in prereqs.get(skill, [])):
            heapq.heappush(heap, (-gap_skills[skill], skill))

    for skill in remaining:
        _push_if_unlocked(skill)

    path: list[dict] = []
    while heap:
        neg_w, skill = heapq.heappop(heap)
        if skill not in remaining:
            continue
        path.append(_make_step(skill, -neg_w, job_concepts, effort_map))
        resolved.add(skill)
        remaining.remove(skill)
        for candidate in list(remaining):
            _push_if_unlocked(candidate)

    for skill in remaining:  # unreachable
        path.append(_make_step(skill, gap_skills[skill], job_concepts, effort_map,
                               note="⚠ prerequisites unresolvable"))
    return path


# ─────────────────────────────────────────────────────────────────────────────
# Algorithm 2 — Critical-path effort ordering (Dijkstra on DAG)
# ─────────────────────────────────────────────────────────────────────────────

def compute_dijkstra_path(
    gap_skills:   dict[str, float],
    prereqs:      dict[str, list[str]],
    known_skills: set[str],
    job_concepts: dict[str, dict],
    effort_map:   dict[str, int],
) -> list[dict]:
    """
    Critical-path ordering: for each concept, compute the earliest possible
    completion time given its prerequisite chain and effort cost.

        completion[v] = effort[v] + max(completion[p] for p in prereqs[v])
                        (known skills have completion = 0)

    Because prerequisites are AND conditions — you must wait for ALL of them —
    we take the MAX of predecessor completion times, not the min. This is the
    standard critical-path method (CPM) on a DAG, and is equivalent to
    Dijkstra with AND-semantics.

    Sorting by completion time gives the effort-optimal topological order:
    cheap, foundational skills first; expensive chains deferred until needed.
    """
    all_needed = set(gap_skills.keys()) | known_skills
    completion: dict[str, float] = {s: 0.0 for s in known_skills}

    # Build forward adjacency and in-degree for a topological pass over gap_skills
    in_degree: dict[str, int] = {s: 0 for s in gap_skills}
    adj: dict[str, list[str]] = defaultdict(list)  # prereq → dependents in gap

    for skill in gap_skills:
        for prereq in prereqs.get(skill, []):
            if prereq in all_needed:
                in_degree[skill] += 1
                adj[prereq].append(skill)

    # Kahn's traversal to propagate completion times in topological order
    queue = [s for s in gap_skills if in_degree[s] == 0]

    for skill in queue:
        prereq_completions = [
            completion.get(p, 0.0)
            for p in prereqs.get(skill, [])
            if p in all_needed
        ]
        completion[skill] = (max(prereq_completions) if prereq_completions else 0.0) + effort_map.get(skill, 10)

    while queue:
        skill = queue.pop(0)
        for dep in adj.get(skill, []):
            in_degree[dep] -= 1
            prereq_completions = [
                completion.get(p, 0.0)
                for p in prereqs.get(dep, [])
                if p in all_needed
            ]
            completion[dep] = (max(prereq_completions) if prereq_completions else 0.0) + effort_map.get(dep, 10)
            if in_degree[dep] == 0:
                queue.append(dep)

    ordered = sorted(
        gap_skills.keys(),
        key=lambda s: (completion.get(s, float("inf")), -job_concepts.get(s, {}).get("weight", 0.0)),
    )

    return [
        {**_make_step(s, gap_skills[s], job_concepts, effort_map),
         "completion_time": round(completion.get(s, 0.0))}
        for s in ordered
    ]


# ─────────────────────────────────────────────────────────────────────────────
# Shared step builder
# ─────────────────────────────────────────────────────────────────────────────

def _make_step(
    skill:        str,
    weight:       float,
    job_concepts: dict[str, dict],
    effort_map:   dict[str, int],
    note:         str = "",
) -> dict:
    return {
        "name":    skill,
        "weight":  weight,
        "is_core": job_concepts.get(skill, {}).get("is_core", False),
        "direct":  skill in job_concepts,
        "effort":  effort_map.get(skill, 10),
        "note":    note,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Display
# ─────────────────────────────────────────────────────────────────────────────

def _tag(step: dict) -> str:
    parts = []
    if step["is_core"]:
        parts.append("CORE")
    if not step["direct"]:
        parts.append("prereq")
    if step.get("note"):
        parts.append(step["note"])
    return ", ".join(parts) if parts else "optional"


def print_path(
    job_name:     str,
    known_skills: set[str],
    path:         list[dict],
    job_concepts: dict[str, dict],
    algo:         str,
    tools_map:    dict[str, list[str]],
) -> None:
    total   = len(job_concepts)
    already = sum(1 for s in job_concepts if s in known_skills)
    gap     = total - already

    algo_label = {
        "kahn":     "Kahn's  (importance-first)",
        "dijkstra": "Dijkstra (effort-first / quick wins)",
    }.get(algo, algo)

    print(f"\n{'═'*72}")
    print(f"  Target role : {job_name}")
    print(f"  Algorithm   : {algo_label}")
    print(f"  Directly needs: {total} skills  ({already} known, {gap} to learn)")
    print(f"  Full path   : {len(path)} steps (includes prerequisites)")
    if known_skills:
        kd = ", ".join(sorted(known_skills)[:5])
        if len(known_skills) > 5:
            kd += f" … +{len(known_skills)-5} more"
        print(f"  Known       : {kd}")

    total_effort = sum(s["effort"] for s in path)
    print(f"  Total effort: ~{total_effort}h")
    print(f"{'═'*72}")

    has_completion = any("completion_time" in s for s in path)
    if has_completion:
        print(f"  {'#':<4} {'Skill':<32} {'Wt':>5}  {'Eff':>4}  {'By':>5}h  {'Tag':<14}  Tools")
        print(f"  {'─'*4} {'─'*32} {'─'*5}  {'─'*4}  {'─'*5}   {'─'*14}  {'─'*20}")
    else:
        print(f"  {'#':<4} {'Skill':<32} {'Wt':>5}  {'Eff':>4}h  {'Tag':<14}  Tools")
        print(f"  {'─'*4} {'─'*32} {'─'*5}  {'─'*5}   {'─'*14}  {'─'*20}")

    for i, step in enumerate(path, 1):
        tool_str = ", ".join(tools_map.get(step["name"], []))
        tag      = _tag(step)
        if has_completion:
            ct = step.get("completion_time", "?")
            print(f"  {i:<4} {step['name']:<32} {step['weight']:>5.2f}  {step['effort']:>3}h  {ct:>5}h  {tag:<14}  {tool_str}")
        else:
            print(f"  {i:<4} {step['name']:<32} {step['weight']:>5.2f}  {step['effort']:>3}h  {tag:<14}  {tool_str}")

    print()


def print_algo_diff(
    kahn_path:     list[dict],
    dijkstra_path: list[dict],
    job_name:      str,
) -> None:
    """
    Side-by-side comparison of Kahn's vs Dijkstra ordering for one job.
    Highlights where the two algorithms disagree.
    """
    kahn_order = {s["name"]: i + 1 for i, s in enumerate(kahn_path)}
    dijk_order = {s["name"]: i + 1 for i, s in enumerate(dijkstra_path)}
    all_skills = list(kahn_order.keys())  # kahn order as base

    print(f"\n{'═'*72}")
    print(f"  Algorithm comparison — {job_name}")
    print(f"  (*)  = industry-standard tool available")
    print(f"  diff = |Kahn rank − Dijkstra rank|  (high = biggest disagreement)")
    print(f"{'─'*72}")
    print(f"  {'Skill':<32}  {'Kahn':>6}  {'Dijkstra':>8}  {'diff':>5}  {'Effort':>7}")
    print(f"  {'─'*32}  {'─'*6}  {'─'*8}  {'─'*5}  {'─'*7}")

    rows = []
    for skill in all_skills:
        k = kahn_order.get(skill, 0)
        d = dijk_order.get(skill, 0)
        effort = next((s["effort"] for s in kahn_path if s["name"] == skill), 0)
        rows.append((skill, k, d, abs(k - d), effort))

    # Sort by biggest disagreement first to highlight interesting differences
    for skill, k, d, diff, effort in sorted(rows, key=lambda r: -r[3]):
        marker = " ◄" if diff >= 5 else ""
        print(f"  {skill:<32}  {k:>6}  {d:>8}  {diff:>5}  {effort:>5}h{marker}")

    print()


# ─────────────────────────────────────────────────────────────────────────────
# Interactive prompt helpers
# ─────────────────────────────────────────────────────────────────────────────

def pick_job(_: list[str]) -> str:
    print("\nAvailable jobs:")
    for i, j in enumerate(AVAILABLE_JOBS, 1):
        print(f"  {i}. {j}")
    choice = input("Pick a job (number or name): ").strip()
    if choice.isdigit() and 1 <= int(choice) <= len(AVAILABLE_JOBS):
        return AVAILABLE_JOBS[int(choice) - 1]
    if choice in AVAILABLE_JOBS:
        return choice
    print("Invalid — defaulting to Front-End Engineer")
    return "Front-End Engineer"


def pick_known(all_concepts: list[str]) -> set[str]:
    print("\nAll available skills:")
    for i, c in enumerate(all_concepts, 1):
        print(f"  {i:>2}. {c}")
    raw = input(
        "\nEnter skill numbers or names you already know (comma-separated), "
        "or press Enter to start from zero:\n> "
    ).strip()
    if not raw:
        return set()
    known: set[str] = set()
    for token in raw.split(","):
        token = token.strip()
        if token.isdigit():
            idx = int(token) - 1
            if 0 <= idx < len(all_concepts):
                known.add(all_concepts[idx])
        else:
            matches = [c for c in all_concepts if token.lower() in c.lower()]
            if matches:
                known.add(matches[0])
            else:
                print(f"  ('{token}' not found — skipped)")
    return known


# ─────────────────────────────────────────────────────────────────────────────
# Core query runner
# ─────────────────────────────────────────────────────────────────────────────

def run_query(
    session,
    job_name:     str,
    known_skills: set[str],
    algo:         str,  # "kahn", "dijkstra", or "both"
) -> None:
    job_concepts = fetch_job_concepts(session, job_name)
    if not job_concepts:
        print(f"  No concepts found for '{job_name}'. Did you run seed.py?")
        return

    prereqs, _  = fetch_prereq_graph(session)
    effort_map  = fetch_effort_map(session)
    gap         = find_needed_concepts(job_concepts, prereqs, known_skills)

    concept_names = list(gap.keys())
    tools_map   = fetch_tools_for_concepts(session, concept_names)

    if algo in ("kahn", "both"):
        kahn_path = compute_kahns_path(gap, prereqs, known_skills, job_concepts, effort_map)
        print_path(job_name, known_skills, kahn_path, job_concepts, "kahn", tools_map)

    if algo in ("dijkstra", "both"):
        dijk_path = compute_dijkstra_path(gap, prereqs, known_skills, job_concepts, effort_map)
        print_path(job_name, known_skills, dijk_path, job_concepts, "dijkstra", tools_map)

    if algo == "both":
        print_algo_diff(kahn_path, dijk_path, job_name)


# ─────────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--job",     default=None,
                        help="Target job name (quoted)")
    parser.add_argument("--known",   default=None, nargs="?", const="",
                        help="Comma-separated known skills (omit value = start from zero)")
    parser.add_argument("--algo",    default="kahn",
                        choices=["kahn", "dijkstra", "both"],
                        help="Path-finding algorithm (default: kahn)")
    parser.add_argument("--compare", action="store_true",
                        help="Run both algos for both jobs, side-by-side diff")
    args = parser.parse_args()

    driver = _driver()
    try:
        with driver.session() as session:
            all_concepts = fetch_all_concept_names(session)
            if not all_concepts:
                print("No :Sandbox concepts found. Run seed.py --clear first.")
                return

            if args.compare:
                for job_name in AVAILABLE_JOBS:
                    run_query(session, job_name, set(), "both")
                return

            job_name = args.job or pick_job(all_concepts)

            if args.known is not None:
                known_skills = {s.strip() for s in args.known.split(",") if s.strip()}
            else:
                known_skills = pick_known(all_concepts)

            run_query(session, job_name, known_skills, args.algo)

    finally:
        driver.close()


if __name__ == "__main__":
    main()
