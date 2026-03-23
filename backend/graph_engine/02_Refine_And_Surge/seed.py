"""
sandbox/seed.py — Manual skill graph seeder for Rolemap path-finding tests.

Inserts:
  - 2 Job nodes (Front-End Engineer, Back-End Engineer)
  - 1 Domain node (Software Engineering)
  - 35 Concept nodes with effort (hours) property
  - 15 Tool nodes
  - PREREQUISITE_FOR edges between concepts
  - REQUIRES edges from each job to its concepts (with weight + is_core)
  - IMPLEMENTS edges from tools to the concepts they represent
  - PART_OF edges from all concepts to the domain

Run:
  cd sandbox
  python seed.py            # seed (safe to re-run — all writes are MERGE)
  python seed.py --clear    # wipe sandbox nodes first, then re-seed
"""

import argparse
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "knowledge_graph"))

from dotenv import load_dotenv
from neo4j import GraphDatabase

load_dotenv(Path(__file__).parent / ".env")
load_dotenv(Path(__file__).parent.parent / ".env")                       # repo root
load_dotenv(Path(__file__).parent.parent / "knowledge_graph" / ".env")  # fallback


# ─────────────────────────────────────────────────────────────────────────────
# Graph data — edit here to extend the sandbox
# ─────────────────────────────────────────────────────────────────────────────

DOMAIN = "Software Engineering"

JOBS = [
    {"id": "job_fe", "display_name": "Front-End Engineer",  "description": "Builds user interfaces for the web."},
    {"id": "job_be", "display_name": "Back-End Engineer",   "description": "Builds server-side APIs and data layers."},
]

# 35 concepts — effort is a rough estimate in hours to reach working proficiency
CONCEPTS = [
    # ── HTML / CSS ──────────────────────────────────────────────────────────
    {"id": "html_basics",         "name": "HTML Basics",               "effort": 8},
    {"id": "css_basics",          "name": "CSS Basics",                "effort": 10},
    {"id": "css_flexbox",         "name": "CSS Flexbox",               "effort": 5},
    {"id": "css_grid",            "name": "CSS Grid",                  "effort": 5},
    {"id": "responsive_design",   "name": "Responsive Design",         "effort": 6},
    # ── JavaScript core ─────────────────────────────────────────────────────
    {"id": "js_fundamentals",     "name": "JavaScript Fundamentals",   "effort": 40},
    {"id": "es6_features",        "name": "ES6+ Features",             "effort": 8},
    {"id": "async_await",         "name": "Async/Await & Promises",    "effort": 6},
    {"id": "dom_manipulation",    "name": "DOM Manipulation",          "effort": 8},
    {"id": "typescript",          "name": "TypeScript Basics",         "effort": 12},
    # ── React ────────────────────────────────────────────────────────────────
    {"id": "react_basics",        "name": "React Basics",              "effort": 16},
    {"id": "react_hooks",         "name": "React Hooks",               "effort": 8},
    {"id": "component_arch",      "name": "Component Architecture",    "effort": 6},
    {"id": "state_management",    "name": "State Management (Redux)",  "effort": 10},
    # ── HTTP / APIs ──────────────────────────────────────────────────────────
    {"id": "http_basics",         "name": "HTTP & Web Basics",         "effort": 6},
    {"id": "networking",          "name": "Networking Basics",         "effort": 8},
    {"id": "rest_api",            "name": "REST API Design",           "effort": 10},
    {"id": "auth_jwt",            "name": "Authentication & JWT",      "effort": 8},
    # ── Node / Express ───────────────────────────────────────────────────────
    {"id": "nodejs",              "name": "Node.js Basics",            "effort": 12},
    {"id": "expressjs",           "name": "Express.js",                "effort": 10},
    # ── Databases ────────────────────────────────────────────────────────────
    {"id": "sql_basics",          "name": "SQL Basics",                "effort": 12},
    {"id": "sql_joins",           "name": "SQL Joins",                 "effort": 6},
    {"id": "db_indexing",         "name": "Database Indexing",         "effort": 5},
    {"id": "postgresql",          "name": "PostgreSQL",                "effort": 8},
    # ── CS fundamentals ──────────────────────────────────────────────────────
    {"id": "data_structures",     "name": "Data Structures",           "effort": 20},
    {"id": "algorithms",          "name": "Algorithms",                "effort": 25},
    {"id": "big_o",               "name": "Big O Notation",            "effort": 8},
    # ── Testing ──────────────────────────────────────────────────────────────
    {"id": "unit_testing",        "name": "Unit Testing",              "effort": 8},
    {"id": "integration_testing", "name": "Integration Testing",       "effort": 6},
    # ── Security ─────────────────────────────────────────────────────────────
    {"id": "web_security",        "name": "Web Security Basics",       "effort": 10},
    # ── DevOps / tooling ────────────────────────────────────────────────────
    {"id": "git",                 "name": "Git & Version Control",     "effort": 8},
    {"id": "cli_linux",           "name": "Command Line / Linux",      "effort": 8},
    {"id": "docker",              "name": "Docker Basics",             "effort": 8},
    {"id": "cicd",                "name": "CI/CD Basics",              "effort": 6},
    # ── Performance ──────────────────────────────────────────────────────────
    {"id": "web_perf",            "name": "Web Performance",           "effort": 6},
]

# (from_id, to_id)  →  "from" is prerequisite, "to" is the advanced skill
PREREQ_EDGES = [
    # HTML/CSS chain
    ("html_basics",       "css_basics"),
    ("css_basics",        "css_flexbox"),
    ("css_basics",        "css_grid"),
    ("css_flexbox",       "responsive_design"),
    ("css_grid",          "responsive_design"),
    ("responsive_design", "web_perf"),
    # JavaScript chain
    ("js_fundamentals",   "es6_features"),
    ("js_fundamentals",   "dom_manipulation"),
    ("js_fundamentals",   "typescript"),
    ("js_fundamentals",   "data_structures"),
    ("js_fundamentals",   "unit_testing"),
    ("js_fundamentals",   "nodejs"),
    ("es6_features",      "async_await"),
    ("es6_features",      "typescript"),
    ("async_await",       "rest_api"),
    ("data_structures",   "algorithms"),
    ("algorithms",        "big_o"),
    ("unit_testing",      "integration_testing"),
    # React chain
    ("dom_manipulation",  "react_basics"),
    ("typescript",        "react_basics"),
    ("react_basics",      "react_hooks"),
    ("react_basics",      "component_arch"),
    ("react_hooks",       "state_management"),
    ("component_arch",    "state_management"),
    # HTTP / API chain
    ("networking",        "http_basics"),
    ("http_basics",       "rest_api"),
    ("http_basics",       "web_perf"),
    ("rest_api",          "auth_jwt"),
    # Node / Express chain
    ("nodejs",            "expressjs"),
    ("expressjs",         "rest_api"),
    # Database chain
    ("sql_basics",        "sql_joins"),
    ("sql_basics",        "postgresql"),
    ("sql_joins",         "db_indexing"),
    ("sql_joins",         "postgresql"),
    # Auth dependency
    ("web_security",      "auth_jwt"),
    # DevOps chain
    ("cli_linux",         "docker"),
    ("docker",            "cicd"),
    ("git",               "cicd"),
]

# (job_id, concept_id, weight, is_core)
REQUIRES_EDGES = [
    # ── Front-End Engineer ───────────────────────────────────────────────────
    ("job_fe", "html_basics",       1.00, True),
    ("job_fe", "css_basics",        1.00, True),
    ("job_fe", "js_fundamentals",   1.00, True),
    ("job_fe", "es6_features",      0.90, True),
    ("job_fe", "async_await",       0.90, True),
    ("job_fe", "dom_manipulation",  0.90, True),
    ("job_fe", "css_flexbox",       0.90, True),
    ("job_fe", "responsive_design", 0.85, True),
    ("job_fe", "component_arch",    0.85, True),
    ("job_fe", "react_basics",      0.95, True),
    ("job_fe", "react_hooks",       0.90, True),
    ("job_fe", "typescript",        0.80, False),
    ("job_fe", "rest_api",          0.80, False),
    ("job_fe", "http_basics",       0.80, True),
    ("job_fe", "git",               0.90, True),
    ("job_fe", "unit_testing",      0.75, False),
    ("job_fe", "web_perf",          0.70, False),
    # ── Back-End Engineer ────────────────────────────────────────────────────
    ("job_be", "js_fundamentals",   0.90, True),
    ("job_be", "es6_features",      0.85, True),
    ("job_be", "async_await",       0.85, True),
    ("job_be", "nodejs",            1.00, True),
    ("job_be", "expressjs",         0.95, True),
    ("job_be", "rest_api",          1.00, True),
    ("job_be", "sql_basics",        0.90, True),
    ("job_be", "sql_joins",         0.85, True),
    ("job_be", "postgresql",        0.85, True),
    ("job_be", "auth_jwt",          0.90, True),
    ("job_be", "git",               0.90, True),
    ("job_be", "http_basics",       0.90, True),
    ("job_be", "cli_linux",         0.80, True),
    ("job_be", "web_security",      0.85, True),
    ("job_be", "data_structures",   0.80, False),
    ("job_be", "unit_testing",      0.80, False),
    ("job_be", "integration_testing", 0.75, False),
    ("job_be", "docker",            0.75, False),
]

# 15 tools — concrete software/frameworks that implement the concepts above
TOOLS = [
    {"id": "tool_react",          "name": "React"},
    {"id": "tool_redux",          "name": "Redux"},
    {"id": "tool_typescript",     "name": "TypeScript"},
    {"id": "tool_nodejs",         "name": "Node.js"},
    {"id": "tool_express",        "name": "Express.js"},
    {"id": "tool_postgresql",     "name": "PostgreSQL"},
    {"id": "tool_docker",         "name": "Docker"},
    {"id": "tool_github_actions", "name": "GitHub Actions"},
    {"id": "tool_git",            "name": "Git"},
    {"id": "tool_jest",           "name": "Jest"},
    {"id": "tool_postman",        "name": "Postman"},
    {"id": "tool_webpack",        "name": "Webpack"},
    {"id": "tool_linux",          "name": "Linux / Bash"},
    {"id": "tool_jwt",            "name": "jsonwebtoken"},
    {"id": "tool_devtools",       "name": "Chrome DevTools"},
]

# (tool_id, concept_id, industry_standard, deprecated)
IMPLEMENTS_EDGES = [
    ("tool_react",          "react_basics",       True,  False),
    ("tool_react",          "component_arch",     True,  False),
    ("tool_redux",          "state_management",   False, False),
    ("tool_typescript",     "typescript",         True,  False),
    ("tool_nodejs",         "nodejs",             True,  False),
    ("tool_express",        "expressjs",          True,  False),
    ("tool_postgresql",     "sql_basics",         True,  False),
    ("tool_postgresql",     "sql_joins",          True,  False),
    ("tool_postgresql",     "postgresql",         True,  False),
    ("tool_docker",         "docker",             True,  False),
    ("tool_github_actions", "cicd",               True,  False),
    ("tool_git",            "git",                True,  False),
    ("tool_jest",           "unit_testing",       False, False),
    ("tool_jest",           "integration_testing",False, False),
    ("tool_postman",        "rest_api",           False, False),
    ("tool_webpack",        "web_perf",           False, False),
    ("tool_linux",          "cli_linux",          True,  False),
    ("tool_jwt",            "auth_jwt",           False, False),
    ("tool_devtools",       "dom_manipulation",   True,  False),
    ("tool_devtools",       "web_perf",           True,  False),
]


# ─────────────────────────────────────────────────────────────────────────────
# Neo4j helpers
# ─────────────────────────────────────────────────────────────────────────────

def _driver():
    uri  = os.environ.get("NEO4J_URI",      "bolt://localhost:7687")
    user = os.environ.get("NEO4J_USER",     "neo4j")
    pw   = os.environ.get("NEO4J_PASSWORD", "")
    if not pw:
        raise EnvironmentError("NEO4J_PASSWORD must be set in .env")
    return GraphDatabase.driver(uri, auth=(user, pw))


def clear_sandbox(session) -> None:
    session.run("MATCH (n:Sandbox) DETACH DELETE n")
    print("  Cleared existing :Sandbox nodes.")


def seed(session) -> None:
    # ── Domain ───────────────────────────────────────────────────────────────
    session.run(
        "MERGE (d:Domain:Sandbox {id: $id}) SET d.name = $name",
        id="domain_swe", name=DOMAIN,
    )

    # ── Jobs ─────────────────────────────────────────────────────────────────
    for job in JOBS:
        session.run(
            """
            MERGE (j:Job:Sandbox {id: $id})
            SET j.display_name = $display_name,
                j.description  = $description
            """,
            **job,
        )

    # ── Concepts (with effort) ────────────────────────────────────────────────
    for c in CONCEPTS:
        session.run(
            """
            MERGE (c:Concept:Sandbox {id: $id})
            SET c.name   = $name,
                c.effort = $effort
            """,
            **c,
        )

    # ── Tools ─────────────────────────────────────────────────────────────────
    for t in TOOLS:
        session.run(
            "MERGE (t:Tool:Sandbox {id: $id}) SET t.name = $name",
            **t,
        )

    # ── PART_OF edges ─────────────────────────────────────────────────────────
    session.run(
        """
        MATCH (c:Concept:Sandbox)
        MATCH (d:Domain:Sandbox {id: 'domain_swe'})
        MERGE (c)-[:PART_OF]->(d)
        """
    )

    # ── PREREQUISITE_FOR edges ────────────────────────────────────────────────
    session.run(
        """
        UNWIND $rows AS row
        MATCH (a:Concept:Sandbox {id: row.from_id})
        MATCH (b:Concept:Sandbox {id: row.to_id})
        MERGE (a)-[:PREREQUISITE_FOR]->(b)
        """,
        rows=[{"from_id": f, "to_id": t} for f, t in PREREQ_EDGES],
    )

    # ── REQUIRES edges ────────────────────────────────────────────────────────
    session.run(
        """
        UNWIND $rows AS row
        MATCH (j:Job:Sandbox     {id: row.job_id})
        MATCH (c:Concept:Sandbox {id: row.concept_id})
        MERGE (j)-[r:REQUIRES]->(c)
        SET r.weight  = row.weight,
            r.is_core = row.is_core
        """,
        rows=[
            {"job_id": j, "concept_id": c, "weight": w, "is_core": core}
            for j, c, w, core in REQUIRES_EDGES
        ],
    )

    # ── IMPLEMENTS edges ──────────────────────────────────────────────────────
    session.run(
        """
        UNWIND $rows AS row
        MATCH (t:Tool:Sandbox    {id: row.tool_id})
        MATCH (c:Concept:Sandbox {id: row.concept_id})
        MERGE (t)-[r:IMPLEMENTS]->(c)
        SET r.industry_standard = row.industry_standard,
            r.deprecated        = row.deprecated
        """,
        rows=[
            {"tool_id": t, "concept_id": c, "industry_standard": ind, "deprecated": dep}
            for t, c, ind, dep in IMPLEMENTS_EDGES
        ],
    )


def print_summary(session) -> None:
    counts = {
        "Jobs":              session.run("MATCH (n:Job:Sandbox)     RETURN count(n) AS c").single()["c"],
        "Concepts":          session.run("MATCH (n:Concept:Sandbox) RETURN count(n) AS c").single()["c"],
        "Tools":             session.run("MATCH (n:Tool:Sandbox)    RETURN count(n) AS c").single()["c"],
        "Domains":           session.run("MATCH (n:Domain:Sandbox)  RETURN count(n) AS c").single()["c"],
        "PREREQUISITE_FOR":  session.run(
            "MATCH (:Concept:Sandbox)-[r:PREREQUISITE_FOR]->(:Concept:Sandbox) RETURN count(r) AS c"
        ).single()["c"],
        "REQUIRES":          session.run(
            "MATCH (:Job:Sandbox)-[r:REQUIRES]->(:Concept:Sandbox) RETURN count(r) AS c"
        ).single()["c"],
        "IMPLEMENTS":        session.run(
            "MATCH (:Tool:Sandbox)-[r:IMPLEMENTS]->(:Concept:Sandbox) RETURN count(r) AS c"
        ).single()["c"],
    }
    print("\n  ── Sandbox graph summary ──────────────────")
    for label, count in counts.items():
        print(f"  {label:<22} {count}")
    print()


# ─────────────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--clear", action="store_true", help="Wipe :Sandbox nodes before seeding")
    args = parser.parse_args()

    driver = _driver()
    try:
        with driver.session() as session:
            if args.clear:
                clear_sandbox(session)
            print("Seeding sandbox graph...")
            seed(session)
            print_summary(session)
            print("Done. Run pathfinder.py to query learning paths.")
    finally:
        driver.close()


if __name__ == "__main__":
    main()
