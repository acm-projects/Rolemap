"""
V3: INTELLIGENT HYBRID TASK GENERATOR
====================================

Combines the best of V1 and V2:
- V2's robust dual search (Wild West + Walled Garden)
- V2's anti-hallucination filtering
- V1's intelligent LLM judging for quality ranking
- API key rotation for reliability
"""

import os
import csv
import json
import asyncio
import time
from typing import List, Dict, Any
from pathlib import Path
from dotenv import load_dotenv
from ddgs import DDGS
import google.generativeai as genai

# Load environment variables
load_dotenv(Path(__file__).parent.parent / ".env")

# Configure Gemini with key rotation
GEMINI_API_KEYS = [
    os.getenv("GEMINI_API_KEY"),
    os.getenv("GEMINI_API_KEY_2")
]
CURRENT_KEY_INDEX = 0

def get_gemini_client():
    """Get Gemini client with automatic key rotation."""
    global CURRENT_KEY_INDEX
    
    for attempt in range(len(GEMINI_API_KEYS)):
        try:
            key = GEMINI_API_KEYS[CURRENT_KEY_INDEX]
            if key:
                genai.configure(api_key=key)
                # Use the correct model name (Gemini 2.0 Flash)
                return genai.GenerativeModel('gemini-2.0-flash')
            else:
                CURRENT_KEY_INDEX = (CURRENT_KEY_INDEX + 1) % len(GEMINI_API_KEYS)
        except Exception as e:
            print(f"  [WARNING] API key {CURRENT_KEY_INDEX + 1} failed: {str(e)[:50]}")
            CURRENT_KEY_INDEX = (CURRENT_KEY_INDEX + 1) % len(GEMINI_API_KEYS)
    
    raise Exception("All Gemini API keys exhausted")

# --- Helper Functions (from V2) ---

def load_domains(filename: str) -> List[str]:
    """Loads domains from CSV files in data directory."""
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

def get_best_domains_no_api(concept: str, domain_list: List[str]) -> List[str]:
    """Rule-based domain selection (enhanced from V2)."""
    keyword_map = {
        # Web Development
        'web': ['w3schools.com', 'developer.mozilla.org', 'freecodecamp.org', 'mdn.io'],
        'react': ['react.dev', 'developer.mozilla.org', 'freecodecamp.org'],
        'vue': ['vuejs.org', 'developer.mozilla.org', 'freecodecamp.org'],
        'html': ['w3schools.com', 'developer.mozilla.org', 'mdn.io'],
        'css': ['w3schools.com', 'developer.mozilla.org', 'mdn.io'],
        'javascript': ['developer.mozilla.org', 'javascript.info', 'freecodecamp.org'],
        
        # Python & Data
        'python': ['docs.python.org', 'realpython.com', 'freecodecamp.org'],
        'pandas': ['pandas.pydata.org', 'realpython.com', 'freecodecamp.org'],
        'numpy': ['numpy.org', 'realpython.com', 'freecodecamp.org'],
        'machine learning': ['scikit-learn.org', 'tensorflow.org', 'pytorch.org', 'realpython.com'],
        'neural networks': ['tensorflow.org', 'pytorch.org', 'deeplearning.ai', 'fast.ai'],
        'data science': ['scikit-learn.org', 'tensorflow.org', 'realpython.com', 'deeplearning.ai'],
        
        # DevOps & Infrastructure  
        'docker': ['docs.docker.com', 'docker.com', 'kubernetes.io', 'freecodecamp.org'],
        'kubernetes': ['kubernetes.io', 'docker.com', 'freecodecamp.org'],
        'container': ['docs.docker.com', 'kubernetes.io', 'freecodecamp.org'],
        'devops': ['kubernetes.io', 'docker.com', 'terraform.io', 'ansible.com'],
        'terraform': ['developer.hashicorp.com', 'terraform.io', 'hashicorp.com', 'freecodecamp.org'],
        'jenkins': ['jenkins.io', 'freecodecamp.org', 'github.com'],
        'ci/cd': ['jenkins.io', 'github.com', 'freecodecamp.org'],
        'ansible': ['docs.ansible.com', 'ansible.com', 'freecodecamp.org'],
        'vault': ['developer.hashicorp.com', 'vaultproject.io', 'hashicorp.com'],
        
        # Security
        'security': ['owasp.org', 'portswigger.net', 'tryhackme.com'],
        'owasp': ['owasp.org', 'portswigger.net', 'tryhackme.com'],
        'cryptography': ['cryptography.io', 'owasp.org', 'portswigger.net'],
        
        # Databases
        'database': ['postgresql.org', 'mongodb.com', 'redis.io'],
        'postgresql': ['postgresql.org', 'freecodecamp.org', 'realpython.com'],
        'mongodb': ['docs.mongodb.com', 'mongodb.com', 'freecodecamp.org'],
        'sql': ['postgresql.org', 'w3schools.com', 'freecodecamp.org'],
        
        # Backend
        'nodejs': ['nodejs.org', 'freecodecamp.org', 'github.com'],
        'express': ['expressjs.com', 'freecodecamp.org', 'github.com'],
        'fastapi': ['fastapi.tiangolo.com', 'realpython.com', 'github.com'],
        'django': ['docs.djangoproject.com', 'djangoproject.com', 'realpython.com'],
        'flask': ['flask.palletsprojects.com', 'realpython.com', 'freecodecamp.org'],
    }
    
    concept_lower = concept.lower()
    
    # Try exact keyword matches (prioritize longer matches)
    for keyword in sorted(keyword_map.keys(), key=len, reverse=True):
        if keyword in concept_lower:
            matches = keyword_map[keyword]
            available = [d for d in matches if d in domain_list]
            if available:
                return available[:2]
    
    # Fallback: return first 2 domains
    return domain_list[:2] if domain_list else []

def perform_ddg_search(query: str, max_results: int = 10) -> List[Dict]:
    """Performs DuckDuckGo search (from V2)."""
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
        print(f"  [WARNING] DuckDuckGo search error: {str(e)[:100]}")
    return results

def basic_quality_filter(search_results: List[Dict]) -> List[Dict]:
    """Basic quality filtering (from V2 enhanced) with deduplication."""
    good_results = []
    seen_urls = set()  # Track seen URLs for deduplication
    
    for result in search_results:
        url = result.get('url', '').lower()
        title = result.get('title', '')
        snippet = result.get('snippet', '').lower()
        
        # Deduplicate by URL
        normalized_url = url.rstrip('/')  # Normalize trailing slashes
        if normalized_url in seen_urls:
            continue
        seen_urls.add(normalized_url)
        
        # Filter out low-quality sources
        if any(block in url for block in ['medium.com', 'quora.com', 'pinterest.com']):
            continue
        if 'paywall' in snippet or 'login required' in snippet:
            continue
        if len(title) < 5:
            continue
        
        # Filter out generic landing pages
        generic_endings = ['/news/', '/docs/', '/blog/', '/learn/', '/tutorials/', '.com/', '.org/', '.dev/']
        if any(url.endswith(ending) for ending in generic_endings):
            continue
        
        # Filter out tag/category pages
        generic_patterns = ['/tag/', '/tags/', '/category/', '/categories/', '/topics/', '/search', '/author/', '/authors/', '/user/', '/users/', '/profile/']
        if any(pattern in url for pattern in generic_patterns):
            continue
        
        # Ensure URL specificity  
        url_parts = url.split('/')
        if len(url_parts) <= 4:
            continue
            
        good_results.append(result)
    
    return good_results

# --- V3 NEW: INTELLIGENT LLM JUDGE ---

def intelligent_llm_curation(concept: str, subtopic: str, preference: str, task_type: str, search_results: List[Dict], count: int) -> List[Dict]:
    """
    V3 INNOVATION: Intelligent LLM-based result curation
    Evaluates results by authority, relevance, and quality - not just search source.
    """
    if not search_results:
        return []
    
    try:
        client = get_gemini_client()
        
        # Prepare results for LLM evaluation
        results_text = ""
        for i, result in enumerate(search_results):
            results_text += f"\n{i+1}. Title: {result.get('title', 'No title')}\n"
            results_text += f"   URL: {result.get('url', '')}\n" 
            results_text += f"   Snippet: {result.get('snippet', '')[:150]}...\n"
        
        prompt = f"""You are a technical learning resource curator. Evaluate these search results for learning "{subtopic}" in the context of "{concept}" for a {preference.replace('-', ' ')} learning approach.

SEARCH RESULTS:
{results_text}

TASK: Select the {count} BEST resources for {task_type} tasks. Prioritize:

1. **Authority**: Official documentation > established tech sites > community blogs
2. **Relevance**: Directly covers "{subtopic}" > general "{concept}" content  
3. **Quality**: Specific technical content > generic overviews
4. **Preference match**: {preference} learning style

Return ONLY a JSON list of the selected result numbers (e.g., [1, 3, 5] for results 1, 3, and 5).
Do not include explanations, just the JSON array of numbers."""

        response = client.generate_content(prompt)
        
        # Parse LLM response
        response_text = response.text.strip()
        if response_text.startswith('[') and response_text.endswith(']'):
            selected_indices = json.loads(response_text)
            
            # Convert to 0-based indexing and validate
            curated_results = []
            for idx in selected_indices:
                if 1 <= idx <= len(search_results) and len(curated_results) < count:
                    result = search_results[idx - 1]  # Convert to 0-based
                    curated_results.append({
                        "title": result.get("title", "Resource")[:80],
                        "description": f"Learn {subtopic}: {result.get('snippet', '')[:100]}",
                        "url": result.get("url"),
                        "type": task_type,
                        "curated_by": "LLM-intelligent (anti-hallucination)"
                    })
            
            print(f"  [SUCCESS] LLM curated {len(curated_results)} {task_type} tasks")
            return curated_results
        else:
            raise Exception(f"Invalid LLM response format: {response_text[:100]}")
            
    except Exception as e:
        print(f"  [WARNING] LLM curation failed: {str(e)[:100]}")
        print(f"  [FALLBACK] Using rule-based curation...")
        
        # Fallback to V2 rule-based curation
        return fallback_rule_curation(concept, subtopic, task_type, search_results, count)

def fallback_rule_curation(concept: str, subtopic: str, task_type: str, search_results: List[Dict], count: int) -> List[Dict]:
    """Fallback rule-based curation if LLM fails."""
    # Authority-based ranking (better than V2's search-type ranking)
    official_domains = [
        # Cloud & DevOps
        'docs.docker.com', 'docker.com', 'developer.hashicorp.com', 'hashicorp.com',
        'kubernetes.io', 'terraform.io', 'ansible.com', 'docs.ansible.com',
        'aws.amazon.com', 'docs.aws.amazon.com', 'cloud.google.com', 'learn.microsoft.com',
        
        # Web Development
        'react.dev', 'vuejs.org', 'angular.io', 'developer.mozilla.org', 'nodejs.org',
        
        # Languages & Frameworks
        'docs.python.org', 'go.dev', 'rust-lang.org', 'typescriptlang.org',
        'djangoproject.com', 'flask.palletsprojects.com', 'fastapi.tiangolo.com',
        
        # Databases
        'postgresql.org', 'docs.mongodb.com', 'redis.io', 'mysql.com',
        
        # Educational
        'freecodecamp.org', 'w3schools.com'
    ]
    
    # Rank by authority
    official_results = []
    community_results = []
    
    for result in search_results:
        url = result.get('url', '')
        if any(domain in url for domain in official_domains):
            official_results.append(result)
        else:
            community_results.append(result)
    
    # Combine with authority priority
    prioritized = official_results + community_results
    
    curated_tasks = []
    for result in prioritized[:count]:
        if result.get("url"):
            curated_tasks.append({
                "title": result.get("title", "Resource")[:80],
                "description": f"Learn {subtopic}: {result.get('snippet', '')[:100]}",
                "url": result.get("url"),
                "type": task_type,
                "curated_by": "rule-based authority ranking"
            })
    
    print(f"  [FALLBACK] Rule-based curated {len(curated_tasks)} {task_type} tasks")
    return curated_tasks

# --- V3 MAIN PIPELINE ---

async def gather_links_v3(concept: str, subtopic: str, task_type: str, domains_file: str, wild_west_keywords: str) -> List[Dict]:
    """V3: Enhanced link gathering with better domain selection."""
    
    # 1. Enhanced Domain Selection
    all_trusted_domains = load_domains(domains_file)
    selected_domains = get_best_domains_no_api(concept, all_trusted_domains)
    
    if not selected_domains:
        selected_domains = all_trusted_domains[:2]
    
    print(f"\n--- V3 Gathering {task_type} Links ---")
    print(f"  Concept-matched domains: {', '.join(selected_domains[:2])}")
    
    # 2. Dual Search (same as V2)
    domain_keywords = " OR ".join(selected_domains)
    walled_garden_query = f"{concept} {subtopic} ({domain_keywords})"
    wild_west_query = f'"{concept}" "{subtopic}" {wild_west_keywords}'
    
    walled_garden_results = perform_ddg_search(walled_garden_query, max_results=10)
    wild_west_results = perform_ddg_search(wild_west_query, max_results=10)
    
    # 3. Mark sources and combine
    for r in walled_garden_results: 
        r['source_type'] = 'Walled Garden'
    for r in wild_west_results: 
        r['source_type'] = 'Wild West'
    
    combined = walled_garden_results + wild_west_results
    
    # 4. Basic quality filtering
    filtered = basic_quality_filter(combined)
    
    print(f"  Found: {len(walled_garden_results)} walled + {len(wild_west_results)} wild = {len(filtered)} after filtering")
    
    return filtered

async def generate_tasks_v3(job: str, concept: str, subtopic: str, preference: str):
    """
    V3 MAIN PIPELINE: Intelligent Hybrid Task Generation
    
    Combines:
    - V2's robust dual search + anti-hallucination 
    - V1's intelligent LLM judging (with fallback)
    - Enhanced domain mapping
    - API key rotation for reliability
    """
    
    print(f"\n{'='*60}")
    print(f"V3 INTELLIGENT HYBRID TASK GENERATION")
    print(f"Concept: {concept} -> {subtopic}")
    print(f"Profile: {job}, Preference: {preference}")
    print(f"Mode: LLM-intelligent with rule-based fallback")
    print(f"{'='*60}")
    
    start_time = time.time()
    
    try:
        # 1. Gather Learning Links
        learning_links = await gather_links_v3(
            concept=concept,
            subtopic=subtopic, 
            task_type="Learning",
            domains_file="credible_website_learn.csv",
            wild_west_keywords="tutorial OR explanation OR guide OR documentation"
        )
        
        # 2. Gather Coding Links
        coding_links = await gather_links_v3(
            concept=concept,
            subtopic=subtopic,
            task_type="Coding", 
            domains_file="credible_website_coding.csv",
            wild_west_keywords="interactive exercise OR coding practice OR GitHub template OR example"
        )
        
        # 3. V3 INNOVATION: Intelligent LLM Curation
        print(f"\n--- V3 Intelligent LLM Curation ---")
        
        learning_tasks = intelligent_llm_curation(concept, subtopic, preference, "Learning", learning_links, 3)
        coding_tasks = intelligent_llm_curation(concept, subtopic, preference, "Coding", coding_links, 2)
        
        elapsed_time = time.time() - start_time
        
        final_output = {
            "metadata": {
                "concept": concept,
                "subtopic": subtopic,
                "preference": preference,
                "version": "V3-intelligent-hybrid",
                "processing_time_seconds": round(elapsed_time, 2),
                "llm_enhanced": True
            },
            "learning_tasks": learning_tasks,
            "coding_tasks": coding_tasks,
            "total_resources_found": len(learning_links) + len(coding_links)
        }
        
        print(f"\n[V3 SUCCESS] Generation Complete!")
        print(f"Processing time: {elapsed_time:.2f}s")
        print(f"Total resources found: {final_output['total_resources_found']}")
        print(f"Learning tasks curated: {len(learning_tasks)}")
        print(f"Coding tasks curated: {len(coding_tasks)}")
        print(json.dumps(final_output, indent=2))
        
        return final_output
        
    except Exception as e:
        print(f"\n[V3 ERROR] {str(e)}")
        raise

# --- CLI Interface ---

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        # Dynamic input mode
        job = sys.argv[1] if len(sys.argv) > 1 else "Software Engineer"
        concept = sys.argv[2] if len(sys.argv) > 2 else "Python"
        subtopic = sys.argv[3] if len(sys.argv) > 3 else "List Comprehensions"
        preference = sys.argv[4] if len(sys.argv) > 4 else "Interactive-Heavy"
        
        print(f"\n[V3] Running with provided arguments:")
        print(f"  Job: {job}")
        print(f"  Concept: {concept}")
        print(f"  Subtopic: {subtopic}")
        print(f"  Preference: {preference}\n")
        
        asyncio.run(generate_tasks_v3(job, concept, subtopic, preference))
    else:
        # Interactive mode
        print("\n=== V3 INTELLIGENT HYBRID TASK GENERATOR ===\n")
        job = input("Enter job profile (default: Software Engineer): ").strip() or "Software Engineer"
        concept = input("Enter concept (default: Python): ").strip() or "Python"
        subtopic = input("Enter subtopic (default: List Comprehensions): ").strip() or "List Comprehensions" 
        preference = input("Enter learning preference (default: Interactive-Heavy): ").strip() or "Interactive-Heavy"
        
        asyncio.run(generate_tasks_v3(job, concept, subtopic, preference))