import argparse
import json
import os
from pathlib import Path

from dotenv import load_dotenv
from neo4j import GraphDatabase


def _set_clause(var_name, labels):
    if not labels:
        return f"CREATE ({var_name})"
    label_text = ":" + ":".join(labels)
    return f"CREATE ({var_name}{label_text})"


def main():
    parser = argparse.ArgumentParser(description="Restore Neo4j from JSON snapshot")
    parser.add_argument("--snapshot", required=True, help="Path to snapshot JSON")
    parser.add_argument("--yes", action="store_true", help="Skip destructive confirmation prompt")
    args = parser.parse_args()

    snapshot_path = Path(args.snapshot)
    if not snapshot_path.exists():
        raise FileNotFoundError(f"Snapshot not found: {snapshot_path}")

    with open(snapshot_path, "r", encoding="utf-8") as f:
        payload = json.load(f)

    nodes = payload.get("nodes", [])
    rels = payload.get("relationships", [])

    if not args.yes:
        print("This will WIPE the current Neo4j database and restore from snapshot.")
        confirm = input("Type RESTORE to continue: ").strip()
        if confirm != "RESTORE":
            print("Cancelled.")
            return

    load_dotenv(Path(__file__).parent / ".env")
    uri = os.getenv("NEO4J_URI", "neo4j://localhost:7687")
    user = os.getenv("NEO4J_USER", "neo4j")
    password = os.getenv("NEO4J_PASSWORD", "password")

    driver = GraphDatabase.driver(uri, auth=(user, password))

    old_to_new = {}
    try:
        with driver.session() as session:
            # Destructive reset before restore
            session.run("MATCH (n) DETACH DELETE n").consume()

            for node in nodes:
                old_id = node.get("id")
                labels = node.get("labels", [])
                props = dict(node.get("props", {}))

                query = _set_clause("n", labels) + " SET n += $props RETURN id(n) AS new_id"
                rec = session.run(query, props=props).single()
                old_to_new[old_id] = rec["new_id"]

            for rel in rels:
                start_old = rel.get("start_id")
                end_old = rel.get("end_id")
                start_new = old_to_new.get(start_old)
                end_new = old_to_new.get(end_old)
                rel_type = rel.get("type")
                props = dict(rel.get("props", {}))

                if start_new is None or end_new is None or not rel_type:
                    continue

                query = (
                    "MATCH (a), (b) "
                    "WHERE id(a) = $start_id AND id(b) = $end_id "
                    f"CREATE (a)-[r:{rel_type}]->(b) "
                    "SET r += $props"
                )
                session.run(query, start_id=start_new, end_id=end_new, props=props).consume()

            node_count = session.run("MATCH (n) RETURN count(n) AS c").single()["c"]
            rel_count = session.run("MATCH ()-[r]->() RETURN count(r) AS c").single()["c"]

        print(f"Restored snapshot: {snapshot_path}")
        print(f"Nodes: {node_count}")
        print(f"Relationships: {rel_count}")
    finally:
        driver.close()


if __name__ == "__main__":
    main()
