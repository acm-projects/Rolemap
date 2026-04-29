"""
User state router — serves mock_db.json data for frontend pages.
Registered in main.py with prefix="/api/v1".
"""
from fastapi import APIRouter, HTTPException, UploadFile, File, Query
from pathlib import Path
import asyncio
import datetime
import hashlib
import json
import os
import logging
import math
import shutil
import sys
from uuid import uuid4
from typing import Any

from models import ShopAppearancePatch, ShopPurchaseRequest, SkillDecayReviewRequest

logger = logging.getLogger(__name__)

router = APIRouter()

# Keep strong references to background tasks so they aren't garbage-collected
_background_tasks: set = set()

DB_PATH = Path(__file__).parent.parent / "data" / "mock_db.json"
SHOP_CATALOG_PATH = Path(__file__).parent.parent / "data" / "shop_catalog.json"
UPLOAD_DIR = Path(__file__).parent.parent / "data" / "uploads"
OUTPUT_DIR = Path(__file__).parent.parent / "output"
RESUME_OUTPUT_PATH = OUTPUT_DIR / "result.json"
GITHUB_OUTPUT_PATH = OUTPUT_DIR / "github_result.json"

_shop_catalog_cache: dict | None = None

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

MOCK_MODE: bool = os.environ.get("MOCK_MODE", "FALSE").upper() == "TRUE"

# ---------------------------------------------------------------------------
# Task_Gen V3 — lazy-loaded module (filename starts with digit, so importlib)
# ---------------------------------------------------------------------------
_task_gen_v3 = None

def _get_task_gen_v3():
    global _task_gen_v3
    if _task_gen_v3 is None:
        import importlib.util
        spec = importlib.util.spec_from_file_location(
            "task_gen_v3",
            Path(__file__).parent.parent / "Task_Gen" / "03_task_generator_v3_intelligent.py",
        )
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)  # type: ignore[union-attr]
        _task_gen_v3 = mod
    return _task_gen_v3


# ---------------------------------------------------------------------------
# Subtopic helpers
# ---------------------------------------------------------------------------

def _get_subtopics_for_checkpoint(cp: dict) -> list:
    """Return subtopics for a checkpoint.

    Priority:
    1. Neo4j Concept.subtopics (matched by label)
    2. checkpoint.learning_goals (fallback)
    """
    label = cp.get("label", "")
    try:
        _db_path = str(Path(__file__).parent.parent)
        if _db_path not in sys.path:
            sys.path.insert(0, _db_path)
        from database import Neo4jDriver  # noqa: PLC0415
        with Neo4jDriver.get_session() as session:
            result = session.run(
                "MATCH (c:Concept) "
                "WHERE toLower(c.name) = toLower($name) "
                "   OR toLower(c.name) CONTAINS toLower($name) "
                "   OR toLower($name) CONTAINS toLower(c.name) "
                "RETURN c.subtopics AS subtopics "
                "LIMIT 1",
                name=label,
            )
            record = result.single()
            if record:
                subs = record.get("subtopics")
                if subs:
                    return list(subs)
    except Exception as e:
        logger.debug("Neo4j subtopic lookup failed for %r: %s", label, e)
    return cp.get("learning_goals", [])


def _ensure_subtopic_progress(db: dict, checkpoint_id: str, subtopics: list) -> bool:
    """Create user_subtopic_progress entries for all subtopics if missing.
    Returns True if any new entries were added."""
    db.setdefault("user_subtopic_progress", [])
    existing_ids = {p["task_id"] for p in db["user_subtopic_progress"]}
    new_entries = []
    for i, subtopic in enumerate(subtopics):
        task_id = f"subtopic__{checkpoint_id}__{i}"
        if task_id not in existing_ids:
            new_entries.append({
                "task_id": task_id,
                "user_id": USER_ID,
                "checkpoint_id": checkpoint_id,
                "subtopic": subtopic,
                "status": "not_started",
            })
    if new_entries:
        db["user_subtopic_progress"].extend(new_entries)
        return True
    return False


def _build_achievements(db: dict) -> list:
    earned = {
        ua["achievement_id"]: ua["earned_at"]
        for ua in db["user_achievements"]
        if ua["user_id"] == USER_ID
    }
    return [
        {**a, "earned_at": earned[a["id"]]}
        for a in db["achievements"]
        if a["id"] in earned
    ]


# XP awarded per event
XP_RESOURCE = 5
XP_SUBTOPIC = 10
XP_CHECKPOINT_LESSON = 50
XP_CHECKPOINT_PROJECT = 200
XP_QUIZ_PASS = 100


def _award_xp(db: dict, amount: int) -> None:
    """Add XP to user and keep gamification record in sync."""
    user = db["users"][0]
    user["xp_total"] = user.get("xp_total", 0) + amount
    if db.get("user_gamification"):
        db["user_gamification"][0]["xp_total"] = user["xp_total"]


def _update_streak(db: dict) -> None:
    """Increment streak on the first activity of a new day; reset if a day was skipped."""
    today = datetime.date.today().isoformat()
    user = db["users"][0]
    last_active = user.get("last_active_date")

    if last_active == today:
        return  # already counted today

    yesterday = (datetime.date.today() - datetime.timedelta(days=1)).isoformat()
    if last_active == yesterday:
        user["current_streak"] = user.get("current_streak", 0) + 1
    else:
        user["current_streak"] = 1  # streak broken (or first ever)

    user["longest_streak"] = max(user.get("longest_streak", 0), user["current_streak"])
    user["last_active_date"] = today

    # Sync to gamification record and leaderboard
    if db.get("user_gamification"):
        gam = db["user_gamification"][0]
        gam["current_streak"] = user["current_streak"]
        gam["longest_streak"] = user["longest_streak"]
    for entry in db.get("leaderboard", []):
        if entry.get("is_you"):
            entry["streak"] = user["current_streak"]


async def _pregen_resources_bg(checkpoint_label: str, subtopics: list, job: str, preference: str) -> None:
    """Pre-generate and cache resources for every subtopic of a checkpoint."""
    task_gen = _get_task_gen_v3()
    for i, subtopic in enumerate(subtopics, 1):
        try:
            db = load_db()
            db.setdefault("task_resources_cache", [])
            if any(r.get("concept") == checkpoint_label and r.get("subtopic") == subtopic
                   for r in db["task_resources_cache"]):
                print(f"[pregen] ({i}/{len(subtopics)}) SKIP (cached): {subtopic!r}", flush=True)
                continue
            print(f"[pregen] ({i}/{len(subtopics)}) Generating: {subtopic!r}...", flush=True)
            result = await task_gen.generate_tasks_v3(
                job=job, concept=checkpoint_label, subtopic=subtopic, preference=preference,
            )
            db = load_db()
            db.setdefault("task_resources_cache", [])
            if not any(r.get("concept") == checkpoint_label and r.get("subtopic") == subtopic
                       for r in db["task_resources_cache"]):
                db["task_resources_cache"].append({
                    "concept": checkpoint_label,
                    "subtopic": subtopic,
                    "result": result,
                    "cached_at": datetime.datetime.utcnow().isoformat(),
                })
                save_db(db)
            print(f"[pregen] ({i}/{len(subtopics)}) Done: {subtopic!r}", flush=True)
        except Exception as e:
            print(f"[pregen] ({i}/{len(subtopics)}) FAILED {subtopic!r}: {e}", flush=True)
            logger.warning("Pregen failed for %r / %r: %s", checkpoint_label, subtopic, e)


def _get_active_job(db: dict) -> str:
    """Derive the job title from the active generated roadmap, falling back to roles table."""
    for rm in db.get("roadmaps", []):
        if rm.get("id") == "rm-generated" and rm.get("title"):
            return rm["title"].removesuffix(" Roadmap")
    roles = db.get("roles", [])
    return roles[0]["title"] if roles else "Software Engineer"


def _unlock_downstream(db: dict, checkpoint_id: str) -> None:
    """Unlock checkpoints directly downstream once ALL their prerequisites are complete."""
    edges = db.get("roadmap_edges", [])
    cps_by_id = {cp["id"]: cp for cp in db.get("roadmap_checkpoints", [])}

    downstream_ids = [e["target"] for e in edges if e.get("source") == checkpoint_id]
    for target_id in downstream_ids:
        target_cp = cps_by_id.get(target_id)
        if not target_cp or not target_cp.get("locked", True):
            continue  # already unlocked
        # Check every prerequisite (source) of this target is complete
        prereq_ids = [e["source"] for e in edges if e.get("target") == target_id]
        if all(cps_by_id.get(pid, {}).get("progress", 0) >= 100 for pid in prereq_ids):
            target_cp["locked"] = False


def load_db() -> dict:
    with open(DB_PATH, encoding="utf-8") as f:
        return json.load(f)


def save_db(db: dict) -> None:
    with open(DB_PATH, "w", encoding="utf-8") as f:
        json.dump(db, f, indent=2)


def _load_optional_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    try:
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        return data if isinstance(data, dict) else {}
    except (OSError, json.JSONDecodeError) as exc:
        logger.warning("Failed to load JSON from %s: %s", path, exc)
        return {}


def _get_resume_output() -> dict[str, Any]:
    return _load_optional_json(RESUME_OUTPUT_PATH)


def _get_github_output() -> dict[str, Any]:
    return _load_optional_json(GITHUB_OUTPUT_PATH)


def _get_resume_state(db: dict) -> dict[str, list[dict[str, Any]]]:
    state = db.setdefault("resume_state", {})
    state.setdefault("added_skills", [])
    state.setdefault("added_projects", [])
    return state


def _normalize_resume_project(project: dict[str, Any], index: int) -> dict[str, Any]:
    descriptions = project.get("descriptions", [])
    bullets = [item for item in descriptions if isinstance(item, str) and item.strip()]
    fallback_name = f"Resume Project {index}"
    name = (project.get("name") or "").strip() or fallback_name

    tech = ""
    if bullets:
        first_bullet = bullets[0]
        if " using " in first_bullet.lower():
            tech = first_bullet.split(" using ", 1)[1].strip().rstrip(".")

    return {
        "id": f"resume-{index}",
        "name": name,
        "tech": tech,
        "period": project.get("date", ""),
        "bullets": bullets,
        "source": "resume",
    }


def _get_profile_payload(db: dict) -> dict[str, str]:
    user = db["users"][0]
    resume_output = _get_resume_output()
    github_output = _get_github_output()

    resume_profile = resume_output.get("profile", {})
    github_profile = github_output.get("profile", {})

    name = (
        resume_profile.get("name")
        or github_profile.get("name")
        or user.get("name")
        or "Player One"
    )
    email = resume_profile.get("email") or user.get("email") or ""

    github_username = (
        user.get("github_username")
        or github_output.get("username")
        or ""
    )
    url = resume_profile.get("url") or ""
    if github_username:
        url = f"github.com/{github_username}"

    return {
        "name": name,
        "email": email,
        "url": url,
    }


def _get_resume_projects() -> list[dict[str, Any]]:
    resume_output = _get_resume_output()
    projects = resume_output.get("projects", [])
    if not isinstance(projects, list):
        return []
    return [
        _normalize_resume_project(project, index)
        for index, project in enumerate(projects, start=1)
        if isinstance(project, dict)
    ]


def _get_roadmap_projects(db: dict) -> list[dict[str, Any]]:
    checkpoints = db.get("roadmap_checkpoints", [])
    results = []
    for checkpoint in checkpoints:
        if checkpoint.get("progress", 0) < 100:
            continue

        label = checkpoint.get("label", "Completed Roadmap Node")
        goals = checkpoint.get("learning_goals", [])
        bullets = [
            goal for goal in goals
            if isinstance(goal, str) and goal.strip()
        ]
        description = checkpoint.get("description", "")
        if description:
            bullets = [description, *bullets]

        results.append({
            "id": checkpoint["id"],
            "name": label,
            "tech": checkpoint.get("kind", "roadmap").replace("_", " ").title(),
            "period": "Completed",
            "bullets": bullets[:4],
            "source": "roadmap",
        })
    return results


def _skill_exists(added_skills: list[dict[str, Any]], name: str) -> bool:
    normalized = name.strip().lower()
    return any(
        isinstance(skill.get("name"), str)
        and skill["name"].strip().lower() == normalized
        for skill in added_skills
    )


# ---------------------------------------------------------------------------
# GET /api/v1/users/me
# ---------------------------------------------------------------------------
@router.get("/users/me")
async def get_current_user():
    db = load_db()
    return db["users"][0]


DEFAULT_CHARACTER = {
    "skin": "char1.png",
    "eyes": "eyes.png",
    "clothes": "suit.png",
    "pants": "pants.png",
    "shoes": "shoes.png",
    "hair": "buzzcut.png",
    "accessories": "",
    "color_variants": {},
}


@router.get("/users/me/character")
async def get_character():
    db = load_db()
    character = db["users"][0].get("character", DEFAULT_CHARACTER)
    return character


@router.patch("/users/me/character")
async def save_character(body: dict):
    db = load_db()
    db["users"][0]["character"] = {**DEFAULT_CHARACTER, **body}
    save_db(db)
    return db["users"][0]["character"]


# ---------------------------------------------------------------------------
# Profile endpoints used by the frontend profile page
# ---------------------------------------------------------------------------
@router.get("/profile")
async def get_profile():
    db = load_db()
    return {"profile": _get_profile_payload(db)}


@router.get("/profile/resume-projects")
async def get_resume_projects():
    return _get_resume_projects()


@router.get("/profile/roadmap-projects")
async def get_roadmap_projects():
    db = load_db()
    return _get_roadmap_projects(db)


@router.get("/profile/resume/active")
async def get_active_resume():
    db = load_db()
    return _get_resume_state(db)


@router.post("/profile/resume/add-skill")
async def add_resume_skill(body: dict[str, Any]):
    name = str(body.get("name", "")).strip()
    category = str(body.get("category", "")).strip()
    if not name or not category:
        raise HTTPException(status_code=400, detail="Skill name and category are required")

    db = load_db()
    state = _get_resume_state(db)
    if _skill_exists(state["added_skills"], name):
        raise HTTPException(status_code=409, detail="Skill already added")

    skill = {"name": name, "category": category}
    state["added_skills"].append(skill)
    save_db(db)
    return {"skill": skill}


@router.delete("/profile/resume/remove-skill/{name}")
async def remove_resume_skill(name: str):
    db = load_db()
    state = _get_resume_state(db)
    before = len(state["added_skills"])
    normalized = name.strip().lower()
    state["added_skills"] = [
        skill for skill in state["added_skills"]
        if str(skill.get("name", "")).strip().lower() != normalized
    ]
    if len(state["added_skills"]) == before:
        raise HTTPException(status_code=404, detail="Skill not found")
    save_db(db)
    return {"ok": True}


@router.post("/profile/resume/add-project")
async def add_resume_project(body: dict[str, Any]):
    name = str(body.get("name", "")).strip()
    if not name:
        raise HTTPException(status_code=400, detail="Project name is required")

    db = load_db()
    state = _get_resume_state(db)
    project = {
        "id": str(uuid4()),
        "name": name,
        "tech": str(body.get("tech", "")).strip(),
        "period": str(body.get("period", "")).strip(),
        "bullets": [
            item for item in body.get("bullets", [])
            if isinstance(item, str) and item.strip()
        ],
    }
    state["added_projects"].append(project)
    save_db(db)
    return {"project": project}


@router.delete("/profile/resume/remove-project/{project_id}")
async def remove_resume_project(project_id: str):
    db = load_db()
    state = _get_resume_state(db)
    before = len(state["added_projects"])
    state["added_projects"] = [
        project for project in state["added_projects"]
        if project.get("id") != project_id
    ]
    if len(state["added_projects"]) == before:
        raise HTTPException(status_code=404, detail="Project not found")
    save_db(db)
    return {"ok": True}


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
    all_checkpoints = db.get("roadmap_checkpoints", [])

    def _roadmap_progress(roadmap_id: str) -> int:
        cps = [cp for cp in all_checkpoints if cp.get("roadmap_id") == roadmap_id]
        if not cps:
            return 0
        return round(sum(cp.get("progress", 0) for cp in cps) / len(cps))

    all_edges = db.get("roadmap_edges", [])

    def _minimap(roadmap_id: str):
        """Build a small node/edge summary for the dashboard minimap."""
        cps = [cp for cp in all_checkpoints if cp.get("roadmap_id") == roadmap_id]
        edges = [e for e in all_edges if e.get("roadmap_id") == roadmap_id]
        if not cps:
            return {"nodes": [], "edges": [], "done_nodes": []}

        # Build id→index map
        id_to_idx = {cp["id"]: i for i, cp in enumerate(cps)}

        # Normalise positions to 0-100 coordinate space
        xs = [cp.get("position", {}).get("x", i * 100) for i, cp in enumerate(cps)]
        ys = [cp.get("position", {}).get("y", 50) for i, cp in enumerate(cps)]
        x_min, x_max = min(xs), max(xs)
        y_min, y_max = min(ys), max(ys)
        x_range = x_max - x_min or 1
        y_range = y_max - y_min or 1

        nodes = [
            {"x": round(10 + 80 * (x - x_min) / x_range, 1),
             "y": round(10 + 80 * (y - y_min) / y_range, 1)}
            for x, y in zip(xs, ys)
        ]
        mini_edges = []
        done_nodes = []
        for e in edges:
            a = id_to_idx.get(e.get("source"))
            b = id_to_idx.get(e.get("target"))
            if a is not None and b is not None:
                src_done = cps[a].get("progress", 0) == 100
                mini_edges.append({"a": a, "b": b, "done": src_done})
        for i, cp in enumerate(cps):
            if cp.get("progress", 0) == 100:
                done_nodes.append(i)

        return {"nodes": nodes, "edges": mini_edges, "done_nodes": done_nodes}

    roadmaps_out = [
        {
            "id": r["id"],
            "title": r["title"],
            "progress_percentage": _roadmap_progress(r["id"]),
            "status": r["status"],
            "minimap": _minimap(r["id"]),
        }
        for r in roadmaps
    ]

    active_pct = _roadmap_progress(active_roadmap["id"])

    return {
        "user": {
            "name": user["name"],
            "xp_total": gamification["xp_total"],
            "current_streak": user["current_streak"],
        },
        "active_roadmap": {
            "id": active_roadmap["id"],
            "title": active_roadmap["title"],
            "progress_percentage": active_pct,
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

    # Attach per-subtopic completion so the map panel can show real tick state
    progress_by_task = {
        p["task_id"]: p["status"]
        for p in db.get("user_subtopic_progress", [])
    }
    for cp in checkpoints:
        subtopics = cp.get("learning_goals", [])
        cp["subtopic_completion"] = [
            progress_by_task.get(f"subtopic__{cp['id']}__{i}", "not_started") == "completed"
            for i in range(len(subtopics))
        ]

    return {"checkpoints": checkpoints, "edges": edges}


# ---------------------------------------------------------------------------
# GET /api/v1/tasks/resources  (must be declared before /{task_id} routes)
# ---------------------------------------------------------------------------
@router.get("/tasks/resources")
async def get_task_resources(
    concept: str,
    subtopic: str,
    job: str = "Front End Developer",
    preference: str = "Interactive-Heavy",
):
    """Return curated resources for a concept/subtopic. Checks DB cache first; fetches and saves on miss."""
    db = load_db()
    db.setdefault("task_resources_cache", [])

    # Cache lookup
    cached = next(
        (r for r in db["task_resources_cache"] if r.get("concept") == concept and r.get("subtopic") == subtopic),
        None,
    )
    if cached:
        logger.info("task_resources cache HIT: %r / %r", concept, subtopic)
        return cached["result"]

    # Cache miss — fetch from Task_Gen V3
    logger.info("task_resources cache MISS: %r / %r — fetching...", concept, subtopic)
    try:
        task_gen = _get_task_gen_v3()
        result = await task_gen.generate_tasks_v3(
            job=job,
            concept=concept,
            subtopic=subtopic,
            preference=preference,
        )
    except Exception as e:
        logger.error("Task resource generation failed: %s", e)
        raise HTTPException(status_code=503, detail=f"Task generation failed: {str(e)}")

    # Persist to cache
    db["task_resources_cache"].append({
        "concept": concept,
        "subtopic": subtopic,
        "result": result,
        "cached_at": datetime.datetime.utcnow().isoformat(),
    })
    save_db(db)
    return result


# ---------------------------------------------------------------------------
# GET /api/v1/tasks
# ---------------------------------------------------------------------------
@router.get("/tasks")
async def get_tasks():
    db = load_db()

    # Find active roadmap (prefer generated, fall back to first active)
    active_rm = next(
        (r for r in db.get("roadmaps", []) if r["id"] == "rm-generated"),
        next((r for r in db.get("roadmaps", []) if r.get("status") == "active"), None),
    )
    rm_id = active_rm["id"] if active_rm else None

    # Find active checkpoint — first unlocked with progress < 100 on the active roadmap
    checkpoints = [
        cp for cp in db.get("roadmap_checkpoints", [])
        if cp.get("roadmap_id") == rm_id
    ]

    # When daily_done, the just-completed checkpoint may already be at 100%.
    # Find it so we can show the "done for the day" screen with its tasks.
    if db.get("daily_done"):
        # Prefer the most recently completed checkpoint (last one at 100%)
        done_cp = None
        for cp in reversed(checkpoints):
            if not cp.get("locked", True) and cp.get("progress", 0) == 100:
                done_cp = cp
                break
        # Fall back to first in-progress checkpoint if none at 100
        active_cp = done_cp or next(
            (cp for cp in checkpoints if not cp.get("locked", True) and cp.get("progress", 0) < 100),
            None,
        )
    else:
        active_cp = next(
            (cp for cp in checkpoints if not cp.get("locked", True) and cp.get("progress", 0) < 100),
            None,
        )

    empty_response = {
        "tasks": [],
        "achievements": _build_achievements(db) if active_cp else [],
        "current_subtopic": None,
        "current_checkpoint_label": None,
        "subtopic_index": 0,
        "total_subtopics": 0,
    }

    if not active_cp:
        return empty_response

    subtopics = active_cp.get("learning_goals", [])
    if not subtopics:
        empty_response["current_checkpoint_label"] = active_cp.get("label")
        return empty_response

    # Ensure subtopic progress entries exist
    if _ensure_subtopic_progress(db, active_cp["id"], subtopics):
        save_db(db)
        db = load_db()

    # Find current subtopic — first incomplete one
    subtopic_statuses = {
        p["task_id"]: p["status"]
        for p in db.get("user_subtopic_progress", [])
        if p.get("checkpoint_id") == active_cp["id"]
    }

    # If daily_done flag is set, show the last *completed* subtopic (not the next one)
    if db.get("daily_done"):
        # Walk backwards to find the most recently completed subtopic
        current_sub_idx = 0
        for i in range(len(subtopics) - 1, -1, -1):
            if subtopic_statuses.get(f"subtopic__{active_cp['id']}__{i}") == "completed":
                current_sub_idx = i
                break
    else:
        current_sub_idx = 0
        for i in range(len(subtopics)):
            if subtopic_statuses.get(f"subtopic__{active_cp['id']}__{i}") != "completed":
                current_sub_idx = i
                break

    current_subtopic = subtopics[current_sub_idx]
    cp_label = active_cp.get("label", "")

    # Look up cached resources for this subtopic
    cached = next(
        (r for r in db.get("task_resources_cache", [])
         if r.get("concept") == cp_label and r.get("subtopic") == current_subtopic),
        None,
    )

    # Build task list from resources — each resource is a card
    resource_progress = {
        p["task_id"]: p["status"]
        for p in db.get("user_resource_progress", [])
    }
    tasks = []
    if cached:
        result = cached.get("result", {})
        all_resources = result.get("learning_tasks", []) + result.get("coding_tasks", [])
        for i, res in enumerate(all_resources):
            task_id = f"resource__{active_cp['id']}__{current_sub_idx}__{i}"
            tasks.append({
                "id": task_id,
                "checkpoint_id": active_cp["id"],
                "user_id": USER_ID,
                "title": res.get("title", f"Resource {i + 1}"),
                "tag": res.get("type", "Learning"),
                "status": resource_progress.get(task_id, "not_started"),
                "description": res.get("description", ""),
                "url": res.get("url", ""),
                "type": res.get("type", "Learning"),
                "objectives": res.get("objectives", []),
            })

    return {
        "tasks": tasks,
        "achievements": _build_achievements(db),
        "current_subtopic": current_subtopic,
        "current_checkpoint_label": cp_label,
        "subtopic_index": current_sub_idx,
        "total_subtopics": len(subtopics),
    }


# ---------------------------------------------------------------------------
# PATCH /api/v1/tasks/{task_id}
# ---------------------------------------------------------------------------
@router.patch("/tasks/{task_id}")
async def update_task(task_id: str, body: dict[str, Any]):
    db = load_db()
    new_status = body.get("status", "not_started")

    # ── Resource-level task (resource__{cp_id}__{sub_idx}__{res_idx}) ──
    if task_id.startswith("resource__"):
        parts = task_id.split("__")
        if len(parts) < 4:
            raise HTTPException(status_code=400, detail="Malformed resource task ID")
        checkpoint_id, sub_idx_str = parts[1], parts[2]
        sub_idx = int(sub_idx_str)

        db.setdefault("user_resource_progress", [])
        old_status = "not_started"
        found = False
        for p in db["user_resource_progress"]:
            if p["task_id"] == task_id:
                old_status = p["status"]
                p["status"] = new_status
                found = True
                break
        if not found:
            db["user_resource_progress"].append({
                "task_id": task_id,
                "user_id": USER_ID,
                "checkpoint_id": checkpoint_id,
                "subtopic_idx": sub_idx,
                "status": new_status,
            })

        if new_status == "completed" and old_status != "completed":
            _award_xp(db, XP_RESOURCE)
            _update_streak(db)
            if db.get("user_gamification"):
                db["user_gamification"][0]["tasks_completed"] = (
                    db["user_gamification"][0].get("tasks_completed", 0) + 1
                )

        # Check if ALL resources for this subtopic are now done
        cp = next((c for c in db.get("roadmap_checkpoints", []) if c["id"] == checkpoint_id), None)
        if cp:
            subtopics = cp.get("learning_goals", [])
            if sub_idx < len(subtopics):
                subtopic_name = subtopics[sub_idx]
                cached = next(
                    (r for r in db.get("task_resources_cache", [])
                     if r.get("concept") == cp.get("label") and r.get("subtopic") == subtopic_name),
                    None,
                )
                if cached:
                    result = cached.get("result", {})
                    total = len(result.get("learning_tasks", [])) + len(result.get("coding_tasks", []))
                    done_count = sum(
                        1 for p in db["user_resource_progress"]
                        if p.get("checkpoint_id") == checkpoint_id
                        and p.get("subtopic_idx") == sub_idx
                        and p["status"] == "completed"
                    )
                    if done_count >= total:
                        # Mark daily_done so GET /tasks keeps showing "done" screen
                        db["daily_done"] = True

                        # Auto-complete the subtopic
                        subtopic_task_id = f"subtopic__{checkpoint_id}__{sub_idx}"
                        for p in db.get("user_subtopic_progress", []):
                            if p["task_id"] == subtopic_task_id:
                                if p["status"] != "completed":
                                    p["status"] = "completed"
                                    _award_xp(db, XP_SUBTOPIC)
                                break

                        # Recalculate checkpoint progress
                        cp_entries = [
                            p for p in db["user_subtopic_progress"]
                            if p.get("checkpoint_id") == checkpoint_id
                        ]
                        if cp_entries:
                            completed_subs = sum(1 for p in cp_entries if p["status"] == "completed")
                            new_progress = round((completed_subs / len(cp_entries)) * 100)
                            old_progress = cp.get("progress", 0)
                            cp["progress"] = new_progress
                            if new_progress == 100 and old_progress < 100:
                                _init_decay(cp)
                                cp_kind = cp.get("kind", "lesson")
                                bonus = XP_CHECKPOINT_PROJECT if cp_kind == "project" else XP_CHECKPOINT_LESSON
                                _award_xp(db, bonus)
                                _unlock_downstream(db, checkpoint_id)
                                next_cp = next(
                                    (c for c in db.get("roadmap_checkpoints", [])
                                     if not c.get("locked", True) and c.get("progress", 0) < 100
                                     and c["id"] != checkpoint_id),
                                    None,
                                )
                                if next_cp and next_cp.get("kind") == "lesson":
                                    job = _get_active_job(db)
                                    _t = asyncio.create_task(_pregen_resources_bg(
                                        next_cp["label"],
                                        next_cp.get("learning_goals", []),
                                        job,
                                        "Interactive-Heavy",
                                    ))
                                    _background_tasks.add(_t)
                                    _t.add_done_callback(_background_tasks.discard)

        save_db(db)
        return {"task_id": task_id, "status": new_status}

    # ── Subtopic-level task (subtopic__{cp_id}__{idx}) — kept for backwards compat ──
    if task_id.startswith("subtopic__"):
        parts = task_id.split("__")
        if len(parts) < 3:
            raise HTTPException(status_code=400, detail="Malformed subtopic task ID")
        checkpoint_id = parts[1]

        old_status = next(
            (p["status"] for p in db.get("user_subtopic_progress", []) if p["task_id"] == task_id),
            "not_started",
        )
        found = False
        for p in db.get("user_subtopic_progress", []):
            if p["task_id"] == task_id and p["user_id"] == USER_ID:
                p["status"] = new_status
                found = True
                break
        if not found:
            raise HTTPException(status_code=404, detail="Subtopic task not found")

        if new_status == "completed" and old_status != "completed":
            _award_xp(db, XP_SUBTOPIC)
            _update_streak(db)
            if db.get("user_gamification"):
                db["user_gamification"][0]["tasks_completed"] = (
                    db["user_gamification"][0].get("tasks_completed", 0) + 1
                )

        cp_entries = [
            p for p in db["user_subtopic_progress"]
            if p.get("checkpoint_id") == checkpoint_id
        ]
        new_progress = 0
        if cp_entries:
            completed_count = sum(1 for p in cp_entries if p["status"] == "completed")
            new_progress = round((completed_count / len(cp_entries)) * 100)
            for cp in db.get("roadmap_checkpoints", []):
                if cp["id"] == checkpoint_id:
                    old_progress = cp.get("progress", 0)
                    cp["progress"] = new_progress
                    if new_progress == 100 and old_progress < 100:
                        _init_decay(cp)
                        cp_kind = cp.get("kind", "lesson")
                        bonus = XP_CHECKPOINT_PROJECT if cp_kind == "project" else XP_CHECKPOINT_LESSON
                        _award_xp(db, bonus)
                        _unlock_downstream(db, checkpoint_id)
                        next_cp = next(
                            (c for c in db.get("roadmap_checkpoints", [])
                             if not c.get("locked", True) and c.get("progress", 0) < 100
                             and c["id"] != checkpoint_id),
                            None,
                        )
                        if next_cp and next_cp.get("kind") == "lesson":
                            job = _get_active_job(db)
                            _t = asyncio.create_task(_pregen_resources_bg(
                                next_cp["label"],
                                next_cp.get("learning_goals", []),
                                job,
                                "Interactive-Heavy",
                            ))
                            _background_tasks.add(_t)
                            _t.add_done_callback(_background_tasks.discard)
                    break

        save_db(db)
        return {"task_id": task_id, "status": new_status}

    # Legacy task progress
    for prog in db["user_task_progress"]:
        if prog["task_id"] == task_id and prog["user_id"] == USER_ID:
            prog["status"] = new_status
            save_db(db)
            return prog
    raise HTTPException(status_code=404, detail="Task not found")


# ---------------------------------------------------------------------------
# POST /api/v1/tasks/advance — clear "done for the day" and move to next subtopic
# ---------------------------------------------------------------------------
@router.post("/tasks/advance")
async def advance_tasks():
    db = load_db()
    db["daily_done"] = False
    save_db(db)
    return {"ok": True}


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
    print(f"[generate] role: '{raw_role}' -> '{role}'", flush=True)
    github_username: str = body.get("github_username", "")

    if MOCK_MODE:
        print("[generate] MOCK_MODE=TRUE — skipping pipelines, using existing mock_db.json", flush=True)
        db = load_db()
        db["users"][0]["onboarding_completed"] = True
        db["users"][0]["onboarding_step"] = 5
        if github_username:
            db["users"][0]["github_username"] = github_username
        save_db(db)
        existing_cps = [cp for cp in db.get("roadmap_checkpoints", []) if cp.get("roadmap_id") == "rm-generated"]
        return {
            "success": True,
            "roadmap_id": "rm-generated",
            "steps_count": len(existing_cps),
            "role": role,
        }

    backend_dir = Path(__file__).parent.parent
    using_dir = backend_dir
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
            str(using_dir / "github" / "main.py"),
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
            str(using_dir / "resume_parser" / "main.py"),
            "--pdf", str(resume_files[0]),
            "--out", str(resume_json),
        )
    else:
        print("[generate] No resume PDF found, skipping resume step", flush=True)

    # 3. Roadmap generation
    gen_script = using_dir / "generator.py"
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
        MAX_LESSONS = 75  # yields ~100 total checkpoints after gates are inserted
        if len(roadmap_steps) > MAX_LESSONS:
            roadmap_steps = roadmap_steps[:MAX_LESSONS]
            print(f"[generate] Capped roadmap at {MAX_LESSONS} lessons", flush=True)
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

    for step in roadmap_steps:
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
                gate_label = lesson_buffer[-1] + " Quiz"
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
        return {
            "description": f"Learn the key concepts of {label}.",
            "learning_goals": [
                f"Understand the core principles of {label}",
                f"Apply {label} in practical scenarios",
                f"Explore advanced patterns in {label}",
                f"Build something real using {label}",
            ],
        }

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

    # Pre-populate subtopic progress for all checkpoints
    db.setdefault("user_subtopic_progress", [])
    existing_task_ids = {p["task_id"] for p in db["user_subtopic_progress"]}
    for cp in checkpoints:
        subtopics = cp.get("learning_goals", [])
        for i, subtopic in enumerate(subtopics):
            task_id = f"subtopic__{cp['id']}__{i}"
            if task_id not in existing_task_ids:
                db["user_subtopic_progress"].append({
                    "task_id": task_id,
                    "user_id": USER_ID,
                    "checkpoint_id": cp["id"],
                    "subtopic": subtopic,
                    "status": "not_started",
                })
                existing_task_ids.add(task_id)

    # Mark onboarding complete and save github username
    db["users"][0]["onboarding_completed"] = True
    db["users"][0]["onboarding_step"] = 5
    if github_username:
        db["users"][0]["github_username"] = github_username

    save_db(db)

    # Generate resources for the first lesson node — awaited so the loading screen
    # waits until resources are ready before redirecting the user.
    first_lesson = next((cp for cp in checkpoints if cp["kind"] == "lesson"), None)
    if first_lesson:
        preference = body.get("preference", "Interactive-Heavy")
        subtopics = first_lesson.get("learning_goals", [])
        print(f"[generate] Pre-generating resources for first node {first_lesson['label']!r} ({len(subtopics)} subtopics)...", flush=True)
        await _pregen_resources_bg(first_lesson["label"], subtopics, role, preference)
        print(f"[generate] Resource pregen complete.", flush=True)

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
# POST /api/v1/quiz/{checkpoint_id}/submit
# ---------------------------------------------------------------------------
@router.post("/quiz/{checkpoint_id}/submit")
async def submit_quiz(checkpoint_id: str, body: dict[str, Any]):
    score: int = body.get("score", 0)
    total: int = body.get("total", 5)
    passed: bool = score >= max(1, round(total * 0.6))  # 60% pass threshold

    if not passed:
        return {"passed": False, "score": score, "total": total}

    db = load_db()
    cp = next((c for c in db.get("roadmap_checkpoints", []) if c["id"] == checkpoint_id), None)
    if not cp:
        raise HTTPException(status_code=404, detail="Checkpoint not found")

    old_progress = cp.get("progress", 0)
    cp["progress"] = 100

    if old_progress < 100:
        _award_xp(db, XP_QUIZ_PASS)
        _update_streak(db)
        _unlock_downstream(db, checkpoint_id)
        if db.get("user_gamification"):
            db["user_gamification"][0]["tasks_completed"] = (
                db["user_gamification"][0].get("tasks_completed", 0) + 1
            )

    save_db(db)
    return {"passed": True, "score": score, "total": total}


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


# ---------------------------------------------------------------------------
# Shop (catalog + user cosmetics in mock_db)
# ---------------------------------------------------------------------------

def _load_shop_catalog() -> dict:
    global _shop_catalog_cache
    if _shop_catalog_cache is None:
        with open(SHOP_CATALOG_PATH, encoding="utf-8") as f:
            _shop_catalog_cache = json.load(f)
    return _shop_catalog_cache


def _ensure_user_shop(db: dict) -> dict:
    default_equipped = {
        "skin": "char1.png",
        "eyes": "eyes.png",
        "clothes": "suit.png",
        "pants": "pants.png",
        "shoes": "shoes.png",
        "hair": "buzzcut.png",
        "accessories": "",
    }
    db.setdefault(
        "user_shop",
        {
            "user_id": USER_ID,
            "purchased_item_ids": [],
            "equipped": dict(default_equipped),
            "gender": "boy",
            "color_variants": {},
        },
    )
    shop = db["user_shop"]
    shop.setdefault("purchased_item_ids", [])
    shop.setdefault("equipped", dict(default_equipped))
    shop.setdefault("gender", "boy")
    shop.setdefault("color_variants", {})
    return shop


def _item_unlocked(item: dict, purchased: set) -> bool:
    if item.get("cost", 0) <= 0:
        return True
    return item["id"] in purchased


def _merge_shop_items(catalog: dict, purchased: set) -> dict:
    out: dict[str, list] = {}
    for cat, items in catalog.items():
        out[cat] = [
            {**it, "unlocked": _item_unlocked(it, purchased)}
            for it in items
        ]
    return out


@router.get("/shop")
async def get_shop():
    """Return catalog with per-user unlock flags, XP, and saved appearance."""
    db = load_db()
    catalog = _load_shop_catalog()
    shop = _ensure_user_shop(db)
    purchased = set(shop["purchased_item_ids"])
    user = db["users"][0]
    xp = user.get("xp_total", 0)
    if db.get("user_gamification"):
        xp = db["user_gamification"][0].get("xp_total", xp)
    return {
        "items": _merge_shop_items(catalog, purchased),
        "equipped": shop["equipped"],
        "gender": shop.get("gender", "boy"),
        "color_variants": shop.get("color_variants", {}),
        "xp_total": xp,
    }


@router.post("/shop/purchase")
async def shop_purchase(body: ShopPurchaseRequest):
    """Spend XP to unlock a paid cosmetic."""
    db = load_db()
    catalog = _load_shop_catalog()
    if body.category not in catalog:
        raise HTTPException(status_code=400, detail="Unknown category")

    item = next((i for i in catalog[body.category] if i["id"] == body.item_id), None)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    cost = int(item.get("cost", 0))
    if cost <= 0:
        raise HTTPException(status_code=400, detail="Item is already free")

    shop = _ensure_user_shop(db)
    purchased = set(shop["purchased_item_ids"])
    if _item_unlocked(item, purchased):
        raise HTTPException(status_code=400, detail="Already unlocked")

    user = db["users"][0]
    xp = user.get("xp_total", 0)
    if db.get("user_gamification"):
        xp = db["user_gamification"][0].get("xp_total", xp)

    if xp < cost:
        raise HTTPException(status_code=400, detail="Not enough XP")

    user["xp_total"] = user.get("xp_total", 0) - cost
    if db.get("user_gamification"):
        db["user_gamification"][0]["xp_total"] = user["xp_total"]

    shop["purchased_item_ids"].append(body.item_id)
    save_db(db)

    purchased.add(body.item_id)
    return {
        "ok": True,
        "xp_total": user["xp_total"],
        "items": _merge_shop_items(catalog, purchased),
    }


@router.patch("/shop/appearance")
async def shop_appearance(body: ShopAppearancePatch):
    """Save equipped layers, optional gender and color variant indices."""
    db = load_db()
    catalog = _load_shop_catalog()
    shop = _ensure_user_shop(db)

    required = ("skin", "eyes", "clothes", "pants", "shoes", "hair", "accessories")
    for key in required:
        if key not in body.equipped:
            raise HTTPException(status_code=400, detail=f"Missing equipped.{key}")

    for cat, file_val in body.equipped.items():
        if cat not in catalog:
            raise HTTPException(status_code=400, detail=f"Unknown category {cat}")
        allowed = {i["file"] for i in catalog[cat]}
        if file_val not in allowed:
            raise HTTPException(status_code=400, detail=f"Invalid file for {cat}: {file_val}")

    shop["equipped"] = dict(body.equipped)
    if body.gender is not None:
        if body.gender not in ("boy", "girl"):
            raise HTTPException(status_code=400, detail="gender must be boy or girl")
        shop["gender"] = body.gender
    if body.color_variants is not None:
        shop["color_variants"] = dict(body.color_variants)

    save_db(db)
    return {"ok": True, "equipped": shop["equipped"], "gender": shop["gender"], "color_variants": shop["color_variants"]}


# ---------------------------------------------------------------------------
# Skill decay (SM-2 on roadmap checkpoints, mock_db)
# ---------------------------------------------------------------------------

def _iso_utc(dt: datetime.datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=datetime.timezone.utc)
    return dt.astimezone(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")


def _init_decay(cp: dict) -> None:
    """Set initial SM-2 state when a checkpoint is first completed. No-op if already set."""
    if cp.get("decay"):
        return
    now = datetime.datetime.now(datetime.timezone.utc)
    cp["decay"] = {
        "times_practiced": 0,
        "sm2_interval": 1,
        "sm2_easiness": 2.5,
        "sm2_repetitions": 0,
        "next_review": _iso_utc(now + datetime.timedelta(days=1)),
        "last_reviewed_at": _iso_utc(now),
    }


def _parse_utc(value: Any) -> datetime.datetime:
    if isinstance(value, datetime.datetime):
        if value.tzinfo is None:
            return value.replace(tzinfo=datetime.timezone.utc)
        return value.astimezone(datetime.timezone.utc)
    s = str(value).replace("Z", "+00:00")
    dt = datetime.datetime.fromisoformat(s)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=datetime.timezone.utc)
    return dt.astimezone(datetime.timezone.utc)


def _virtual_decay_defaults(cp_id: str) -> dict:
    """Stable demo defaults when checkpoint has no persisted decay."""
    now = datetime.datetime.now(datetime.timezone.utc)
    bucket = int(hashlib.md5(cp_id.encode()).hexdigest()[:8], 16) % 4
    if bucket == 0:
        next_r = now + datetime.timedelta(days=5)
    elif bucket == 1:
        next_r = now + datetime.timedelta(days=1)
    elif bucket == 2:
        next_r = now - datetime.timedelta(days=1)
    else:
        next_r = now - datetime.timedelta(days=10)
    last_r = now - datetime.timedelta(days=15)
    return {
        "times_practiced": 0,
        "sm2_interval": 1,
        "sm2_easiness": 2.5,
        "sm2_repetitions": 0,
        "next_review": next_r,
        "last_reviewed_at": last_r,
    }


def _checkpoint_decay_state(cp: dict) -> dict:
    base = _virtual_decay_defaults(cp["id"])
    raw = cp.get("decay") or {}
    merged = {**base, **raw}
    merged["next_review"] = _parse_utc(merged["next_review"])
    merged["last_reviewed_at"] = _parse_utc(merged["last_reviewed_at"])
    merged["sm2_easiness"] = float(merged["sm2_easiness"])
    merged["sm2_interval"] = max(1, int(merged["sm2_interval"]))
    merged["sm2_repetitions"] = int(merged["sm2_repetitions"])
    merged["times_practiced"] = int(merged["times_practiced"])
    return merged


def _decay_level(next_review: datetime.datetime, sm2_interval: int) -> str:
    """Match frontend `app/api/test-decay/route.ts` getDecayLevel."""
    now = datetime.datetime.now(datetime.timezone.utc)
    days_until = math.ceil((next_review - now).total_seconds() / (3600 * 24))
    if days_until > 3:
        return "fresh"
    if days_until > 0:
        return "review_soon"
    if days_until > -sm2_interval:
        return "decaying"
    return "forgotten"


def _decay_health(next_review: datetime.datetime, sm2_interval: int) -> int:
    """Health bar from overdue days (same idea as frontend `skillDecay.calculateHealth`)."""
    now = datetime.datetime.now(datetime.timezone.utc)
    days_overdue = max(0.0, (now - next_review).total_seconds() / (3600 * 24))
    denom = max(sm2_interval, 1)
    return max(0, min(100, round(100 - (days_overdue / denom) * 100)))


def _resolve_decay_roadmap_id(db: dict, roadmap_id: str | None) -> str:
    if roadmap_id:
        if not any(r.get("id") == roadmap_id for r in db.get("roadmaps", [])):
            raise HTTPException(status_code=404, detail="Roadmap not found")
        return roadmap_id
    rm = next((r for r in db.get("roadmaps", []) if r.get("id") == "rm-generated"), None)
    if rm:
        return rm["id"]
    rm = next((r for r in db.get("roadmaps", []) if r.get("status") == "active"), None)
    if rm:
        return rm["id"]
    raise HTTPException(status_code=404, detail="No roadmap found")


def _apply_sm2(state: dict, quality: int) -> dict:
    """SM-2 update aligned with `frontend/app/api/test-decay/route.ts` POST."""
    sm2_interval = state["sm2_interval"]
    sm2_easiness = float(state["sm2_easiness"])
    sm2_repetitions = int(state["sm2_repetitions"])
    times_practiced = int(state["times_practiced"])

    if quality >= 3:
        if sm2_repetitions == 0:
            sm2_interval = 1
        elif sm2_repetitions == 1:
            sm2_interval = 6
        else:
            sm2_interval = max(1, round(sm2_interval * sm2_easiness))
        sm2_repetitions += 1
    else:
        sm2_repetitions = 0
        sm2_interval = 1

    sm2_easiness = max(
        1.3,
        sm2_easiness + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02),
    )

    now = datetime.datetime.now(datetime.timezone.utc)
    next_review = now + datetime.timedelta(days=max(1, sm2_interval))
    times_practiced += 1

    return {
        "times_practiced": times_practiced,
        "sm2_interval": max(1, int(sm2_interval)),
        "sm2_easiness": sm2_easiness,
        "sm2_repetitions": sm2_repetitions,
        "next_review": next_review,
        "last_reviewed_at": now,
    }


@router.get("/skills/decay")
async def get_skills_decay(roadmap_id: str | None = Query(default=None)):
    """List SM-2 decay rows for completed checkpoints. Scans all roadmaps when no specific id given."""
    db = load_db()
    rows = []
    for cp in db.get("roadmap_checkpoints", []):
        if roadmap_id and cp.get("roadmap_id") != roadmap_id:
            continue
        if cp.get("progress", 0) < 100:
            continue
        st = _checkpoint_decay_state(cp)
        next_r = st["next_review"]
        sm2_i = st["sm2_interval"]
        now = datetime.datetime.now(datetime.timezone.utc)
        days_until = math.ceil((next_r - now).total_seconds() / (3600 * 24))
        rows.append(
            {
                "id": cp["id"],
                "skill": cp.get("label", ""),
                "health": _decay_health(next_r, sm2_i),
                "times_practiced": st["times_practiced"],
                "sm2_interval": sm2_i,
                "sm2_easiness": f"{st['sm2_easiness']:.2f}",
                "sm2_repetitions": st["sm2_repetitions"],
                "days_until_review": days_until,
                "next_review": _iso_utc(next_r),
                "last_reviewed_at": _iso_utc(st["last_reviewed_at"]),
                "decay_level": _decay_level(next_r, sm2_i),
            }
        )
    rows.sort(key=lambda r: r["health"])
    return rows


@router.post("/skills/decay/review")
async def post_skills_decay_review(body: SkillDecayReviewRequest):
    """Apply one SM-2 review and persist `decay` on the checkpoint."""
    db = load_db()
    cp = next((c for c in db.get("roadmap_checkpoints", []) if c["id"] == body.id), None)
    if not cp:
        raise HTTPException(status_code=404, detail="Checkpoint not found")

    st = _checkpoint_decay_state(cp)
    updated = _apply_sm2(st, body.quality)
    cp["decay"] = {
        "times_practiced": updated["times_practiced"],
        "sm2_interval": updated["sm2_interval"],
        "sm2_easiness": updated["sm2_easiness"],
        "sm2_repetitions": updated["sm2_repetitions"],
        "next_review": _iso_utc(updated["next_review"]),
        "last_reviewed_at": _iso_utc(updated["last_reviewed_at"]),
    }
    save_db(db)
    return {
        "success": True,
        "new_interval": updated["sm2_interval"],
        "next_review": _iso_utc(updated["next_review"]),
    }
