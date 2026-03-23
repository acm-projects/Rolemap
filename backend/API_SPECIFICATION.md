# ROLEMAP BACKEND API SPECIFICATION
## Core Python/FastAPI Endpoints for Graph Traversal & Path Generation

---

## Executive Summary

The Backend API will expose 3 core endpoints that extract learning paths from the Neo4j prerequisite graph using topological sorting (Kahn's algorithm) and path-finding algorithms. These endpoints will serve the frontend UI for career planning, skill gap analysis, and curriculum generation.

**Architecture**:
- **Framework**: FastAPI (Python 3.9+)
- **Database**: Neo4j driver (already integrated)
- **Algorithms**: Kahn's topological sort, BFS/DFS path finding, skill matching
- **Caching**: Redis (optional, for frequently requested paths)

---

## Core Endpoint 1: `/api/v1/paths/prerequisites`

### Purpose
Extract the complete prerequisite chain from a foundation concept to an advanced concept.

### Request
```json
{
  "foundation": "Internet",
  "advanced": "React",
  "include_intermediate": true
}
```

### Response
```json
{
  "path": [
    {
      "concept": "Internet",
      "level": 1,
      "domain": "frontend",
      "description": "Understanding how the internet works",
      "hop": 0
    },
    {
      "concept": "HTML Fundamentals",
      "level": 1,
      "domain": "frontend",
      "description": "Markup language for web pages",
      "hop": 1
    },
    {
      "concept": "CSS Fundamentals",
      "level": 1,
      "domain": "frontend",
      "description": "Styling and layout",
      "hop": 2
    },
    {
      "concept": "JavaScript Fundamentals",
      "level": 2,
      "domain": "frontend",
      "description": "Programming language for browsers",
      "hop": 3
    },
    {
      "concept": "DOM Manipulation",
      "level": 2,
      "domain": "frontend",
      "description": "Interacting with HTML elements via JS",
      "hop": 4
    },
    {
      "concept": "Advanced JavaScript Concepts",
      "level": 2,
      "domain": "frontend",
      "description": "Closures, async/await, prototypes",
      "hop": 5
    },
    {
      "concept": "Frontend Framework Fundamentals",
      "level": 3,
      "domain": "frontend",
      "description": "Introduction to modern frameworks",
      "hop": 6
    },
    {
      "concept": "React",
      "level": 4,
      "domain": "frontend",
      "description": "JavaScript library for UI",
      "hop": 7
    }
  ],
  "total_hops": 7,
  "estimated_learning_time": "8-12 weeks",
  "domain_transitions": 0,
  "path_quality": "optimal"
}
```

### Implementation Details

**Algorithm**: BFS shortest path (Neo4j built-in path finding)

**Cypher Query**:
```cypher
MATCH (foundation:Concept {name: $foundation_name})
MATCH (advanced:Concept {name: $advanced_name})
MATCH p = shortest_path((foundation)-[:PREREQUISITE_FOR*]->(advanced))
UNWIND nodes(p) as node
RETURN node.name as concept, node.level as level, node.domain as domain
```

**Python Implementation Skeleton**:
```python
@app.get("/api/v1/paths/prerequisites")
async def get_prerequisite_path(foundation: str, advanced: str):
    with driver.session() as session:
        query = """
        MATCH (f:Concept {name: $foundation})
        MATCH (a:Concept {name: $advanced})
        MATCH p = shortest_path((f)-[:PREREQUISITE_FOR*]->(a))
        RETURN [node in nodes(p) | {
            concept: node.name,
            level: node.level,
            domain: node.domain
        }] as path
        """
        result = session.run(query, foundation=foundation, advanced=advanced)
        record = result.single()
        
        if not record:
            raise HTTPException(status_code=404, detail="No path found")
        
        path = record['path']
        return {
            "path": path,
            "total_hops": len(path) - 1,
            "estimated_learning_time": estimate_time(len(path)),
            "path_quality": "optimal"
        }
```

---

## Core Endpoint 2: `/api/v1/roadmap/generate`

### Purpose
Generate a complete learning roadmap from user's current skills to a target job/role, using Kahn's topological sort.

### Request
```json
{
  "user_skills": ["JavaScript", "HTML", "CSS"],
  "target_role": "Frontend Engineer",
  "skill_gaps": true
}
```

### Response
```json
{
  "roadmap": [
    {
      "phase": 1,
      "name": "Frontend Foundations",
      "concepts": ["DOM Manipulation", "Advanced JavaScript Concepts"],
      "duration_weeks": 3,
      "order": "sequential"
    },
    {
      "phase": 2,
      "name": "React Mastery",
      "concepts": ["Frontend Framework Fundamentals", "React", "State Management"],
      "duration_weeks": 4,
      "prerequisites_met": true
    },
    {
      "phase": 3,
      "name": "Advanced React",
      "concepts": ["Performance Optimization", "Testing", "Build Tools"],
      "duration_weeks": 3,
      "prerequisites_met": true
    }
  ],
  "job_requirements": {
    "total_required_concepts": 28,
    "user_has": 3,
    "gaps": 25,
    "estimated_total_time": "10-16 weeks"
  },
  "learning_efficiency": 0.89
}
```

### Implementation Details

**Algorithm**: 
1. Extract job role requirements from graph (find all concepts REQUIRED_FOR target job)
2. Filter out concepts user already knows
3. Build DAG (directed acyclic graph) from remaining concepts
4. Run Kahn's algorithm to get topological order
5. Group concepts into learning phases by level/domain

**Key Cypher Queries**:

```cypher
// Get all concepts required for a job
MATCH (job:Job {name: $job_title})-[:REQUIRES*]->(concepts:Concept)
RETURN COLLECT(concepts.name) as required_concepts

// Get prerequisites for a set of concepts
MATCH (c:Concept)-[:PREREQUISITE_FOR*]->(target:Concept)
WHERE target.name IN $required_concepts
RETURN c.name as prerequisite

// Topological sort (via Python, using graph structure)
// Neo4j returns all edges; Python computes Kahn's algorithm
```

**Python Implementation Skeleton**:
```python
from collections import defaultdict, deque

def kahns_algorithm(graph: dict) -> list:
    """
    Topological sort using Kahn's algorithm.
    graph: {node: [dependencies]}
    returns: [sorted_order]
    """
    in_degree = {node: len(deps) for node, deps in graph.items()}
    queue = deque([node for node in graph if in_degree[node] == 0])
    topological_order = []
    
    while queue:
        node = queue.popleft()
        topological_order.append(node)
        
        # Find all nodes that depend on this node
        for neighbor, deps in graph.items():
            if node in deps:
                in_degree[neighbor] -= 1
                if in_degree[neighbor] == 0:
                    queue.append(neighbor)
    
    if len(topological_order) != len(graph):
        raise ValueError("Cycle detected in graph")
    
    return topological_order

@app.post("/api/v1/roadmap/generate")
async def generate_roadmap(
    user_skills: List[str],
    target_role: str,
    skill_gaps: bool = True
):
    with driver.session() as session:
        # Step 1: Get job requirements
        job_query = """
        MATCH (job:Job {name: $target_role})-[:REQUIRES]->(concept:Concept)
        RETURN COLLECT(concept.name) as required_concepts
        """
        result = session.run(job_query, target_role=target_role)
        job_record = result.single()
        
        if not job_record:
            raise HTTPException(status_code=404, detail="Job not found")
        
        required = set(job_record['required_concepts'])
        user_skills_set = set(user_skills)
        gaps = required - user_skills_set
        
        # Step 2: Build prerequisite graph for gaps
        prereq_query = """
        MATCH (p:Concept)-[:PREREQUISITE_FOR]->(c:Concept)
        WHERE c.name IN $gaps
        RETURN p.name as source, c.name as target
        """
        result = session.run(prereq_query, gaps=list(gaps))
        
        graph = defaultdict(list)
        for record in result:
            graph[record['target']].append(record['source'])
        
        # Step 3: Kahn's algorithm
        topological_order = kahns_algorithm(graph)
        
        # Step 4: Group into phases
        phases = group_concepts_into_phases(topological_order, graph)
        
        return {
            "roadmap": phases,
            "job_requirements": {
                "total_required": len(required),
                "user_has": len(user_skills_set),
                "gaps": len(gaps)
            },
            "estimated_total_time": f"{len(gaps) * 1.5}-{len(gaps) * 2.5} weeks"
        }
```

---

## Core Endpoint 3: `/api/v1/concepts/analyze`

### Purpose
Analyze a skill/concept and return its prerequisites, dependents, and pedagogical position in the graph.

### Request
```json
{
  "concept": "React",
  "depth": 3,
  "include_dependents": true
}
```

### Response
```json
{
  "concept": {
    "name": "React",
    "domain": "frontend",
    "level": 4,
    "description": "A JavaScript library for building user interfaces"
  },
  "prerequisites": {
    "direct": [
      "Frontend Framework Fundamentals"
    ],
    "transitive_depth_3": [
      {
        "concept": "HTML Fundamentals",
        "hops_back": 6,
        "critical_path": true
      },
      {
        "concept": "JavaScript Fundamentals",
        "hops_back": 4,
        "critical_path": true
      }
    ]
  },
  "dependents": [
    {
      "concept": "State Management",
      "hops_forward": 1,
      "job_alignment": ["Frontend Engineer", "Full-Stack Engineer"]
    },
    {
      "concept": "Next.js",
      "hops_forward": 2,
      "job_alignment": ["Full-Stack Engineer"]
    }
  ],
  "pedagogical_analysis": {
    "is_foundational": false,
    "is_critical_hub": true,
    "skill_gap_indicator": 0.82,
    "recommended_for_roles": ["Frontend Engineer", "Full-Stack Engineer", "React Developer"]
  }
}
```

### Implementation Details

**Algorithm**: 
1. BFS backward (find prerequisites at depth N)
2. BFS forward (find dependents at depth N)
3. Identify critical paths (concepts that block multiple learning paths)

**Cypher Queries**:
```cypher
// Get prerequisites at specific depth
MATCH (prereq:Concept)-[:PREREQUISITE_FOR*1..$depth]->(target:Concept {name: $concept})
RETURN prereq.name as prerequisite, length(path) as hops

// Get dependents (concepts that require this one)
MATCH (target:Concept {name: $concept})-[:PREREQUISITE_FOR*1..$depth]->(dependent:Concept)
RETURN dependent.name as dependent, length(path) as hops
```

**Python Implementation Skeleton**:
```python
@app.get("/api/v1/concepts/analyze")
async def analyze_concept(
    concept: str,
    depth: int = 3,
    include_dependents: bool = True
):
    with driver.session() as session:
        # Prerequisites
        prereq_query = f"""
        MATCH (p:Concept)-[:PREREQUISITE_FOR*1..{depth}]->(c:Concept {{name: $concept}})
        RETURN COLLECT(DISTINCT {{
            concept: p.name,
            hops: length(path)
        }}) as prerequisites
        """
        
        # Dependents
        dependent_query = f"""
        MATCH (c:Concept {{name: $concept}})-[:PREREQUISITE_FOR*1..{depth}]->(d:Concept)
        RETURN COLLECT(DISTINCT {{
            concept: d.name,
            hops: length(path)
        }}) as dependents
        """
        
        # Concept info
        concept_query = """
        MATCH (c:Concept {name: $concept})
        RETURN c.name, c.domain, c.level
        """
        
        concept_result = session.run(concept_query, concept=concept)
        concept_record = concept_result.single()
        
        prereq_result = session.run(prereq_query, concept=concept)
        prereq_record = prereq_result.single()
        
        dependent_result = session.run(dependent_query, concept=concept)
        dependent_record = dependent_result.single()
        
        return {
            "concept": {
                "name": concept_record[0],
                "domain": concept_record[1],
                "level": concept_record[2]
            },
            "prerequisites": prereq_record['prerequisites'],
            "dependents": dependent_record['dependents'] if include_dependents else None
        }
```

---

## Supporting Infrastructure

### Data Models (Pydantic)

```python
class Concept(BaseModel):
    name: str
    domain: str
    level: int
    description: Optional[str] = None

class PathNode(BaseModel):
    concept: str
    level: int
    domain: str
    hop: int

class LearningPath(BaseModel):
    path: List[PathNode]
    total_hops: int
    estimated_learning_time: str
    path_quality: str

class RoadmapPhase(BaseModel):
    phase: int
    name: str
    concepts: List[str]
    duration_weeks: int
    prerequisites_met: bool

class Roadmap(BaseModel):
    roadmap: List[RoadmapPhase]
    job_requirements: dict
    estimated_total_time: str
```

### Error Handling

```python
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.detail,
            "status": "error"
        }
    )

# Custom exceptions
class PathNotFoundError(Exception):
    pass

class CycleDetectedError(Exception):
    pass
```

### Caching Strategy

```python
from functools import lru_cache
from redis import Redis

redis_client = Redis(host='localhost', port=6379)

@app.get("/api/v1/paths/prerequisites")
@lru_cache(maxsize=1000)  # Local cache
async def get_prerequisite_path(foundation: str, advanced: str):
    cache_key = f"path:{foundation}:{advanced}"
    cached = redis_client.get(cache_key)
    
    if cached:
        return json.loads(cached)
    
    # ... compute path ...
    redis_client.setex(cache_key, 3600, json.dumps(result))  # Cache for 1 hour
    
    return result
```

---

## API Deployment

### FastAPI Server Setup

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from neo4j import GraphDatabase
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(
    title="Rolemap Learning Path API",
    version="1.0.0",
    description="Graph-based career planning and skill roadmap generation"
)

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://rolemap.ai"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Neo4j connection pool
driver = GraphDatabase.driver(
    os.getenv("NEO4J_URI"),
    auth=(os.getenv("NEO4J_USER"), os.getenv("NEO4J_PASSWORD"))
)

@app.on_event("shutdown")
async def shutdown():
    driver.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

### Run Command

```bash
# Development
uvicorn main:app --reload --port 8000

# Production
gunicorn -w 4 -k uvicorn.workers.UvicornWorker main:app
```

---

## Testing Strategy

### Unit Tests

```python
import pytest
from fastapi.testclient import TestClient

client = TestClient(app)

def test_prerequisite_path_frontend():
    response = client.get(
        "/api/v1/paths/prerequisites",
        params={"foundation": "Internet", "advanced": "React"}
    )
    assert response.status_code == 200
    assert len(response.json()["path"]) > 1
    assert response.json()["path"][0]["concept"] == "Internet"
    assert response.json()["path"][-1]["concept"] == "React"

def test_roadmap_generation():
    response = client.post(
        "/api/v1/roadmap/generate",
        json={
            "user_skills": ["JavaScript", "HTML"],
            "target_role": "Frontend Engineer"
        }
    )
    assert response.status_code == 200
    assert "roadmap" in response.json()
```

---

## Performance Considerations

| Endpoint | Expected Latency | Caching Strategy |
|----------|------------------|------------------|
| `/paths/prerequisites` | 50-200ms | Redis (1 hour TTL) |
| `/roadmap/generate` | 200-500ms | Redis (24 hour TTL) |
| `/concepts/analyze` | 100-300ms | Redis (6 hour TTL) |

---

## Next Steps

1. **Week 1**: Implement endpoints 1-3 with unit tests
2. **Week 2**: Add caching, performance optimization, API documentation
3. **Week 3**: Integrate with frontend UI, user skill extraction
4. **Week 4**: Deploy to production, monitoring & logging

---

## Summary

This API provides the three core capabilities needed to serve dynamic learning paths:
- **Endpoint 1**: Extract sequential prerequisites (BFS shortest path)
- **Endpoint 2**: Generate full roadmaps (Kahn's topological sort)
- **Endpoint 3**: Analyze skill/concept positioning (graph analytics)

All endpoints use Neo4j for graph queries and Python algorithms for sophisticated path planning.
