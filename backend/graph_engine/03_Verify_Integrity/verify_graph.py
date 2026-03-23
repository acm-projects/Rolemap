#!/usr/bin/env python3
"""
Graph Verification Script
Consolidated script to run basic validation checks on the Neo4j Knowledge Graph.
Checks for cycles, orphans, and longest paths.
"""

import os
import sys
from dotenv import load_dotenv
from neo4j import GraphDatabase

# Force UTF-8 output on Windows
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

load_dotenv()

NEO4J_URI = os.getenv("NEO4J_URI")
NEO4J_USER = os.getenv("NEO4J_USER")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD")
NEO4J_DATABASE = os.getenv("NEO4J_DATABASE", "neo4j")

def get_neo4j_driver():
    return GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))

def print_header(title):
    print(f"\n{'='*80}\n{title}\n{'='*80}")

def check_cycles(session):
    print_header("1. Checking for Cycles")
    query = """
    MATCH p=(n:Concept)-[:PREREQUISITE_FOR*1..10]->(n)
    RETURN [node in nodes(p) | node.name] AS cycle
    LIMIT 10
    """
    results = session.run(query).data()
    if not results:
        print("[SUCCESS] No PREREQUISITE_FOR cycles found.")
    else:
        print(f"[WARNING] Found {len(results)} cycles!")
        for idx, r in enumerate(results, 1):
            print(f"  {idx}. {' -> '.join(r['cycle'])}")

def check_orphans(session):
    print_header("2. Checking for Orphaned Concepts")
    query = """
    MATCH (n:Concept)
    WHERE NOT (n)-[:PREREQUISITE_FOR]-() AND NOT (n)-[:PART_OF]-() AND NOT (n)<-[:REQUIRES]-()
    RETURN n.name AS name, n.domain AS domain
    LIMIT 20
    """
    results = session.run(query).data()
    if not results:
        print("[SUCCESS] No completely orphaned concepts found.")
    else:
        print(f"[WARNING] Found orphaned concepts (showing up to 20):")
        for r in results:
            print(f"  - {r['name']} ({r['domain']})")

def check_longest_paths(session):
    print_header("3. Longest Learning Paths")
    query = """
    MATCH p = (start:Concept)-[:PREREQUISITE_FOR*1..15]->(end:Concept)
    RETURN [node in nodes(p) | node.name] AS path, length(p) AS depth
    ORDER BY depth DESC
    LIMIT 5
    """
    results = session.run(query).data()
    if not results:
        print("[INFO] No paths found.")
    else:
        print(f"[INFO] Top {len(results)} longest chains:")
        for r in results:
            print(f"  [{r['depth']} steps] {' -> '.join(r['path'])}")

def main():
    if not NEO4J_URI:
        print("Error: NEO4J_URI environment variable not set.")
        sys.exit(1)
        
    driver = get_neo4j_driver()
    try:
        with driver.session(database=NEO4J_DATABASE) as session:
            check_cycles(session)
            check_orphans(session)
            check_longest_paths(session)
    finally:
        driver.close()

if __name__ == "__main__":
    main()
