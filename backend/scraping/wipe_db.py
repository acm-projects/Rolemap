import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from neo4j import GraphDatabase

def main():
    # Load .env from root
    env_path = Path(__file__).parent.parent / ".env"
    load_dotenv(env_path)

    uri = os.environ.get("NEO4J_URI", "bolt://localhost:7687")
    user = os.environ.get("NEO4J_USER", "neo4j")
    password = os.environ.get("NEO4J_PASSWORD")

    if not password:
        print("ERROR: NEO4J_PASSWORD not found in .env")
        return

    print(f"Connecting to Neo4j at {uri}...")
    driver = GraphDatabase.driver(uri, auth=(user, password))

    try:
        with driver.session() as session:
            print("⚠️  WIPING DATABASE...")
            # Delete everything: nodes and relationships
            result = session.run("MATCH (n) DETACH DELETE n")
            summary = result.consume()
            print(f"✅  Done! Nodes deleted: {summary.counters.nodes_deleted}")
            print(f"✅  Relationships deleted: {summary.counters.relationships_deleted}")

            print("\nNext steps:")
            print("1. Run seeder: python sandbox/seed.py")
            print("2. Run fresh scrape: python scraping/main.py --spider=linkedin --limit=20")

    except Exception as e:
        print(f"ERROR: {e}")
    finally:
        driver.close()

if __name__ == "__main__":
    main()
