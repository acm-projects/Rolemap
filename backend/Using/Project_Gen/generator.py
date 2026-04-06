"""
Project idea generator.
Uses Gemini to produce a tailored project prompt based on concepts, difficulty, and user info.
"""

import json
import logging
from typing import Any, Callable, Dict, List, Optional

logger = logging.getLogger(__name__)

DIFFICULTY_CONFIG = {
    1: {
        "label": "Beginner",
        "complexity": "a simple single-file or two-file project",
        "hours_min": 4,
        "hours_max": 8,
    },
    2: {
        "label": "Elementary",
        "complexity": "a small multi-file project with a clear structure",
        "hours_min": 8,
        "hours_max": 16,
    },
    3: {
        "label": "Intermediate",
        "complexity": "a moderate full-feature project with multiple components",
        "hours_min": 16,
        "hours_max": 30,
    },
    4: {
        "label": "Advanced",
        "complexity": "a complex multi-component project addressing real-world concerns",
        "hours_min": 30,
        "hours_max": 60,
    },
    5: {
        "label": "Expert",
        "complexity": "a production-grade or system-design-level project",
        "hours_min": 60,
        "hours_max": 120,
    },
}

_JSON_SCHEMA = """{
  "project_title": "string",
  "project_description": "string (2-3 sentences describing what to build and why)",
  "requirements": ["string (specific, testable requirement)", ...],
  "tech_stack": ["string (concrete tool/framework name e.g. React 18, FastAPI, PostgreSQL)", ...],
  "success_criteria": ["string (observable from outside the code)", ...],
  "bonus_challenges": ["string (genuinely harder stretch goals)", ...],
  "estimated_hours": integer,
  "concepts_tested": ["string", ...]
}"""


def _build_generate_prompt(
    concepts: List[str],
    difficulty: int,
    user_info: Optional[Dict[str, Any]],
) -> str:
    cfg = DIFFICULTY_CONFIG[difficulty]
    concepts_str = ", ".join(f'"{c}"' for c in concepts)

    user_context = ""
    if user_info:
        lines = []
        if user_info.get("level"):
            lines.append(f"  - Experience level: {user_info['level']}")
        if user_info.get("preferred_language"):
            lines.append(f"  - Preferred language: {user_info['preferred_language']}")
        if user_info.get("background"):
            lines.append(f"  - Background: {user_info['background']}")
        if lines:
            user_context = "\nLEARNER CONTEXT\n---------------\n" + "\n".join(lines) + "\n"

    return f"""You are a senior engineer and technical mentor designing real-world projects for a developer learning platform called Rolemap.

GOAL
----
Create ONE creative, self-contained project idea that GENUINELY requires the developer to use and understand the given concepts. The project should feel like something someone would actually build, not a toy example.

CONCEPTS TO TEST
----------------
{concepts_str}

DIFFICULTY
----------
{difficulty}/5 — {cfg["label"]}: {cfg["complexity"]}
Estimated build time: {cfg["hours_min"]}–{cfg["hours_max"]} hours
{user_context}
RULES
-----
1. The project MUST require ALL listed concepts to complete — none should be optional.
2. requirements must be specific and testable (e.g. "implement useEffect to fetch user data on mount", NOT "use React hooks").
3. success_criteria must be observable from the outside (e.g. "the app shows a loading spinner while data is fetching").
4. bonus_challenges must be genuinely harder stretch goals, not just "add more features".
5. tech_stack must be concrete tool names (e.g. "React 18", "FastAPI", "PostgreSQL"), not categories.
6. estimated_hours must be an integer between {cfg["hours_min"]} and {cfg["hours_max"]}.
7. concepts_tested may include implied prerequisites but MUST include all input concepts.
8. Write in second person ("Build a...", "Implement...").

OUTPUT FORMAT
-------------
Return ONLY valid JSON — no markdown fences, no extra text.
Schema:
{_JSON_SCHEMA}"""


def _parse_response(text: str) -> Dict:
    """Strip markdown fences and parse JSON from Gemini response."""
    text = text.strip()
    if text.startswith("```"):
        lines = text.splitlines()
        text = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])
    return json.loads(text)


def generate_project_idea(
    concepts: List[str],
    difficulty: int,
    user_info: Optional[Dict[str, Any]],
    call_gemini_fn: Callable[[str], str],
) -> Dict:
    """
    Generate a tailored project prompt using Gemini.

    Args:
        concepts: List of concepts the project must test.
        difficulty: 1-5 difficulty level.
        user_info: Optional dict with level, preferred_language, background.
        call_gemini_fn: Injected callable from main.py (uses key rotation).

    Returns:
        Dict matching ProjectGenerateResponse fields.

    Raises:
        RuntimeError: If Gemini call fails.
        json.JSONDecodeError: If response is not valid JSON.
        KeyError: If response is missing required fields.
    """
    prompt = _build_generate_prompt(concepts, difficulty, user_info)

    logger.info(f"Generating project idea: concepts={concepts}, difficulty={difficulty}")
    raw_text = call_gemini_fn(prompt)

    result = _parse_response(raw_text)

    # Validate required fields are present
    required = {
        "project_title", "project_description", "requirements",
        "tech_stack", "success_criteria", "bonus_challenges",
        "estimated_hours", "concepts_tested",
    }
    missing = required - result.keys()
    if missing:
        raise KeyError(f"LLM response missing fields: {missing}")

    # Clamp estimated_hours to configured range
    cfg = DIFFICULTY_CONFIG[difficulty]
    result["estimated_hours"] = max(
        cfg["hours_min"],
        min(cfg["hours_max"], int(result["estimated_hours"])),
    )

    return result
