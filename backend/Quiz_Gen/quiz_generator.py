"""
QUIZ GENERATOR
==============

Generates adaptive quiz questions for Rolemap learners.

Inputs:
  - topics          : list of concept/node names being tested
  - learned_resources: URLs or resource titles the user has already studied
  - difficulty      : 1 (Beginner) → 5 (Expert)
  - learning_style  : e.g. "Interactive-Heavy", "Reading-Heavy", "Hands-on"

Output:
  JSON array of quiz questions, each with:
    question, type, options, correct_answer, explanation, difficulty, topic
"""

import os
import json
import time
import argparse
from typing import List, Dict, Any
from pathlib import Path
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv(Path(__file__).parent.parent / ".env")

# ---------------------------------------------------------------------------
# Gemini key rotation — loads all GEMINI_API_KEY, _2, _3, _4, ... from .env
# ---------------------------------------------------------------------------

def _load_gemini_keys() -> list:
    keys = []
    k = os.getenv("GEMINI_API_KEY")
    if k:
        keys.append(k)
    i = 2
    while True:
        k = os.getenv(f"GEMINI_API_KEY_{i}")
        if not k:
            break
        keys.append(k)
        i += 1
    return keys

GEMINI_API_KEYS = _load_gemini_keys()
CURRENT_KEY_INDEX = 0


def call_gemini(prompt: str) -> str:
    """Call Gemini, cycling through all available keys on failure."""
    global CURRENT_KEY_INDEX

    if not GEMINI_API_KEYS:
        raise RuntimeError("No Gemini API keys configured in .env")

    last_error = None
    for _ in range(len(GEMINI_API_KEYS)):
        key = GEMINI_API_KEYS[CURRENT_KEY_INDEX]
        try:
            genai.configure(api_key=key)
            model = genai.GenerativeModel("gemini-2.0-flash")
            response = model.generate_content(prompt)
            print(f"  [GEMINI] Key {CURRENT_KEY_INDEX + 1}/{len(GEMINI_API_KEYS)} used")
            return response.text
        except Exception as e:
            last_error = e
            print(f"  [WARNING] Gemini key {CURRENT_KEY_INDEX + 1}/{len(GEMINI_API_KEYS)} failed: {str(e)[:80]}")
            CURRENT_KEY_INDEX = (CURRENT_KEY_INDEX + 1) % len(GEMINI_API_KEYS)

    raise RuntimeError(f"All {len(GEMINI_API_KEYS)} Gemini keys failed. Last: {last_error}")


# ---------------------------------------------------------------------------
# Difficulty mapping
# ---------------------------------------------------------------------------

DIFFICULTY_CONFIG = {
    1: {
        "label": "Beginner",
        "allowed_types": ["true_false", "multiple_choice"],
        "question_count": 5,
        "description": "Basic definitions and recall. Use simple language and obvious distractors.",
    },
    2: {
        "label": "Elementary",
        "allowed_types": ["multiple_choice"],
        "question_count": 6,
        "description": "Conceptual understanding. Use plausible but clearly wrong distractors.",
    },
    3: {
        "label": "Intermediate",
        "allowed_types": ["multiple_choice", "short_answer"],
        "question_count": 7,
        "description": "Applied reasoning. Questions require understanding, not just recall.",
    },
    4: {
        "label": "Advanced",
        "allowed_types": ["short_answer", "code_challenge"],
        "question_count": 8,
        "description": "Deep analysis and problem-solving. Include edge cases and tradeoffs.",
    },
    5: {
        "label": "Expert",
        "allowed_types": ["code_challenge", "multiple_choice"],
        "question_count": 10,
        "description": "Architecture, debugging, and design decisions. Scenario-based questions.",
    },
}


# ---------------------------------------------------------------------------
# Core pipeline
# ---------------------------------------------------------------------------

def build_resource_context(learned_resources: List[str]) -> str:
    """Format all learned resources into a compact string for the prompt."""
    if not learned_resources:
        return "No specific resources provided."
    lines = [f"  - {r}" for r in learned_resources]
    return "\n".join(lines)


def build_prompt(
    topics: List[str],
    resource_context: str,
    difficulty: int,
    learning_style: str,
) -> str:
    cfg = DIFFICULTY_CONFIG[difficulty]
    topics_str = ", ".join(f'"{t}"' for t in topics)
    types_str = ", ".join(cfg["allowed_types"])
    n = cfg["question_count"]

    return f"""You are a technical quiz author for a developer learning platform called Rolemap.

Generate exactly {n} quiz questions that test knowledge of {topics_str} at {cfg["label"]} level.

LEARNER CONTEXT
---------------
Studied resources:
{resource_context}

Learning style: {learning_style}

DIFFICULTY GUIDELINES
---------------------
Level {difficulty} — {cfg["label"]}: {cfg["description"]}
Allowed question types: {types_str}

RULES
-----
1. Distribute questions evenly across topics if multiple topics are given.
2. For multiple_choice: provide exactly 4 options as a list ["A. ...", "B. ...", "C. ...", "D. ..."].
   correct_answer must be just the letter, e.g. "B".
3. For true_false: options must be ["True", "False"].
   correct_answer must be "True" or "False".
4. For short_answer: options must be an empty list [].
   correct_answer is a concise model answer (1-3 sentences).
5. For code_challenge: include a small code snippet in the question text.
   options must be an empty list [].
   correct_answer is the corrected/completed code or explanation.
6. In the explanation field, reference the studied resources where relevant
   (e.g. "As covered in the Docker networking docs, ...").
7. Adapt question phrasing to a {learning_style} learner.
8. Do NOT invent URLs or resource links inside questions or explanations.

OUTPUT FORMAT
-------------
Return ONLY a valid JSON array — no markdown fences, no extra text.
Each element must follow this exact schema:

{{
  "question": "...",
  "type": "multiple_choice | true_false | short_answer | code_challenge",
  "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
  "correct_answer": "...",
  "explanation": "...",
  "difficulty": {difficulty},
  "topic": "..."
}}"""


def parse_llm_response(response_text: str) -> List[Dict]:
    """Strip markdown fences and parse the JSON array from the LLM response."""
    text = response_text.strip()
    # Strip ```json ... ``` fences if present
    if text.startswith("```"):
        lines = text.splitlines()
        text = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])
    return json.loads(text)


def validate_questions(questions: List[Dict]) -> List[Dict]:
    """Drop any question missing required fields."""
    required = {"question", "type", "correct_answer", "explanation", "difficulty", "topic"}
    valid = []
    for q in questions:
        if not isinstance(q, dict):
            continue
        if not required.issubset(q.keys()):
            print(f"  [WARN] Dropping question missing fields: {required - q.keys()}")
            continue
        if "options" not in q:
            q["options"] = []
        valid.append(q)
    return valid


def generate_quiz(
    topics: List[str],
    learned_resources: List[str],
    difficulty: int,
    learning_style: str,
) -> Dict[str, Any]:
    """
    Main quiz generation pipeline.

    Returns a dict with keys: metadata, questions, total_questions.
    """
    print(f"\n{'='*60}")
    print(f"QUIZ GENERATOR")
    print(f"Topics      : {', '.join(topics)}")
    print(f"Difficulty  : {difficulty} — {DIFFICULTY_CONFIG[difficulty]['label']}")
    print(f"Style       : {learning_style}")
    print(f"Resources   : {len(learned_resources)} provided")
    print(f"{'='*60}")

    start = time.time()

    resource_context = build_resource_context(learned_resources)
    prompt = build_prompt(topics, resource_context, difficulty, learning_style)

    print("\n[1/3] Sending prompt to Gemini...")
    raw_text = call_gemini(prompt)

    print("[2/3] Parsing response...")
    try:
        raw_questions = parse_llm_response(raw_text)
    except json.JSONDecodeError as e:
        print(f"  [ERROR] JSON parse failed: {e}")
        print(f"  Raw response (first 300 chars): {response.text[:300]}")
        raise

    print("[3/3] Validating questions...")
    questions = validate_questions(raw_questions)

    elapsed = round(time.time() - start, 2)

    output = {
        "metadata": {
            "topics": topics,
            "difficulty": difficulty,
            "difficulty_label": DIFFICULTY_CONFIG[difficulty]["label"],
            "learning_style": learning_style,
            "resources_used": len(learned_resources),
            "processing_time_seconds": elapsed,
            "model": "gemini-2.0-flash",
        },
        "questions": questions,
        "total_questions": len(questions),
    }

    print(f"\n[SUCCESS] Generated {len(questions)} questions in {elapsed}s")
    print(json.dumps(output, indent=2))
    return output


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Rolemap Quiz Generator")
    parser.add_argument("topics", nargs="+", help="One or more topic names")
    parser.add_argument(
        "--resources", nargs="*", default=[],
        help="URLs or resource titles the learner has already studied"
    )
    parser.add_argument(
        "--difficulty", type=int, default=3, choices=[1, 2, 3, 4, 5],
        help="Difficulty level 1 (Beginner) to 5 (Expert)"
    )
    parser.add_argument(
        "--style", default="Interactive-Heavy",
        help='Learning style, e.g. "Reading-Heavy", "Hands-on", "Interactive-Heavy"'
    )
    args = parser.parse_args()

    generate_quiz(
        topics=args.topics,
        learned_resources=args.resources,
        difficulty=args.difficulty,
        learning_style=args.style,
    )
