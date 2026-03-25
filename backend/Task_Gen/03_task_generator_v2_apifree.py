import os
import csv
import json
import asyncio
from typing import List, Dict, Any
from pathlib import Path
from dotenv import load_dotenv
from ddgs import DDGS
from neo4j import GraphDatabase

# Load environment variables
load_dotenv(Path(__file__).parent.parent / ".env")

# Configure Neo4j
NEO4J_URI = os.getenv("NEO4J_URI")
NEO4J_USER = os.getenv("NEO4J_USER")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD")

# --- Helper Functions ---

def load_domains(filename: str) -> List[str]:
    """Loads domains from the CSV files in the data directory."""
    csv_path = Path(__file__).parent / "data" / filename
    domains = []
    try:
        with open(csv_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                domains.append(row['domain'])
    except Exception as e:
        print(f"[ERROR] Loading {filename}: {e}")
    return domains

def perform_ddg_search(query: str, max_results: int = 10) -> List[Dict]:
    """Performs a DuckDuckGo search and returns formatted results."""
    print(f"  Searching: {query[:70]}...")
    results = []
    try:
        ddgs = DDGS()
        for r in ddgs.text(query, max_results=max_results):
            results.append({
                "title": r.get("title", ""),
                "url": r.get("href", ""),
                "snippet": r.get("body", "")[:200]
            })
    except Exception as e:
        print(f"  [ERROR] Search error: {str(e)[:100]}")
    return results

def get_best_domains_no_api(concept: str, task_type: str, domain_list: List[str]) -> List[str]:
    """
    Rule-based domain selection WITHOUT using API.
    Uses keyword matching to pick best domains.
    """
    keyword_map = {
        # Web Development
        'web': ['w3schools.com', 'developer.mozilla.org', 'freecodecamp.org', 'mdn.io'],
        'react': ['react.dev', 'developer.mozilla.org', 'freecodecamp.org'],
        'vue': ['vuejs.org', 'developer.mozilla.org', 'freecodecamp.org'],
        'html': ['w3schools.com', 'developer.mozilla.org', 'mdn.io'],
        'css': ['w3schools.com', 'developer.mozilla.org', 'mdn.io'],
        
        # Python & Data
        'python': ['docs.python.org', 'realpython.com', 'freecodecamp.org'],
        'pandas': ['pandas.pydata.org', 'realpython.com', 'freecodecamp.org'],
        'numpy': ['numpy.org', 'realpython.com', 'freecodecamp.org'],
        'machine learning': ['scikit-learn.org', 'tensorflow.org', 'pytorch.org', 'realpython.com'],
        'neural networks': ['tensorflow.org', 'pytorch.org', 'deeplearning.ai', 'fast.ai'],
        'data science': ['scikit-learn.org', 'tensorflow.org', 'realpython.com', 'deeplearning.ai'],
        
        # DevOps & Infrastructure
        'docker': ['docker.com', 'kubernetes.io', 'freecodecamp.org'],
        'kubernetes': ['kubernetes.io', 'docker.com', 'freecodecamp.org'],
        'container': ['docker.com', 'kubernetes.io', 'freecodecamp.org'],
        'devops': ['kubernetes.io', 'docker.com', 'terraform.io', 'ansible.com'],
        'terraform': ['terraform.io', 'developer.hashicorp.com', 'hashicorp.com', 'freecodecamp.org'],
        'jenkins': ['jenkins.io', 'freecodecamp.org', 'github.com'],
        'ci/cd': ['jenkins.io', 'github.com', 'freecodecamp.org'],
        'ansible': ['ansible.com', 'freecodecamp.org', 'github.com'],
        'vault': ['vaultproject.io', 'developer.hashicorp.com', 'hashicorp.com'],
        
        # Security
        'security': ['portswigger.net', 'tryhackme.com', 'owasp.org'],
        'owasp': ['owasp.org', 'portswigger.net', 'tryhackme.com'],
        'cryptography': ['cryptography.io', 'owasp.org', 'portswigger.net'],
        
        # Databases
        'database': ['postgresql.org', 'mongodb.com', 'redis.io'],
        'postgresql': ['postgresql.org', 'freecodecamp.org', 'realpython.com'],
        'mongodb': ['mongodb.com', 'freecodecamp.org', 'github.com'],
        'sql': ['postgresql.org', 'w3schools.com', 'freecodecamp.org'],
        
        # Backend
        'nodejs': ['nodejs.org', 'freecodecamp.org', 'github.com'],
        'express': ['expressjs.com', 'freecodecamp.org', 'github.com'],
        'fastapi': ['fastapi.tiangolo.com', 'realpython.com', 'github.com'],
        'django': ['djangoproject.com', 'realpython.com', 'freecodecamp.org'],
        'flask': ['flask.palletsprojects.com', 'realpython.com', 'freecodecamp.org'],
    }
    
    concept_lower = concept.lower()
    
    # Try exact keyword matches (prioritize longer matches for specificity)
    matches = []
    for keyword in sorted(keyword_map.keys(), key=len, reverse=True):
        if keyword in concept_lower:
            matches = keyword_map[keyword]
            break
    
    if matches:
        available = [d for d in matches if d in domain_list]
        if available:
            return available[:2]
    
    # Fallback: return first 2 domains from list
    return domain_list[:2] if domain_list else []

# --- Main Pipeline (API-Free) ---

async def gather_links(concept: str, subtopic: str, task_type: str, domains_file: str, wild_west_keywords: str) -> List[Dict]:
    """Executes the Walled Garden and Wild West searches simultaneously (NO API CALLS)."""
    
    # 1. Domain Selection (No API - uses rule-based matching)
    all_trusted_domains = load_domains(domains_file)
    selected_domains = get_best_domains_no_api(concept, task_type, all_trusted_domains)
    
    if not selected_domains:
        print(f"  [WARNING] No suitable domains found for {task_type}")
        selected_domains = all_trusted_domains[:2]
    
    print(f"\n--- Gathering {task_type} Links (NO API CALLS) ---")
    print(f"  Trusted domains: {', '.join(selected_domains[:2])}")
    
    # 2. Walled Garden Query (using domain names as keywords instead of site: operator)
    # DuckDuckGo's site: operator doesn't work reliably, so we use domain names as keywords
    domain_keywords = " OR ".join(selected_domains)
    walled_garden_query = f"{concept} {subtopic} ({domain_keywords})"
    
    # 3. Wild West Query
    wild_west_query = f'"{concept}" "{subtopic}" {wild_west_keywords}'
    
    # Run searches
    walled_garden_results = perform_ddg_search(walled_garden_query, max_results=10)
    wild_west_results = perform_ddg_search(wild_west_query, max_results=10)
    
    # Combine and mark sources
    for r in walled_garden_results: 
        r['source_type'] = 'Walled Garden'
    for r in wild_west_results: 
        r['source_type'] = 'Wild West'
    
    combined = walled_garden_results + wild_west_results
    return combined

def simple_curation(concept: str, subtopic: str, preference: str, task_type: str, search_results: List[Dict], count: int) -> List[Dict]:
    """
    Simple rule-based curation WITHOUT using LLM API.
    Prioritizes Walled Garden sources and filters by quality signals.
    """
    if not search_results:
        print(f"  [WARNING] No search results to curate for {task_type}")
        return []

    # Filter by quality signals
    good_results = []
    for result in search_results:
        url = result.get('url', '').lower()
        title = result.get('title', '').lower()
        snippet = result.get('snippet', '').lower()
        
        # Filter out low-quality sources
        if any(block in url for block in ['medium.com', 'quora.com', 'pinterest.com']):
            continue
        if 'paywall' in snippet or 'login required' in snippet:
            continue
        if len(result.get('title', '')) < 5:
            continue
        
        # Filter out generic landing pages and home pages
        generic_endings = ['/news/', '/docs/', '/blog/', '/learn/', '/tutorials/', '.com/', '.org/', '.dev/']
        if any(url.endswith(ending) for ending in generic_endings):
            continue
        
        # Ensure URL has some specificity (more than 4 path segments)
        url_parts = url.split('/')
        if len(url_parts) <= 4:  # e.g., https://site.com/section/ 
            continue
            
        good_results.append(result)
    
    # Prioritize Walled Garden
    walled = [r for r in good_results if r.get('source_type') == 'Walled Garden']
    wild = [r for r in good_results if r.get('source_type') == 'Wild West']
    
    prioritized = walled + wild
    
    # Return top N results
    curated_tasks = []
    for i, result in enumerate(prioritized[:count]):
        if result.get("url"):
            curated_tasks.append({
                "title": result.get("title", "Resource")[:80],
                "description": f"Learn {subtopic} from this {result.get('source_type', 'source')}: {result.get('snippet', '')[:100]}",
                "url": result.get("url"),
                "type": task_type,
                "curated_by": "rule-based (no hallucination)"
            })
    
    print(f"  [SUCCESS] Curated {len(curated_tasks)} {task_type} tasks (rule-based)")
    return curated_tasks

async def generate_tasks(job: str, concept: str, subtopic: str, preference: str):
    print(f"\n{'='*60}")
    print(f"Generating tasks for: {concept} -> {subtopic}")
    print(f"Profile: {job}, Preference: {preference}")
    print(f"Mode: API-FREE (no Gemini quota used)")
    print(f"{'='*60}\n")
    
    # 1. Gather Learning Links (DuckDuckGo only)
    learning_links = await gather_links(
        concept=concept, 
        subtopic=subtopic, 
        task_type="Learning", 
        domains_file="credible_website_learn.csv", 
        wild_west_keywords="tutorial OR explanation OR guide OR official documentation"
    )
    
    # 2. Gather Coding Links (DuckDuckGo only)
    coding_links = await gather_links(
        concept=concept, 
        subtopic=subtopic, 
        task_type="Coding", 
        domains_file="credible_website_coding.csv", 
        wild_west_keywords="interactive exercise OR coding practice OR GitHub template OR example"
    )
    
    # 3. Simple Rule-Based Curation (NO LLM)
    print("\n--- Rule-Based Curation ---")
    learning_tasks = simple_curation(concept, subtopic, preference, "Learning", learning_links, 3)
    coding_tasks = simple_curation(concept, subtopic, preference, "Coding", coding_links, 2)
    
    final_output = {
        "metadata": {
            "concept": concept,
            "subtopic": subtopic,
            "preference": preference,
            "api_calls_made": 0,
            "mode": "API-FREE"
        },
        "learning_tasks": learning_tasks,
        "coding_tasks": coding_tasks,
        "total_resources_found": len(learning_links) + len(coding_links)
    }
    
    print(f"\n[SUCCESS] Generation Complete!")
    print(f"Total resources found: {final_output['total_resources_found']}")
    print(f"Learning tasks curated: {len(learning_tasks)}")
    print(f"Coding tasks curated: {len(coding_tasks)}")
    print(json.dumps(final_output, indent=2))
    return final_output

if __name__ == "__main__":
    import sys
    
    # Check if arguments provided for dynamic input
    if len(sys.argv) > 1:
        # Dynamic input mode
        job = sys.argv[1] if len(sys.argv) > 1 else "Frontend Engineer"
        concept = sys.argv[2] if len(sys.argv) > 2 else "React"
        subtopic = sys.argv[3] if len(sys.argv) > 3 else "useEffect Cleanup Functions"
        preference = sys.argv[4] if len(sys.argv) > 4 else "Interactive-Heavy"
        
        print(f"\n[INFO] Running with provided arguments:")
        print(f"  Job: {job}")
        print(f"  Concept: {concept}")
        print(f"  Subtopic: {subtopic}")
        print(f"  Preference: {preference}\n")
        
        asyncio.run(generate_tasks(job, concept, subtopic, preference))
    else:
        # Interactive mode
        print("\n=== Task Generator - Interactive Mode (API-FREE) ===\n")
        job = input("Enter job profile (default: Frontend Engineer): ").strip() or "Frontend Engineer"
        concept = input("Enter concept (default: React): ").strip() or "React"
        subtopic = input("Enter subtopic (default: useEffect Cleanup Functions): ").strip() or "useEffect Cleanup Functions"
        preference = input("Enter learning preference (default: Interactive-Heavy): ").strip() or "Interactive-Heavy"
        
        asyncio.run(generate_tasks(job, concept, subtopic, preference))
