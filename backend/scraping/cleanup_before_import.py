"""
cleanup_before_import.py

One-time graph cleanup script to run BEFORE importing scraped_jobs_clean.csv.

What it does:
  1. Deletes all scraper-created Job nodes (those with a 'title' property) and
     their relationships — these are raw noisy titles like "FRONTEND SOFTWARE ENGINEER"
     that will be replaced by clean canonical nodes from the import.
  2. Deduplicates seeder-created Job nodes (display_name duplicates from double
     seeder runs) — keeps the one with the most REQUIRES edges, moves PART_OF
     edges to the survivor, deletes the duplicate.
  3. Deduplicates Domain nodes — same double-seeder issue.
  4. Collapses "Mobile Engineer (Android)" and "Mobile Engineer (iOS)" into a
     single "Mobile Engineer" node, migrating all REQUIRES edges.
  5. Adds the 'domain' property to every surviving Job node from the canonical
     mapping in jobs.py.
  6. Creates (Job)-[:PART_OF]->(Domain) edges for all Job nodes.

Usage:
    cd backend/scraping
    python cleanup_before_import.py
    python cleanup_before_import.py --dry-run   # preview only
"""

import argparse
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from neo4j import GraphDatabase

# ---------------------------------------------------------------------------
# Canonical job → domain mapping (mirrors jobs.py)
# ---------------------------------------------------------------------------

JOB_DOMAIN_MAP = {
    "Front-End Engineer":            "Software Engineering",
    "Back-End Engineer":             "Software Engineering",
    "Full-Stack Engineer":           "Software Engineering",
    "Mobile Engineer":               "Software Engineering",
    "Systems Engineer":              "Software Engineering",
    "Game Developer":                "Software Engineering",
    "Security Analyst":              "Cybersecurity",
    "Penetration Tester":            "Cybersecurity",
    "Security Engineer":             "Cybersecurity",
    "Cloud Security Engineer":       "Cybersecurity",
    "SOC Analyst":                   "Cybersecurity",
    "Application Security Engineer": "Cybersecurity",
    "GRC Analyst":                   "Cybersecurity",
    "Machine Learning Engineer":     "Machine Learning",
    "Data Scientist":                "Machine Learning",
    "AI Engineer":                   "Machine Learning",
    "NLP Engineer":                  "Machine Learning",
    "Computer Vision Engineer":      "Machine Learning",
    "Research Scientist":            "Machine Learning",
    "BI Developer":                  "Data Visualization",
    "Data Visualization Engineer":   "Data Visualization",
    "Analytics Engineer":            "Data Visualization",
    "Reporting Analyst":             "Data Visualization",
    "Cloud Infrastructure Engineer": "Cloud & Infrastructure",
    "Cloud Architect":               "Cloud & Infrastructure",
    "Site Reliability Engineer":     "Cloud & Infrastructure",
    "Platform Engineer":             "Cloud & Infrastructure",
    "Technical Project Manager":     "Technical Project Management",
    "Agile Project Manager":         "Technical Project Management",
    "Program Manager":               "Technical Project Management",
    "Scrum Master":                  "Technical Project Management",
    "DevOps Engineer":               "DevOps",
    "CI/CD Engineer":                "DevOps",
    "Infrastructure as Code Engineer": "DevOps",
    "Release Engineer":              "DevOps",
    "Containerization Engineer":     "DevOps",
}


def run_cleanup(driver, dry_run: bool) -> None:
    tag = "[DRY RUN] " if dry_run else ""

    with driver.session() as session:

        # ------------------------------------------------------------------
        # Step 1: Delete scraper-created Job nodes (have 'title' property)
        # ------------------------------------------------------------------
        result = session.run("MATCH (j:Job) WHERE j.title IS NOT NULL RETURN count(j) AS n")
        scraper_job_count = result.single()["n"]
        print(f"{tag}Step 1: Found {scraper_job_count} scraper-created Job nodes (with 'title' property)")
        if not dry_run and scraper_job_count > 0:
            session.run("MATCH (j:Job) WHERE j.title IS NOT NULL DETACH DELETE j")
            print(f"  Deleted {scraper_job_count} scraper Job nodes and all their relationships.")

        # ------------------------------------------------------------------
        # Step 2: Deduplicate seeder Job nodes (same display_name, 2 nodes)
        # ------------------------------------------------------------------
        result = session.run("""
            MATCH (j:Job)
            WHERE j.display_name IS NOT NULL
            WITH j.display_name AS name, collect(j) AS dupes
            WHERE size(dupes) > 1
            RETURN name, size(dupes) AS count
        """)
        dup_jobs = [(r["name"], r["count"]) for r in result]
        print(f"\n{tag}Step 2: Found {len(dup_jobs)} duplicated Job display_names")
        for name, count in dup_jobs:
            print(f"  '{name}' ({count}x)")

        if not dry_run:
            # For each duplicated display_name: keep the node with more REQUIRES edges,
            # move any PART_OF edges from the loser to the winner, delete the loser.
            for name, _ in dup_jobs:
                # Get all nodes with this display_name, ordered by REQUIRES edge count desc
                result = session.run("""
                    MATCH (j:Job {display_name: $name})
                    OPTIONAL MATCH (j)-[:REQUIRES]->(c:Concept)
                    WITH j, count(c) AS req_count
                    ORDER BY req_count DESC
                    RETURN elementId(j) AS eid, req_count
                """, name=name)
                records = list(result)
                winner_eid = records[0]["eid"]
                loser_eids = [r["eid"] for r in records[1:]]

                for loser_eid in loser_eids:
                    # Re-link PART_OF edges from loser to winner (if any)
                    session.run("""
                        MATCH (loser:Job) WHERE elementId(loser) = $loser_eid
                        MATCH (winner:Job) WHERE elementId(winner) = $winner_eid
                        OPTIONAL MATCH (loser)-[:PART_OF]->(d:Domain)
                        WITH winner, collect(d) AS domains
                        FOREACH (d IN domains |
                            MERGE (winner)-[:PART_OF]->(d)
                        )
                    """, loser_eid=loser_eid, winner_eid=winner_eid)
                    # Delete the loser
                    session.run("""
                        MATCH (j:Job) WHERE elementId(j) = $loser_eid
                        DETACH DELETE j
                    """, loser_eid=loser_eid)
            print(f"  Deduplicated {len(dup_jobs)} Job groups.")

        # ------------------------------------------------------------------
        # Step 3: Deduplicate Domain nodes
        # ------------------------------------------------------------------
        result = session.run("""
            MATCH (d:Domain)
            WITH d.name AS name, collect(d) AS dupes
            WHERE size(dupes) > 1
            RETURN name, size(dupes) AS count
        """)
        dup_domains = [(r["name"], r["count"]) for r in result]
        print(f"\n{tag}Step 3: Found {len(dup_domains)} duplicated Domain names")
        for name, count in dup_domains:
            print(f"  '{name}' ({count}x)")

        if not dry_run:
            for name, _ in dup_domains:
                result = session.run("""
                    MATCH (d:Domain {name: $name})
                    OPTIONAL MATCH (d)<-[:PART_OF]-(j:Job)
                    WITH d, count(j) AS job_count
                    ORDER BY job_count DESC
                    RETURN elementId(d) AS eid, job_count
                """, name=name)
                records = list(result)
                winner_eid = records[0]["eid"]
                loser_eids = [r["eid"] for r in records[1:]]

                for loser_eid in loser_eids:
                    # Re-link any PART_OF edges from Jobs pointing to the loser
                    session.run("""
                        MATCH (winner:Domain) WHERE elementId(winner) = $winner_eid
                        MATCH (loser:Domain) WHERE elementId(loser) = $loser_eid
                        OPTIONAL MATCH (j:Job)-[:PART_OF]->(loser)
                        WITH winner, loser, collect(j) AS jobs
                        FOREACH (j IN jobs |
                            MERGE (j)-[:PART_OF]->(winner)
                        )
                    """, winner_eid=winner_eid, loser_eid=loser_eid)
                    session.run("""
                        MATCH (d:Domain) WHERE elementId(d) = $loser_eid
                        DETACH DELETE d
                    """, loser_eid=loser_eid)
            print(f"  Deduplicated {len(dup_domains)} Domain groups.")

        # ------------------------------------------------------------------
        # Step 4: Collapse Mobile Engineer (Android) + (iOS) → Mobile Engineer
        # ------------------------------------------------------------------
        result = session.run("""
            MATCH (j:Job)
            WHERE j.display_name IN ['Mobile Engineer (Android)', 'Mobile Engineer (iOS)']
            RETURN j.display_name AS name, elementId(j) AS eid
        """)
        mobile_records = list(result)
        print(f"\n{tag}Step 4: Found {len(mobile_records)} Mobile Engineer variant nodes to collapse")
        for r in mobile_records:
            print(f"  '{r['name']}'")

        if not dry_run and mobile_records:
            # Ensure "Mobile Engineer" node exists
            session.run("""
                MERGE (j:Job {display_name: 'Mobile Engineer'})
                ON CREATE SET j.id = randomUUID(),
                              j.description = 'Mobile application developer for iOS and Android platforms.'
            """)

            for r in mobile_records:
                loser_eid = r["eid"]
                # Move all REQUIRES edges: (loser)-[:REQUIRES]->(c) → (mobile)-[:REQUIRES]->(c)
                session.run("""
                    MATCH (loser:Job) WHERE elementId(loser) = $loser_eid
                    MATCH (mobile:Job {display_name: 'Mobile Engineer'})
                    MATCH (loser)-[old_r:REQUIRES]->(c:Concept)
                    MERGE (mobile)-[new_r:REQUIRES]->(c)
                    ON CREATE SET new_r.weight = old_r.weight,
                                  new_r.source = old_r.source,
                                  new_r.is_core = old_r.is_core
                    ON MATCH SET new_r.weight = CASE
                        WHEN new_r.weight < old_r.weight THEN old_r.weight
                        ELSE new_r.weight
                    END
                """, loser_eid=loser_eid)
                # Delete the variant node
                session.run("""
                    MATCH (j:Job) WHERE elementId(j) = $loser_eid
                    DETACH DELETE j
                """, loser_eid=loser_eid)
            print(f"  Collapsed Mobile Engineer variants into 'Mobile Engineer'.")

        # ------------------------------------------------------------------
        # Step 5: Add 'domain' property to all canonical Job nodes
        # ------------------------------------------------------------------
        print(f"\n{tag}Step 5: Setting domain property on {len(JOB_DOMAIN_MAP)} Job nodes")
        if not dry_run:
            updated = 0
            for display_name, domain in JOB_DOMAIN_MAP.items():
                result = session.run("""
                    MATCH (j:Job {display_name: $display_name})
                    SET j.domain = $domain
                    RETURN count(j) AS n
                """, display_name=display_name, domain=domain)
                n = result.single()["n"]
                if n > 0:
                    updated += 1
            print(f"  Set domain on {updated} Job nodes.")
        else:
            for display_name, domain in JOB_DOMAIN_MAP.items():
                print(f"  Would set: '{display_name}' -> domain='{domain}'")

        # ------------------------------------------------------------------
        # Step 6: Create (Job)-[:PART_OF]->(Domain) edges
        # ------------------------------------------------------------------
        print(f"\n{tag}Step 6: Creating (Job)-[:PART_OF]->(Domain) edges")
        if not dry_run:
            result = session.run("""
                MATCH (j:Job)
                WHERE j.domain IS NOT NULL
                MATCH (d:Domain {name: j.domain})
                MERGE (j)-[:PART_OF]->(d)
                RETURN count(*) AS n
            """)
            edge_count = result.single()["n"]
            print(f"  Created/merged {edge_count} PART_OF edges.")

        # ------------------------------------------------------------------
        # Step 7: Deduplicate Concept nodes (same name, multiple nodes)
        # ------------------------------------------------------------------
        result = session.run("""
            MATCH (c:Concept)
            WITH c.name AS name, collect(c) AS dupes
            WHERE size(dupes) > 1
            RETURN name, size(dupes) AS count
        """)
        dup_concepts = [(r["name"], r["count"]) for r in result]
        print(f"\n{tag}Step 7: Found {len(dup_concepts)} duplicated Concept names")
        if len(dup_concepts) > 0:
            print(f"  (first 10 shown)")
            for name, count in dup_concepts[:10]:
                print(f"  '{name}' ({count}x)")

        if not dry_run:
            merged = 0
            for name, _ in dup_concepts:
                # Get all nodes with this name, pick the one with most incoming edges as winner
                result = session.run("""
                    MATCH (c:Concept {name: $name})
                    OPTIONAL MATCH ()-[r:REQUIRES]->(c)
                    WITH c, count(r) AS req_count
                    ORDER BY req_count DESC
                    RETURN elementId(c) AS eid, req_count, c.mention_count AS mc
                """, name=name)
                records = list(result)
                winner_eid = records[0]["eid"]
                loser_eids = [r["eid"] for r in records[1:]]

                for loser_eid in loser_eids:
                    # Move REQUIRES edges: for each Job->loser edge, MERGE Job->winner
                    session.run("""
                        MATCH (loser:Concept)  WHERE elementId(loser)  = $loser_eid
                        MATCH (winner:Concept) WHERE elementId(winner) = $winner_eid
                        MATCH (j:Job)-[old_r:REQUIRES]->(loser)
                        MERGE (j)-[new_r:REQUIRES]->(winner)
                        ON CREATE SET new_r.weight         = old_r.weight,
                                      new_r.mentions       = old_r.mentions,
                                      new_r.total_postings = old_r.total_postings,
                                      new_r.source         = old_r.source,
                                      new_r.is_core        = old_r.is_core,
                                      new_r.last_import_batch   = old_r.last_import_batch,
                                      new_r.last_imported_at    = old_r.last_imported_at
                        ON MATCH SET new_r.weight = CASE
                            WHEN new_r.weight < old_r.weight THEN old_r.weight
                            ELSE new_r.weight
                        END
                    """, loser_eid=loser_eid, winner_eid=winner_eid)
                    # Sum mention_count from loser into winner
                    session.run("""
                        MATCH (loser:Concept)  WHERE elementId(loser)  = $loser_eid
                        MATCH (winner:Concept) WHERE elementId(winner) = $winner_eid
                        SET winner.mention_count = coalesce(winner.mention_count, 0)
                                                 + coalesce(loser.mention_count, 0)
                    """, loser_eid=loser_eid, winner_eid=winner_eid)
                    # Delete loser (DETACH removes its now-redundant edges)
                    session.run("""
                        MATCH (c:Concept) WHERE elementId(c) = $loser_eid
                        DETACH DELETE c
                    """, loser_eid=loser_eid)
                merged += 1
            print(f"  Deduplicated {merged} Concept groups.")

        # ------------------------------------------------------------------
        # Final state report
        # ------------------------------------------------------------------
        print(f"\n{'='*50}")
        print("Final graph state:")
        result = session.run("MATCH (j:Job) RETURN count(j) AS n")
        print(f"  Job nodes:      {result.single()['n']}")
        result = session.run("MATCH (d:Domain) RETURN count(d) AS n")
        print(f"  Domain nodes:   {result.single()['n']}")
        result = session.run("MATCH (c:Concept) RETURN count(c) AS n")
        print(f"  Concept nodes:  {result.single()['n']}")
        result = session.run("MATCH ()-[r:PART_OF]->() RETURN count(r) AS n")
        print(f"  PART_OF edges:  {result.single()['n']}")
        result = session.run("MATCH ()-[r:REQUIRES]->() RETURN count(r) AS n")
        print(f"  REQUIRES edges: {result.single()['n']}")
        result = session.run("MATCH (j:Job) WHERE j.domain IS NOT NULL RETURN count(j) AS n")
        print(f"  Jobs with domain: {result.single()['n']}")
        print(f"{'='*50}")


def main():
    parser = argparse.ArgumentParser(description="Clean up Neo4j graph before importing scraped jobs CSV")
    parser.add_argument("--dry-run", action="store_true", help="Preview changes without writing to Neo4j")
    args = parser.parse_args()

    dotenv_path = Path(__file__).parent.parent / ".env"
    load_dotenv(dotenv_path)

    neo4j_uri = os.getenv("NEO4J_URI", "neo4j://localhost:7687")
    neo4j_user = os.getenv("NEO4J_USER", "neo4j")
    neo4j_password = os.getenv("NEO4J_PASSWORD", "password")

    driver = GraphDatabase.driver(neo4j_uri, auth=(neo4j_user, neo4j_password))
    try:
        run_cleanup(driver, dry_run=args.dry_run)
    finally:
        driver.close()

    if args.dry_run:
        print("\n[DRY RUN] No changes were made.")


if __name__ == "__main__":
    main()
