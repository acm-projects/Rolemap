"""
dump_concepts.py

Utility to extract Concept node names from the most recent Neo4j snapshot
and write a tiered vocabulary JSON for use by normalize_linkedin_csv.py.

Usage:
    cd normalization_testing
    python dump_concepts.py
    python dump_concepts.py --snapshot ../backend/output/backups/neo4j_snapshot_20260314_195931.json

Output: concepts.json in the same directory as this script.

Two tiers:
  extractable   - safe for regex boundary extraction from free text
  validate_only - exist in graph but too ambiguous for blind regex
                  (used only to validate skills already found by other means)
"""

import argparse
import json
import re
from datetime import datetime, timezone, timedelta
from pathlib import Path

# ─── Tier 2: single-word concepts too generic for safe regex extraction ────────
# These appear in the graph but are common English words that would produce
# massive false positives if scanned against raw job description text.
AMBIGUOUS_SINGLE_WORDS = {
    "Activity",
    "Base",
    "Baseline",
    "Box",
    "Bus",
    "Buttons",
    "Caching",
    "Capabilities",
    "Closures",
    "Coding",
    "Compliance",
    "Components",
    "Concurrency",
    "Containers",
    "Containment",
    "Credentials",
    "Debugging",
    "Decline",
    "Development",
    "Discovery",
    "Distribution",
    "Editors",
    "Execution",
    "Flow",
    "Frame",
    "Frameworks",
    "Groups",
    "Growth",
    "Internet",
    "Launch",
    "Maturity",
    "Permissions",
    "Recovery",
    "Release",
    "Roles",
    "Scale",
    "Scope",
    "Security",
    "Services",
    "Sessions",
    "Storage",
    "Testing",
    "Text",
    "Tools",
    "Trust",
    "Views",
    "Windows",
    "Business",
    "Communication",
    "Deployment",
    "Design",
    "Development",
    "Discovery",
    "Distribution",
    "Execution",
    "Integration",
    "Management",
    "Monitoring",
    "Operations",
    "Planning",
    "Research",
    "Strategy",
}

# ─── Patterns that indicate a non-extractable meta-concept ────────────────────
_SKIP_PREFIXES_LOWER = (
    "learn ",
    "understand ",
    "pick a",
    "basics of",
    "basic ",
    "checkpoint",
    "create a",
    "history and why",
    "benefits over",
    "introduction to",
    "overview of",
    "getting started",
    "how to ",
    "advanced analysis",
    "defining ",
    "communicating ",
    "building ",
    "finding ",
    "building and ",
    "choosing ",
    "setting up ",
)

def _is_skippable(name: str) -> bool:
    """Return True if the concept name should not be included in either tier."""
    if not name or not name.strip():
        return True
    # Questions
    if "?" in name:
        return True
    low = name.strip().lower()
    for prefix in _SKIP_PREFIXES_LOWER:
        if low.startswith(prefix):
            return True
    return False


def _is_extractable(name: str) -> bool:
    """
    Return True if this concept name is safe for regex boundary extraction.
    Multi-word phrases are almost always safe.
    Single words are safe only if they are NOT in AMBIGUOUS_SINGLE_WORDS.
    """
    stripped = name.strip()
    # Single-word check
    if " " not in stripped and "/" not in stripped and "-" not in stripped.replace("-", ""):
        # Check against ambiguous set (case-insensitive)
        if stripped in AMBIGUOUS_SINGLE_WORDS or stripped.lower() in {a.lower() for a in AMBIGUOUS_SINGLE_WORDS}:
            return False
        # Also skip very generic single words (lowercase common English)
        if stripped.islower() and len(stripped) > 5 and stripped not in {
            "python", "docker", "ansible", "terraform", "jenkins", "grafana",
            "splunk", "kibana", "airflow", "consul", "envoy", "istio",
            "flink", "kafka", "redis", "nginx", "apache", "hadoop",
            "spark", "pandas", "numpy", "pytorch", "flask", "django",
            "fastapi", "celery", "grpc", "graphql",
        }:
            # Be conservative: single lowercase words that aren't known tech
            # are likely fragment noise from roadmap.sh parsing
            pass  # allow through — synonym map will filter at extract time
    return True


def find_latest_snapshot(backups_dir: Path) -> Path | None:
    snapshots = sorted(backups_dir.glob("neo4j_snapshot_*.json"), reverse=True)
    return snapshots[0] if snapshots else None


def check_staleness(snapshot_path: Path, warn_days: int = 7) -> None:
    mtime = datetime.fromtimestamp(snapshot_path.stat().st_mtime, tz=timezone.utc)
    age = datetime.now(timezone.utc) - mtime
    if age > timedelta(days=warn_days):
        print(f"WARNING: snapshot is {age.days} days old — consider re-running backup_neo4j_json.py")


def main():
    parser = argparse.ArgumentParser(description="Dump Neo4j Concept nodes to concepts.json")
    parser.add_argument(
        "--snapshot",
        default=None,
        help="Path to a specific neo4j_snapshot_*.json (default: latest in backend/output/backups/)",
    )
    parser.add_argument(
        "--out",
        default=None,
        help="Output JSON path (default: concepts.json next to this script)",
    )
    args = parser.parse_args()

    script_dir = Path(__file__).parent

    # Locate snapshot
    if args.snapshot:
        snapshot_path = Path(args.snapshot).resolve()
    else:
        backups_dir = script_dir.parent.parent / "output" / "backups"
        snapshot_path = find_latest_snapshot(backups_dir)
        if not snapshot_path:
            raise FileNotFoundError(f"No snapshot found in {backups_dir}. Run backend/backup_neo4j_json.py first.")

    check_staleness(snapshot_path)
    print(f"Loading snapshot: {snapshot_path.name}")

    with open(snapshot_path, encoding="utf-8") as f:
        data = json.load(f)

    # Extract unique Concept node names
    raw_names = set()
    for node in data["nodes"]:
        if "Concept" in node.get("labels", []):
            name = node.get("props", {}).get("name", "")
            if name:
                raw_names.add(name.strip())

    print(f"Raw concept nodes: {len(raw_names)}")

    # Filter and tier
    extractable = []
    validate_only = []
    skipped = []

    for name in sorted(raw_names):
        if _is_skippable(name):
            skipped.append(name)
        elif _is_extractable(name):
            extractable.append(name)
        else:
            validate_only.append(name)

    # Also put ambiguous single-words into validate_only (not skipped)
    for name in sorted(raw_names):
        stripped = name.strip()
        if not _is_skippable(name) and not _is_extractable(name):
            if name not in validate_only:
                validate_only.append(name)

    # Deduplicate, keep sorted
    extractable = sorted(set(extractable))
    validate_only = sorted(set(validate_only))

    out_path = Path(args.out).resolve() if args.out else script_dir / "concepts.json"

    payload = {
        "generated_from": snapshot_path.name,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "snapshot_path": str(snapshot_path),
        "counts": {
            "raw": len(raw_names),
            "extractable": len(extractable),
            "validate_only": len(validate_only),
            "skipped": len(skipped),
        },
        "extractable": extractable,
        "validate_only": validate_only,
        "_skipped_preview": skipped[:30],
    }

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)

    print(f"Extractable concepts : {len(extractable)}")
    print(f"Validate-only        : {len(validate_only)}")
    print(f"Skipped (noise)      : {len(skipped)}")
    print(f"Written              : {out_path}")


if __name__ == "__main__":
    main()
