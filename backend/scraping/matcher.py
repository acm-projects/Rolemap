from neo4j import GraphDatabase
from thefuzz import process
import re

# Skill synonym mapping for normalization (canonical form on right).
# Kept in sync with normalization_testing/normalize_linkedin_csv.py.
# IMPORTANT: Avoid bare short aliases that over-match prose (see inline comments).
SKILL_SYNONYMS = {
    # JavaScript ecosystem
    "reactjs": "react",
    "react.js": "react",
    "react js": "react",
    "vuejs": "vue",
    "vue.js": "vue",
    "vue js": "vue",
    "angularjs": "angular",
    "angular.js": "angular",
    "nodejs": "node.js",
    # bare "node" excluded — too common in distributed systems prose
    "expressjs": "express.js",
    # bare "express" excluded — common English word
    "nextjs": "next.js",
    # bare "next" excluded — too common an English word (false positives)
    "typescript": "typescript",
    # "ts" excluded — often means "timestamp" in job descriptions
    "javascript": "javascript",
    # "js" excluded — usually written in full in job descriptions
    "es6": "javascript",
    "es6+": "javascript",

    # Python ecosystem
    "python3": "python",
    # "py" excluded — rarely standalone in prose
    "pytorch": "pytorch",
    "torch": "pytorch",
    "tensorflow": "tensorflow",
    # "tf" excluded — ambiguous (TensorFlow vs. Terraform abbreviation)
    "scikit-learn": "scikit-learn",
    "sklearn": "scikit-learn",
    "scikit learn": "scikit-learn",
    "pandas": "pandas",
    "numpy": "numpy",
    "np": "numpy",
    "fastapi": "fastapi",
    "fast api": "fastapi",
    "django": "django",
    "flask": "flask",

    # Databases
    "postgresql": "postgresql",
    "postgres": "postgresql",
    "psql": "postgresql",
    "mysql": "mysql",
    "mongodb": "mongodb",
    "mongo": "mongodb",
    "redis": "redis",
    "redis cache": "redis",
    "elasticsearch": "elasticsearch",
    "elastic": "elasticsearch",
    "dynamodb": "dynamodb",
    "dynamo": "dynamodb",
    "nosql": "nosql databases",
    "nosql databases": "nosql databases",

    # Cloud & DevOps
    "kubernetes": "kubernetes",
    "k8s": "kubernetes",
    "docker": "docker",
    "docker-compose": "docker",
    "terraform": "terraform",
    "cloudformation": "cloudformation",
    "cfn": "cloudformation",
    "aws": "aws",
    "amazon web services": "aws",
    "azure": "azure",
    "microsoft azure": "azure",
    "gcp": "gcp",
    "google cloud": "gcp",
    "google cloud platform": "gcp",
    "jenkins": "jenkins",
    "github actions": "github actions",
    "gh actions": "github actions",
    "gitlab ci": "gitlab ci",
    "circleci": "circleci",
    "circle ci": "circleci",
    "ansible": "ansible",
    "helm": "helm",
    "argocd": "argocd",
    "argo cd": "argocd",
    "prometheus": "prometheus",
    "grafana": "grafana",
    "nginx": "nginx",

    # Languages
    "golang": "go",
    "go lang": "go",
    "go-lang": "go",
    "rust lang": "rust",
    "rustlang": "rust",
    "c++": "c++",
    "cpp": "c++",
    "c#": "c#",
    "csharp": "c#",
    "c sharp": "c#",
    "dotnet": ".net",
    ".net core": ".net",
    ".net framework": ".net",
    "java": "java",
    "kotlin": "kotlin",
    "swift": "swift",
    "ruby": "ruby",
    "php": "php",
    "scala": "scala",

    # Mobile
    "swiftui": "swiftui",
    "react native": "react native",
    "reactnative": "react native",
    "flutter": "flutter",
    "ios": "ios",
    "android": "android",
    "jetpack compose": "jetpack compose",

    # Security
    "owasp": "owasp",
    "owasp top 10": "owasp",
    "penetration testing": "penetration testing",
    "pen testing": "penetration testing",
    "pentest": "penetration testing",
    "pentesting": "penetration testing",
    "burp suite": "burp suite",
    "burpsuite": "burp suite",
    "nmap": "nmap",
    "metasploit": "metasploit",
    "wireshark": "wireshark",

    # Data & ML
    "machine learning": "machine learning",
    "ml": "machine learning",
    "deep learning": "deep learning",
    # "dl" excluded — ambiguous in prose
    "natural language processing": "nlp",
    "nlp": "nlp",
    "computer vision": "computer vision",
    # "cv" excluded — means "curriculum vitae" in job context
    "llm": "llm",
    "llms": "llm",
    "large language model": "llm",
    "large language models": "llm",
    "huggingface": "huggingface",
    "hugging face": "huggingface",
    "transformers": "transformers",
    "generative ai": "generative ai",
    "gen ai": "generative ai",
    "ai": "ai",
    "artificial intelligence": "ai",
    "microservices": "microservices",
    "microservice": "microservices",
    "distributed systems": "distributed systems",
    "system design": "system design",
    "rag": "rag",
    "retrieval augmented generation": "rag",
    "vector database": "vector database",
    "vector db": "vector database",
    "fine-tuning": "fine-tuning",
    "fine tuning": "fine-tuning",

    # Data Engineering
    "apache kafka": "kafka",
    "kafka": "kafka",
    "apache spark": "spark",
    "pyspark": "spark",
    "spark": "spark",
    "airflow": "airflow",
    "apache airflow": "airflow",
    "dbt": "dbt",

    # Data Visualization
    "tableau": "tableau",
    "power bi": "power bi",
    "powerbi": "power bi",
    "looker": "looker",
    "d3.js": "d3.js",
    "d3": "d3.js",
    "superset": "superset",
    "apache superset": "superset",
    "metabase": "metabase",

    # General / APIs / Process
    "restful api": "rest api",
    "restful apis": "rest api",
    "rest api": "rest api",
    "rest apis": "rest api",
    # bare "rest" excluded — extremely common English word
    "graphql": "graphql",
    "grpc": "grpc",
    "git": "git",
    "github": "github",
    "gitlab": "gitlab",
    "bitbucket": "bitbucket",
    "jira": "jira",
    "confluence": "confluence",
    "agile": "agile",
    "scrum": "scrum",
    "kanban": "kanban",
    "ci/cd": "ci/cd",
    "cicd": "ci/cd",
    "continuous integration": "ci/cd",
    "continuous deployment": "ci/cd",
    "linux": "linux",
    "sql": "sql",
    "bash": "bash",
    "shell script": "bash",
    "shell scripting": "bash",
    # bare "shell" excluded — matches "shell company", "shell out" etc.
}


def normalize_skill(skill: str) -> str:
    """Normalize a skill name using synonyms and standard casing."""
    if not skill:
        return skill
    skill_lower = skill.strip().lower()
    return SKILL_SYNONYMS.get(skill_lower, skill_lower)


class DataMatcher:
    def __init__(self, uri, user, password):
        self.driver = GraphDatabase.driver(uri, auth=(user, password))
        self.cached_jobs = []
        self.cached_concepts = []
        self._cached_concepts_upper = set()
        self._dynamic_terms = set()
        self._load_cache()

    def close(self):
        self.driver.close()

    def _load_cache(self):
        with self.driver.session() as session:
            # Load jobs
            result = session.run("MATCH (j:Job) RETURN j.title as title")
            self.cached_jobs = [record["title"] for record in result if record["title"]]
            
            # Load concepts (skills)
            result = session.run("MATCH (c:Concept) RETURN c.name as name")
            self.cached_concepts = [record["name"] for record in result if record["name"]]
            self._cached_concepts_upper = {c.upper() for c in self.cached_concepts}

        # Dynamic extraction vocabulary: known synonyms + current graph concepts
        vocab = set()
        vocab.update(SKILL_SYNONYMS.keys())
        vocab.update(SKILL_SYNONYMS.values())
        vocab.update([c.lower() for c in self.cached_concepts])
        # Keep only meaningful terms
        self._dynamic_terms = {t.strip() for t in vocab if isinstance(t, str) and len(t.strip()) >= 2}

    def match_job_title(self, title, threshold=80):
        if not title or not self.cached_jobs:
            return None
        match_tuple = process.extractOne(title, self.cached_jobs)
        if match_tuple and match_tuple[1] >= threshold:
            return match_tuple[0]
        return None

    def match_concept(self, skill, threshold=80):
        if not skill or not self.cached_concepts:
            return None
        # First try synonym normalization
        normalized = normalize_skill(skill)
        normalized_upper = normalized.upper()
        if normalized_upper in self._cached_concepts_upper:
            # Return exact match from cache
            for c in self.cached_concepts:
                if c.upper() == normalized_upper:
                    return c
        # Also try raw skill exact match in cache
        raw_upper = str(skill).strip().upper()
        if raw_upper in self._cached_concepts_upper:
            for c in self.cached_concepts:
                if c.upper() == raw_upper:
                    return c
        # Fallback to fuzzy matching
        match_tuple = process.extractOne(normalized, self.cached_concepts)
        if match_tuple and match_tuple[1] >= threshold:
            return match_tuple[0]
        return None

    def extract_dynamic_skills(self, text, max_skills=20):
        """Extract candidate skills from free text using dynamic vocabulary and normalization."""
        if not text:
            return []

        content = str(text).lower()
        found = set()

        for term in self._dynamic_terms:
            pattern = r"(?<![a-z0-9])" + re.escape(term) + r"(?![a-z0-9])"
            if re.search(pattern, content):
                canonical = normalize_skill(term)
                if canonical and len(canonical.strip()) >= 2:
                    found.add(canonical)

        # Normalize against known graph concepts when possible, otherwise keep canonical free-text skill
        normalized = []
        for skill in sorted(found):
            matched = self.match_concept(skill, threshold=90)
            normalized.append(matched if matched else skill.upper())

        return normalized[:max_skills]
