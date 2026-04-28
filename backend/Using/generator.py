import sys
import json
import os
from pathlib import Path
from dotenv import load_dotenv
from neo4j import GraphDatabase
from collections import deque, defaultdict

# Force UTF-8 output on Windows
sys.stdout = open(sys.stdout.fileno(), mode='w', encoding='utf-8', buffering=1)
sys.stderr = open(sys.stderr.fileno(), mode='w', encoding='utf-8', buffering=1)

# Ensure local imports resolve when run from repo root
sys.path.insert(0, str(Path(__file__).parent.parent))
load_dotenv(Path(__file__).parent.parent / ".env")

def get_db_driver():
    uri = os.environ.get("NEO4J_URI", "bolt://localhost:7687").replace("neo4j+s://", "neo4j+ssc://")
    user = os.environ.get("NEO4J_USER", "neo4j")
    password = os.environ.get("NEO4J_PASSWORD", "")
    return GraphDatabase.driver(uri, auth=(user, password))

def load_user_skills(github_path: str, resume_path: str) -> list[str]:
    """Load and combine skills from both GitHub and Resume JSON files."""
    combined_skills = set()

    if github_path and os.path.exists(github_path):
        with open(github_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            combined_skills.update(data.get("skill_assessment", {}).get("strengths", []))
            
    if resume_path and os.path.exists(resume_path):
        with open(resume_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            combined_skills.update(data.get("skills", []))

    return list(combined_skills)

def match_skills_to_neo4j(driver, raw_skills: list[str]) -> list[dict]:
    """Fuzzy match GitHub/Resume skills to Neo4j Concept or Tool nodes with a fallback."""
    try:
        from knowledge_graph.pipeline.processor import canonical
    except ImportError:
        print("[warn] Could not import processor.canonical, using basic lowercasing.")
        canonical = lambda x: x.strip().lower()
        
    matched_nodes = []
    with driver.session() as session:
        for skill in raw_skills:
            normalized_skill = canonical(skill)
            
            # 1. Try EXACT match on canonical name
            exact_query = """
            MATCH (n)
            WHERE (n:Concept OR n:Tool) AND toLower(n.name) = $normalized
            RETURN labels(n)[0] AS type, n.id AS id, n.name AS name
            """
            result = session.run(exact_query, normalized=normalized_skill).data()
            
            if result:
                matched_nodes.extend(result)
                continue
                
            # 2. FALLBACK 1: Try a CONTAINS match if the skill is at least 3 chars long
            if len(normalized_skill) > 2:
                fallback_query = """
                MATCH (n)
                WHERE (n:Concept OR n:Tool) AND toLower(n.name) CONTAINS $normalized
                RETURN labels(n)[0] AS type, n.id AS id, n.name AS name
                LIMIT 1
                """
                fallback_result = session.run(fallback_query, normalized=normalized_skill).data()
                if fallback_result:
                    print(f"      [info] Fallback matched '{skill}' to '{fallback_result[0]['name']}'")
                    matched_nodes.extend(fallback_result)
                    continue

            # 3. FALLBACK 2: Try Levenshtein Distance (Allowed 1 typo for short words, 2 for long)
            dist = 1 if len(normalized_skill) < 7 else 2
            leven_query = """
            MATCH (n)
            WHERE (n:Concept OR n:Tool) AND apoc.text.distance(toLower(n.name), $normalized) <= $dist
            RETURN labels(n)[0] AS type, n.id AS id, n.name AS name
            ORDER BY apoc.text.distance(toLower(n.name), $normalized) ASC
            LIMIT 1
            """
            try:
                leven_result = session.run(leven_query, normalized=normalized_skill, dist=dist).data()
                if leven_result:
                    print(f"      [info] Levenshtein matched '{skill}' to '{leven_result[0]['name']}'")
                    matched_nodes.extend(leven_result)
                    continue
            except Exception:
                pass # APOC might not be installed

            print(f"[warn] Could not map '{skill}' to any Knowledge Graph node.")
                
    # Deduplicate in case multiple raw skills map to the same id
    unique_nodes = {n['id']: n for n in matched_nodes}.values()
    return list(unique_nodes)

def fetch_job_requirements(driver, job_name: str) -> dict:
    """Fetch the full REQUIREMENT and PREREQUISITE tree for a job."""
    with driver.session() as session:
        # Find the Job ID
        job_res = session.run("MATCH (j:Job) WHERE toLower(j.display_name) CONTAINS toLower($job) RETURN j.id AS id, j.display_name AS name", job=job_name).data()

        if not job_res:
            print(f"[error] Job matching '{job_name}' not found.")
            return {}

        job_id = job_res[0]['id']
        job_display = job_res[0]['name']

        # Get all required concepts and their weights + roadmap.sh position
        req_query = """
        MATCH (j:Job {id: $job_id})-[r:REQUIRES]->(c:Concept)
        RETURN c.id AS id, c.name AS name, r.weight AS weight,
               r.is_core AS is_core,
               c.position_y AS position_y, c.position_x AS position_x
        """
        requirements = session.run(req_query, job_id=job_id).data()

        # Get all PREREQUISITE_FOR relationships flowing INTO any requirement or prerequisite
        # Also fetch position x/y so the sort can use roadmap.sh visual ordering
        edges_query = """
        MATCH (j:Job {id: $job_id})-[:REQUIRES]->(req:Concept)
        MATCH path = (prereq:Concept)-[:PREREQUISITE_FOR*1..5]->(req)
        UNWIND relationships(path) AS rel
        RETURN startNode(rel).id AS from_id, startNode(rel).name AS from_name,
               startNode(rel).position_y AS from_position_y,
               startNode(rel).position_x AS from_position_x,
               endNode(rel).id AS to_id, endNode(rel).name AS to_name,
               endNode(rel).position_y AS to_position_y,
               endNode(rel).position_x AS to_position_x
        """
        prereq_edges = session.run(edges_query, job_id=job_id).data()

    return {
        "job_id": job_id,
        "job_name": job_display,
        "requirements": requirements,
        "prereq_edges": prereq_edges
    }

def topological_sort_path(user_nodes: list[dict], job_graph: dict) -> list[dict]:
    """Calculate the GAP and apply Kahn's Algorithm to sort remaining skills.

    Ordering uses an effective_y score derived from roadmap.sh position data:
      - Main column concepts (|x| <= 250) keep their Y as-is.
      - Sidebar concepts (|x| > 250): certifications, practice platforms, tools —
        penalised by +5000 so they appear after all core learning path items.
      - Concepts with no position data: penalised by +10000 (sort last).

    Within the same effective_y bucket, out_degree breaks ties: concepts that
    unlock many other missing skills are learned first (they're foundational).
    """
    user_ids = {n['id'] for n in user_nodes}

    # 1. Build the graph of the skills the user DOES NOT HAVE
    in_degree = defaultdict(int)
    adj_list = defaultdict(list)
    nodes_info = {}

    def _make_node(nid, name, is_core, weight, position_y, position_x):
        return {
            "id": nid, "name": name,
            "is_core": is_core, "weight": weight,
            "position_y": position_y, "position_x": position_x,
        }

    # Add core requirements to nodes_info
    for req in job_graph.get("requirements", []):
        if req['id'] not in user_ids:
            nodes_info[req['id']] = _make_node(
                req['id'], req['name'], req['is_core'], req['weight'],
                req.get('position_y'), req.get('position_x'),
            )
            if req['id'] not in in_degree:
                in_degree[req['id']] = 0

    # Add prerequisite edges, but ONLY for nodes the user doesn't know yet
    for edge in job_graph.get("prereq_edges", []):
        u, v = edge['from_id'], edge['to_id']

        # If user knows the target they don't need to learn it;
        # if user knows the prerequisite it no longer blocks.
        if v in user_ids:
            continue

        if v not in nodes_info:
            nodes_info[v] = _make_node(
                v, edge['to_name'], False, 0.5,
                edge.get('to_position_y'), edge.get('to_position_x'),
            )

        if u not in user_ids:
            if u not in nodes_info:
                nodes_info[u] = _make_node(
                    u, edge['from_name'], False, 0.5,
                    edge.get('from_position_y'), edge.get('from_position_x'),
                )

            adj_list[u].append(v)
            in_degree[v] += 1
            if u not in in_degree:
                in_degree[u] = 0

    # Compute out-degree: how many missing skills depend on each node.
    # A high out-degree means this node unlocks many others → it's foundational.
    out_degree = defaultdict(int)
    for u, dependents in adj_list.items():
        out_degree[u] = len(dependents)

    # Detect whether this roadmap has a distinct main column vs sidebar.
    # Use the 75th-percentile of |x| as the threshold so only the outermost
    # 25% of positioned concepts are treated as sidebar items.  This handles
    # narrow-trunk roadmaps (cyber-security) and wide-tree roadmaps (frontend
    # + backend) correctly without a hard-coded pixel value.
    _positioned = [
        (info['position_x'], info['position_y'])
        for info in nodes_info.values()
        if info.get('position_x') is not None and info.get('position_y') is not None
    ]
    if _positioned:
        _abs_xs = sorted(abs(x) for x, _ in _positioned)
        _sidebar_threshold = _abs_xs[int(len(_abs_xs) * 0.75)]
        _use_sidebar = True
    else:
        _sidebar_threshold = 250
        _use_sidebar = False

    def _effective_y(info: dict) -> float:
        """Convert raw position into a sortable score (lower = learn earlier).

        The sidebar threshold is the 75th percentile of |x|, so only the
        outermost 25% of concepts (practice platforms, certifications, exotic
        tools) are penalised.

          0 – 5000 : main column concepts, ordered by actual Y.
          5000+    : sidebar items (|x| > p75 threshold).
          10000+   : no position data — fallback ordering.
        """
        pos_y = info.get('position_y')
        pos_x = info.get('position_x')

        if pos_y is None or pos_x is None:
            return 10000.0

        if _use_sidebar and abs(pos_x) > _sidebar_threshold:
            return 5000.0 + pos_y

        return float(pos_y)

    def _sort_key(nid: str) -> tuple:
        info = nodes_info[nid]
        is_core = 1 if info.get('is_core') else 0
        eff_y = _effective_y(info)
        od = out_degree.get(nid, 0)
        weight = info.get('weight') or 0.0
        # Sort descending (reverse=True):
        #   is_core HIGH first, eff_y LOW first (negate), out_degree HIGH first
        return (is_core, -eff_y, od, weight)

    # 2. Kahn's Algorithm for Topological Sorting
    queue = deque([nid for nid, deg in in_degree.items() if deg == 0])

    learning_path = []

    while queue:
        queue = deque(sorted(queue, key=_sort_key, reverse=True))
        current_id = queue.popleft()
        learning_path.append(nodes_info[current_id])

        for dependent in adj_list[current_id]:
            in_degree[dependent] -= 1
            if in_degree[dependent] == 0:
                queue.append(dependent)

    if len(learning_path) != len(nodes_info):
        print("[warn] Topological sort detected a cycle in the prerequisite graph!")

    return learning_path

def main():
    if len(sys.argv) < 3:
        print("Usage: python pathfinder/generator.py <target_job_name> [--github path/to/github.json] [--resume path/to/resume.json] [--out path/to/output.json]")
        sys.exit(1)
        
    target_job = sys.argv[1]
    
    github_file = None
    resume_file = None
    out_file = None
    if "--github" in sys.argv:
        github_file = sys.argv[sys.argv.index("--github") + 1]
    if "--resume" in sys.argv:
        resume_file = sys.argv[sys.argv.index("--resume") + 1]
    if "--out" in sys.argv:
        out_file = sys.argv[sys.argv.index("--out") + 1]
    
    print("[1/4] Loading Unified User Data")
    raw_skills = load_user_skills(github_file, resume_file)
    print(f"      → Detected {len(raw_skills)} unique skills from sources")
    if raw_skills: print(f"      → {', '.join(raw_skills)}")
    
    driver = get_db_driver()
    try:
        print("\n[2/4] Mapping user skills to Neo4j Knowledge Graph")
        user_nodes = match_skills_to_neo4j(driver, raw_skills)
        print(f"      → Successfully mapped {len(user_nodes)} skills to canonical nodes.")
        for n in user_nodes:
            print(f"        - {n['name']} ({n['type']})")
            
        print(f"\n[3/4] Generating requirements graph for '{target_job}'")
        job_graph = fetch_job_requirements(driver, target_job)
        if not job_graph:
            sys.exit(1)
        print(f"      → Target Role: {job_graph['job_name']}")
            
        print("\n[4/4] Calculating Delta & Topological Sort")
        learning_path = topological_sort_path(user_nodes, job_graph)
        
        print("\n=== GENERATED ROADMAP (KAHN'S ORDER) ===")
        print(f"Target: {job_graph['job_name']}")
        print(f"Total Missing Concepts: {len(learning_path)}")
        print("-" * 40)
        
        for i, step in enumerate(learning_path, 1):
            core_str = "[CORE]" if step['is_core'] else "[OPTIONAL/PREREQ]"
            print(f"{i}. {step['name']} {core_str} (Weight: {step['weight']})")

        if out_file:
            out_path = Path(out_file)
            out_path.parent.mkdir(parents=True, exist_ok=True)
            with open(out_path, "w", encoding="utf-8") as f:
                json.dump(learning_path, f, indent=2, ensure_ascii=False)
            print(f"\n[success] Saved JSON roadmap to {out_file}")

    finally:
        driver.close()

if __name__ == "__main__":
    main()
