"""
Demo backend — serves mock_db.json with no external dependencies.
Run: pip install fastapi uvicorn && python main.py
"""
import datetime
import json
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI(title="Rolemap Demo API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_PATH = Path(__file__).parent / "mock_db.json"
USER_ID = "u-001"

XP_RESOURCE = 5
XP_SUBTOPIC = 10
XP_CHECKPOINT_LESSON = 50
XP_CHECKPOINT_PROJECT = 200
XP_QUIZ_PASS = 100


def load_db() -> dict:
    with open(DB_PATH, encoding="utf-8") as f:
        return json.load(f)


def save_db(db: dict) -> None:
    with open(DB_PATH, "w", encoding="utf-8") as f:
        json.dump(db, f, indent=2)


def award_xp(db: dict, amount: int) -> None:
    db["users"][0]["xp_total"] = db["users"][0].get("xp_total", 0) + amount
    if db.get("user_gamification"):
        db["user_gamification"][0]["xp_total"] = db["users"][0]["xp_total"]


def unlock_downstream(db: dict, checkpoint_id: str) -> None:
    edges = db.get("roadmap_edges", [])
    cps_by_id = {cp["id"]: cp for cp in db.get("roadmap_checkpoints", [])}
    for e in edges:
        if e.get("source") != checkpoint_id:
            continue
        target = cps_by_id.get(e["target"])
        if not target or not target.get("locked", True):
            continue
        prereqs = [e2["source"] for e2 in edges if e2.get("target") == e["target"]]
        if all(cps_by_id.get(pid, {}).get("progress", 0) >= 100 for pid in prereqs):
            target["locked"] = False


def roadmap_progress(db: dict, roadmap_id: str) -> int:
    cps = [cp for cp in db.get("roadmap_checkpoints", []) if cp.get("roadmap_id") == roadmap_id]
    if not cps:
        return 0
    return round(sum(cp.get("progress", 0) for cp in cps) / len(cps))


# ---------------------------------------------------------------------------
# GET /api/v1/users/me
# ---------------------------------------------------------------------------
@app.get("/api/v1/users/me")
def get_current_user():
    return load_db()["users"][0]


# ---------------------------------------------------------------------------
# GET /api/v1/dashboard
# ---------------------------------------------------------------------------
@app.get("/api/v1/dashboard")
def get_dashboard():
    db = load_db()
    user = db["users"][0]
    gam = db["user_gamification"][0]
    roadmaps = db["roadmaps"]
    active_roadmap = next((r for r in roadmaps if r["status"] == "active"), roadmaps[0])
    active_pct = roadmap_progress(db, active_roadmap["id"])

    return {
        "user": {
            "name": user["name"],
            "xp_total": gam["xp_total"],
            "current_streak": user["current_streak"],
        },
        "active_roadmap": {
            "id": active_roadmap["id"],
            "title": active_roadmap["title"],
            "progress_percentage": active_pct,
        },
        "roadmaps": [
            {
                "id": r["id"],
                "title": r["title"],
                "progress_percentage": roadmap_progress(db, r["id"]),
                "status": r["status"],
                "minimap": {"nodes": [], "edges": [], "done_nodes": []},
            }
            for r in roadmaps
        ],
        "gamification": {
            "tasks_completed": gam["tasks_completed"],
            "leaderboard_rank": gam["leaderboard_rank"],
        },
        "leaderboard": db["leaderboard"],
    }


# ---------------------------------------------------------------------------
# GET /api/v1/roadmaps/{roadmap_id}/map
# ---------------------------------------------------------------------------
@app.get("/api/v1/roadmaps/{roadmap_id}/map")
def get_roadmap_map(roadmap_id: str):
    db = load_db()
    checkpoints = [cp for cp in db["roadmap_checkpoints"] if cp["roadmap_id"] == roadmap_id]
    if not checkpoints:
        raise HTTPException(status_code=404, detail="Roadmap not found")
    edges = [e for e in db.get("roadmap_edges", []) if e.get("roadmap_id") == roadmap_id]

    progress_by_task = {p["task_id"]: p["status"] for p in db.get("user_subtopic_progress", [])}
    for cp in checkpoints:
        goals = cp.get("learning_goals", [])
        cp["subtopic_completion"] = [
            progress_by_task.get(f"subtopic__{cp['id']}__{i}", "not_started") == "completed"
            for i in range(len(goals))
        ]

    return {"checkpoints": checkpoints, "edges": edges}


# ---------------------------------------------------------------------------
# GET /api/v1/tasks/resources
# ---------------------------------------------------------------------------
@app.get("/api/v1/tasks/resources")
def get_task_resources(concept: str, subtopic: str):
    db = load_db()
    cached = next(
        (r for r in db.get("task_resources_cache", [])
         if r.get("concept") == concept and r.get("subtopic") == subtopic),
        None,
    )
    if not cached:
        raise HTTPException(status_code=404, detail="No resources cached for this subtopic")
    return cached["result"]


# ---------------------------------------------------------------------------
# GET /api/v1/tasks
# ---------------------------------------------------------------------------
@app.get("/api/v1/tasks")
def get_tasks():
    db = load_db()

    active_rm = next((r for r in db.get("roadmaps", []) if r.get("status") == "active"), None)
    rm_id = active_rm["id"] if active_rm else None
    checkpoints = [cp for cp in db.get("roadmap_checkpoints", []) if cp.get("roadmap_id") == rm_id]

    if db.get("daily_done"):
        active_cp = next(
            (cp for cp in reversed(checkpoints) if not cp.get("locked", True) and cp.get("progress", 0) == 100),
            None,
        ) or next(
            (cp for cp in checkpoints if not cp.get("locked", True) and cp.get("progress", 0) < 100),
            None,
        )
    else:
        active_cp = next(
            (cp for cp in checkpoints if not cp.get("locked", True) and cp.get("progress", 0) < 100),
            None,
        )

    empty = {"tasks": [], "achievements": [], "current_subtopic": None,
             "current_checkpoint_label": None, "subtopic_index": 0, "total_subtopics": 0}

    if not active_cp:
        return empty

    subtopics = active_cp.get("learning_goals", [])
    if not subtopics:
        return {**empty, "current_checkpoint_label": active_cp.get("label")}

    # Ensure subtopic progress entries exist
    db.setdefault("user_subtopic_progress", [])
    existing_ids = {p["task_id"] for p in db["user_subtopic_progress"]}
    added = False
    for i, sub in enumerate(subtopics):
        tid = f"subtopic__{active_cp['id']}__{i}"
        if tid not in existing_ids:
            db["user_subtopic_progress"].append({
                "task_id": tid, "user_id": USER_ID,
                "checkpoint_id": active_cp["id"], "subtopic": sub, "status": "not_started",
            })
            added = True
    if added:
        save_db(db)

    subtopic_statuses = {
        p["task_id"]: p["status"]
        for p in db["user_subtopic_progress"]
        if p.get("checkpoint_id") == active_cp["id"]
    }

    if db.get("daily_done"):
        current_sub_idx = max(
            (i for i in range(len(subtopics))
             if subtopic_statuses.get(f"subtopic__{active_cp['id']}__{i}") == "completed"),
            default=0,
        )
    else:
        current_sub_idx = next(
            (i for i in range(len(subtopics))
             if subtopic_statuses.get(f"subtopic__{active_cp['id']}__{i}") != "completed"),
            0,
        )

    current_subtopic = subtopics[current_sub_idx]
    cp_label = active_cp.get("label", "")

    cached = next(
        (r for r in db.get("task_resources_cache", [])
         if r.get("concept") == cp_label and r.get("subtopic") == current_subtopic),
        None,
    )

    resource_progress = {p["task_id"]: p["status"] for p in db.get("user_resource_progress", [])}
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

    earned = {ua["achievement_id"]: ua["earned_at"] for ua in db["user_achievements"] if ua["user_id"] == USER_ID}
    achievements = [{**a, "earned_at": earned[a["id"]]} for a in db["achievements"] if a["id"] in earned]

    return {
        "tasks": tasks,
        "achievements": achievements,
        "current_subtopic": current_subtopic,
        "current_checkpoint_label": cp_label,
        "subtopic_index": current_sub_idx,
        "total_subtopics": len(subtopics),
    }


# ---------------------------------------------------------------------------
# PATCH /api/v1/tasks/{task_id}
# ---------------------------------------------------------------------------
@app.patch("/api/v1/tasks/{task_id}")
def update_task(task_id: str, body: dict[str, Any]):
    db = load_db()
    new_status = body.get("status", "not_started")

    if task_id.startswith("resource__"):
        parts = task_id.split("__")
        if len(parts) < 4:
            raise HTTPException(status_code=400, detail="Malformed resource task ID")
        checkpoint_id, sub_idx = parts[1], int(parts[2])

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
                "task_id": task_id, "user_id": USER_ID,
                "checkpoint_id": checkpoint_id, "subtopic_idx": sub_idx, "status": new_status,
            })

        if new_status == "completed" and old_status != "completed":
            award_xp(db, XP_RESOURCE)
            if db.get("user_gamification"):
                db["user_gamification"][0]["tasks_completed"] = db["user_gamification"][0].get("tasks_completed", 0) + 1

        # Check if all resources for this subtopic are done
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
                        db["daily_done"] = True
                        subtopic_tid = f"subtopic__{checkpoint_id}__{sub_idx}"
                        for p in db.get("user_subtopic_progress", []):
                            if p["task_id"] == subtopic_tid and p["status"] != "completed":
                                p["status"] = "completed"
                                award_xp(db, XP_SUBTOPIC)
                                break

                        cp_entries = [p for p in db["user_subtopic_progress"] if p.get("checkpoint_id") == checkpoint_id]
                        if cp_entries:
                            done_subs = sum(1 for p in cp_entries if p["status"] == "completed")
                            new_progress = round((done_subs / len(cp_entries)) * 100)
                            old_progress = cp.get("progress", 0)
                            cp["progress"] = new_progress
                            if new_progress == 100 and old_progress < 100:
                                kind = cp.get("kind", "lesson")
                                award_xp(db, XP_CHECKPOINT_PROJECT if kind == "project" else XP_CHECKPOINT_LESSON)
                                unlock_downstream(db, checkpoint_id)

        save_db(db)
        return {"task_id": task_id, "status": new_status}

    raise HTTPException(status_code=404, detail="Task not found")


# ---------------------------------------------------------------------------
# POST /api/v1/tasks/advance
# ---------------------------------------------------------------------------
@app.post("/api/v1/tasks/advance")
def advance_tasks():
    db = load_db()
    db["daily_done"] = False
    save_db(db)
    return {"ok": True}


# ---------------------------------------------------------------------------
# GET /api/v1/quiz/{checkpoint_id}
# ---------------------------------------------------------------------------
@app.get("/api/v1/quiz/{checkpoint_id}")
def get_quiz(checkpoint_id: str):
    db = load_db()
    cp = next((c for c in db["roadmap_checkpoints"] if c["id"] == checkpoint_id), None)
    if not cp:
        raise HTTPException(status_code=404, detail="Checkpoint not found")
    questions = db.get("quiz_questions", {}).get(checkpoint_id)
    if not questions:
        raise HTTPException(status_code=404, detail="No questions for this checkpoint")
    return {"checkpoint_id": checkpoint_id, "label": cp["label"], "questions": questions}


# ---------------------------------------------------------------------------
# POST /api/v1/quiz/{checkpoint_id}/submit
# ---------------------------------------------------------------------------
@app.post("/api/v1/quiz/{checkpoint_id}/submit")
def submit_quiz(checkpoint_id: str, body: dict[str, Any]):
    score: int = body.get("score", 0)
    total: int = body.get("total", 5)
    passed = score >= max(1, round(total * 0.6))

    if not passed:
        return {"passed": False, "score": score, "total": total}

    db = load_db()
    cp = next((c for c in db.get("roadmap_checkpoints", []) if c["id"] == checkpoint_id), None)
    if not cp:
        raise HTTPException(status_code=404, detail="Checkpoint not found")

    old_progress = cp.get("progress", 0)
    cp["progress"] = 100
    if old_progress < 100:
        award_xp(db, XP_QUIZ_PASS)
        unlock_downstream(db, checkpoint_id)
        if db.get("user_gamification"):
            db["user_gamification"][0]["tasks_completed"] = db["user_gamification"][0].get("tasks_completed", 0) + 1

    save_db(db)
    return {"passed": True, "score": score, "total": total}


# ---------------------------------------------------------------------------
# POST /api/v1/onboarding/complete
# ---------------------------------------------------------------------------
@app.post("/api/v1/onboarding/complete")
def complete_onboarding(body: dict[str, Any]):
    db = load_db()
    db["users"][0]["onboarding_completed"] = True
    save_db(db)
    return {"success": True}


# ---------------------------------------------------------------------------
# POST /api/v1/onboarding/generate  (instant — no pipelines)
# ---------------------------------------------------------------------------
@app.post("/api/v1/onboarding/generate")
def generate_roadmap(body: dict[str, Any]):
    db = load_db()
    db["users"][0]["onboarding_completed"] = True
    save_db(db)
    return {"success": True, "roadmap_id": "rm-001", "steps_count": 8, "role": "Front-End Engineer"}


# ---------------------------------------------------------------------------
# POST /api/v1/onboarding/resume
# ---------------------------------------------------------------------------
@app.post("/api/v1/onboarding/resume")
def upload_resume():
    return {"success": True, "filename": "resume.pdf"}


# ---------------------------------------------------------------------------
# GET /api/v1/skills/decay
# ---------------------------------------------------------------------------
@app.get("/api/v1/skills/decay")
def get_skills_decay():
    db = load_db()
    now = datetime.datetime.now(datetime.timezone.utc)
    rows = []
    for cp in db.get("roadmap_checkpoints", []):
        if cp.get("progress", 0) < 100:
            continue
        next_review = (now + datetime.timedelta(days=3)).strftime("%Y-%m-%dT%H:%M:%S.000Z")
        rows.append({
            "id": cp["id"],
            "skill": cp.get("label", ""),
            "health": 80,
            "decay_level": "fresh",
            "next_review": next_review,
            "days_until_review": 3,
        })
    return rows


# ---------------------------------------------------------------------------
# GET /health
# ---------------------------------------------------------------------------
@app.get("/health")
def health():
    return {"status": "ok"}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
