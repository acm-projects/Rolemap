import os
import csv
from pathlib import Path
from dotenv import load_dotenv
from neo4j import GraphDatabase

load_dotenv(Path(__file__).parent.parent / ".env")

NEO4J_URI = os.getenv("NEO4J_URI", "neo4j://localhost:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "password")

def import_subtopics():
    csv_file = Path(__file__).parent / "data" / "subtopics.csv"
    
    if not csv_file.exists():
        print(f"Error: {csv_file} does not exist. Run 01_generate_subtopics.py first.")
        return
        
    print(f"Connecting to Neo4j at {NEO4J_URI}...")
    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
    
    update_count = 0
    with driver.session() as session:
        with open(csv_file, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                concept_name = row['concept']
                # Subtopics were saved separated by |
                subtopics_list = [s.strip() for s in row['subtopics'].split('|') if s.strip()]
                
                if not subtopics_list:
                    continue
                    
                # Update the node in Neo4j
                query = """
                MATCH (c:Concept {name: $name})
                SET c.subtopics = $subtopics
                RETURN count(c) as updated
                """
                
                result = session.run(query, name=concept_name, subtopics=subtopics_list)
                if result.single()['updated'] > 0:
                    update_count += 1
                    
    driver.close()
    print(f"Successfully updated {update_count} concepts with subtopics in Neo4j.")

if __name__ == "__main__":
    import_subtopics()
