"""
User state router — serves mock_db.json data for frontend pages.
Registered in main.py with prefix="/api/v1".
"""
from fastapi import APIRouter, HTTPException, UploadFile, File
from pathlib import Path
import asyncio
import json
import logging
import shutil
import sys
from typing import Any

logger = logging.getLogger(__name__)

router = APIRouter()

DB_PATH = Path(__file__).parent.parent / "data" / "mock_db.json"
UPLOAD_DIR = Path(__file__).parent.parent / "data" / "uploads"

# Quiz_Gen import
_quiz_gen_path = str(Path(__file__).parent.parent / "Quiz_Gen")
if _quiz_gen_path not in sys.path:
    sys.path.insert(0, _quiz_gen_path)
from quiz_generator import generate_quiz  # noqa: E402


def _convert_quiz_questions(raw_questions: list) -> list:
    """Convert Quiz_Gen output format to the frontend QuizQuestion format."""
    result = []
    letter_to_idx = {"A": 0, "B": 1, "C": 2, "D": 3}
    for i, q in enumerate(raw_questions):
        qtype = q.get("type", "multiple_choice")
        options = q.get("options", [])
        correct_answer = q.get("correct_answer", "")

        if qtype == "multiple_choice":
            # Strip "A. " / "B. " prefixes from options
            clean_options = [o[3:] if len(o) > 2 and o[1] == "." else o for o in options]
            correct_idx = letter_to_idx.get(correct_answer.strip().upper(), 0)
        elif qtype == "true_false":
            clean_options = options  # ["True", "False"]
            correct_idx = 0 if correct_answer.strip().lower() == "true" else 1
        else:
            # short_answer / code_challenge — skip, frontend can't render them
            continue

        result.append({
            "id": i + 1,
            "question": q["question"],
            "options": clean_options,
            "correct": correct_idx,
            "explanation": q.get("explanation", ""),
        })
    return result

USER_ID = "u-001"


def load_db() -> dict:
    with open(DB_PATH, encoding="utf-8") as f:
        return json.load(f)


def save_db(db: dict) -> None:
    with open(DB_PATH, "w", encoding="utf-8") as f:
        json.dump(db, f, indent=2)


# ---------------------------------------------------------------------------
# GET /api/v1/users/me
# ---------------------------------------------------------------------------
@router.get("/users/me")
async def get_current_user():
    db = load_db()
    return db["users"][0]


# ---------------------------------------------------------------------------
# GET /api/v1/dashboard
# ---------------------------------------------------------------------------
@router.get("/dashboard")
async def get_dashboard():
    db = load_db()
    user = db["users"][0]
    gamification = db["user_gamification"][0]
    roadmaps = db["roadmaps"]
    active_roadmap = next((r for r in roadmaps if r["status"] == "active"), roadmaps[0])

    roadmaps_out = [
        {
            "id": r["id"],
            "title": r["title"],
            "progress_percentage": r["progress_percentage"],
            "status": r["status"],
        }
        for r in roadmaps
    ]

    return {
        "user": {
            "name": user["name"],
            "xp_total": gamification["xp_total"],
            "current_streak": user["current_streak"],
        },
        "active_roadmap": {
            "id": active_roadmap["id"],
            "title": active_roadmap["title"],
            "progress_percentage": active_roadmap["progress_percentage"],
        },
        "roadmaps": roadmaps_out,
        "gamification": {
            "tasks_completed": gamification["tasks_completed"],
            "leaderboard_rank": gamification["leaderboard_rank"],
        },
        "leaderboard": db["leaderboard"],
    }


# ---------------------------------------------------------------------------
# GET /api/v1/roadmaps/{roadmap_id}/map
# ---------------------------------------------------------------------------
@router.get("/roadmaps/{roadmap_id}/map")
async def get_roadmap_map(roadmap_id: str):
    db = load_db()
    checkpoints = [cp for cp in db["roadmap_checkpoints"] if cp["roadmap_id"] == roadmap_id]
    if not checkpoints:
        raise HTTPException(status_code=404, detail="Roadmap not found")
    edges = [e for e in db.get("roadmap_edges", []) if e.get("roadmap_id") == roadmap_id]
    return {"checkpoints": checkpoints, "edges": edges}


# ---------------------------------------------------------------------------
# GET /api/v1/tasks
# ---------------------------------------------------------------------------
@router.get("/tasks")
async def get_tasks():
    db = load_db()
    progress_map = {p["task_id"]: p["status"] for p in db["user_task_progress"]}
    tasks = []
    for t in db["tasks"]:
        if t["user_id"] == USER_ID:
            tasks.append({**t, "status": progress_map.get(t["id"], t.get("status", "not_started"))})

    earned = {
        ua["achievement_id"]: ua["earned_at"]
        for ua in db["user_achievements"]
        if ua["user_id"] == USER_ID
    }
    achievements = [
        {**a, "earned_at": earned[a["id"]]}
        for a in db["achievements"]
        if a["id"] in earned
    ]

    return {"tasks": tasks, "achievements": achievements}


# ---------------------------------------------------------------------------
# PATCH /api/v1/tasks/{task_id}
# ---------------------------------------------------------------------------
@router.patch("/tasks/{task_id}")
async def update_task(task_id: str, body: dict[str, Any]):
    db = load_db()
    for prog in db["user_task_progress"]:
        if prog["task_id"] == task_id and prog["user_id"] == USER_ID:
            prog["status"] = body.get("status", prog["status"])
            save_db(db)
            return prog
    raise HTTPException(status_code=404, detail="Task not found")


# ---------------------------------------------------------------------------
# POST /api/v1/onboarding/complete
# ---------------------------------------------------------------------------
@router.post("/onboarding/complete")
async def complete_onboarding(body: dict[str, Any]):
    db = load_db()
    db["users"][0]["onboarding_completed"] = True
    db["users"][0]["onboarding_step"] = 5
    save_db(db)
    return {"success": True}


# ---------------------------------------------------------------------------
# POST /api/v1/onboarding/generate
# Runs the real pipelines: GitHub analyzer → Resume parser → Roadmap generator
# ---------------------------------------------------------------------------
# Maps frontend role IDs (category names + kebab slugs) → Neo4j Job display_name
_ROLE_MAP: dict[str, str] = {
    # categories
    "software engineer":          "Full-Stack Engineer",
    "cybersecurity specialist":   "Security Engineer",
    "ml/ data scientist":         "Data Scientist",
    "cloud engineer":             "Cloud Infrastructure Engineer",
    "product manager":            "Technical Project Manager",
    "dev ops":                    "Site Reliability Engineer",
    # specialization slugs
    "software-engineer":          "Full-Stack Engineer",
    "frontend-engineer":          "Front-End Engineer",
    "backend-engineer":           "Back-End Engineer",
    "fullstack-engineer":         "Full-Stack Engineer",
    "mobile-engineer":            "Mobile Engineer (Android)",
    "game-developer":             "Game Developer",
    "cybersecurity-analyst":      "Security Analyst",
    "penetration-tester":         "Penetration Tester",
    "security-engineer":          "Security Engineer",
    "cloud-security-engineer":    "Cloud Security Engineer",
    "soc-analyst":                "SOC Analyst",
    "appsec":                     "Application Security Engineer",
    "grc":                        "GRC Analyst",
    "ml-engineer":                "Machine Learning Engineer",
    "data-scientist":             "Data Scientist",
    "ai-engineer":                "AI Engineer",
    "nlp engineer":               "NLP Engineer",
    "computer-vision-engineer":   "Computer Vision Engineer",
    "research-scientist":         "Research Scientist",
    "data-viz":                   "Data Visualization Engineer",
    "bi-diveloper":               "BI Developer",
    "data-viz-engineer":          "Data Visualization Engineer",
}


@router.post("/onboarding/generate")
async def generate_roadmap_api(body: dict[str, Any]):
    raw_role: str = body.get("role", "software engineer")
    role: str = _ROLE_MAP.get(raw_role.lower(), raw_role)
    print(f"[generate] role: '{raw_role}' → '{role}'", flush=True)
    github_username: str = body.get("github_username", "")

    backend_dir = Path(__file__).parent.parent
    output_dir = backend_dir / "output"
    upload_dir = UPLOAD_DIR
    output_dir.mkdir(parents=True, exist_ok=True)

    github_json = output_dir / "github_result.json"
    resume_json = output_dir / "result.json"
    roadmap_json = output_dir / "roadmap.json"

    async def _run(label: str, *args: str) -> int:
        print(f"[generate] Running {label}...", flush=True)
        proc = await asyncio.create_subprocess_exec(
            *args,
            cwd=str(backend_dir),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await proc.communicate()
        rc = proc.returncode or 0
        if stdout:
            for line in stdout.decode(errors="replace").splitlines():
                print(f"  [{label}] {line}", flush=True)
        if stderr:
            for line in stderr.decode(errors="replace").splitlines():
                print(f"  [{label} stderr] {line}", flush=True)
        print(f"[generate] {label} exited with code {rc}", flush=True)
        return rc

    # 1. GitHub analysis
    if github_username:
        await _run(
            "github",
            sys.executable,
            str(backend_dir / "github" / "main.py"),
            "--username", github_username,
            "--out", str(github_json),
            "--no-llm",
        )
    else:
        print("[generate] No github_username provided, skipping GitHub step", flush=True)

    # 2. Resume parsing (most recently uploaded PDF)
    resume_files = sorted(upload_dir.glob("*.pdf"), key=lambda p: p.stat().st_mtime, reverse=True)
    if resume_files:
        print(f"[generate] Using resume: {resume_files[0].name}", flush=True)
        await _run(
            "resume",
            sys.executable,
            str(backend_dir / "resume_parser" / "main.py"),
            "--pdf", str(resume_files[0]),
            "--out", str(resume_json),
        )
    else:
        print("[generate] No resume PDF found, skipping resume step", flush=True)

    # 3. Roadmap generation
    gen_script = backend_dir / "graph_engine" / "04_Generate_Roadmaps" / "generator.py"
    gen_args = [sys.executable, str(gen_script), role]
    if github_json.exists():
        gen_args += ["--github", str(github_json)]
    if resume_json.exists():
        gen_args += ["--resume", str(resume_json)]
    gen_args += ["--out", str(roadmap_json)]
    rc = await _run("generator", *gen_args)
    if rc != 0:
        print(f"[generate] ERROR: generator exited with code {rc}", flush=True)

    # 4. Read generated roadmap steps
    roadmap_steps: list[dict] = []
    if roadmap_json.exists():
        with open(roadmap_json, encoding="utf-8") as f:
            roadmap_steps = json.load(f)
        print(f"[generate] Loaded {len(roadmap_steps)} steps from roadmap.json", flush=True)
    else:
        print("[generate] ERROR: roadmap.json was not created — generator likely failed", flush=True)

    # 5. Convert to checkpoint format and persist in mock_db
    # Lazy import to avoid circular dependency (main.py imports this router)
    try:
        from main import call_gemini as _call_gemini
    except ImportError:
        _call_gemini = None

    roadmap_id = "rm-generated"

    # --- Pass 1: build the skeleton (labels + kinds), no Gemini yet ---
    # Gate intervals vary so each segment has a different number of lessons,
    # producing uneven branches in the tree layout.
    GATE_INTERVALS = [2, 4, 3, 2, 4, 3, 3, 2, 4, 2]  # cycles through segments
    skeleton: list[dict] = []  # {"label": ..., "kind": ...}
    lesson_buffer: list[str] = []
    lesson_count = 0
    quiz_count = 0
    batch_count = 0  # lessons accumulated since last gate

    for step in roadmap_steps[:25]:
        label = step.get("name", f"Step {lesson_count + 1}")
        skeleton.append({"label": label, "kind": "lesson"})
        lesson_buffer.append(label)
        lesson_count += 1
        batch_count += 1

        gate_interval = GATE_INTERVALS[quiz_count % len(GATE_INTERVALS)]
        if batch_count == gate_interval:
            quiz_count += 1
            if quiz_count % 3 == 0:
                gate_kind = "project"
                gate_label = f"{role} Project #{quiz_count // 3}"
            else:
                gate_kind = "quiz"
                gate_label = " + ".join(lesson_buffer[-batch_count:]) + " Quiz"
            skeleton.append({"label": gate_label, "kind": gate_kind})
            lesson_buffer = []
            batch_count = 0

    # --- Pass 2: single Gemini call for all content ---
    print(f"[generate] Generating content for {len(skeleton)} checkpoints via Gemini...", flush=True)
    kind_desc_map = {"lesson": "learning lesson", "quiz": "knowledge-check quiz", "project": "hands-on build project"}
    content_list: list[dict] = []

    if _call_gemini is not None:
        items_json = json.dumps([
            {"index": i, "label": s["label"], "type": kind_desc_map.get(s["kind"], "checkpoint")}
            for i, s in enumerate(skeleton)
        ])
        batch_prompt = (
            f'You are building a learning roadmap for a "{role}" career path.\n'
            f'For each item below, write a checkpoint card.\n'
            f'Return ONLY a JSON array (same length, same order) where each element has exactly:\n'
            f'{{"description": "2-3 sentence description", "learning_goals": ["goal1","goal2","goal3","goal4"]}}\n'
            f'Be concise and practical. No markdown, no extra text, just the JSON array.\n\n'
            f'Items:\n{items_json}'
        )
        try:
            raw = _call_gemini(batch_prompt).strip()
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]
            parsed = json.loads(raw)
            if isinstance(parsed, list) and len(parsed) == len(skeleton):
                content_list = parsed
                print(f"[generate] Gemini batch content OK ({len(content_list)} items)", flush=True)
            else:
                print(f"[generate] Gemini returned unexpected shape, using fallback", flush=True)
        except Exception as e:
            print(f"[generate] Gemini batch failed ({e}), using fallback", flush=True)

    def _fallback(label: str) -> dict:
        return {"description": f"Learn {label}", "learning_goals": [label]}

    # --- Pass 3: assemble final checkpoints ---
    checkpoints = []
    for i, node in enumerate(skeleton):
        content = content_list[i] if i < len(content_list) else _fallback(node["label"])
        x = 300 if i % 2 == 0 else 500
        y = 100 + i * 130
        checkpoints.append({
            "id": f"cp-gen-{i:03d}",
            "roadmap_id": roadmap_id,
            "label": node["label"],
            "kind": node["kind"],
            "progress": 0,
            "locked": i > 0,
            "position": {"x": x, "y": y},
            "description": content.get("description", f"Learn {node['label']}"),
            "learning_goals": content.get("learning_goals", [node["label"]]),
        })

    print(f"[generate] Built {len(checkpoints)} checkpoints ({lesson_count} lessons, {quiz_count} quizzes/projects)", flush=True)

    def build_branching_edges(cps: list, rm_id: str) -> list:
        """Build an uneven tree: each segment between gates is split into
        chains of varying length, so branches have different depths."""
        result = []
        counter = 0

        def make_edge(src: str, tgt: str) -> dict:
            nonlocal counter
            e = {"id": f"edge-gen-{counter:03d}", "roadmap_id": rm_id,
                 "source": src, "target": tgt}
            counter += 1
            return e

        # Split patterns per branch count and total lesson count.
        # Each tuple is a sequence of chain lengths that must sum to n.
        # Keyed by (n, pattern_index % variants).
        SPLIT_PATTERNS: dict[int, list[tuple]] = {
            1: [(1,)],
            2: [(1, 1), (2,)],
            3: [(1, 2), (2, 1), (3,), (1, 1, 1)],
            4: [(1, 3), (2, 2), (3, 1), (1, 1, 2), (4,), (2, 1, 1)],
            5: [(1, 4), (2, 3), (3, 2), (1, 2, 2), (2, 2, 1), (5,)],
        }

        gate_indices = [i for i, cp in enumerate(cps)
                        if cp["kind"] in ("quiz", "project")]
        seg_starts = [0] + [gi + 1 for gi in gate_indices[:-1]]
        seg_ends = gate_indices

        for seg_idx, (start, end) in enumerate(zip(seg_starts, seg_ends)):
            lessons = cps[start:end]
            gate = cps[end]

            if seg_idx == 0:
                # Bootstrap: linear chain before the first gate
                for i in range(start, end):
                    result.append(make_edge(cps[i]["id"], cps[i + 1]["id"]))
            elif not lessons:
                prior_gate = cps[gate_indices[seg_idx - 1]]
                result.append(make_edge(prior_gate["id"], gate["id"]))
            else:
                prior_gate = cps[gate_indices[seg_idx - 1]]
                n = len(lessons)
                patterns = SPLIT_PATTERNS.get(n, [(n,)])
                pattern = patterns[(seg_idx - 1) % len(patterns)]

                idx = 0
                for chain_len in pattern:
                    chain = lessons[idx: idx + chain_len]
                    if not chain:
                        continue
                    result.append(make_edge(prior_gate["id"], chain[0]["id"]))
                    for i in range(len(chain) - 1):
                        result.append(make_edge(chain[i]["id"], chain[i + 1]["id"]))
                    result.append(make_edge(chain[-1]["id"], gate["id"]))
                    idx += chain_len

        # Tail: any lessons after the last gate
        if gate_indices:
            for i in range(gate_indices[-1], len(cps) - 1):
                result.append(make_edge(cps[i]["id"], cps[i + 1]["id"]))

        return result

    edges = build_branching_edges(checkpoints, roadmap_id)

    db = load_db()

    # Replace generated checkpoints & edges
    db["roadmap_checkpoints"] = [
        cp for cp in db["roadmap_checkpoints"] if cp["roadmap_id"] != roadmap_id
    ] + checkpoints
    db.setdefault("roadmap_edges", [])
    db["roadmap_edges"] = [
        e for e in db["roadmap_edges"] if e.get("roadmap_id") != roadmap_id
    ] + edges

    # Upsert roadmap record
    existing = next((r for r in db["roadmaps"] if r["id"] == roadmap_id), None)
    if existing:
        existing.update({"title": f"{role} Roadmap", "progress_percentage": 0, "status": "active"})
    else:
        db["roadmaps"].insert(0, {
            "id": roadmap_id,
            "user_id": "u-001",
            "title": f"{role} Roadmap",
            "progress_percentage": 0,
            "status": "active",
        })

    # Mark onboarding complete and save github username
    db["users"][0]["onboarding_completed"] = True
    db["users"][0]["onboarding_step"] = 5
    if github_username:
        db["users"][0]["github_username"] = github_username

    save_db(db)

    return {
        "success": True,
        "roadmap_id": roadmap_id,
        "steps_count": len(checkpoints),
        "role": role,
    }


# ---------------------------------------------------------------------------
# POST /api/v1/onboarding/resume
# ---------------------------------------------------------------------------
@router.post("/onboarding/resume")
async def upload_resume(file: UploadFile = File(...)):
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    dest = UPLOAD_DIR / (file.filename or "resume.pdf")
    with open(dest, "wb") as f:
        shutil.copyfileobj(file.file, f)
    return {"success": True, "filename": file.filename}


# ---------------------------------------------------------------------------
# GET /api/v1/quiz/{checkpoint_id}
# ---------------------------------------------------------------------------
@router.get("/quiz/{checkpoint_id}")
async def get_quiz(checkpoint_id: str):
    db = load_db()
    cp = next((c for c in db["roadmap_checkpoints"] if c["id"] == checkpoint_id), None)

    # Use cached questions if available
    questions = db.get("quiz_questions", {}).get(checkpoint_id)
    if questions:
        return {
            "checkpoint_id": checkpoint_id,
            "label": cp["label"] if cp else "",
            "questions": questions,
        }

    if not cp:
        raise HTTPException(status_code=404, detail="Checkpoint not found")

    # Generate on-demand via Quiz_Gen
    topics = [cp["label"]] + cp.get("learning_goals", [])
    loop = asyncio.get_event_loop()
    try:
        result = await loop.run_in_executor(
            None,
            lambda: generate_quiz(
                topics=topics,
                learned_resources=[],
                difficulty=2,
                learning_style="Interactive-Heavy",
            ),
        )
    except Exception as e:
        logger.error("Quiz generation failed for %s: %s", checkpoint_id, e)
        raise HTTPException(status_code=503, detail="Quiz generation failed")

    questions = _convert_quiz_questions(result["questions"])
    if not questions:
        raise HTTPException(status_code=503, detail="Quiz generation returned no usable questions")

    return {
        "checkpoint_id": checkpoint_id,
        "label": cp["label"],
        "questions": questions,
    }
