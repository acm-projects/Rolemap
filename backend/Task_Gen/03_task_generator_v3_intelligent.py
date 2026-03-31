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
from urllib.parse import urlparse
from dotenv import load_dotenv
from ddgs import DDGS
from google import genai

# Load environment variables
load_dotenv(Path(__file__).parent.parent / ".env")

# Load all GEMINI_API_KEY, GEMINI_API_KEY_2, GEMINI_API_KEY_3, ... dynamically
def _load_gemini_keys() -> List[str]:
    keys = []
    k = os.getenv("GEMINI_API_KEY")
    if k:
        keys.append(k)
    i = 2
    while True:
        k = os.getenv(f"GEMINI_API_KEY_{i}")
        if not k:
            break
        keys.append(k)
        i += 1
    return keys

GEMINI_API_KEYS = _load_gemini_keys()
CURRENT_KEY_INDEX = 0


def get_gemini_client():
    """Return a Gemini Client using the current key."""
    if not GEMINI_API_KEYS:
        raise Exception("No Gemini API keys configured in .env")
    key = GEMINI_API_KEYS[CURRENT_KEY_INDEX % len(GEMINI_API_KEYS)]
    print(f"  [GEMINI] Key {CURRENT_KEY_INDEX + 1}/{len(GEMINI_API_KEYS)} selected")
    return genai.Client(api_key=key)

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
        'web': ['w3schools.com', 'developer.mozilla.org', 'freecodecamp.org', 'mdn.io', 'css-tricks.com', 'smashingmagazine.com'],
        'react': ['react.dev', 'developer.mozilla.org', 'freecodecamp.org', 'kentcdodds.com', 'javascript.info', 'w3schools.com'],
        'vue': ['vuejs.org', 'developer.mozilla.org', 'freecodecamp.org', 'w3schools.com', 'javascript.info', 'css-tricks.com'],
        'angular': ['angular.io', 'developer.mozilla.org', 'freecodecamp.org', 'w3schools.com', 'javascript.info'],
        'html': ['w3schools.com', 'developer.mozilla.org', 'mdn.io', 'freecodecamp.org', 'css-tricks.com', 'smashingmagazine.com'],
        'css': ['w3schools.com', 'developer.mozilla.org', 'mdn.io', 'css-tricks.com', 'smashingmagazine.com', 'freecodecamp.org'],
        'javascript': ['developer.mozilla.org', 'javascript.info', 'freecodecamp.org', 'w3schools.com', 'kentcdodds.com', 'dev.to'],
        'typescript': ['typescriptlang.org', 'developer.mozilla.org', 'freecodecamp.org', 'javascript.info', 'dev.to'],

        # Python & Data
        'python': ['docs.python.org', 'realpython.com', 'freecodecamp.org', 'python.org', 'dev.to', 'geeksforgeeks.org'],
        'pandas': ['pandas.pydata.org', 'realpython.com', 'freecodecamp.org', 'geeksforgeeks.org', 'towardsdatascience.com', 'kaggle.com'],
        'numpy': ['numpy.org', 'realpython.com', 'freecodecamp.org', 'geeksforgeeks.org', 'towardsdatascience.com'],
        'machine learning': ['scikit-learn.org', 'tensorflow.org', 'pytorch.org', 'realpython.com', 'huggingface.co', 'towardsdatascience.com'],
        'neural network': ['tensorflow.org', 'pytorch.org', 'huggingface.co', 'fast.ai', 'towardsdatascience.com', 'realpython.com'],
        'data science': ['scikit-learn.org', 'tensorflow.org', 'realpython.com', 'towardsdatascience.com', 'kaggle.com', 'huggingface.co'],

        # DevOps & Infrastructure
        'docker': ['docs.docker.com', 'docker.com', 'kubernetes.io', 'freecodecamp.org', 'dev.to', 'geeksforgeeks.org'],
        'kubernetes': ['kubernetes.io', 'docs.docker.com', 'freecodecamp.org', 'dev.to', 'killercoda.com', 'kodekloud.com'],
        'container': ['docs.docker.com', 'kubernetes.io', 'freecodecamp.org', 'dev.to', 'kodekloud.com'],
        'devops': ['kubernetes.io', 'docs.docker.com', 'terraform.io', 'docs.ansible.com', 'freecodecamp.org', 'dev.to'],
        'terraform': ['developer.hashicorp.com', 'terraform.io', 'hashicorp.com', 'freecodecamp.org', 'dev.to', 'kodekloud.com'],
        'jenkins': ['jenkins.io', 'freecodecamp.org', 'github.com', 'dev.to', 'geeksforgeeks.org'],
        'ci/cd': ['jenkins.io', 'github.com', 'freecodecamp.org', 'dev.to', 'docs.docker.com'],
        'ansible': ['docs.ansible.com', 'ansible.com', 'freecodecamp.org', 'dev.to', 'geeksforgeeks.org'],
        'vault': ['developer.hashicorp.com', 'vaultproject.io', 'hashicorp.com', 'freecodecamp.org', 'dev.to'],

        # Cloud
        'aws': ['docs.aws.amazon.com', 'aws.amazon.com', 'freecodecamp.org', 'dev.to', 'acloudguru.com'],
        'azure': ['learn.microsoft.com', 'azure.microsoft.com', 'freecodecamp.org', 'dev.to', 'acloudguru.com'],
        'gcp': ['cloud.google.com', 'freecodecamp.org', 'dev.to', 'acloudguru.com', 'qwiklabs.com'],
        'cloud': ['docs.aws.amazon.com', 'learn.microsoft.com', 'cloud.google.com', 'freecodecamp.org', 'acloudguru.com'],

        # Security
        'security': ['owasp.org', 'portswigger.net', 'tryhackme.com', 'hackthebox.com', 'freecodecamp.org', 'cloudflare.com'],
        'owasp': ['owasp.org', 'portswigger.net', 'tryhackme.com', 'freecodecamp.org', 'geeksforgeeks.org'],
        'cryptography': ['cryptography.io', 'owasp.org', 'portswigger.net', 'freecodecamp.org', 'geeksforgeeks.org'],
        'network': ['cloudflare.com', 'cisco.com', 'freecodecamp.org', 'geeksforgeeks.org', 'developer.mozilla.org'],

        # Databases
        'database': ['postgresql.org', 'docs.mongodb.com', 'redis.io', 'freecodecamp.org', 'geeksforgeeks.org', 'dev.to'],
        'postgresql': ['postgresql.org', 'postgresqltutorial.com', 'freecodecamp.org', 'realpython.com', 'geeksforgeeks.org'],
        'mongodb': ['docs.mongodb.com', 'mongodb.com', 'freecodecamp.org', 'dev.to', 'geeksforgeeks.org'],
        'redis': ['redis.io', 'freecodecamp.org', 'dev.to', 'geeksforgeeks.org', 'realpython.com'],
        'sql': ['postgresql.org', 'w3schools.com', 'freecodecamp.org', 'sqlzoo.net', 'geeksforgeeks.org', 'postgresqltutorial.com'],

        # Backend
        'nodejs': ['nodejs.org', 'freecodecamp.org', 'developer.mozilla.org', 'dev.to', 'geeksforgeeks.org'],
        'express': ['expressjs.com', 'freecodecamp.org', 'developer.mozilla.org', 'dev.to', 'geeksforgeeks.org'],
        'fastapi': ['fastapi.tiangolo.com', 'realpython.com', 'github.com', 'dev.to', 'geeksforgeeks.org'],
        'django': ['docs.djangoproject.com', 'djangoproject.com', 'realpython.com', 'dev.to', 'geeksforgeeks.org'],
        'flask': ['flask.palletsprojects.com', 'realpython.com', 'freecodecamp.org', 'dev.to', 'geeksforgeeks.org'],

        # Architecture & Design
        'architecture': ['martinfowler.com', 'refactoring.guru', 'freecodecamp.org', 'dev.to', 'geeksforgeeks.org'],
        'design pattern': ['refactoring.guru', 'martinfowler.com', 'freecodecamp.org', 'dev.to', 'geeksforgeeks.org'],

        # Project Management
        'agile': ['atlassian.com', 'scrum.org', 'pmi.org', 'freecodecamp.org', 'dev.to'],
        'scrum': ['scrum.org', 'atlassian.com', 'pmi.org', 'freecodecamp.org', 'dev.to'],
    }

    concept_lower = concept.lower()

    # Try exact keyword matches (prioritize longer matches)
    for keyword in sorted(keyword_map.keys(), key=len, reverse=True):
        if keyword in concept_lower:
            matches = keyword_map[keyword]
            available = [d for d in matches if d in domain_list]
            if available:
                return available[:5]

    # Fallback: return first 5 domains
    return domain_list[:5] if domain_list else []

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

def filter_similar_links(results: List[Dict]) -> List[Dict]:
    """
    Remove URLs that are sub-paths of other URLs on the same domain.

    Example: if both /engine/network/ and /engine/network/drivers/bridge/
    are present, keep only the more specific (longer path) one.
    """
    if not results:
        return []

    parsed = []
    for r in results:
        url = r.get('url', '')
        try:
            p = urlparse(url.lower().rstrip('/'))
            parts = [x for x in p.path.split('/') if x]
            parsed.append((r, p.netloc, parts))
        except Exception:
            parsed.append((r, '', []))

    keep = [True] * len(parsed)

    for i in range(len(parsed)):
        if not keep[i]:
            continue
        ri, domain_i, parts_i = parsed[i]
        for j in range(len(parsed)):
            if i == j or not keep[j]:
                continue
            rj, domain_j, parts_j = parsed[j]
            if domain_i != domain_j or not domain_i:
                continue
            # Check if parts_i is a strict prefix of parts_j (same section of docs)
            if len(parts_i) < len(parts_j) and parts_j[:len(parts_i)] == parts_i:
                # i is the parent; discard i, keep the more specific j
                keep[i] = False
                break

    filtered = [r for r, flag in zip(results, keep) if flag]
    removed = len(results) - len(filtered)
    if removed:
        print(f"  [SIMILARITY] Removed {removed} near-duplicate URL(s)")
    return filtered


def prioritize_by_credible_domains(results: List[Dict], credible_domains: List[str]) -> List[Dict]:
    """
    Boost results whose domain appears in the credible CSV list to the front.
    If there are ≥5 credible results, return only those (skip the rest).
    """
    credible, other = [], []
    for r in results:
        url = r.get('url', '').lower()
        if any(domain in url for domain in credible_domains):
            credible.append(r)
        else:
            other.append(r)

    if len(credible) >= 5:
        print(f"  [CREDIBLE] {len(credible)} credible-domain results — skipping non-credible sources")
        return credible
    return credible + other


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

        response = client.models.generate_content(model="gemini-2.5-flash", contents=prompt)
        
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

async def gather_links_v3(concept: str, subtopic: str, task_type: str, domains_file: str, wild_west_keywords: str):
    """V3: Enhanced link gathering with better domain selection.

    Returns (filtered_results, all_trusted_domains) so the caller can
    run domain prioritization before LLM curation.
    """

    # 1. Enhanced Domain Selection
    all_trusted_domains = load_domains(domains_file)
    selected_domains = get_best_domains_no_api(concept, all_trusted_domains)

    if not selected_domains:
        selected_domains = all_trusted_domains[:5]

    print(f"\n--- V3 Gathering {task_type} Links ---")
    print(f"  Concept-matched domains: {', '.join(selected_domains)}")

    # 2. Dual Search
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

    # 4. Link similarity filtering (remove near-duplicate URLs before quality filter)
    deduplicated = filter_similar_links(combined)

    # 5. Basic quality filtering
    filtered = basic_quality_filter(deduplicated)

    print(f"  Found: {len(walled_garden_results)} walled + {len(wild_west_results)} wild"
          f" → {len(deduplicated)} after similarity check → {len(filtered)} after quality filter")

    return filtered, all_trusted_domains

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
        learning_links, learn_credible_domains = await gather_links_v3(
            concept=concept,
            subtopic=subtopic,
            task_type="Learning",
            domains_file="credible_website_learn.csv",
            wild_west_keywords="tutorial OR explanation OR guide OR documentation"
        )

        # 2. Gather Coding Links
        coding_links, coding_credible_domains = await gather_links_v3(
            concept=concept,
            subtopic=subtopic,
            task_type="Coding",
            domains_file="credible_website_coding.csv",
            wild_west_keywords="interactive exercise OR coding practice OR GitHub template OR example"
        )

        # 3. Prioritize results from credible domain lists (before LLM curation)
        print(f"\n--- V3 Domain Prioritization ---")
        learning_links = prioritize_by_credible_domains(learning_links, learn_credible_domains)
        coding_links = prioritize_by_credible_domains(coding_links, coding_credible_domains)

        # 4. V3 INNOVATION: Intelligent LLM Curation
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