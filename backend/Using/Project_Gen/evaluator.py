"""
Project evaluator.
Fetches a GitHub repo, analyzes commit signals, and uses Gemini to
produce constructive feedback across 4 dimensions.
"""

import json
import logging
import re
from datetime import datetime, timezone
from typing import Callable, Dict, List, Optional

from Project_Gen.repo_fetcher import build_repo_snapshot, parse_github_url

logger = logging.getLogger(__name__)

_GENERIC_MSG_PATTERNS = re.compile(
    r"^(initial commit|init|first commit|add files?|added files?|"
    r"update|updates|wip|temp|test|testing|misc|fix|fixes|"
    r"commit|new commit|upload|uploaded|done|finished)\.?$",
    re.IGNORECASE,
)

_EVAL_JSON_SCHEMA = """{
  "overall_score": integer (0-100),
  "code_quality": {
    "score": integer (0-100),
    "positives": ["string", ...],
    "negatives": ["string", ...],
    "feedback": "string"
  },
  "ai_detection": {
    "score": integer (0-100, confidence that AI wrote this),
    "is_likely_ai": boolean,
    "positives": ["string (evidence of human authorship)", ...],
    "negatives": ["string (AI suspicion signal)", ...],
    "feedback": "string"
  },
  "project_structure": {
    "score": integer (0-100),
    "positives": ["string", ...],
    "negatives": ["string", ...],
    "feedback": "string"
  },
  "concept_mastery": {
    "score": integer (0-100),
    "concepts_demonstrated": ["string", ...],
    "concepts_missing": ["string", ...],
    "positives": ["string", ...],
    "negatives": ["string", ...],
    "feedback": "string"
  },
  "overall_feedback": "string (2-3 paragraphs, constructive)",
  "recommendations": ["string (specific, actionable next step)", ...]
}"""


def compute_ai_detection_signals(commit_history: List[Dict]) -> Dict:
    """
    Pure Python pre-analysis of commit signals for AI detection.

    Returns a dict with:
      - total_commits
      - time_span_hours (first → last)
      - generic_message_count / generic_message_ratio
      - max_burst (max commits within a 1-hour window)
    """
    total = len(commit_history)
    if total == 0:
        return {
            "total_commits": 0,
            "time_span_hours": 0.0,
            "generic_message_count": 0,
            "generic_message_ratio": 0.0,
            "max_burst": 0,
        }

    # Count generic messages
    generic = sum(
        1 for c in commit_history
        if _GENERIC_MSG_PATTERNS.match(c.get("message", "").strip())
    )

    # Parse dates for time span and burst calculation
    parsed_dates = []
    for c in commit_history:
        raw = c.get("date", "")
        if raw:
            try:
                # GitHub dates are ISO 8601: "2024-03-25T14:30:00Z"
                dt = datetime.fromisoformat(raw.replace("Z", "+00:00"))
                parsed_dates.append(dt)
            except ValueError:
                pass

    parsed_dates.sort()
    if len(parsed_dates) >= 2:
        span = (parsed_dates[-1] - parsed_dates[0]).total_seconds() / 3600
    else:
        span = 0.0

    # Max burst: max commits within any 1-hour window
    max_burst = 1
    for i, dt in enumerate(parsed_dates):
        window_end = dt.timestamp() + 3600
        burst = sum(1 for other in parsed_dates if other.timestamp() <= window_end)
        max_burst = max(max_burst, burst)

    return {
        "total_commits": total,
        "time_span_hours": round(span, 1),
        "generic_message_count": generic,
        "generic_message_ratio": round(generic / total, 2) if total else 0.0,
        "max_burst": max_burst,
    }


def _build_evaluate_prompt(
    repo_snapshot: Dict,
    concepts: List[str],
    project_description: Optional[str],
    ai_signals: Dict,
) -> str:
    meta = repo_snapshot["metadata"]
    concepts_str = ", ".join(f'"{c}"' for c in concepts)
    tree_summary = repo_snapshot["file_tree_summary"]
    commit_history = repo_snapshot["commit_history"]
    file_contents = repo_snapshot["file_contents"]

    # File tree (capped at 100 entries)
    tree_str = "\n".join(tree_summary[:100])
    if len(tree_summary) > 100:
        tree_str += f"\n... and {len(tree_summary) - 100} more files"

    # Commit list
    commit_lines = "\n".join(
        f"  {c['sha']} | {c['date'][:10] if c.get('date') else '?'} | {c['message']}"
        for c in commit_history[:30]
    )

    # File contents block
    files_block = ""
    for path, content in file_contents.items():
        files_block += f"\n--- {path} ---\n{content}\n"

    # Original description block
    desc_block = ""
    if project_description:
        desc_block = f"\nORIGINAL PROJECT PROMPT\n-----------------------\n{project_description}\n"

    return f"""You are a senior engineering mentor evaluating a developer's project submission on a learning platform called Rolemap.
{desc_block}
CONCEPTS TO DEMONSTRATE
------------------------
{concepts_str}

REPOSITORY: {meta.get('name', 'unknown')}
Description: {meta.get('description') or '(none)'}
Primary language: {meta.get('language', 'Unknown')}
Stars / Forks: {meta.get('stars', 0)} / {meta.get('forks', 0)}
Total files: {repo_snapshot['total_files']}
Topics: {', '.join(meta.get('topics', [])) or '(none)'}

FILE STRUCTURE
--------------
{tree_str}

COMMIT HISTORY SIGNALS
-----------------------
Total commits: {ai_signals['total_commits']}
Time span: {ai_signals['time_span_hours']:.1f} hours (first → last commit)
Generic commit messages: {ai_signals['generic_message_count']}/{ai_signals['total_commits']} ({int(ai_signals['generic_message_ratio']*100)}%)
Largest 1-hour commit burst: {ai_signals['max_burst']} commits

Commit log:
{commit_lines or '  (no commits found)'}

KEY FILE CONTENTS
-----------------
{files_block or '(no file contents retrieved)'}

EVALUATION TASK
---------------
Score this project across 4 dimensions. Be CONSTRUCTIVE — always include both positives (what was done well) AND negatives (what needs improvement) in EVERY section, even if the project is excellent or terrible.

SCORING CRITERIA
----------------
code_quality (0-100):
  - Code organization, naming conventions, DRY principles
  - Error handling and edge cases
  - Readability and consistency
  - Use of appropriate patterns

ai_detection score (0-100 = confidence that AI generated the code):
  Weigh these signals:
  * Very few commits OR entire project in one/two commits → high suspicion (+30)
  * Generic commit messages (>50% generic ratio) → moderate suspicion (+20)
  * Project uploaded all at once (time_span < 2 hours for a complex project) → high suspicion (+25)
  * Overly verbose/perfect comments explaining obvious things → moderate (+15)
  * No fix/debug/oops commits visible → moderate suspicion (+10)
  * Code style is suspiciously consistent throughout (no learning curve) → low (+10)
  * Conversely: iterative commits over days/weeks → reduce suspicion (-30)
  * Varied commit messages showing real work → reduce suspicion (-20)
  Set is_likely_ai: true if score > 65.
  In positives: list evidence of human authorship.
  In negatives: list AI suspicion signals you actually observed.

project_structure (0-100):
  - File and folder organization
  - Separation of concerns
  - Follows conventions for the language/framework
  - README and documentation

concept_mastery (0-100):
  - Does the code ACTUALLY use the required concepts (not just import them)?
  - Depth of usage — surface call vs. real understanding
  - Mark concepts_demonstrated only if you saw real usage in the code
  - Mark concepts_missing for concepts not clearly demonstrated

SCORING FORMULA (apply this exactly)
--------------------------------------
overall_score = round(code_quality * 0.30 + (100 - ai_detection.score) * 0.20 + project_structure * 0.25 + concept_mastery * 0.25)

RULES
-----
1. overall_feedback: 2-3 paragraphs, constructive, specific to THIS repo. Reference actual files or patterns you saw.
2. recommendations: 3-5 specific, actionable next steps. Reference actual files/patterns you observed.
3. Every section MUST have at least 1 positive and 1 negative.
4. Do NOT invent file contents — only evaluate what was shown above.

OUTPUT FORMAT
-------------
Return ONLY valid JSON — no markdown fences, no extra text.
Schema:
{_EVAL_JSON_SCHEMA}"""


def _parse_response(text: str) -> Dict:
    """Strip markdown fences and parse JSON."""
    text = text.strip()
    if text.startswith("```"):
        lines = text.splitlines()
        text = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])
    return json.loads(text)


def _recompute_overall_score(result: Dict) -> int:
    """Recompute overall_score server-side to ensure determinism."""
    cq = result.get("code_quality", {}).get("score", 0)
    ai = result.get("ai_detection", {}).get("score", 0)
    ps = result.get("project_structure", {}).get("score", 0)
    cm = result.get("concept_mastery", {}).get("score", 0)
    return round(cq * 0.30 + (100 - ai) * 0.20 + ps * 0.25 + cm * 0.25)


def evaluate_repository(
    owner: str,
    repo: str,
    concepts: List[str],
    project_description: Optional[str],
    github_token: Optional[str],
    call_gemini_fn: Callable[[str], str],
) -> Dict:
    """
    Full evaluation pipeline:
    1. Fetch repo snapshot (file tree, contents, commits)
    2. Compute AI detection signals
    3. Build evaluation prompt
    4. Call Gemini
    5. Parse, recompute overall_score, and return result dict

    Raises:
        RuntimeError: If Gemini call fails.
        json.JSONDecodeError: If LLM returns invalid JSON.
    """
    logger.info(f"Evaluating repository {owner}/{repo} for concepts: {concepts}")

    snapshot = build_repo_snapshot(owner, repo, github_token)
    ai_signals = compute_ai_detection_signals(snapshot["commit_history"])

    logger.info(
        f"AI signals: {ai_signals['total_commits']} commits, "
        f"{ai_signals['time_span_hours']}h span, "
        f"{int(ai_signals['generic_message_ratio']*100)}% generic msgs"
    )

    prompt = _build_evaluate_prompt(snapshot, concepts, project_description, ai_signals)
    raw_text = call_gemini_fn(prompt)

    result = _parse_response(raw_text)

    # Override overall_score with server-computed value
    result["overall_score"] = _recompute_overall_score(result)

    # Ensure is_likely_ai is set correctly
    ai_score = result.get("ai_detection", {}).get("score", 0)
    if "ai_detection" in result:
        result["ai_detection"]["is_likely_ai"] = ai_score > 65

    return result
