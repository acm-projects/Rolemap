"""
Quiz Generator — Health Check
Validates pipeline components before use.
"""

import os
import sys
import json
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")


def check_gemini_keys() -> bool:
    keys = [os.getenv("GEMINI_API_KEY"), os.getenv("GEMINI_API_KEY_2")]
    found = [k for k in keys if k]
    if not found:
        print("  [FAIL] No Gemini API keys found in .env")
        return False
    print(f"  [PASS] {len(found)} Gemini API key(s) configured")
    return True


def check_gemini_client() -> bool:
    try:
        sys.path.insert(0, str(Path(__file__).parent))
        from quiz_generator import get_gemini_client
        client = get_gemini_client()
        print(f"  [PASS] Gemini client initialised: {type(client).__name__}")
        return True
    except Exception as e:
        print(f"  [FAIL] Gemini client error: {e}")
        return False


def check_difficulty_config() -> bool:
    try:
        from quiz_generator import DIFFICULTY_CONFIG, build_prompt
        assert len(DIFFICULTY_CONFIG) == 5
        # Smoke-test prompt building for each level
        for level in range(1, 6):
            prompt = build_prompt(["Test Topic"], "No resources.", level, "Hands-on")
            assert len(prompt) > 100
        print("  [PASS] Difficulty config and prompt builder OK (levels 1-5)")
        return True
    except Exception as e:
        print(f"  [FAIL] Difficulty config error: {e}")
        return False


def run_integration_test() -> bool:
    """Generate 1 question at difficulty 1 to verify end-to-end."""
    try:
        from quiz_generator import generate_quiz
        result = generate_quiz(
            topics=["Python"],
            learned_resources=["https://docs.python.org"],
            difficulty=1,
            learning_style="Reading-Heavy",
        )
        assert result["total_questions"] >= 1
        q = result["questions"][0]
        assert "question" in q and "correct_answer" in q
        print(f"  [PASS] Integration test — got {result['total_questions']} question(s)")
        return True
    except Exception as e:
        print(f"  [FAIL] Integration test error: {e}")
        return False


def main():
    print("\n=== Quiz Generator Health Check ===\n")
    checks = [
        ("Gemini API keys", check_gemini_keys),
        ("Gemini client init", check_gemini_client),
        ("Difficulty config", check_difficulty_config),
        ("Integration test", run_integration_test),
    ]

    results = []
    for name, fn in checks:
        print(f"[{name}]")
        passed = fn()
        results.append(passed)
        print()

    passed_count = sum(results)
    total = len(results)
    print(f"Results: {passed_count}/{total} checks passed")

    if passed_count < total:
        sys.exit(1)
    print("All checks passed.")


if __name__ == "__main__":
    main()
