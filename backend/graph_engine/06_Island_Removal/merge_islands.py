import os
import sys
from neo4j import GraphDatabase
from dotenv import load_dotenv

# Load env variables from backend/.env
dotenv_path = os.path.join(os.path.dirname(__file__), '..', '..', '.env')
load_dotenv(dotenv_path)

uri = os.getenv('NEO4J_URI', 'neo4j://localhost:7687')
user = os.getenv('NEO4J_USER', 'neo4j')
password = os.getenv('NEO4J_PASSWORD', 'password')

print(f"Connecting to Neo4j at {uri}...")
driver = GraphDatabase.driver(uri, auth=(user, password))

# Cypher query to safely merge two nodes
# Takes `keep_id` (elementId of canonical node) and `dup_id` (elementId of duplicate node)
MERGE_QUERY = """
MATCH (duplicate:Concept) WHERE elementId(duplicate) = $dup_id
MATCH (keeper:Concept) WHERE elementId(keeper) = $keep_id

// 1. Move incoming PREREQUISITE_FOR edges
WITH duplicate, keeper
OPTIONAL MATCH (src)-[in_e:PREREQUISITE_FOR]->(duplicate)
FOREACH (ignore IN CASE WHEN src IS NOT NULL AND src <> keeper THEN [1] ELSE [] END |
    MERGE (src)-[new_in:PREREQUISITE_FOR]->(keeper)
    SET new_in += properties(in_e)
)

// 2. Move outgoing PREREQUISITE_FOR edges
WITH duplicate, keeper
OPTIONAL MATCH (duplicate)-[out_e:PREREQUISITE_FOR]->(tgt)
FOREACH (ignore IN CASE WHEN tgt IS NOT NULL AND tgt <> keeper THEN [1] ELSE [] END |
    MERGE (keeper)-[new_out:PREREQUISITE_FOR]->(tgt)
    SET new_out += properties(out_e)
)

// 3. Move incoming REQUIRES edges (from Jobs)
WITH duplicate, keeper
OPTIONAL MATCH (job:Job)-[req_e:REQUIRES]->(duplicate)
FOREACH (ignore IN CASE WHEN job IS NOT NULL THEN [1] ELSE [] END |
    MERGE (job)-[new_req:REQUIRES]->(keeper)
    SET new_req += properties(req_e)
)

// 4. Move any other relationships if they exist (just to be safe)
// (Since we know about PREREQUISITE_FOR and REQUIRES, those are explicitly handled above. 
// We will detach delete later which drops remaining abandoned edges, though we shouldn't have any others.)

// 5. Detach and delete the duplicate
WITH duplicate
DETACH DELETE duplicate
"""

def get_islands_count(session):
    query = '''
    MATCH (c:Concept)
    WHERE NOT EXISTS {
        MATCH (c)-[:PREREQUISITE_FOR*0..]->(req:Concept)<-[:REQUIRES]-(:Job)
    }
    RETURN count(c) as count
    '''
    return session.run(query).single()['count']

def merge_nodes(session, keep_id, dup_id):
    session.run(MERGE_QUERY, keep_id=keep_id, dup_id=dup_id)

def merge_custom(session, target_name, dup_name):
    print(f"Custom merging: '{dup_name}' -> '{target_name}'")
    keeper_res = session.run("MATCH (c:Concept {name: $t}) RETURN elementId(c) as id LIMIT 1", t=target_name).single()
    dup_res = session.run("MATCH (c:Concept {name: $d}) RETURN elementId(c) as id LIMIT 1", d=dup_name).single()
    
    if keeper_res and dup_res:
        merge_nodes(session, keeper_res['id'], dup_res['id'])
        print(f"  -> Successfully merged!")
        return True
    else:
        print(f"  -> Failed: Could not find one or both nodes.")
        return False

def run_island_merge():
    with driver.session() as session:
        initial_islands = get_islands_count(session)
        print(f"Initial Island Concepts: {initial_islands}")
        
        # Step 1: Handle specific stragglers manually
        merge_custom(session, "Vim / Nano / Emacs", "Vim / Nano /  Emacs")
        merge_custom(session, "Networking & Protocols", "Network Protocols")
        
        # Step 2: Dynamically merge all case-insensitive duplicates
        print("Finding case-insensitive duplicate groups...")
        query = '''
        MATCH (c:Concept)
        WITH toLower(c.name) as lower_name, collect(c) as nodes
        WHERE size(nodes) > 1
        RETURN lower_name, [n in nodes | {
            id: elementId(n),
            name: n.name, 
            score: COUNT { (n)<-[:REQUIRES]-(:Job) } * 100 + COUNT { (n)-[]-() }
        }] as variants
        '''
        
        groups = session.run(query).data()
        print(f"Found {len(groups)} duplicate groups to merge.")
        
        merged_count = 0
        for group in groups:
            variants = sorted(group['variants'], key=lambda x: x['score'], reverse=True)
            keeper = variants[0]
            
            for dup in variants[1:]:
                # print(f"Merging '{dup['name']}' into '{keeper['name']}'")
                merge_nodes(session, keeper['id'], dup['id'])
                merged_count += 1
                
        print(f"Successfully merged {merged_count} duplicate nodes.")
        
        # Step 3: Break any cycles that were formed by merging previously disconnected branches
        print("Breaking known cycles formed by merging...")
        session.run('''
        MATCH (a:Concept {name: 'UX / UI Design'})-[r:PREREQUISITE_FOR]->(b:Concept {name: 'Principles of UX Design'})
        DELETE r
        ''')
        
        # Final Verification
        final_islands = get_islands_count(session)
        print(f"Final Island Concepts: {final_islands}")
        
        if final_islands == 0:
            print("SUCCESS: All island concepts have been successfully connected to the main graph!")
        else:
            print(f"WARNING: {final_islands} island concepts still remain. Further investigation needed.")

if __name__ == "__main__":
    run_island_merge()
    driver.close()
