"""
Quiz Generator — Test Runner

Test matrix:
  - 3 topic scenarios × 3 difficulty levels = 9 test cases

Quality checks per result:
  - questions array is non-empty                   (25 pts)
  - all required fields present on every question  (25 pts)
  - question types match difficulty constraints    (25 pts)
  - options list correct for MCQ/T_F               (25 pts)

Pass threshold: ≥ 80% success rate + avg quality ≥ 75
"""

import sys
import json
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from quiz_generator import generate_quiz, DIFFICULTY_CONFIG

# ---------------------------------------------------------------------------
# Test cases
# ---------------------------------------------------------------------------

TEST_CASES = [
    # (topics, learned_resources, difficulty, learning_style)
    (["Python", "List Comprehensions"], ["https://docs.python.org/3/tutorial/datastructures.html"], 1, "Reading-Heavy"),
    (["Docker", "Container Networking"], ["https://docs.docker.com/engine/network/"], 3, "Hands-on"),
    (["React", "State Management"], ["https://react.dev/learn/managing-state"], 5, "Interactive-Heavy"),
    (["SQL", "Joins"], ["https://postgresqltutorial.com/postgresql-joins/"], 2, "Reading-Heavy"),
    (["Kubernetes"], [], 4, "Hands-on"),
    (["Machine Learning", "Neural Networks"], ["https://pytorch.org/tutorials/"], 3, "Interactive-Heavy"),
    (["CSS", "Flexbox"], ["https://css-tricks.com/snippets/css/a-guide-to-flexbox/"], 1, "Interactive-Heavy"),
    (["Django", "REST APIs"], ["https://docs.djangoproject.com/"], 4, "Hands-on"),
    (["Cybersecurity", "OWASP Top 10"], ["https://owasp.org/www-project-top-ten/"], 5, "Reading-Heavy"),
]

REQUIRED_FIELDS = {"question", "type", "correct_answer", "explanation", "difficulty", "topic"}


# ---------------------------------------------------------------------------
# Validators
# ---------------------------------------------------------------------------

def validate_result(result: dict, difficulty: int) -> int:
    """Return quality score 0-100."""
    score = 0
    questions = result.get("questions", [])

    # 1. Non-empty
    if questions:
        score += 25

    # 2. Required fields on every question
    all_have_fields = all(REQUIRED_FIELDS.issubset(q.keys()) for q in questions)
    if all_have_fields and questions:
        score += 25

    # 3. Types match allowed types for difficulty
    allowed = set(DIFFICULTY_CONFIG[difficulty]["allowed_types"])
    types_ok = all(q.get("type") in allowed for q in questions)
    if types_ok and questions:
        score += 25

    # 4. Options list correct for MCQ/T_F
    options_ok = True
    for q in questions:
        qtype = q.get("type", "")
        opts = q.get("options", [])
        if qtype == "multiple_choice" and len(opts) != 4:
            options_ok = False
            break
        if qtype == "true_false" and set(opts) != {"True", "False"}:
            options_ok = False
            break
        if qtype in ("short_answer", "code_challenge") and opts:
            options_ok = False
            break
    if options_ok and questions:
        score += 25

    return score


# ---------------------------------------------------------------------------
# Runner
# ---------------------------------------------------------------------------

def run_test(topics, resources, difficulty, style) -> tuple[bool, int, float]:
    label = f"{', '.join(topics)} (diff={difficulty})"
    print(f"\n  Testing: {label}")
    t0 = time.time()
    try:
        result = generate_quiz(
            topics=topics,
            learned_resources=resources,
            difficulty=difficulty,
            learning_style=style,
        )
        elapsed = time.time() - t0
        score = validate_result(result, difficulty)
        passed = score >= 75
        status = "PASS" if passed else "FAIL"
        print(f"  [{status}] Quality score: {score}/100 | {result['total_questions']} questions | {elapsed:.1f}s")
        return passed, score, elapsed
    except Exception as e:
        elapsed = time.time() - t0
        print(f"  [ERROR] {e}")
        return False, 0, elapsed


def main():
    print("\n" + "=" * 60)
    print("QUIZ GENERATOR TEST RUNNER")
    print("=" * 60)

    passed_count = 0
    scores = []
    total = len(TEST_CASES)

    for topics, resources, difficulty, style in TEST_CASES:
        passed, score, _ = run_test(topics, resources, difficulty, style)
        if passed:
            passed_count += 1
        scores.append(score)

    avg_score = sum(scores) / len(scores) if scores else 0
    success_rate = passed_count / total * 100

    print("\n" + "=" * 60)
    print(f"RESULTS: {passed_count}/{total} passed ({success_rate:.0f}%)")
    print(f"Average quality score: {avg_score:.1f}/100")

    if success_rate >= 80 and avg_score >= 75:
        print("OVERALL: PASS")
        sys.exit(0)
    else:
        print("OVERALL: FAIL")
        sys.exit(1)


if __name__ == "__main__":
    main()
