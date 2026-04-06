"""LLM enrichment layer — framework detection + skill assessment via gpt-4o-mini.

Gracefully skips if OPENAI_API_KEY is not set or the call fails.
"""
import json
import os


def assess(summary_text: str, structured_data: dict) -> dict:
    """Assess a GitHub profile using LLM if available, else heuristic fallback."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("[info] GEMINI_API_KEY not set — using heuristic assessment")
        return _heuristic_level(structured_data)

    try:
        from google import genai
    except ImportError:
        print("[warn] google-genai package not installed — using heuristic assessment")
        return _heuristic_level(structured_data)

    schema = json.dumps({
        "detected_frameworks": ["list of technologies/frameworks beyond raw languages"],
        "estimated_level": "junior | mid | senior",
        "level_reasons": ["up to 5 concise bullet strings"],
        "assessment_summary": "2-3 sentence paragraph",
    }, indent=2)

    prompt = (
        "You are a senior engineering hiring manager evaluating a developer's GitHub profile. "
        "Respond ONLY with valid JSON matching the schema provided.\n\n"
        f"Evaluate this GitHub profile and return JSON:\n\n"
        f"{summary_text}\n\n"
        f"Return this exact JSON schema:\n{schema}\n\n"
        "Guidelines:\n"
        "- detected_frameworks: go beyond obvious languages — infer frameworks, tools, cloud providers, "
        "ML libraries from ANY signal (repo names, topics, descriptions, language combinations)\n"
        "- estimated_level: consider breadth, depth, recency, and project scope holistically\n"
        "- Be specific in level_reasons — reference actual numbers and repo names where relevant"
    )

    try:
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
        )
        content = response.text.strip()
        
        # Strip markdown fences if model wraps anyway
        if content.startswith("```"):
            pieces = content.split("```")
            if len(pieces) >= 3:
                content = pieces[1].strip()
            if content.startswith("json"):
                content = content[4:].strip()
            content = content.strip()
        return json.loads(content)
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"[warn] LLM assessment failed ({e}) — using heuristic fallback")
        return _heuristic_level(structured_data)


# Maps GitHub topic slugs -> display names
_TOPIC_TO_FRAMEWORK: dict[str, str] = {
    # AI / ML
    "machine-learning": "Machine Learning",
    "deep-learning": "Deep Learning",
    "nlp": "NLP",
    "natural-language-processing": "NLP",
    "llm": "LLMs",
    "llms": "LLMs",
    "generative-ai": "Generative AI",
    "computer-vision": "Computer Vision",
    "reinforcement-learning": "Reinforcement Learning",
    "transformers": "Transformers",
    "pytorch": "PyTorch",
    "tensorflow": "TensorFlow",
    "scikit-learn": "scikit-learn",
    "huggingface": "Hugging Face",
    "langchain": "LangChain",
    "openai": "OpenAI API",
    "rag": "RAG",
    "recommender-system": "Recommender Systems",
    "recommendation-system": "Recommender Systems",
    # Data
    "data-engineering": "Data Engineering",
    "data-science": "Data Science",
    "data-analysis": "Data Analysis",
    "etl": "ETL",
    "spark": "Apache Spark",
    "kafka": "Apache Kafka",
    "airflow": "Apache Airflow",
    "dbt": "dbt",
    "snowflake": "Snowflake",
    "databricks": "Databricks",
    "pandas": "Pandas",
    "graphdb": "Graph Database",
    "graph-database": "Graph Database",
    "neo4j": "Neo4j",
    "healthcare": "Healthcare",
    # Web / Frontend
    "react": "React",
    "reactjs": "React",
    "nextjs": "Next.js",
    "next-js": "Next.js",
    "vue": "Vue",
    "vuejs": "Vue",
    "angular": "Angular",
    "svelte": "Svelte",
    "tailwindcss": "Tailwind CSS",
    "typescript": "TypeScript",
    # Backend / APIs
    "fastapi": "FastAPI",
    "django": "Django",
    "flask": "Flask",
    "nodejs": "Node.js",
    "node-js": "Node.js",
    "express": "Express",
    "graphql": "GraphQL",
    "rest-api": "REST API",
    "grpc": "gRPC",
    # Infra / Cloud
    "docker": "Docker",
    "kubernetes": "Kubernetes",
    "k8s": "Kubernetes",
    "aws": "AWS",
    "gcp": "GCP",
    "azure": "Azure",
    "terraform": "Terraform",
    "ci-cd": "CI/CD",
    "github-actions": "GitHub Actions",
    # Databases
    "postgresql": "PostgreSQL",
    "postgres": "PostgreSQL",
    "mongodb": "MongoDB",
    "redis": "Redis",
    "elasticsearch": "Elasticsearch",
    "sqlite": "SQLite",
    # Mobile
    "react-native": "React Native",
    "flutter": "Flutter",
    "android": "Android",
    "ios": "iOS",
}


def _frameworks_from_topics(structured_data: dict) -> list[str]:
    """Map all_topics slugs to display names, deduped."""
    topics = structured_data.get("all_topics", [])
    seen: set[str] = set()
    result: list[str] = []
    for topic in topics:
        name = _TOPIC_TO_FRAMEWORK.get(topic.lower())
        if name and name not in seen:
            seen.add(name)
            result.append(name)
    return result


def _heuristic_level(structured_data: dict) -> dict:
    """6-signal voting system to estimate developer level without LLM."""
    profile = structured_data.get("profile", {})
    activity = structured_data.get("activity", {})
    languages = structured_data.get("languages", {})
    top_repos = structured_data.get("top_repos", [])

    repo_count = profile.get("public_repos", 0)
    lang_count = len(languages)
    account_age_days = profile.get("account_age_days", 0)
    commits_90d = activity.get("commits_last_90_days", 0)
    max_stars = max((r.get("stars", 0) for r in top_repos), default=0)
    active_weeks = activity.get("active_weeks", 0)

    votes = {"junior": 0, "mid": 0, "senior": 0}

    # Repo count
    if repo_count < 8:
        votes["junior"] += 1
    elif repo_count < 25:
        votes["mid"] += 1
    else:
        votes["senior"] += 1

    # Language breadth
    if lang_count <= 2:
        votes["junior"] += 1
    elif lang_count <= 5:
        votes["mid"] += 1
    else:
        votes["senior"] += 1

    # Account age
    if account_age_days < 365:
        votes["junior"] += 1
    elif account_age_days < 1095:
        votes["mid"] += 1
    else:
        votes["senior"] += 1

    # Recent commits
    if commits_90d < 10:
        votes["junior"] += 1
    elif commits_90d < 50:
        votes["mid"] += 1
    else:
        votes["senior"] += 1

    # Stars on top repos
    if max_stars < 5:
        votes["junior"] += 1
    elif max_stars < 50:
        votes["mid"] += 1
    else:
        votes["senior"] += 1

    # Active weeks
    if active_weeks < 4:
        votes["junior"] += 1
    elif active_weeks < 8:
        votes["mid"] += 1
    else:
        votes["senior"] += 1

    level = max(votes, key=lambda k: votes[k])

    reasons = [
        f"{repo_count} public repositories",
        f"{lang_count} language(s) used",
        f"Account age: {account_age_days} days",
        f"{commits_90d} commits in the last 90 days across {active_weeks} active weeks",
        f"Top repo stars: {max_stars}",
    ]

    detected_frameworks = _frameworks_from_topics(structured_data)

    return {
        "detected_frameworks": detected_frameworks,
        "estimated_level": level,
        "level_reasons": reasons,
        "assessment_summary": "",
    }
