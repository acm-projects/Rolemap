import os
from neo4j import GraphDatabase
from dotenv import load_dotenv

dotenv_path = os.path.join(os.path.dirname(__file__), '..', '..', '.env')
load_dotenv(dotenv_path)

uri = os.getenv('NEO4J_URI', 'neo4j://localhost:7687')
user = os.getenv('NEO4J_USER', 'neo4j')
password = os.getenv('NEO4J_PASSWORD', 'password')

print(f"Connecting to Neo4j at {uri}...")
driver = GraphDatabase.driver(uri, auth=(user, password))

# Cypher query to safely merge two nodes
MERGE_QUERY = """
MATCH (duplicate:Concept) WHERE elementId(duplicate) = $dup_id
MATCH (keeper:Concept) WHERE elementId(keeper) = $keep_id

// Move incoming PREREQUISITE_FOR edges
WITH duplicate, keeper
OPTIONAL MATCH (src)-[in_e:PREREQUISITE_FOR]->(duplicate)
FOREACH (ignore IN CASE WHEN src IS NOT NULL AND src <> keeper THEN [1] ELSE [] END |
    MERGE (src)-[new_in:PREREQUISITE_FOR]->(keeper)
    SET new_in += properties(in_e)
)

// Move outgoing PREREQUISITE_FOR edges
WITH duplicate, keeper
OPTIONAL MATCH (duplicate)-[out_e:PREREQUISITE_FOR]->(tgt)
FOREACH (ignore IN CASE WHEN tgt IS NOT NULL AND tgt <> keeper THEN [1] ELSE [] END |
    MERGE (keeper)-[new_out:PREREQUISITE_FOR]->(tgt)
    SET new_out += properties(out_e)
)

// Move incoming REQUIRES edges (from Jobs)
WITH duplicate, keeper
OPTIONAL MATCH (job:Job)-[req_e:REQUIRES]->(duplicate)
FOREACH (ignore IN CASE WHEN job IS NOT NULL THEN [1] ELSE [] END |
    MERGE (job)-[new_req:REQUIRES]->(keeper)
    SET new_req += properties(req_e)
)

// Delete duplicate node
WITH duplicate
DETACH DELETE duplicate
"""

def merge_nodes(session, keep_id, dup_id):
    session.run(MERGE_QUERY, keep_id=keep_id, dup_id=dup_id)

def run_semantic_merge():
    with driver.session() as session:
        # Find fuzzy duplicates based on suffixes
        query = '''
        MATCH (c:Concept)
        WHERE c.name ENDS WITH ' Fundamentals' OR c.name ENDS WITH ' Concepts' OR c.name ENDS WITH ' Basics'
        WITH c, 
             replace(replace(replace(toLower(c.name), ' fundamentals', ''), ' concepts', ''), ' basics', '') as base_name
        MATCH (base:Concept)
        WHERE toLower(base.name) = base_name AND base <> c
        RETURN c.name as dup_name, elementId(c) as dup_id, base.name as base_name, elementId(base) as base_id
        '''
        
        results = session.run(query).data()
        print(f"Found {len(results)} suffix-based duplicate nodes to merge.")
        
        merged_count = 0
        for r in results:
            print(f"Merging '{r['dup_name']}' into '{r['base_name']}'")
            merge_nodes(session, r['base_id'], r['dup_id'])
            merged_count += 1
                
        print(f"Successfully merged {merged_count} semantic duplicate nodes.")

if __name__ == "__main__":
    run_semantic_merge()
    driver.close()
