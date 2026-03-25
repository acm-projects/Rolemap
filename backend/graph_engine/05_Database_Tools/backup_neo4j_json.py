import json
import os
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from neo4j import GraphDatabase


def custom_serializer(obj):
    if hasattr(obj, "isoformat"):
        return obj.isoformat()
    return str(obj)

def main():
    load_dotenv(Path(__file__).parent.parent.parent / ".env")

    uri = os.getenv("NEO4J_URI", "neo4j://localhost:7687")
    user = os.getenv("NEO4J_USER", "neo4j")
    password = os.getenv("NEO4J_PASSWORD", "password")

    ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    out_dir = Path(__file__).parent.parent.parent / "output" / "backups"
    out_dir.mkdir(parents=True, exist_ok=True)
    out_file = out_dir / f"neo4j_snapshot_{ts}.json"

    driver = GraphDatabase.driver(uri, auth=(user, password))
    try:
        with driver.session() as session:
            nodes_result = session.run(
                """
                MATCH (n)
                RETURN id(n) AS id, labels(n) AS labels, properties(n) AS props
                ORDER BY id
                """
            )
            rels_result = session.run(
                """
                MATCH (a)-[r]->(b)
                RETURN id(r) AS id, id(a) AS start_id, id(b) AS end_id, type(r) AS type, properties(r) AS props
                ORDER BY id
                """
            )

            payload = {
                "meta": {
                    "created_utc": datetime.now(timezone.utc).isoformat(),
                    "uri": uri,
                },
                "nodes": [dict(row) for row in nodes_result],
                "relationships": [dict(row) for row in rels_result],
            }

        with open(out_file, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, default=custom_serializer)

        print(f"Backup written: {out_file}")
        print(f"Nodes: {len(payload['nodes'])}")
        print(f"Relationships: {len(payload['relationships'])}")
    finally:
        driver.close()


if __name__ == "__main__":
    main()
