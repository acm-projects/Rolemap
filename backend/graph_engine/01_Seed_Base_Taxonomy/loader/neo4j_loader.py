"""
Neo4j loader — MERGE-based, idempotent writes for all node and edge types.

Load order:
  1. Domains
  2. Jobs
  3. Concepts
  4. Tools
  5. Resources
  6. Edges: REQUIRES, PREREQUISITE_FOR, PART_OF, IMPLEMENTS, TEACHES
"""

import os
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from neo4j import GraphDatabase

load_dotenv()

BATCH_SIZE = 500  # rows per Cypher UNWIND batch


def _driver():
    uri = os.environ.get("NEO4J_URI", "bolt://localhost:7687")
    user = os.environ.get("NEO4J_USER", "neo4j")
    password = os.environ.get("NEO4J_PASSWORD", "")
    if not password:
        raise EnvironmentError("NEO4J_PASSWORD must be set in .env")
    return GraphDatabase.driver(uri, auth=(user, password))


def _batches(lst: list, size: int):
    for i in range(0, len(lst), size):
        yield lst[i : i + size]


# ---------------------------------------------------------------------------
# Schema constraints (run once)
# ---------------------------------------------------------------------------

CONSTRAINTS = [
    "CREATE CONSTRAINT IF NOT EXISTS FOR (d:Domain) REQUIRE d.id IS UNIQUE",
    "CREATE CONSTRAINT IF NOT EXISTS FOR (j:Job) REQUIRE j.id IS UNIQUE",
    "CREATE CONSTRAINT IF NOT EXISTS FOR (c:Concept) REQUIRE c.id IS UNIQUE",
    "CREATE CONSTRAINT IF NOT EXISTS FOR (t:Tool) REQUIRE t.id IS UNIQUE",
    "CREATE CONSTRAINT IF NOT EXISTS FOR (r:Resource) REQUIRE r.id IS UNIQUE",
]


def create_constraints(driver) -> None:
    with driver.session() as session:
        for stmt in CONSTRAINTS:
            session.run(stmt)
    print("  [neo4j] Constraints ensured.")


# ---------------------------------------------------------------------------
# Node loaders
# ---------------------------------------------------------------------------

def load_domains(driver, domains: list[dict]) -> None:
    query = """
    UNWIND $rows AS row
    MERGE (d:Domain {id: row.id})
    SET d.name = row.name
    """
    count = 0
    with driver.session() as session:
        for batch in _batches(domains, BATCH_SIZE):
            session.run(query, rows=batch)
            count += len(batch)
    print(f"  [neo4j] Merged {count} Domain nodes.")


def load_jobs(driver, jobs: list[dict]) -> None:
    query = """
    UNWIND $rows AS row
    MERGE (j:Job {id: row.id})
    SET j.display_name = row.display_name,
        j.description  = row.description
    """
    count = 0
    with driver.session() as session:
        for batch in _batches(jobs, BATCH_SIZE):
            session.run(query, rows=batch)
            count += len(batch)
    print(f"  [neo4j] Merged {count} Job nodes.")


def load_concepts(driver, concepts: list[dict]) -> None:
    query = """
    UNWIND $rows AS row
    MERGE (c:Concept {id: row.id})
    SET c.name = row.name
    """
    count = 0
    with driver.session() as session:
        for batch in _batches(concepts, BATCH_SIZE):
            # Strip internal _canonical key before sending to Neo4j
            clean = [{k: v for k, v in c.items() if not k.startswith("_")} for c in batch]
            session.run(query, rows=clean)
            count += len(batch)
    print(f"  [neo4j] Merged {count} Concept nodes.")


def load_tools(driver, tools: list[dict]) -> None:
    query = """
    UNWIND $rows AS row
    MERGE (t:Tool {id: row.id})
    SET t.name = row.name
    """
    count = 0
    with driver.session() as session:
        for batch in _batches(tools, BATCH_SIZE):
            clean = [{k: v for k, v in t.items() if not k.startswith("_")} for t in batch]
            session.run(query, rows=clean)
            count += len(batch)
    print(f"  [neo4j] Merged {count} Tool nodes.")


def load_resources(driver, resources: list[dict]) -> None:
    """Resources from resources_seed.json."""
    if not resources:
        print("  [neo4j] No resources to load.")
        return

    query = """
    UNWIND $rows AS row
    MERGE (r:Resource {id: row.id})
    SET r.url    = row.url,
        r.format = row.format
    """
    count = 0
    with driver.session() as session:
        for batch in _batches(resources, BATCH_SIZE):
            session.run(query, rows=batch)
            count += len(batch)
    print(f"  [neo4j] Merged {count} Resource nodes.")


# ---------------------------------------------------------------------------
# Edge loaders
# ---------------------------------------------------------------------------

def load_requires_edges(driver, edges: list[dict]) -> None:
    query = """
    UNWIND $rows AS row
    MATCH (j:Job {id: row.job_id})
    MATCH (c:Concept {id: row.concept_id})
    MERGE (j)-[r:REQUIRES]->(c)
    SET r.weight  = row.weight,
        r.is_core = row.is_core
    """
    count = 0
    with driver.session() as session:
        for batch in _batches(edges, BATCH_SIZE):
            session.run(query, rows=batch)
            count += len(batch)
    print(f"  [neo4j] Merged {count} REQUIRES edges.")


def load_prerequisite_edges(driver, edges: list[dict]) -> None:
    query = """
    UNWIND $rows AS row
    MATCH (a:Concept {id: row.from_concept_id})
    MATCH (b:Concept {id: row.to_concept_id})
    MERGE (a)-[:PREREQUISITE_FOR]->(b)
    """
    count = 0
    with driver.session() as session:
        for batch in _batches(edges, BATCH_SIZE):
            session.run(query, rows=batch)
            count += len(batch)
    print(f"  [neo4j] Merged {count} PREREQUISITE_FOR edges.")


def load_part_of_edges(driver, edges: list[dict]) -> None:
    query = """
    UNWIND $rows AS row
    MATCH (c:Concept {id: row.concept_id})
    MATCH (d:Domain {id: row.domain_id})
    MERGE (c)-[:PART_OF]->(d)
    """
    count = 0
    with driver.session() as session:
        for batch in _batches(edges, BATCH_SIZE):
            session.run(query, rows=batch)
            count += len(batch)
    print(f"  [neo4j] Merged {count} PART_OF edges.")


def load_implements_edges(driver, edges: list[dict]) -> None:
    query = """
    UNWIND $rows AS row
    MATCH (t:Tool {id: row.tool_id})
    MATCH (c:Concept {id: row.concept_id})
    MERGE (t)-[r:IMPLEMENTS]->(c)
    SET r.industry_standard = row.industry_standard,
        r.deprecated        = row.deprecated
    """
    count = 0
    with driver.session() as session:
        for batch in _batches(edges, BATCH_SIZE):
            session.run(query, rows=batch)
            count += len(batch)
    print(f"  [neo4j] Merged {count} IMPLEMENTS edges.")


def load_teaches_edges(
    driver,
    resources: list[dict],
    concept_nodes: list[dict],
    tool_nodes: list[dict],
) -> None:
    """
    Resource -[TEACHES]-> Concept  and  Resource -[TEACHES]-> Tool
    Resolved by name matching against the loaded concept/tool nodes.
    """
    if not resources:
        return

    concept_by_name: dict[str, str] = {c["name"].lower(): c["id"] for c in concept_nodes}
    tool_by_name: dict[str, str] = {t["name"].lower(): t["id"] for t in tool_nodes}

    concept_edges: list[dict] = []
    tool_edges: list[dict] = []

    for res in resources:
        rid = res["id"]
        for cname in res.get("teaches_concepts", []):
            cid = concept_by_name.get(cname.lower())
            if cid:
                concept_edges.append({"resource_id": rid, "concept_id": cid})
        for tname in res.get("teaches_tools", []):
            tid = tool_by_name.get(tname.lower())
            if tid:
                tool_edges.append({"resource_id": rid, "tool_id": tid})

    q_concept = """
    UNWIND $rows AS row
    MATCH (r:Resource {id: row.resource_id})
    MATCH (c:Concept {id: row.concept_id})
    MERGE (r)-[:TEACHES]->(c)
    """
    q_tool = """
    UNWIND $rows AS row
    MATCH (r:Resource {id: row.resource_id})
    MATCH (t:Tool {id: row.tool_id})
    MERGE (r)-[:TEACHES]->(t)
    """
    with driver.session() as session:
        for batch in _batches(concept_edges, BATCH_SIZE):
            session.run(q_concept, rows=batch)
        for batch in _batches(tool_edges, BATCH_SIZE):
            session.run(q_tool, rows=batch)

    print(
        f"  [neo4j] Merged {len(concept_edges)} TEACHES->Concept edges, "
        f"{len(tool_edges)} TEACHES->Tool edges."
    )


# ---------------------------------------------------------------------------
# Main loader entry point
# ---------------------------------------------------------------------------

def load_all(graph_data: dict[str, Any], resources: list[dict]) -> None:
    """
    Load all nodes and edges into Neo4j.

    Args:
        graph_data: output from pipeline/processor.process_all()
        resources:  output from scraper/resource_scraper.load_resources()
    """
    import uuid as _uuid

    # Attach IDs to resources
    for res in resources:
        if "id" not in res:
            res["id"] = str(_uuid.uuid4())

    driver = _driver()
    try:
        print("\n[neo4j] Ensuring constraints...")
        create_constraints(driver)

        print("\n[neo4j] Loading nodes...")
        load_domains(driver, graph_data["domains"])
        load_jobs(driver, graph_data["jobs"])
        load_concepts(driver, graph_data["concepts"])
        load_tools(driver, graph_data["tools"])
        load_resources(driver, resources)

        print("\n[neo4j] Loading edges...")
        load_requires_edges(driver, graph_data["requires_edges"])
        load_prerequisite_edges(driver, graph_data["prereq_edges"])
        load_part_of_edges(driver, graph_data["part_of_edges"])
        load_implements_edges(driver, graph_data["implements_edges"])
        load_teaches_edges(
            driver,
            resources,
            graph_data["concepts"],
            graph_data["tools"],
        )

        print("\n[neo4j] Load complete.")

    finally:
        driver.close()
