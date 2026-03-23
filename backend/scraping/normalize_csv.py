"""
normalize_csv.py

Post-scrape normalization script. Run this after any spider to clean and
enrich a scraped jobs CSV with validated skill tags from the Neo4j graph.

Usage:
    python normalize_csv.py --csv output/scraped_jobs.csv
    python normalize_csv.py --csv output/scraped_jobs.csv --out output/normalized.csv
    python normalize_csv.py --csv output/scraped_jobs.csv --drop-noise
    python normalize_csv.py --csv output/scraped_jobs.csv --stats-only

Output columns added / replaced:
    normalized_skills   pipe-separated validated skill labels
    unmatched_skills    pipe-separated skills found in text but not in graph
    skill_count         integer count of validated skills
    is_noise_row        1 if row is a scraper artifact, 0 otherwise

Requires:
    NEO4J_URI / NEO4J_USER / NEO4J_PASSWORD in backend/.env (or environment)
    thefuzz: pip install thefuzz
"""

import argparse
import csv
import os
import re
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from neo4j import GraphDatabase

try:
    from thefuzz import fuzz
    _FUZZY_AVAILABLE = True
except ImportError:
    _FUZZY_AVAILABLE = False

# Re-use the canonical synonym map from matcher.py
from matcher import SKILL_SYNONYMS

# =============================================================================
# CONSTANTS (kept in sync with normalization_testing/normalize_linkedin_csv.py)
# =============================================================================

NOISE_PATTERNS = [
    "LINKEDIN IS BETTER ON THE APP",
    "JOIN LINKEDIN",
    "AGREE & JOIN",
    "PASSWORD (6+ CHARACTERS)",
    "OPEN THE APP",
    "DON'T HAVE THE APP",
    "GET IT IN THE MICROSOFT STORE",
    "PRIVACY POLICY",
    "USER AGREEMENT",
]

BLOCKED_CONCEPTS = {
    # Graph noise / meta nodes
    "MAN", "CAT", "VISION & MISSION", "SECURITY SKILLS AND KNOWLEDGE",
    "PENETRATION TESTING RULES OF ENGAGEMENT", "AI IN PRODUCT MGMT.",
    "CLOUD-NATIVE ML SERVICES", "DATA REPLICATION", "HR", "BOX", "BUS", "AHA",
    # Common English words that match prose, not skills
    "TEAMS", "LOCATION", "HYBRID", "PUBLIC", "LEGAL", "STAKEHOLDERS",
    "DISCOVERY", "NETWORK", "FRAMEWORKS", "SERVICES", "COMPONENTS",
    "COMPLIANCE", "MONITORING", "DEVELOPMENT", "INTERNET", "GROWTH",
    "VIEWS", "BASE", "FLOW", "ACTIVITY", "CLOSURES", "CONCURRENCY",
    "CONTAINERS", "WINDOWS", "TESTING", "CACHING", "BUTTONS", "REST",
    "INSTALLING", "PRIVATE", "MANAGEMENT", "BUSINESS", "NARRATIVE",
    "MATURITY", "PROPOSITION", "PREPARATION", "DECLINE", "CODING",
    "SELECTION", "STAR", "STATEMENT", "TREND", "TIMEFRAME", "INTRODUCTION",
    "AVAILABILITY", "CAPABILITIES", "IDENTIFICATION", "EXECUTION",
    "DISTRIBUTION", "MEDIA", "GROUPS", "CONSTRAINT", "BASELINE",
    "TROUBLESHOOTING", "VALIDATION", "RELATIVE", "TARGET", "FRAME",
    "SWITCH", "RING", "ROUTER", "MESH", "RETRO", "NAVIGATION", "PARSING",
    "HASHING", "PATCHING", "ERADICATION", "CONTAINMENT", "RECOVERY",
    "RECONNAISSANCE", "STEPPING", "IMPERSONATION", "PHISHING", "SMISHING",
    "WHALING", "TAILGATING", "SPOOFING", "SINKHOLES", "SANDBOXING",
    "OBFUSCATION", "SALTING", "INTERPERSONAL", "BACKPRESSURE", "LOADSHIFTING",
    "THROTTLING", "NORMALIZATION", "LINEARIZATION", "TABS",
    "HEAD", "KEY SKILLS", "HTTPS", "HTTP", "PAYMENTS", "STORAGE",
    "SAAS",   # business model / product category, not a learnable technical skill
}

SHORT_SKILL_ALLOWLIST = {
    "AI", "ML", "NLP", "AWS", "GCP", "SQL", "API", "BI", "SOC", "IAM",
    "CI/CD", "C++", "C#", "CSS", "HTML", "PHP", "DNS", "VPN", "SSH",
    "JWT", "SSO", "XSS", "CDN", "MVC", "OOP", "SDK", "IDE", "CLI",
    "VPC", "EC2", "S3", "RDS", "ECS", "EKS", "ACL", "TLS", "SSL",
    "TCP", "UDP", "IP", "GO", "R",
}

JOB_TITLES = {
    "front-end engineer", "back-end engineer", "full-stack engineer",
    "mobile engineer (android)", "mobile engineer (ios)", "mobile engineer",
    "systems engineer", "game developer", "security analyst",
    "penetration tester", "security engineer", "cloud security engineer",
    "soc analyst", "application security engineer", "grc analyst",
    "machine learning engineer", "data scientist", "ai engineer",
    "nlp engineer", "computer vision engineer", "research scientist",
    "bi developer", "data visualization engineer", "analytics engineer",
    "reporting analyst", "cloud infrastructure engineer", "cloud architect",
    "site reliability engineer", "platform engineer",
    "technical project manager", "agile project manager", "program manager",
    "scrum master", "devops engineer", "ci/cd engineer",
    "infrastructure as code engineer", "release engineer",
    "containerization engineer", "automation engineer", "devops",
    "application security", "technical product manager", "product manager",
    "engineering manager", "staff engineer", "principal engineer",
    "solutions architect",
}

SYNONYM_CANONICALS: set = set(SKILL_SYNONYMS.values())

FUZZY_MATCH_THRESHOLD = 85
MAX_SKILL_LENGTH = 60
MAX_SKILLS_PER_ROW = 35


# =============================================================================
# NEO4J CONCEPT LOADER
# =============================================================================

def load_concepts_from_neo4j(uri: str, user: str, password: str) -> tuple:
    """
    Connect to Neo4j and load all Concept node names.
    Returns (extractable_concepts, all_concepts) as lists of strings.
    Concepts with short/blocked names are put in validate_only tier.
    """
    driver = GraphDatabase.driver(uri, auth=(user, password))
    try:
        with driver.session() as session:
            result = session.run("MATCH (c:Concept) RETURN c.name AS name")
            all_concepts = [r["name"] for r in result if r["name"]]
    finally:
        driver.close()

    extractable = []
    validate_only = []
    for name in all_concepts:
        upper = name.strip().upper()
        if upper in BLOCKED_CONCEPTS:
            continue
        if len(upper) <= 2 and upper not in SHORT_SKILL_ALLOWLIST:
            validate_only.append(name)
        else:
            extractable.append(name)

    print(f"Loaded {len(extractable)} extractable + {len(validate_only)} validate-only concepts from Neo4j")
    return extractable, extractable + validate_only


# =============================================================================
# VOCABULARY & LOOKUP BUILDERS
# =============================================================================

def build_vocab(extractable_concepts: list) -> set:
    vocab = set()
    vocab.update(SKILL_SYNONYMS.keys())
    vocab.update(SKILL_SYNONYMS.values())
    for name in extractable_concepts:
        vocab.add(name.strip().lower())
    cleaned = set()
    for term in vocab:
        t = term.strip()
        if len(t) < 2:
            continue
        if t.upper() in BLOCKED_CONCEPTS:
            continue
        cleaned.add(t)
    return cleaned


def build_concept_lookup(all_concepts: list) -> dict:
    return {c.lower(): c for c in all_concepts}


# =============================================================================
# HELPERS
# =============================================================================

def normalize_skill(skill: str) -> str:
    if not skill:
        return ""
    return SKILL_SYNONYMS.get(skill.strip().lower(), skill.strip().lower())


def parse_skills(value) -> list:
    if value is None:
        return []
    text = str(value).strip()
    if not text:
        return []
    if "|" in text:
        return [p.strip() for p in text.split("|") if p.strip()]
    if text.startswith("[") and text.endswith("]"):
        inner = text[1:-1].strip()
        if not inner:
            return []
        return [p.strip().strip('"').strip("'") for p in inner.split(",") if p.strip()]
    return [text]


def is_noise_row(company: str, job: str, desc: str = "") -> bool:
    blob = f"{company} {job}".upper()
    if any(p in blob for p in NOISE_PATTERNS):
        return True
    if any(p in desc.upper() for p in NOISE_PATTERNS):
        return True
    return False


def is_job_title(skill: str) -> bool:
    return skill.strip().lower() in JOB_TITLES


def is_valid_skill_label(skill: str) -> bool:
    if not skill:
        return False
    s = skill.strip()
    su = s.upper()
    if not s or su in BLOCKED_CONCEPTS:
        return False
    if is_job_title(s):
        return False
    if len(s) > MAX_SKILL_LENGTH:
        return False
    if re.search(r"\d", s) and len(s) > 6:
        return False
    if any(tok in su for tok in ["SALARY", "$", "CHARACTERS", "HOURS", "YEARS"]):
        return False
    if len(su) <= 2 and su not in SHORT_SKILL_ALLOWLIST:
        return False
    if len(su) == 3 and su not in SHORT_SKILL_ALLOWLIST and not su.isupper():
        return False
    if s.startswith("-") or s.endswith("-"):
        return False
    if s in {".", ",", ":", ";", "/", "|"}:
        return False
    return True


def company_self_tokens(company: str) -> set:
    """
    Tokens derived from the company name that should not appear as skills
    on that company's own listings.
    """
    if not company:
        return set()
    tokens = set()
    name_lower = company.strip().lower()
    for suffix in (" inc", " llc", " ltd", " corp", " co", " group", " solutions",
                   " consulting", " technologies", " technology", " services",
                   " partners", " labs", " studio", " studios"):
        name_lower = name_lower.replace(suffix, "")
    name_lower = name_lower.strip()
    tokens.add(name_lower)
    for word in re.split(r"[\s\-_,&()./]+", name_lower):
        word = word.strip()
        if len(word) >= 4:
            tokens.add(word)
    return tokens


# =============================================================================
# VALIDATION
# =============================================================================

def validate_against_graph(
    skill_lower: str,
    concept_lookup: dict,
    all_concepts_lower: list,
) -> str | None:
    # 0. Synonym-canonical shortcut
    if skill_lower in SYNONYM_CANONICALS:
        return skill_lower.upper()
    normed = normalize_skill(skill_lower)
    if normed in SYNONYM_CANONICALS:
        return normed.upper()
    # 1. Exact
    if skill_lower in concept_lookup:
        return concept_lookup[skill_lower]
    # 2. Synonym → exact
    if normed in concept_lookup:
        return concept_lookup[normed]
    # 3. Fuzzy
    if _FUZZY_AVAILABLE and all_concepts_lower:
        best_score, best_concept = 0, None
        for candidate in all_concepts_lower:
            score = fuzz.ratio(skill_lower, candidate)
            if score > best_score:
                best_score, best_concept = score, candidate
        if best_score >= FUZZY_MATCH_THRESHOLD and best_concept:
            return concept_lookup.get(best_concept, best_concept)
    return None


# =============================================================================
# EXTRACTION
# =============================================================================

def extract_skills_from_text(text: str, vocab: set) -> list:
    if not text:
        return []
    content = text.lower()
    found = set()
    for term in vocab:
        pattern = r"(?<![a-z0-9\-\.])" + re.escape(term) + r"(?![a-z0-9\-\.])"
        if re.search(pattern, content):
            canonical = normalize_skill(term)
            if canonical:
                found.add(canonical)
    return sorted(found)


# =============================================================================
# ROW NORMALIZER
# =============================================================================

def normalize_row(
    row: dict,
    vocab: set,
    concept_lookup: dict,
    all_concepts_lower: list,
) -> dict:
    company = (row.get("company_name") or row.get("company") or "").strip()
    job = (row.get("job_name") or row.get("job") or "").strip()
    desc = (row.get("description") or "").strip()
    qualifications_raw = row.get("qualifications") or row.get("skills") or ""

    base_skills_raw = parse_skills(qualifications_raw)
    base_skills_clean = [
        normalize_skill(s).strip()
        for s in base_skills_raw
        if normalize_skill(s).strip() and not is_job_title(normalize_skill(s).strip())
    ]
    original_skills_str = "|".join(normalize_skill(s).upper() for s in base_skills_raw if s)

    dynamic = extract_skills_from_text(f"{job}\n{desc}", vocab)

    merged_lower = set()
    for s in base_skills_clean:
        merged_lower.add(s.lower())
    for s in dynamic:
        merged_lower.add(s.lower())

    self_tokens = company_self_tokens(company)

    validated = []
    unmatched = []
    for skill_lower in sorted(merged_lower):
        if not is_valid_skill_label(skill_lower):
            continue
        if skill_lower in self_tokens:
            continue
        graph_match = validate_against_graph(skill_lower, concept_lookup, all_concepts_lower)
        if graph_match:
            validated.append(graph_match)
        else:
            display = skill_lower.upper()
            if is_valid_skill_label(display):
                unmatched.append(display)

    validated = sorted(set(validated))[:MAX_SKILLS_PER_ROW]
    unmatched = sorted(set(unmatched))[:MAX_SKILLS_PER_ROW]
    validated_upper = [v.upper() for v in validated]

    out = dict(row)
    out["normalized_skills"] = "|".join(validated_upper)
    out["unmatched_skills"] = "|".join(unmatched)
    out["skill_count"] = str(len(validated_upper))
    out["is_noise_row"] = "1" if is_noise_row(company, job, desc) else "0"
    return out


# =============================================================================
# STATS
# =============================================================================

def print_stats(rows: list) -> None:
    non_noise = [r for r in rows if r.get("is_noise_row") != "1"]
    counts = [int(r.get("skill_count", 0)) for r in non_noise]

    noise = len(rows) - len(non_noise)
    zero_skills = sum(1 for c in counts if c == 0)

    avg = sum(counts) / len(counts) if counts else 0
    mx = max(counts) if counts else 0
    mn = min(counts) if counts else 0

    print(f"\n{'-'*50}")
    print(f"Total rows        : {len(rows)}")
    print(f"Noise rows        : {noise}")
    print(f"Clean rows        : {len(non_noise)}")
    print(f"Rows with 0 skills: {zero_skills}")
    print(f"Avg skills/row    : {avg:.1f}")
    print(f"Min / Max skills  : {mn} / {mx}")

    skill_counter: Counter = Counter()
    for r in non_noise:
        for skill in r.get("normalized_skills", "").split("|"):
            skill = skill.strip()
            if skill:
                skill_counter[skill] += 1

    print(f"\nTop 25 skills:")
    for skill, cnt in skill_counter.most_common(25):
        bar = "#" * min(cnt, 40)
        print(f"  {skill:<40s} {cnt:3d}  {bar}")

    unmatched_counter: Counter = Counter()
    for r in non_noise:
        for skill in r.get("unmatched_skills", "").split("|"):
            skill = skill.strip()
            if skill:
                unmatched_counter[skill] += 1

    if unmatched_counter:
        print(f"\nTop 20 unmatched skills (not in graph):")
        for skill, cnt in unmatched_counter.most_common(20):
            print(f"  {skill:<40s} {cnt:3d}")

    print(f"{'-'*50}\n")


# =============================================================================
# PROGRAMMATIC ENTRY POINT (called from main.py after scraping)
# =============================================================================

def run_normalize(csv_path: str, neo4j_uri: str, neo4j_user: str, neo4j_password: str) -> None:
    """
    Normalize a scraped jobs CSV in place using the live Neo4j concept graph.
    Called automatically by main.py after each scrape run.
    """
    path = Path(csv_path)
    if not path.exists():
        print(f"[Normalize] CSV not found, skipping: {path}")
        return

    print(f"\n[Normalize] Normalizing {path} ...")

    extractable_concepts, all_concepts = load_concepts_from_neo4j(
        neo4j_uri, neo4j_user, neo4j_password
    )
    vocab = build_vocab(extractable_concepts)
    concept_lookup = build_concept_lookup(all_concepts)
    all_concepts_lower = list(concept_lookup.keys())

    with open(path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        original_fieldnames = reader.fieldnames or []
        rows = list(reader)

    normalized = [
        normalize_row(row, vocab, concept_lookup, all_concepts_lower)
        for row in rows
    ]

    new_cols = ["normalized_skills", "unmatched_skills", "skill_count", "is_noise_row"]
    fieldnames = list(original_fieldnames)
    for col in new_cols:
        if col not in fieldnames:
            fieldnames.append(col)

    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(normalized)

    print(f"[Normalize] Done. {len(normalized)} rows written to {path}")
    print_stats(normalized)


# =============================================================================
# MAIN
# =============================================================================

def main():
    parser = argparse.ArgumentParser(
        description="Normalize a scraped jobs CSV using the Neo4j concept graph."
    )
    parser.add_argument("--csv", required=True, help="Path to scraped jobs CSV")
    parser.add_argument(
        "--out",
        default="",
        help="Output path (default: overwrites --csv in place)",
    )
    parser.add_argument(
        "--drop-noise",
        action="store_true",
        help="Exclude noise rows from output",
    )
    parser.add_argument(
        "--stats-only",
        action="store_true",
        help="Print stats from an already-normalized CSV without re-processing",
    )
    args = parser.parse_args()

    csv_path = Path(args.csv)
    if not csv_path.exists():
        print(f"ERROR: CSV not found: {csv_path}", file=sys.stderr)
        sys.exit(1)

    out_path = Path(args.out) if args.out else csv_path

    # Stats-only mode: just read and report
    if args.stats_only:
        with open(csv_path, newline="", encoding="utf-8") as f:
            rows = list(csv.DictReader(f))
        print_stats(rows)
        return

    # Load .env from backend/
    dotenv_path = Path(__file__).parent.parent / ".env"
    load_dotenv(dotenv_path)

    neo4j_uri = os.getenv("NEO4J_URI", "neo4j://localhost:7687")
    neo4j_user = os.getenv("NEO4J_USER", "neo4j")
    neo4j_password = os.getenv("NEO4J_PASSWORD", "password")

    # Load concepts from live graph
    extractable_concepts, all_concepts = load_concepts_from_neo4j(
        neo4j_uri, neo4j_user, neo4j_password
    )

    vocab = build_vocab(extractable_concepts)
    concept_lookup = build_concept_lookup(all_concepts)
    all_concepts_lower = list(concept_lookup.keys())

    print(f"Extraction vocab  : {len(vocab)} terms")
    print(f"Graph concepts    : {len(concept_lookup)}")
    if not _FUZZY_AVAILABLE:
        print("WARNING: thefuzz not installed — fuzzy matching disabled")

    # Read input
    with open(csv_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        original_fieldnames = reader.fieldnames or []
        rows = list(reader)

    print(f"Input rows        : {len(rows)}")

    # Normalize
    normalized = [
        normalize_row(row, vocab, concept_lookup, all_concepts_lower)
        for row in rows
    ]

    if args.drop_noise:
        normalized = [r for r in normalized if r.get("is_noise_row") != "1"]

    # Build output fieldnames: preserve original columns, append new ones at end
    new_cols = ["normalized_skills", "unmatched_skills", "skill_count", "is_noise_row"]
    fieldnames = list(original_fieldnames)
    for col in new_cols:
        if col not in fieldnames:
            fieldnames.append(col)

    with open(out_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(normalized)

    print(f"Output rows       : {len(normalized)}")
    print(f"Written           : {out_path}")

    print_stats(normalized)


if __name__ == "__main__":
    main()
