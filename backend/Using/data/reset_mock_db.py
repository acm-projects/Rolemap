"""
Reset mock_db.json:
  - users[*].onboarding_completed      → false
  - users[*].onboarding_step           → 0
  - tasks[*].status                    → "not_started"
  - user_task_progress[*].status       → "not_started"
  - user_task_progress[*].completed_at → null
  - user_resource_progress[*].status   → "not_started"
"""

import json
from pathlib import Path

DB_PATH = Path(__file__).parent / "mock_db.json"


def main() -> None:
    data = json.loads(DB_PATH.read_text(encoding="utf-8"))

    for user in data.get("users", []):
        user["onboarding_completed"] = False
        user["onboarding_step"] = 0

    for task in data.get("tasks", []):
        task["status"] = "not_started"

    for entry in data.get("user_task_progress", []):
        entry["status"] = "not_started"
        entry["completed_at"] = None

    for entry in data.get("user_resource_progress", []):
        entry["status"] = "not_started"

    DB_PATH.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Reset complete → {DB_PATH}")


if __name__ == "__main__":
    main()
