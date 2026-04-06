"""Pure aggregation layer — no LLM, no network calls."""
import re
from datetime import datetime, timezone

# Languages that are build tooling / config, not skills
NOISE_LANGUAGES = frozenset({
    "Makefile", "CMake", "Shell", "Batchfile", "Dockerfile",
    "YAML", "JSON", "Markdown", "Text", "TeX", "Roff", "HCL",
    "TOML", "INI", "XML",
})

# Maps lowercase bio token -> canonical display name
_BIO_SKILL_VOCAB: dict[str, str] = {
    "python": "Python",
    "sql": "SQL",
    "nosql": "NoSQL",
    "java": "Java",
    "javascript": "JavaScript",
    "js": "JavaScript",
    "typescript": "TypeScript",
    "ts": "TypeScript",
    "go": "Go",
    "golang": "Go",
    "rust": "Rust",
    "c++": "C++",
    "c#": "C#",
    "scala": "Scala",
    "kotlin": "Kotlin",
    "swift": "Swift",
    "ruby": "Ruby",
    "php": "PHP",
    "bash": "Bash",
    "nlp": "NLP",
    "natural language processing": "NLP",
    "machine learning": "Machine Learning",
    "deep learning": "Deep Learning",
    "data engineering": "Data Engineering",
    "data engineer": "Data Engineering",
    "data science": "Data Science",
    "data scientist": "Data Science",
    "recommender systems": "Recommender Systems",
    "recommendation systems": "Recommender Systems",
    "computer vision": "Computer Vision",
    "llm": "LLMs",
    "llms": "LLMs",
    "generative ai": "Generative AI",
    "react": "React",
    "vue": "Vue",
    "angular": "Angular",
    "node.js": "Node.js",
    "nodejs": "Node.js",
    "django": "Django",
    "fastapi": "FastAPI",
    "flask": "Flask",
    "spring": "Spring",
    "tensorflow": "TensorFlow",
    "pytorch": "PyTorch",
    "scikit-learn": "scikit-learn",
    "sklearn": "scikit-learn",
    "pandas": "Pandas",
    "numpy": "NumPy",
    "aws": "AWS",
    "gcp": "GCP",
    "google cloud": "GCP",
    "azure": "Azure",
    "docker": "Docker",
    "kubernetes": "Kubernetes",
    "k8s": "Kubernetes",
    "spark": "Apache Spark",
    "apache spark": "Apache Spark",
    "kafka": "Apache Kafka",
    "airflow": "Apache Airflow",
    "dbt": "dbt",
    "snowflake": "Snowflake",
    "databricks": "Databricks",
    "neo4j": "Neo4j",
    "postgresql": "PostgreSQL",
    "postgres": "PostgreSQL",
    "mongodb": "MongoDB",
    "redis": "Redis",
    "elasticsearch": "Elasticsearch",
    "git": "Git",
    "linux": "Linux",
    "ci/cd": "CI/CD",
    "devops": "DevOps",
    "mlops": "MLOps",
}

# Single uppercase letters that are valid language names — matched case-sensitively
_CASE_SENSITIVE_EXACT = {"R": "R"}


def extract_bio_skills(bio: str) -> list[str]:
    """Extract known tech skills from a GitHub bio string."""
    if not bio:
        return []

    found: list[str] = []
    seen: set[str] = set()

    def add(name: str) -> None:
        if name not in seen:
            seen.add(name)
            found.append(name)

    tokens = [t.strip() for t in re.split(r"[|,&;/\n]", bio) if t.strip()]

    for token in tokens:
        # Case-sensitive exact match first (e.g. "R")
        if token in _CASE_SENSITIVE_EXACT:
            add(_CASE_SENSITIVE_EXACT[token])
            continue

        token_lower = token.lower()

        # Full-token exact match
        if token_lower in _BIO_SKILL_VOCAB:
            add(_BIO_SKILL_VOCAB[token_lower])
            continue

        # Scan for known phrases within the token; longer keys win
        for key in sorted(_BIO_SKILL_VOCAB, key=len, reverse=True):
            if len(key) <= 2:
                continue  # skip ambiguous short keys in substring search
            pattern = r"(?<!\w)" + re.escape(key) + r"(?!\w)"
            if re.search(pattern, token_lower):
                add(_BIO_SKILL_VOCAB[key])

    return found


def build_profile(user: dict) -> dict:
    created_at = user.get("created_at", "")
    account_age_days = 0
    if created_at:
        created = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
        account_age_days = (datetime.now(timezone.utc) - created).days
    return {
        "name": user.get("name") or "",
        "bio": user.get("bio") or "",
        "location": user.get("location") or "",
        "public_repos": user.get("public_repos", 0),
        "followers": user.get("followers", 0),
        "account_age_days": account_age_days,
    }


def aggregate_languages(repos: list, language_data: dict[str, dict]) -> dict:
    """Sum bytes per language across non-fork repos, normalize to %."""
    totals: dict[str, int] = {}
    for repo in repos:
        if repo.get("fork"):
            continue
        repo_name = repo["name"]
        for lang, byte_count in language_data.get(repo_name, {}).items():
            totals[lang] = totals.get(lang, 0) + byte_count

    grand_total = sum(totals.values())
    if grand_total == 0:
        return {}

    pct = {lang: round(bytes_ / grand_total * 100, 1) for lang, bytes_ in totals.items()}
    # Filter < 0.5% and sort descending
    pct = {k: v for k, v in pct.items() if v >= 0.5}
    return dict(sorted(pct.items(), key=lambda x: x[1], reverse=True))


def compute_activity(events: list) -> dict:
    """Count PushEvent commits and active weeks in last 90 days."""
    now = datetime.now(timezone.utc)
    cutoff = now.timestamp() - 90 * 86400

    commits = 0
    active_weeks: set[str] = set()
    last_pushed: str | None = None

    for event in events:
        if event.get("type") != "PushEvent":
            continue
        created_at = event.get("created_at", "")
        if not created_at:
            continue
        ts = datetime.fromisoformat(created_at.replace("Z", "+00:00"))

        if last_pushed is None or ts > datetime.fromisoformat(last_pushed.replace("Z", "+00:00")):
            last_pushed = created_at

        if ts.timestamp() >= cutoff:
            payload = event.get("payload", {})
            # Use `size` (total commits in push) — `commits` array is truncated to 20
            commits += payload.get("size", len(payload.get("commits", [])))
            # ISO week key: "2026-W10"
            active_weeks.add(f"{ts.isocalendar()[0]}-W{ts.isocalendar()[1]:02d}")

    last_pushed_date = ""
    if last_pushed:
        last_pushed_date = last_pushed[:10]

    return {
        "commits_last_90_days": commits,
        "active_weeks": len(active_weeks),
        "last_pushed": last_pushed_date,
    }


def get_top_repos(repos: list, n: int = 5) -> list:
    non_forks = [r for r in repos if not r.get("fork")]
    sorted_repos = sorted(non_forks, key=lambda r: r.get("stargazers_count", 0), reverse=True)
    result = []
    for r in sorted_repos[:n]:
        result.append({
            "name": r["name"],
            "stars": r.get("stargazers_count", 0),
            "language": r.get("language") or "",
            "description": r.get("description") or "",
            "topics": r.get("topics", []),
        })
    return result


def build_compact_summary(
    username: str,
    user: dict,
    repos: list,
    language_data: dict[str, dict],
    events: list,
) -> tuple[str, dict]:
    """Build token-efficient text summary for LLM + structured data dict."""
    profile = build_profile(user)
    languages = aggregate_languages(repos, language_data)
    activity = compute_activity(events)
    top_repos = get_top_repos(repos)
    bio_skills = extract_bio_skills(profile["bio"])

    # All non-fork repo names (up to 30)
    non_fork_names = [r["name"] for r in repos if not r.get("fork")][:30]

    # All unique topics across all repos
    all_topics: set[str] = set()
    for r in repos:
        all_topics.update(r.get("topics", []))

    # Format languages line
    lang_str = ", ".join(f"{lang} {pct}%" for lang, pct in list(languages.items())[:10])

    # Format top repos line
    def fmt_repo(r: dict) -> str:
        topics_str = f", topics: {r['topics']}" if r["topics"] else ""
        return f"{r['name']} (★{r['stars']}, {r['language'] or 'N/A'}{topics_str})"

    top_repos_str = "; ".join(fmt_repo(r) for r in top_repos)

    lines = [
        f"GitHub user: {username} ({profile['name']})",
        f"Account age: {profile['account_age_days']} days | Public repos: {profile['public_repos']} | Followers: {profile['followers']}",
        f"Languages (% of code): {lang_str or 'none detected'}",
        f"Activity (last 90 days): {activity['commits_last_90_days']} commits across {activity['active_weeks']} weeks",
        f"Top repos: {top_repos_str or 'none'}",
        f"All repo names: {', '.join(non_fork_names) or 'none'}",
        f"All unique topics: {', '.join(sorted(all_topics)) or 'none'}",
    ]
    if profile["bio"]:
        lines.insert(1, f"Bio: {profile['bio']}")
    if bio_skills:
        lines.insert(2 if profile["bio"] else 1, f"Bio skills: {', '.join(bio_skills)}")

    summary_text = "\n".join(lines)

    structured_data = {
        "username": username,
        "profile": profile,
        "languages": languages,
        "activity": activity,
        "top_repos": top_repos,
        "all_repo_names": non_fork_names,
        "all_topics": sorted(all_topics),
        "bio_skills": bio_skills,
    }

    return summary_text, structured_data
