"""
roadmap.sh parser — clones/updates kamranahmedse/developer-roadmap and
extracts Concept nodes + PREREQUISITE_FOR edges from each roadmap JSON.

Roadmap JSON files live at:
  <repo>/public/roadmaps/<slug>.json   (newer format)
  OR
  <repo>/src/data/roadmaps/<slug>/content/...   (older format)

This parser handles the newer public JSON format which contains a "nodes"
and "edges" array — the same format used by roadmap.sh's interactive viewer.

Caches parsed output to data/raw/{slug}_concepts.json
"""

import json
import re
import subprocess
from pathlib import Path

RAW_DIR = Path(__file__).parent.parent / "data" / "raw"
ROADMAPS_DIR = Path(__file__).parent.parent / "data" / "roadmaps"
REPO_URL = "https://github.com/kamranahmedse/developer-roadmap.git"
RAW_DIR.mkdir(parents=True, exist_ok=True)
ROADMAPS_DIR.mkdir(parents=True, exist_ok=True)


# ---------------------------------------------------------------------------
# Repo management
# ---------------------------------------------------------------------------

def ensure_repo(use_cache: bool = True) -> Path:
    """Clone or pull the developer-roadmap repo. Returns the repo root path."""
    repo_path = ROADMAPS_DIR / "developer-roadmap"

    if repo_path.exists():
        if not use_cache:
            print("  [roadmap.sh] Updating repo (git pull)...")
            subprocess.run(
                ["git", "-C", str(repo_path), "pull", "--quiet"],
                check=True,
            )
        else:
            print("  [roadmap.sh] Using existing repo clone.")
    else:
        print(f"  [roadmap.sh] Cloning {REPO_URL} (this may take a minute)...")
        subprocess.run(
            ["git", "clone", "--depth=1", "--quiet", REPO_URL, str(repo_path)],
            check=True,
        )

    return repo_path


# ---------------------------------------------------------------------------
# Name normalisation helpers
# ---------------------------------------------------------------------------

_EMOJI_RE = re.compile(
    "["
    "\U0001F600-\U0001F64F"
    "\U0001F300-\U0001F5FF"
    "\U0001F680-\U0001F6FF"
    "\U0001F1E0-\U0001F1FF"
    "\U00002702-\U000027B0"
    "\U000024C2-\U0001F251"
    "]+",
    flags=re.UNICODE,
)


def _clean_name(raw: str) -> str:
    """Strip emoji, extra whitespace, and leading punctuation from a topic name."""
    s = _EMOJI_RE.sub("", raw)
    s = re.sub(r"^\W+", "", s)  # leading non-word chars
    return s.strip()


# ---------------------------------------------------------------------------
# JSON format detection & parsing
# ---------------------------------------------------------------------------

def _find_roadmap_json(repo_path: Path, slug: str) -> Path | None:
    """
    Look for a roadmap JSON in the expected locations within the repo.
    Returns the path if found, else None.
    """
    candidates = [
        repo_path / "public" / "roadmaps" / f"{slug}.json",
        repo_path / "src" / "data" / "roadmaps" / f"{slug}" / f"{slug}.json",
        repo_path / "src" / "data" / f"{slug}.json",
    ]
    for candidate in candidates:
        if candidate.exists():
            return candidate

    # Recursive search as fallback
    matches = list(repo_path.rglob(f"{slug}.json"))
    if matches:
        return matches[0]

    return None


def _parse_nodes_edges_format(data: dict) -> tuple[list[dict], list[dict]]:
    """
    Parse the newer roadmap.sh JSON format:
      { "nodes": [...], "edges": [...] }

    Node types of interest: "topic", "subtopic"
    Each node has: id, type, data.label (the topic name)
    Each edge has: source, target (node ids)
    """
    raw_nodes = data.get("nodes", [])
    raw_edges = data.get("edges", [])

    concepts: list[dict] = []
    seen_ids: set[str] = set()

    for node in raw_nodes:
        node_type = node.get("type", "")
        if node_type not in ("topic", "subtopic"):
            continue
        node_id = node.get("id", "")
        label = node.get("data", {}).get("label", "") or node.get("label", "")
        name = _clean_name(str(label))
        if not name or node_id in seen_ids:
            continue
        seen_ids.add(node_id)
        concepts.append({"id": node_id, "name": name})

    # Build id → canonical name map for edge resolution
    id_to_name = {c["id"]: c["name"] for c in concepts}

    prereq_edges: list[dict] = []
    for edge in raw_edges:
        src = edge.get("source", "")
        tgt = edge.get("target", "")
        if src in id_to_name and tgt in id_to_name:
            prereq_edges.append(
                {"from": id_to_name[src], "to": id_to_name[tgt]}
            )

    return concepts, prereq_edges


def _parse_content_directory_format(repo_path: Path, slug: str) -> tuple[list[dict], list[dict]]:
    """
    Fallback: parse older roadmap.sh format where content lives in
    src/data/roadmaps/<slug>/content/**/*.md files.
    We extract topic names from filenames and infer shallow hierarchy from
    directory depth.
    """
    content_dir = repo_path / "src" / "data" / "roadmaps" / slug / "content"
    if not content_dir.exists():
        return [], []

    concepts: list[dict] = []
    prereq_edges: list[dict] = []
    seen: set[str] = set()
    parent_map: dict[str, str] = {}  # child_name → parent_name

    for md_file in sorted(content_dir.rglob("*.md")):
        # Derive a readable name from the filename
        stem = md_file.stem
        # Remove numeric prefixes like "100-" or "1-"
        stem = re.sub(r"^\d+[-_]", "", stem)
        name = _clean_name(stem.replace("-", " ").replace("_", " ").title())
        if not name or name in seen:
            continue
        seen.add(name)
        concepts.append({"id": str(md_file), "name": name})

        # Shallow hierarchy: immediate parent directory name → child name
        parent_dir = md_file.parent
        if parent_dir != content_dir:
            parent_stem = parent_dir.name
            parent_stem = re.sub(r"^\d+[-_]", "", parent_stem)
            parent_name = _clean_name(
                parent_stem.replace("-", " ").replace("_", " ").title()
            )
            parent_map[name] = parent_name

    # Build edges: parent PREREQUISITE_FOR child
    name_set = {c["name"] for c in concepts}
    for child, parent in parent_map.items():
        if parent in name_set:
            prereq_edges.append({"from": parent, "to": child})

    return concepts, prereq_edges


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def parse_roadmap(slug: str, repo_path: Path, use_cache: bool = True) -> dict:
    """
    Parse a single roadmap by slug.

    Returns:
        {
            "slug": str,
            "concepts": [{"id": str, "name": str}, ...],
            "prereq_edges": [{"from": str, "to": str}, ...],
        }
    """
    cache_path = RAW_DIR / f"{slug}_concepts.json"
    if use_cache and cache_path.exists():
        with cache_path.open() as f:
            return json.load(f)

    print(f"  [roadmap.sh] Parsing roadmap: {slug}")

    json_path = _find_roadmap_json(repo_path, slug)
    concepts: list[dict] = []
    prereq_edges: list[dict] = []

    if json_path:
        with json_path.open(encoding="utf-8") as f:
            data = json.load(f)

        if "nodes" in data and "edges" in data:
            concepts, prereq_edges = _parse_nodes_edges_format(data)
        else:
            # Some files wrap in a top-level key
            for key in data:
                if isinstance(data[key], dict) and "nodes" in data[key]:
                    concepts, prereq_edges = _parse_nodes_edges_format(data[key])
                    break

    # Fallback to content directory format
    if not concepts:
        concepts, prereq_edges = _parse_content_directory_format(repo_path, slug)

    if not concepts:
        print(f"  [roadmap.sh] WARNING: No concepts found for slug '{slug}'")

    result = {
        "slug": slug,
        "concepts": concepts,
        "prereq_edges": prereq_edges,
    }

    with cache_path.open("w") as f:
        json.dump(result, f, indent=2)

    print(
        f"  [roadmap.sh] {slug}: {len(concepts)} concepts, "
        f"{len(prereq_edges)} prerequisite edges"
    )
    return result


def parse_all_roadmaps(
    slugs: list[str], repo_path: Path, use_cache: bool = True
) -> dict[str, dict]:
    """Parse all roadmap slugs. Returns a dict keyed by slug."""
    results: dict[str, dict] = {}
    seen_slugs: set[str] = set()
    for slug in slugs:
        if slug is None or slug in seen_slugs:
            continue
        seen_slugs.add(slug)
        results[slug] = parse_roadmap(slug, repo_path, use_cache=use_cache)
    return results
