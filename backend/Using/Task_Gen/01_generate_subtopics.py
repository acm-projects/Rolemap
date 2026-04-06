import os
import csv
import json
import time
from pathlib import Path
from dotenv import load_dotenv
from neo4j import GraphDatabase
from google import genai
from pydantic import BaseModel

# Load environment variables
load_dotenv(Path(__file__).parent.parent / ".env")

# Configure Neo4j
NEO4J_URI = os.getenv("NEO4J_URI", "neo4j://localhost:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "password")

# Configure Multiple Gemini Keys for Rate Limit Cycling
api_keys = []
for i in range(1, 10):
    key_name = "GEMINI_API_KEY" if i == 1 else f"GEMINI_API_KEY_{i}"
    key = os.getenv(key_name)
    if key:
        api_keys.append(key)

if not api_keys:
    raise ValueError("No GEMINI_API_KEY found in .env")

print(f"Loaded {len(api_keys)} Gemini API keys for rate limit cycling.")
clients = [genai.Client(api_key=key) for key in api_keys]
current_client_idx = 0
MODEL_NAME = 'gemini-2.5-flash'

PROMPT_TEMPLATE = """
You are an expert technical curriculum designer. 
I am going to provide you with a list of technology concepts from a knowledge graph.
For each concept, I need you to generate a comprehensive list of "Subtopics" that a student would need to learn to master that concept.

Rules for Subtopic Generation:
1. Generate between 5 to 10 subtopics per concept. 
2. The subtopics should be ordered logically from beginner to advanced.
3. Keep the subtopic names concise but descriptive (e.g., "React useEffect Cleanup Functions" rather than just "useEffect").
4. Return the output STRICTLY as a JSON object where the keys are the concept names exactly as provided, and the values are arrays of strings (the subtopics).

Example Output Format:
{
  "React": [
    "JSX Syntax and Rules",
    "Functional Components and Props",
    "State Management with useState",
    "Handling Side Effects with useEffect",
    "React Context API",
    "Custom Hooks"
  ]
}

Here are the concepts to process:
"""

def get_all_concepts():
    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
    with driver.session() as session:
        result = session.run("MATCH (c:Concept) RETURN c.name as name")
        concepts = [record["name"] for record in result]
    driver.close()
    return concepts

def process_batch(concepts_batch):
    global current_client_idx
    prompt = PROMPT_TEMPLATE + "\n" + json.dumps(concepts_batch)
    
    while True: # Keep trying until successful or hard error
        client = clients[current_client_idx]
        try:
            response = client.models.generate_content(
                model=MODEL_NAME,
                contents=prompt,
                config=genai.types.GenerateContentConfig(
                    temperature=0.2,
                    response_mime_type="application/json",
                )
            )
            return json.loads(response.text)
        except Exception as e:
            err_msg = str(e)
            
            # Case 1: Rate Limit or Quota Exhausted
            if "429" in err_msg or "RESOURCE_EXHAUSTED" in err_msg or "Quota" in err_msg:
                print(f"    Rate limit hit on Key {current_client_idx + 1}. Rotating to next key...")
                current_client_idx = (current_client_idx + 1) % len(clients)
                if current_client_idx == 0:
                    print("    All keys exhausted. Cooling down for 60 seconds...")
                    time.sleep(60)
                else:
                    time.sleep(2)
            
            # Case 2: Server Overloaded (Google API hiccup)
            elif "503" in err_msg or "UNAVAILABLE" in err_msg or "500" in err_msg:
                print(f"    Google API overloaded (503/500). Waiting 30 seconds before retrying...")
                time.sleep(30)
                
            # Case 3: Other Errors (Parsing, etc.)
            else:
                print(f"    Error processing batch: {e}")
                try:
                    if 'response' in locals() and response.text:
                        text = response.text.replace("```json", "").replace("```", "").strip()
                        return json.loads(text)
                except:
                    pass
                
                print("    Unrecoverable error. Skipping this batch.")
                return {}

def main():
    print("Fetching concepts from Neo4j...")
    all_concepts = get_all_concepts()
    
    BATCH_SIZE = 20
    output_file = Path(__file__).parent / "data" / "subtopics.csv"
    
    processed_concepts = set()
    
    # Setup CSV and check for resume capability
    if output_file.exists():
        with open(output_file, 'r', encoding='utf-8') as f:
            reader = csv.reader(f)
            header = next(reader, None)
            if header and header[0] == 'concept':
                for row in reader:
                    if row:
                        processed_concepts.add(row[0])
        print(f"Resuming progress: Found {len(processed_concepts)} concepts already processed.")
    else:
        # Create the CSV if it doesn't exist
        with open(output_file, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(['concept', 'subtopics'])

    concepts_to_process = [c for c in all_concepts if c not in processed_concepts]
    print(f"Found {len(concepts_to_process)} remaining concepts out of {len(all_concepts)} total.")
    
    if not concepts_to_process:
        print("All concepts processed! Done.")
        return
        
    print(f"Starting generation in batches of {BATCH_SIZE}...")
    
    for i in range(0, len(concepts_to_process), BATCH_SIZE):
        batch = concepts_to_process[i:i+BATCH_SIZE]
        batch_num = i // BATCH_SIZE + 1
        total_batches = (len(concepts_to_process) + BATCH_SIZE - 1) // BATCH_SIZE
        print(f"Processing batch {batch_num}/{total_batches} ({len(batch)} concepts)...")
        
        results = process_batch(batch)
        
        # Append to CSV immediately
        if results:
            with open(output_file, 'a', newline='', encoding='utf-8') as f:
                writer = csv.writer(f)
                for concept, subtopics in results.items():
                    subtopics_str = "|".join(subtopics)
                    writer.writerow([concept, subtopics_str])
        
        # Base rate limiting pause
        time.sleep(5)
        
    print(f"Done! Subtopics saved to {output_file}")

if __name__ == "__main__":
    main()
