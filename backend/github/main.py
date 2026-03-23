"""GitHub Skill Analyzer entry point.

Usage:
    python backend/github/main.py --username <github_username>
    python backend/github/main.py --username <github_username> --no-llm
    python backend/github/main.py --username <github_username> --out path/to/output.json
"""
import argparse
import io
import json
import os
import sys
from pathlib import Path

# Force UTF-8 output on Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace", line_buffering=True)
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace", line_buffering=True)

# Ensure local imports resolve when run from repo root
sys.path.insert(0, str(Path(__file__).parent))

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / ".env")  # backend/.env

from client import GitHubClient
from analyzer import build_compact_summary, NOISE_LANGUAGES
import llm_assessor

_DEFAULT_OUTPUT = Path(__file__).parent.parent / "output" / "github_result.json"


def run(username: str, use_llm: bool = True) -> dict:
    token = os.getenv("GITHUB_TOKEN")
    client = GitHubClient(token=token)

    print(f"[1/4] Fetching profile for: {username}")
    user = client.get_user(username)
    print(f"      → {user.get('name') or username} | {user.get('public_repos', 0)} repos")

    print("[2/4] Fetching repositories")
    repos = client.get_repos(username)
    non_forks = [r for r in repos if not r.get("fork")]
    print(f"      → {len(repos)} repos total ({len(non_forks)} non-fork)")

    print("[3/4] Fetching language data")
    language_data: dict[str, dict] = {}
    for i, repo in enumerate(non_forks, 1):
        print(f"      [{i}/{len(non_forks)}] {repo['name']}", end="\r")
        try:
            language_data[repo["name"]] = client.get_repo_languages(username, repo["name"])
        except Exception as e:
            print(f"\n      [warn] Could not fetch languages for {repo['name']}: {e}")
    print()  # newline after \r progress

    print("[4/4] Fetching public activity")
    events = client.get_public_events(username)
    push_events = [e for e in events if e.get("type") == "PushEvent"]
    print(f"      → {len(events)} events ({len(push_events)} pushes)")

    summary_text, structured_data = build_compact_summary(username, user, repos, language_data, events)

    print("\n--- Profile Summary ---")
    print(summary_text)
    print("-----------------------\n")

    if use_llm:
        print("[LLM] Assessing profile with gemini-2.5-flash...")
        assessment_raw = llm_assessor.assess(summary_text, structured_data)
    else:
        print("[LLM] Skipped — using heuristic assessment")
        assessment_raw = llm_assessor._heuristic_level(structured_data)

    primary_languages = [
        lang for lang in structured_data["languages"]
        if lang not in NOISE_LANGUAGES
    ][:5]
    bio_skills = structured_data.get("bio_skills", [])
    strengths = list(dict.fromkeys(
        bio_skills + primary_languages + assessment_raw.get("detected_frameworks", [])
    ))[:10]

    result = {
        "username": username,
        "profile": structured_data["profile"],
        "languages": structured_data["languages"],
        "activity": structured_data["activity"],
        "top_repos": structured_data["top_repos"],
        "skill_assessment": {
            "primary_languages": primary_languages,
            "bio_skills": bio_skills,
            "detected_frameworks": assessment_raw.get("detected_frameworks", []),
            "estimated_level": assessment_raw.get("estimated_level", "unknown"),
            "level_reasons": assessment_raw.get("level_reasons", []),
            "assessment_summary": assessment_raw.get("assessment_summary", ""),
            "strengths": strengths,
        },
    }
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description="Analyze a GitHub user's skills")
    parser.add_argument("--username", required=True, help="GitHub username to analyze")
    parser.add_argument("--out", type=Path, default=_DEFAULT_OUTPUT, help="Output JSON path")
    parser.add_argument("--no-llm", action="store_true", help="Skip LLM, use heuristic only")
    args = parser.parse_args()

    try:
        result = run(args.username, use_llm=not args.no_llm)
    except Exception as e:
        print(f"[error] {e}", file=sys.stderr)
        sys.exit(1)

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\nDone! Output written to: {args.out}")

    sa = result["skill_assessment"]
    print(f"  level      : {sa['estimated_level']}")
    print(f"  languages  : {', '.join(sa['primary_languages']) or '(none)'}")
    print(f"  frameworks : {', '.join(sa['detected_frameworks']) or '(none)'}")
    print(f"  strengths  : {', '.join(sa['strengths']) or '(none)'}")
    if sa["assessment_summary"]:
        print(f"  summary    : {sa['assessment_summary']}")


if __name__ == "__main__":
    main()
