"""
GitHub repository fetcher for project evaluation.
Fetches file tree, selected file contents, and commit history.
"""

import base64
import logging
import os
import re
import time
from typing import Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

GITHUB_API_BASE = "https://api.github.com"

# File extensions worth reading for code analysis
CODE_EXTENSIONS = {
    ".py", ".js", ".ts", ".jsx", ".tsx", ".java", ".go", ".rs",
    ".cpp", ".c", ".cs", ".rb", ".php", ".swift", ".kt", ".vue",
    ".html", ".css", ".scss", ".sql", ".sh", ".yaml", ".yml",
}

# Config/entry files always read regardless of extension
ALWAYS_READ_NAMES = {
    "readme.md", "package.json", "requirements.txt", "pyproject.toml",
    "dockerfile", "docker-compose.yml", "docker-compose.yaml",
    "go.mod", "cargo.toml", "pom.xml", "build.gradle",
    ".env.example", "setup.py", "setup.cfg",
}

# Common entry-point filenames
ENTRY_POINT_NAMES = {
    "main.py", "app.py", "server.py", "index.py",
    "index.js", "index.ts", "app.js", "app.ts", "server.js", "server.ts",
    "main.go", "main.rs", "main.java", "main.cpp", "main.c",
    "app.tsx", "index.tsx", "App.tsx", "App.jsx",
}

# Directories to skip
SKIP_DIRS = {
    "node_modules", "vendor", "dist", "build", ".git",
    "__pycache__", ".next", ".nuxt", "venv", ".venv", "env",
    "coverage", ".nyc_output", "target", "out", "bin", "obj",
}

MAX_FILES_TO_READ = 25
MAX_FILE_CHARS = 8_000
MAX_TOTAL_CHARS = 80_000


def parse_github_url(raw_url: str) -> Tuple[str, str]:
    """
    Parse owner and repo from any of these forms:
      - https://github.com/owner/repo
      - https://github.com/owner/repo.git
      - github.com/owner/repo
      - owner/repo

    Returns (owner, repo). Raises ValueError if unparseable.
    """
    raw = raw_url.strip()

    # Try URL pattern first
    match = re.search(r'(?:https?://)?(?:www\.)?github\.com/([^/\s]+)/([^/\s?.#]+)', raw)
    if match:
        owner = match.group(1)
        repo = match.group(2).removesuffix(".git")
        return owner, repo

    # Try shorthand "owner/repo"
    parts = [p for p in raw.split("/") if p]
    if len(parts) == 2 and all(parts):
        return parts[0], parts[1].removesuffix(".git")

    raise ValueError(
        f"Cannot parse GitHub URL: '{raw_url}'. "
        "Expected 'https://github.com/owner/repo' or 'owner/repo'."
    )


def _github_get(path: str, token: Optional[str], params: Optional[Dict] = None) -> Dict:
    """Make a GitHub API GET request. Retries once on rate-limit (403/429)."""
    import requests

    headers = {
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"

    url = f"{GITHUB_API_BASE}{path}"
    for attempt in range(2):
        resp = requests.get(url, headers=headers, params=params, timeout=30)
        if resp.status_code in (403, 429) and attempt == 0:
            logger.warning(f"GitHub rate-limit on {path}, sleeping 60s")
            time.sleep(60)
            continue
        resp.raise_for_status()
        return resp.json()

    raise RuntimeError(f"GitHub API failed after retry: {path}")


def fetch_repo_metadata(owner: str, repo: str, token: Optional[str]) -> Dict:
    """Fetch basic repo metadata."""
    data = _github_get(f"/repos/{owner}/{repo}", token)
    return {
        "name": data.get("name"),
        "description": data.get("description") or "",
        "language": data.get("language") or "Unknown",
        "stars": data.get("stargazers_count", 0),
        "forks": data.get("forks_count", 0),
        "open_issues": data.get("open_issues_count", 0),
        "default_branch": data.get("default_branch", "main"),
        "created_at": data.get("created_at", ""),
        "updated_at": data.get("updated_at", ""),
        "size_kb": data.get("size", 0),
        "topics": data.get("topics", []),
    }


def fetch_file_tree(owner: str, repo: str, token: Optional[str], branch: str = "HEAD") -> List[Dict]:
    """
    Fetch recursive file tree. Returns list of {path, type, size} dicts.
    Only includes blob (file) entries, not trees (dirs).
    """
    try:
        data = _github_get(
            f"/repos/{owner}/{repo}/git/trees/{branch}",
            token,
            params={"recursive": "1"},
        )
    except Exception as e:
        logger.warning(f"File tree fetch failed: {e}")
        return []

    entries = []
    for item in data.get("tree", []):
        if item.get("type") != "blob":
            continue
        path = item.get("path", "")
        # Skip files in ignored directories
        top_dir = path.split("/")[0] if "/" in path else ""
        if top_dir in SKIP_DIRS:
            continue
        entries.append({
            "path": path,
            "size": item.get("size", 0),
        })
    return entries


def select_files_to_read(tree: List[Dict]) -> List[str]:
    """
    Intelligently select which files to read.
    Priority: always-read config files > entry points > largest code files.
    Returns ordered list of file paths (max MAX_FILES_TO_READ).
    """
    selected: List[str] = []
    seen: set = set()

    def add(path: str) -> None:
        if path not in seen and len(selected) < MAX_FILES_TO_READ:
            selected.append(path)
            seen.add(path)

    # Tier 1: always-read files (by lowercase filename)
    for entry in tree:
        fname = entry["path"].split("/")[-1].lower()
        if fname in ALWAYS_READ_NAMES:
            add(entry["path"])

    # Tier 2: entry-point files
    for entry in tree:
        fname = entry["path"].split("/")[-1]
        if fname in ENTRY_POINT_NAMES:
            add(entry["path"])

    # Tier 3: largest code files
    code_files = [
        e for e in tree
        if any(e["path"].endswith(ext) for ext in CODE_EXTENSIONS)
        and e["path"] not in seen
    ]
    code_files.sort(key=lambda e: e["size"], reverse=True)
    for entry in code_files:
        add(entry["path"])
        if len(selected) >= MAX_FILES_TO_READ:
            break

    return selected


def fetch_file_content(
    owner: str, repo: str, path: str, token: Optional[str]
) -> Optional[str]:
    """
    Fetch and decode a single file's content.
    Truncates to MAX_FILE_CHARS. Returns None on failure.
    """
    try:
        data = _github_get(f"/repos/{owner}/{repo}/contents/{path}", token)
        if data.get("encoding") != "base64":
            return None
        raw = base64.b64decode(data["content"]).decode("utf-8", errors="replace")
        return raw[:MAX_FILE_CHARS]
    except Exception as e:
        logger.debug(f"Failed to fetch {path}: {e}")
        return None


def fetch_commit_history(
    owner: str, repo: str, token: Optional[str], limit: int = 30
) -> List[Dict]:
    """
    Fetch recent commits. Returns list of {sha, message, date, author} dicts.
    """
    try:
        data = _github_get(
            f"/repos/{owner}/{repo}/commits",
            token,
            params={"per_page": str(limit)},
        )
        commits = []
        for item in data if isinstance(data, list) else []:
            commit = item.get("commit", {})
            committer = commit.get("committer") or commit.get("author") or {}
            commits.append({
                "sha": item.get("sha", "")[:7],
                "message": (commit.get("message") or "").split("\n")[0][:120],
                "date": committer.get("date", ""),
                "author": (commit.get("author") or {}).get("name", "Unknown"),
            })
        return commits
    except Exception as e:
        logger.warning(f"Commit history fetch failed: {e}")
        return []


def build_repo_snapshot(owner: str, repo: str, token: Optional[str]) -> Dict:
    """
    Orchestrate all GitHub API calls and return a structured snapshot.
    Stays within MAX_TOTAL_CHARS budget for file contents.
    """
    logger.info(f"Building repo snapshot for {owner}/{repo}")

    metadata = fetch_repo_metadata(owner, repo, token)
    tree = fetch_file_tree(owner, repo, token, branch=metadata.get("default_branch", "HEAD"))
    commit_history = fetch_commit_history(owner, repo, token)

    # Select and fetch file contents within budget
    paths_to_read = select_files_to_read(tree)
    file_contents: Dict[str, str] = {}
    total_chars = 0

    for path in paths_to_read:
        if total_chars >= MAX_TOTAL_CHARS:
            logger.debug(f"Char budget exhausted after {len(file_contents)} files")
            break
        content = fetch_file_content(owner, repo, path, token)
        if content:
            file_contents[path] = content
            total_chars += len(content)

    logger.info(
        f"Snapshot ready: {len(tree)} total files, "
        f"{len(file_contents)} read, {total_chars} chars"
    )

    return {
        "metadata": metadata,
        "file_tree_summary": [e["path"] for e in tree],
        "file_contents": file_contents,
        "commit_history": commit_history,
        "total_files": len(tree),
    }
