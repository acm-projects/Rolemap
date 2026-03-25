import os
import csv
import json
import asyncio
import aiohttp
from typing import List, Dict, Any
from urllib.parse import urlparse
from bs4 import BeautifulSoup
from pathlib import Path
from dotenv import load_dotenv
from google import genai
from duckduckgo_search import DDGS

# Load environment variables
load_dotenv(Path(__file__).parent.parent / ".env")

# Configure Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY not found in .env")

client = genai.Client(api_key=GEMINI_API_KEY)
MODEL_NAME = 'gemini-2.5-flash'

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
        print(f"Error loading {filename}: {e}")
    return domains

def perform_ddg_search(query: str, max_results: int = 10) -> List[Dict]:
    """Performs a DuckDuckGo search and returns formatted results."""
    print(f"  Searching: {query}")
    results = []
    try:
        with DDGS() as ddgs:
            for r in ddgs.text(query, max_results=max_results):
                results.append({
                    "title": r.get("title", ""),
                    "url": r.get("href", ""),
                    "snippet": r.get("body", "")
                })
    except Exception as e:
        print(f"  [ERROR] Search error for '{query}': {e}")
    return results

# --- Stage 1: LLM Pre-Routing (Select Domains) ---

def select_best_domains(concept: str, subtopic: str, domain_list: List[str], task_type: str) -> List[str]:
    """Uses LLM to pick the 2 most relevant domains for the specific topic."""
    prompt = f"""
    You are an expert technical curriculum curator.
    I need to find {task_type} resources for the topic: "{concept} - {subtopic}".
    
    Here is a list of trusted domains:
    {json.dumps(domain_list)}
    
    Which 2 domains from this exact list are the absolute best fit for this specific topic?
    Return ONLY a JSON array of 2 strings representing the domain names.
    Example: ["w3schools.com", "developer.mozilla.org"]
    """
    
    try:
        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=prompt,
            config=genai.types.GenerateContentConfig(
                temperature=0.1,
                response_mime_type="application/json",
            )
        )
        selected = json.loads(response.text)
        return selected[:2] if isinstance(selected, list) else []
    except Exception as e:
        print(f"Domain routing error: {e}")
        return domain_list[:2] # Fallback to first two

# --- Stage 2: The Two-Pronged Search ---

async def gather_links(concept: str, subtopic: str, task_type: str, domains_file: str, wild_west_keywords: str) -> List[Dict]:
    """Executes the Walled Garden and Wild West searches simultaneously."""
    
    # 1. Walled Garden Setup
    all_trusted_domains = load_domains(domains_file)
    selected_domains = select_best_domains(concept, subtopic, all_trusted_domains, task_type)
    
    walled_garden_query = ""
    if selected_domains:
        site_operators = " OR ".join([f"site:{d}" for d in selected_domains])
        walled_garden_query = f"{site_operators} {concept} {subtopic}"
    
    # 2. Wild West Setup
    wild_west_query = f"\"{concept} {subtopic}\" {wild_west_keywords}"
    
    # Run searches sequentially to avoid DDG rate limits (could be async with different IPs)
    print(f"\n--- Gathering {task_type} Links ---")
    walled_garden_results = perform_ddg_search(walled_garden_query, max_results=10) if walled_garden_query else []
    wild_west_results = perform_ddg_search(wild_west_query, max_results=10)
    
    # Combine and mark sources
    for r in walled_garden_results: r['source_type'] = 'Walled Garden'
    for r in wild_west_results: r['source_type'] = 'Wild West'
    
    combined = walled_garden_results + wild_west_results
    return combined

# --- Stage 3: LLM Judge ---

def llm_judge(concept: str, subtopic: str, preference: str, task_type: str, search_results: List[Dict], count: int) -> List[Dict]:
    """Uses LLM to review the search results and generate final Task Cards."""
    if not search_results:
        print(f"  [WARNING] No search results found for {task_type}. Returning empty array.")
        return []

    prompt = f"""
    You are an expert technical curriculum curator.
    You need to create {count} {task_type} Task Cards for a student learning "{concept} - {subtopic}".
    The student's learning preference is: "{preference}".
    
    Review the following raw search results:
    {json.dumps(search_results[:5], indent=2)}
    
    Instructions:
    1. Select the {count} absolute best links from the provided list.
    2. Prioritize 'Walled Garden' sources (highly trusted) if they are relevant.
    3. If 'Walled Garden' links are irrelevant/missing, fallback to 'Wild West' links.
    4. Ignore spam, paywalls (like medium.com unless it's the only option), or irrelevant links.
    5. Write a compelling, actionable 'description' for why the student should use this specific link.
    
    Return EXACTLY this JSON array format:
    [
      {{
        "title": "Clear Title of the Resource",
        "description": "Actionable description of what they will learn/do here...",
        "url": "THE EXACT URL FROM THE SEARCH RESULTS",
        "type": "{task_type}"
      }}
    ]
    """
    
    try:
        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=prompt,
            config=genai.types.GenerateContentConfig(
                temperature=0.3,
                response_mime_type="application/json",
            )
        )
        result = json.loads(response.text)
        print(f"  [SUCCESS] Generated {len(result)} {task_type} tasks")
        return result
    except Exception as e:
        error_str = str(e)
        if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str:
            print(f"  [QUOTA LIMIT] API quota exceeded. Using fallback curation...")
            # Fallback: Use search results directly without LLM judgment
            # This ensures we never hallucinate - we only use what was actually found
            fallback_tasks = []
            for i, result in enumerate(search_results[:count]):
                if result.get("url"):
                    fallback_tasks.append({
                        "title": result.get("title", "Resource")[:80],
                        "description": f"Resource from {result.get('source_type', 'search')}: {result.get('snippet', '')[:150]}",
                        "url": result.get("url"),
                        "type": task_type,
                        "curated_by": "fallback (no hallucination)"
                    })
            print(f"  [FALLBACK] Returning {len(fallback_tasks)} non-hallucinated {task_type} tasks")
            return fallback_tasks
        else:
            print(f"  [ERROR] LLM Judge error: {e}")
            return []

# --- Main Pipeline ---

async def generate_tasks(job: str, concept: str, subtopic: str, preference: str):
    print(f"\n==================================================")
    print(f"Generating tasks for: {concept} -> {subtopic}")
    print(f"Profile: {job}, Preference: {preference}")
    print(f"==================================================\n")
    
    # 1. Gather Links
    learning_links = await gather_links(
        concept=concept, 
        subtopic=subtopic, 
        task_type="Learning", 
        domains_file="credible_website_learn.csv", 
        wild_west_keywords="tutorial OR explanation OR guide OR official documentation"
    )
    
    coding_links = await gather_links(
        concept=concept, 
        subtopic=subtopic, 
        task_type="Coding", 
        domains_file="credible_website_coding.csv", 
        wild_west_keywords="interactive exercise OR coding practice OR GitHub template"
    )
    
    # 2. Judge and Generate Cards
    print("\n--- LLM Judging Results ---")
    
    # We want 3 learning tasks and 2 coding tasks
    learning_tasks = llm_judge(concept, subtopic, preference, "Learning", learning_links, 3)
    coding_tasks = llm_judge(concept, subtopic, preference, "Coding", coding_links, 2)
    
    final_output = {
        "metadata": {
            "concept": concept,
            "subtopic": subtopic,
            "preference": preference
        },
        "learning_tasks": learning_tasks,
        "coding_tasks": coding_tasks
    }
    
    print("\n[SUCCESS] Generation Complete!")
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
        print("\n=== Task Generator - Interactive Mode ===\n")
        job = input("Enter job profile (default: Frontend Engineer): ").strip() or "Frontend Engineer"
        concept = input("Enter concept (default: React): ").strip() or "React"
        subtopic = input("Enter subtopic (default: useEffect Cleanup Functions): ").strip() or "useEffect Cleanup Functions"
        preference = input("Enter learning preference (default: Interactive-Heavy): ").strip() or "Interactive-Heavy"
        
        asyncio.run(generate_tasks(job, concept, subtopic, preference))
