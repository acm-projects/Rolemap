"""
Rolemap Backend API - Phase 4
FastAPI application with 3 core endpoints
Algorithms: BFS (prerequisites), Kahn's (roadmap), Bidirectional BFS (skill gap)
V3 Intelligent Task Generation with LLM curation + fallback
"""

import logging
import asyncio
import csv
import os
import json
from typing import List, Dict, Set, Optional, Tuple
from collections import deque, defaultdict
from pathlib import Path
from ddgs import DDGS
from dotenv import load_dotenv
import google.generativeai as genai

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from neo4j import Session

from database import get_neo4j_session
from models import (
    PrerequisitesPathRequest, PrerequisitesPathResponse, ConceptWithHop,
    RoadmapGenerateRequest, RoadmapGenerateResponse, RoadmapStep,
    SkillGapAnalysisRequest, SkillGapAnalysisResponse,
    TaskGenerationRequest, TaskGenerationResponse, LearningTask,
    ErrorResponse
)

# Load environment variables
load_dotenv(Path(__file__).parent / ".env")

# Configure Gemini with key rotation for V3
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
                return genai.GenerativeModel('gemini-2.0-flash')
            else:
                CURRENT_KEY_INDEX = (CURRENT_KEY_INDEX + 1) % len(GEMINI_API_KEYS)
        except Exception as e:
            logger.warning(f"API key {CURRENT_KEY_INDEX + 1} failed: {str(e)[:50]}")
            CURRENT_KEY_INDEX = (CURRENT_KEY_INDEX + 1) % len(GEMINI_API_KEYS)
    
    return None  # All keys exhausted, will use fallback

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Rolemap Backend API",
    description="Learning path generation using Neo4j prerequisite graph",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

def estimate_learning_time(num_steps: int) -> str:
    """Estimate learning time based on number of steps"""
    weeks = num_steps * 1.5
    if weeks <= 4:
        return f"{int(weeks)}-{int(weeks + 2)} weeks"
    elif weeks <= 12:
        return f"{int(weeks)}-{int(weeks + 4)} weeks"
    else:
        months = weeks / 4
        return f"{int(months)}-{int(months + 1)} months"


def get_concept_details(session: Session, concept_name: str) -> Optional[Dict]:
    """Fetch concept details from Neo4j"""
    query = """
    MATCH (c:Concept {name: $name})
    RETURN c.name as name, c.level as level, c.domain as domain, c.description as description
    """
    result = session.run(query, name=concept_name)
    record = result.single()
    return dict(record) if record else None


# ============================================================================
# ENDPOINT 1: GET /api/v1/paths/prerequisites
# Algorithm: BFS (Breadth-First Search)
# Purpose: Find shortest path between two concepts
# ============================================================================

@app.get(
    "/api/v1/paths/prerequisites",
    response_model=PrerequisitesPathResponse,
    responses={404: {"model": ErrorResponse}, 400: {"model": ErrorResponse}}
)
async def get_prerequisite_path(
    foundation: str,
    advanced: str,
    session: Session = Depends(get_neo4j_session)
) -> PrerequisitesPathResponse:
    """
    Get the prerequisite path between two concepts using BFS.
    
    **Algorithm**: Breadth-First Search (BFS)
    - Finds the shortest path in terms of number of hops
    - Returns the immediate neighborhood/tree structure
    - Used for UI node expansion
    
    **Parameters**:
    - foundation: Starting concept (e.g., "Internet")
    - advanced: Target concept (e.g., "React")
    
    **Returns**: Complete path with all intermediate concepts and metadata
    """
    try:
        # BFS via Neo4j's shortestPath() function
        query = """
        MATCH (foundation:Concept {name: $foundation})
        MATCH (advanced:Concept {name: $advanced})
        MATCH p = shortestPath((foundation)-[:PREREQUISITE_FOR*]->(advanced))
        RETURN 
            [node in nodes(p) | {
                name: node.name,
                level: node.level,
                domain: node.domain,
                description: node.description
            }] as path_nodes
        """
        
        result = session.run(query, foundation=foundation, advanced=advanced)
        record = result.single()
        
        if not record or not record['path_nodes']:
            raise HTTPException(
                status_code=404,
                detail=f"No path found from '{foundation}' to '{advanced}'"
            )
        
        path_nodes = record['path_nodes']
        
        # Build response with hop distances
        path_with_hops = [
            ConceptWithHop(
                name=node['name'],
                level=node['level'],
                domain=node['domain'],
                description=node['description'],
                hop=i
            )
            for i, node in enumerate(path_nodes)
        ]
        
        # Calculate metadata
        total_hops = len(path_nodes) - 1
        domain_transitions = sum(
            1 for i in range(len(path_nodes) - 1)
            if path_nodes[i]['domain'] != path_nodes[i + 1]['domain']
        )
        
        return PrerequisitesPathResponse(
            path=path_with_hops,
            total_hops=total_hops,
            estimated_learning_time=estimate_learning_time(total_hops),
            domain_transitions=domain_transitions,
            path_quality="optimal" if total_hops <= 8 else "long"
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in get_prerequisite_path: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        session.close()


# ============================================================================
# ENDPOINT 2: POST /api/v1/roadmap/generate
# Algorithm: Kahn's Algorithm (Topological Sort)
# Purpose: Generate step-by-step learning roadmap for a job
# ============================================================================

@app.post(
    "/api/v1/roadmap/generate",
    response_model=RoadmapGenerateResponse,
    responses={404: {"model": ErrorResponse}, 400: {"model": ErrorResponse}}
)
async def generate_roadmap(
    request: RoadmapGenerateRequest,
    session: Session = Depends(get_neo4j_session)
) -> RoadmapGenerateResponse:
    """
    Generate a complete learning roadmap using Kahn's Algorithm.
    
    **Algorithm**: Kahn's Topological Sort
    - Takes a sub-graph and flattens it into a strict linear sequence
    - Ensures all prerequisites come before dependents
    - Generates step-by-step syllabus
    
    **Parameters**:
    - target_concept: Target concept/skill to reach (e.g., "React")
    - current_skills: Skills user already has
    - include_optional: Include optional skills in roadmap
    
    **Returns**: Ordered step-by-step learning plan
    """
    try:
        # Verify target concept exists
        verify_query = "MATCH (c:Concept {name: $target_concept}) RETURN c.name"
        if not session.run(verify_query, target_concept=request.target_concept).single():
            raise HTTPException(
                status_code=404,
                detail=f"Concept '{request.target_concept}' not found"
            )
        
        # Fetch all required skills to reach this concept (including the concept itself)
        req_query = """
        MATCH (target:Concept {name: $target_concept})
        OPTIONAL MATCH (prereq:Concept)-[:PREREQUISITE_FOR*1..15]->(target)
        WITH target.name AS target_name, collect(DISTINCT prereq.name) AS prereqs
        RETURN [x IN prereqs WHERE x IS NOT NULL] + [target_name] AS required_skills
        """
        result = session.run(req_query, target_concept=request.target_concept)
        required_skills = set(result.single()['required_skills'])
        
        current_skills = set(request.current_skills)
        missing_skills = required_skills - current_skills
        
        if not missing_skills:
            return RoadmapGenerateResponse(
                target_concept=request.target_concept,
                current_skills=list(current_skills),
                missing_skills=[],
                roadmap=[],
                total_steps=0,
                estimated_total_time="No additional learning needed"
            )
        
        # Fetch prerequisite graph for missing skills using Kahn's Algorithm
        # Build in-degree map and adjacency list
        graph_query = """
        MATCH (c:Concept)
        WHERE c.name IN $missing_skills
        WITH c
        MATCH (c)<-[:PREREQUISITE_FOR*]-(prereq:Concept)
        RETURN DISTINCT prereq.name as concept, prereq.level as level
        """
        
        result = session.run(graph_query, missing_skills=list(missing_skills))
        concepts_to_learn = set(missing_skills)
        in_degree = defaultdict(int)
        adjacency = defaultdict(list)
        
        for record in result:
            concept = record['concept']
            concepts_to_learn.add(concept)
        
        # Build graph edges
        edge_query = """
        MATCH (a:Concept)-[:PREREQUISITE_FOR]->(b:Concept)
        WHERE a.name IN $concepts AND b.name IN $concepts
        RETURN a.name as source, b.name as target
        """
        
        result = session.run(edge_query, concepts=list(concepts_to_learn))
        
        for record in result:
            source = record['source']
            target = record['target']
            adjacency[source].append(target)
            in_degree[target] += 1
        
        # Initialize in_degree for all concepts
        for concept in concepts_to_learn:
            if concept not in in_degree:
                in_degree[concept] = 0
        
        # Kahn's Algorithm: Topological Sort
        queue = deque([concept for concept in concepts_to_learn if in_degree[concept] == 0])
        topological_order = []
        
        while queue:
            current = queue.popleft()
            topological_order.append(current)
            
            for neighbor in adjacency[current]:
                in_degree[neighbor] -= 1
                if in_degree[neighbor] == 0:
                    queue.append(neighbor)
        
        # Check for cycles (shouldn't happen in our graph)
        if len(topological_order) != len(concepts_to_learn):
            raise HTTPException(
                status_code=400,
                detail="Cycle detected in prerequisite graph"
            )
        
        # Build roadmap steps
        roadmap_steps = []
        for order, concept_name in enumerate(topological_order, 1):
            # Get concept details
            detail_query = """
            MATCH (c:Concept {name: $name})
            RETURN c.level as level, c.domain as domain
            """
            
            result = session.run(detail_query, name=concept_name)
            detail_record = result.single()
            
            # Find prerequisites that are already in the roadmap
            prerequisites_met = [
                dep for dep in adjacency.get(concept_name, [])
                if dep in topological_order[:order - 1]
            ]
            
            step = RoadmapStep(
                order=order,
                concept=concept_name,
                prerequisites_met=prerequisites_met,
                estimated_duration="1-2 weeks",
                resources=[]
            )
            roadmap_steps.append(step)
        
        return RoadmapGenerateResponse(
            target_concept=request.target_concept,
            current_skills=list(current_skills),
            missing_skills=list(missing_skills),
            roadmap=roadmap_steps,
            total_steps=len(roadmap_steps),
            estimated_total_time=estimate_learning_time(len(roadmap_steps))
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in generate_roadmap: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        session.close()


# ============================================================================
# ENDPOINT 3: POST /api/v1/concepts/analyze (Skill Gap Analysis)
# Algorithm: Bidirectional BFS
# Purpose: Find shortest path between current skills and target skill
# ============================================================================

@app.post(
    "/api/v1/concepts/analyze",
    response_model=SkillGapAnalysisResponse,
    responses={404: {"model": ErrorResponse}, 400: {"model": ErrorResponse}}
)
async def analyze_skill_gap(
    request: SkillGapAnalysisRequest,
    session: Session = Depends(get_neo4j_session)
) -> SkillGapAnalysisResponse:
    """
    Analyze skill gap using Bidirectional BFS.
    
    **Algorithm**: Bidirectional BFS
    - Searches from both current skills and target skill simultaneously
    - Finds the shortest path between them
    - More efficient than unidirectional BFS for large graphs
    
    **Parameters**:
    - current_skills: User's current skill set
    - target_skill: Desired skill to reach
    
    **Returns**: Ordered list of missing concepts to close the gap
    """
    try:
        current_skill_set = set(request.current_skills)
        target = request.target_skill
        
        # Verify target exists
        verify_query = "MATCH (c:Concept {name: $name}) RETURN c.name"
        result = session.run(verify_query, name=target)
        if not result.single():
            raise HTTPException(
                status_code=404,
                detail=f"Target skill '{target}' not found"
            )
        
        # Bidirectional BFS implementation
        # Forward search: from current skills towards target
        # Backward search: from target towards current skills
        
        forward_queue = deque(current_skill_set)
        forward_visited = set(current_skill_set)
        forward_parent = {skill: None for skill in current_skill_set}
        
        backward_queue = deque([target])
        backward_visited = {target}
        backward_parent = {target: None}
        
        meeting_point = None
        
        # Cypher query to get adjacent concepts
        adjacency_query = """
        MATCH (a:Concept)-[:PREREQUISITE_FOR]->(b:Concept)
        WHERE a.name = $concept
        RETURN b.name as adjacent
        """
        
        reverse_adjacency_query = """
        MATCH (a:Concept)-[:PREREQUISITE_FOR]->(b:Concept)
        WHERE b.name = $concept
        RETURN a.name as adjacent
        """
        
        # Bidirectional BFS search
        while forward_queue or backward_queue:
            # Forward search step
            if forward_queue:
                current = forward_queue.popleft()
                
                result = session.run(adjacency_query, concept=current)
                for record in result:
                    adjacent = record['adjacent']
                    
                    if adjacent in backward_visited:
                        meeting_point = (current, adjacent)
                        break
                    
                    if adjacent not in forward_visited:
                        forward_visited.add(adjacent)
                        forward_parent[adjacent] = current
                        forward_queue.append(adjacent)
                
                if meeting_point:
                    break
            
            # Backward search step
            if backward_queue and not meeting_point:
                current = backward_queue.popleft()
                
                result = session.run(reverse_adjacency_query, concept=current)
                for record in result:
                    adjacent = record['adjacent']
                    
                    if adjacent in forward_visited:
                        meeting_point = (adjacent, current)
                        break
                    
                    if adjacent not in backward_visited:
                        backward_visited.add(adjacent)
                        backward_parent[adjacent] = current
                        backward_queue.append(adjacent)
                
                if meeting_point:
                    break
        
        # Reconstruct path if found
        if not meeting_point:
            raise HTTPException(
                status_code=404,
                detail=f"No path found from current skills to '{target}'"
            )
        
        forward_point, backward_point = meeting_point
        
        # Reconstruct forward path
        forward_path = []
        current = forward_point
        while current is not None:
            forward_path.append(current)
            current = forward_parent.get(current)
        forward_path.reverse()
        
        # Reconstruct backward path
        backward_path = []
        current = backward_parent.get(backward_point)
        while current is not None:
            backward_path.append(current)
            current = backward_parent.get(current)
        
        # Combine paths
        missing_path = forward_path + backward_path
        
        # Remove concepts user already knows
        missing_path = [c for c in missing_path if c not in current_skill_set]
        
        gap_size = len(missing_path)
        
        return SkillGapAnalysisResponse(
            target_skill=target,
            missing_path=missing_path,
            gap_size=gap_size,
            estimated_time=estimate_learning_time(gap_size)
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in analyze_skill_gap: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        session.close()


# ============================================================================
# ENDPOINT 4: POST /api/v1/tasks/generate
# Algorithm: DuckDuckGo Walled Garden + Rule-Based Curation (API-FREE)
# Purpose: Generate learning tasks for a concept/subtopic
# ============================================================================

def load_domains(filename: str) -> List[str]:
    """Loads domains from CSV files in Task_Gen/data directory."""
    csv_path = Path(__file__).parent / "Task_Gen" / "data" / filename
    domains = []
    try:
        with open(csv_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                domains.append(row['domain'])
    except Exception as e:
        logger.warning(f"Loading {filename}: {e}")
    return domains


def get_best_domains_no_api(concept: str, domain_list: List[str]) -> List[str]:
    """Rule-based domain selection (no API calls)."""
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
        'terraform': ['terraform.io', 'freecodecamp.org', 'github.com'],
        'jenkins': ['jenkins.io', 'freecodecamp.org', 'github.com'],
        'ci/cd': ['jenkins.io', 'github.com', 'freecodecamp.org'],
        
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
    """Performs a DuckDuckGo search and returns formatted results."""
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
        logger.warning(f"DuckDuckGo search error: {str(e)[:100]}")
    return results


def basic_quality_filter(search_results: List[Dict]) -> List[Dict]:
    """Basic quality filtering with deduplication (from V3)."""
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
        
        # Filter out tag/category pages (includes /author/ filter)
        generic_patterns = ['/tag/', '/tags/', '/category/', '/categories/', '/topics/', '/search', '/author/', '/authors/', '/user/', '/users/', '/profile/']
        if any(pattern in url for pattern in generic_patterns):
            continue
        
        # Ensure URL specificity  
        url_parts = url.split('/')
        if len(url_parts) <= 4:
            continue
            
        good_results.append(result)
    
    return good_results


def intelligent_llm_curation(concept: str, subtopic: str, preference: str, task_type: str, search_results: List[Dict], count: int) -> List[LearningTask]:
    """
    V3 INNOVATION: Intelligent LLM-based result curation
    Evaluates results by authority, relevance, and quality - not just search source.
    """
    if not search_results:
        return []
    
    try:
        client = get_gemini_client()
        if not client:
            raise Exception("All Gemini API keys exhausted")
        
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
                    curated_results.append(LearningTask(
                        title=result.get("title", "Resource")[:80],
                        description=f"Learn {subtopic}: {result.get('snippet', '')[:100]}",
                        url=result.get("url"),
                        type=task_type,
                        curated_by="LLM-intelligent (anti-hallucination)"
                    ))
            
            logger.info(f"LLM curated {len(curated_results)} {task_type} tasks")
            return curated_results
        else:
            raise Exception(f"Invalid LLM response format: {response_text[:100]}")
            
    except Exception as e:
        logger.warning(f"LLM curation failed: {str(e)[:100]}")
        logger.info("Using rule-based fallback...")
        
        # Fallback to authority-based curation
        return fallback_rule_curation(concept, subtopic, task_type, search_results, count)


def fallback_rule_curation(concept: str, subtopic: str, task_type: str, search_results: List[Dict], count: int) -> List[LearningTask]:
    """Fallback rule-based curation if LLM fails (V3 authority-based ranking)."""
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
            curated_tasks.append(LearningTask(
                title=result.get("title", "Resource")[:80],
                description=f"Learn {subtopic}: {result.get('snippet', '')[:100]}",
                url=result.get("url"),
                type=task_type,
                curated_by="rule-based authority ranking"
            ))
    
    logger.info(f"Rule-based curated {len(curated_tasks)} {task_type} tasks")
    return curated_tasks


@app.post(
    "/api/v1/tasks/generate",
    response_model=TaskGenerationResponse,
    responses={400: {"model": ErrorResponse}}
)
async def generate_tasks(request: TaskGenerationRequest) -> TaskGenerationResponse:
    """
    Generate learning tasks for a concept/subtopic using V3 INTELLIGENT HYBRID pipeline.
    
    **Algorithm**: V3 Intelligent Hybrid Task Generation
    - Stage 1: Enhanced rule-based domain selection
    - Stage 2: Dual search (trusted domains + wild internet) 
    - Stage 3: V3 INNOVATION - LLM intelligent curation with authority-based fallback
    - Anti-hallucination: No fake URLs, enhanced filtering
    
    **Parameters**:
    - job: Job profile (e.g., "Backend Engineer")
    - concept: Concept name (e.g., "Docker")
    - subtopic: Subtopic name (e.g., "Container Networking")
    - preference: Learning preference (default: "Interactive-Heavy")
    
    **Returns**: Curated learning and coding tasks with intelligent ranking
    """
    try:
        logger.info(f"V3 Task generation: {request.concept} -> {request.subtopic}")
        
        # Load domain lists
        learning_domains = load_domains("credible_website_learn.csv")
        coding_domains = load_domains("credible_website_coding.csv")
        
        # 1. Enhanced Domain Selection (V3)
        learning_selected = get_best_domains_no_api(request.concept, learning_domains)
        learning_selected = learning_selected or learning_domains[:2]
        
        coding_selected = get_best_domains_no_api(request.concept, coding_domains)
        coding_selected = coding_selected or coding_domains[:2]
        
        logger.info(f"Selected domains - Learning: {learning_selected[:2]}, Coding: {coding_selected[:2]}")
        
        # 2. Dual Search (Walled Garden + Wild West)
        domain_keywords_learn = " OR ".join(learning_selected)
        walled_garden_learn = f"{request.concept} {request.subtopic} ({domain_keywords_learn})"
        wild_west_learn = f'"{request.concept}" "{request.subtopic}" tutorial OR explanation OR guide OR documentation'
        
        learning_walled = perform_ddg_search(walled_garden_learn, max_results=10)
        learning_wild = perform_ddg_search(wild_west_learn, max_results=10)
        
        for r in learning_walled: r['source_type'] = 'Walled Garden'
        for r in learning_wild: r['source_type'] = 'Wild West'
        learning_combined = learning_walled + learning_wild
        
        domain_keywords_coding = " OR ".join(coding_selected)
        walled_garden_coding = f"{request.concept} {request.subtopic} ({domain_keywords_coding})"
        wild_west_coding = f'"{request.concept}" "{request.subtopic}" interactive exercise OR coding practice OR GitHub template OR example'
        
        coding_walled = perform_ddg_search(walled_garden_coding, max_results=10)
        coding_wild = perform_ddg_search(wild_west_coding, max_results=10)
        
        for r in coding_walled: r['source_type'] = 'Walled Garden'
        for r in coding_wild: r['source_type'] = 'Wild West'
        coding_combined = coding_walled + coding_wild
        
        # 3. Enhanced Quality Filtering (V3 with deduplication)
        learning_filtered = basic_quality_filter(learning_combined)
        coding_filtered = basic_quality_filter(coding_combined)
        
        logger.info(f"After filtering - Learning: {len(learning_filtered)}, Coding: {len(coding_filtered)}")
        
        # 4. V3 INNOVATION: Intelligent LLM Curation with Fallback
        learning_tasks = intelligent_llm_curation(
            request.concept, request.subtopic, request.preference, 
            "Learning", learning_filtered, 3
        )
        coding_tasks = intelligent_llm_curation(
            request.concept, request.subtopic, request.preference,
            "Coding", coding_filtered, 2
        )
        
        # Check if LLM was used
        llm_used = any(task.curated_by.startswith("LLM") for task in learning_tasks + coding_tasks)
        
        return TaskGenerationResponse(
            metadata={
                "concept": request.concept,
                "subtopic": request.subtopic,
                "preference": request.preference,
                "version": "V3-intelligent-hybrid",
                "llm_enhanced": llm_used,
                "mode": "LLM-intelligent with authority fallback"
            },
            learning_tasks=learning_tasks,
            coding_tasks=coding_tasks,
            total_resources_found=len(learning_combined) + len(coding_combined)
        )
    
    except Exception as e:
        logger.error(f"Error in generate_tasks: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# HEALTH CHECK ENDPOINT
# ============================================================================

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok", "service": "rolemap-api"}


@app.get("/")
async def root():
    """Root endpoint with API documentation link"""
    return {
        "service": "Rolemap Backend API",
        "version": "1.0.0",
        "docs": "/docs",
        "endpoints": {
            "prerequisites": "GET /api/v1/paths/prerequisites",
            "roadmap": "POST /api/v1/roadmap/generate",
            "skill_gap": "POST /api/v1/concepts/analyze",
            "tasks": "POST /api/v1/tasks/generate"
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
