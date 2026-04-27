"""Export all Neo4j nodes and relationships to a JSON snapshot."""
import sys
import json
import gzip
from datetime import datetime
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')
from database import Neo4jDriver

driver = Neo4jDriver.get_driver()
output_dir = Path(__file__).parent / "output" / "backups"
output_dir.mkdir(parents=True, exist_ok=True)

timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
out_file = output_dir / f"neo4j_backup_{timestamp}.json.gz"

print("Exporting nodes...")
nodes = []
with driver.session() as s:
    result = s.run("MATCH (n) RETURN elementId(n) AS id, labels(n) AS labels, properties(n) AS props")
    for r in result:
        nodes.append({"id": r["id"], "labels": r["labels"], "props": dict(r["props"])})
print(f"  {len(nodes)} nodes")

print("Exporting relationships...")
rels = []
with driver.session() as s:
    result = s.run(
        "MATCH (a)-[r]->(b) "
        "RETURN elementId(r) AS id, type(r) AS type, "
        "elementId(a) AS from_id, elementId(b) AS to_id, properties(r) AS props"
    )
    for r in result:
        rels.append({
            "id": r["id"], "type": r["type"],
            "from": r["from_id"], "to": r["to_id"],
            "props": dict(r["props"])
        })
print(f"  {len(rels)} relationships")

snapshot = {
    "created_at": datetime.now().isoformat(),
    "node_count": len(nodes),
    "rel_count": len(rels),
    "nodes": nodes,
    "relationships": rels,
}

with gzip.open(out_file, "wt", encoding="utf-8") as f:
    json.dump(snapshot, f, ensure_ascii=False, indent=2)

size_kb = out_file.stat().st_size // 1024
print(f"\nSaved: {out_file}")
print(f"Size:  {size_kb} KB")
print(f"Nodes: {len(nodes)}, Rels: {len(rels)}")
