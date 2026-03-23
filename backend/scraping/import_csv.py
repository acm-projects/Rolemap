"""
import_csv.py — Import scraped job CSV into Neo4j.

Standard path (default):
    Reads raw CSV, applies title/concept matching via Neo4j fuzzy matcher,
    extracts dynamic skills, and writes row-by-row.

Normalized path (--use-normalized):
    Reads scraped_jobs_clean.csv which already has a 'normalized_skills' column
    and an 'is_noise_row' flag produced by normalize_csv.py.

    Phase 1 — Aggregate CSV rows by canonical job title:
        - Map CSV 'qualifications' column (job title) → canonical display_name + domain
        - Count skill mentions per job (Counter over normalized_skills lists)
        - Collect distinct company names per job
        - Store first non-empty description per job

    Phase 2 — Write to Neo4j once per canonical job:
        - weight = mentions / total_postings  (for THAT job only)
        - Overwrite REQUIRES edge properties on each re-import

    Phase 3 — Final pass:
        - Set jobs[] and job_count on every Concept node

Usage:
    cd backend/scraping
    python import_csv.py --csv output/scraped_jobs_clean.csv --source scraped --use-normalized
    python import_csv.py --csv output/scraped_jobs_clean.csv --source scraped --use-normalized --dry-run
    python import_csv.py --csv output/scraped_jobs_clean.csv --source scraped --use-normalized --verbose
"""

import argparse
import csv
import os
import re
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv

from matcher import DataMatcher
from neo4j_writer import Neo4jWriter


# ---------------------------------------------------------------------------
# Canonical title mapping: CSV qualifications value → (display_name, domain)
# ---------------------------------------------------------------------------

TITLE_TO_CANONICAL = {
    # Software Engineering
    "Front-End Engineer":              ("Front-End Engineer",              "Software Engineering"),
    "Back-End Engineer":               ("Back-End Engineer",               "Software Engineering"),
    "Full-Stack Engineer":             ("Full-Stack Engineer",              "Software Engineering"),
    "Mobile Engineer":                 ("Mobile Engineer",                  "Software Engineering"),
    "Mobile Engineer (Android)":       ("Mobile Engineer",                  "Software Engineering"),
    "Mobile Engineer (iOS)":           ("Mobile Engineer",                  "Software Engineering"),
    "Systems Engineer":                ("Systems Engineer",                 "Software Engineering"),
    "Game Developer":                  ("Game Developer",                   "Software Engineering"),
    # Cybersecurity
    "Security Analyst":                ("Security Analyst",                 "Cybersecurity"),
    "Penetration Tester":              ("Penetration Tester",               "Cybersecurity"),
    "Security Engineer":               ("Security Engineer",                "Cybersecurity"),
    "Cloud Security Engineer":         ("Cloud Security Engineer",          "Cybersecurity"),
    "SOC Analyst":                     ("SOC Analyst",                      "Cybersecurity"),
    "Application Security Engineer":   ("Application Security Engineer",    "Cybersecurity"),
    "Application Security":            ("Application Security Engineer",    "Cybersecurity"),
    "GRC Analyst":                     ("GRC Analyst",                      "Cybersecurity"),
    # Machine Learning
    "Machine Learning Engineer":       ("Machine Learning Engineer",        "Machine Learning"),
    "Data Scientist":                  ("Data Scientist",                   "Machine Learning"),
    "AI Engineer":                     ("AI Engineer",                      "Machine Learning"),
    "NLP Engineer":                    ("NLP Engineer",                     "Machine Learning"),
    "Computer Vision Engineer":        ("Computer Vision Engineer",         "Machine Learning"),
    "Research Scientist":              ("Research Scientist",               "Machine Learning"),
    # Data Visualization
    "BI Developer":                    ("BI Developer",                     "Data Visualization"),
    "Data Visualization Engineer":     ("Data Visualization Engineer",      "Data Visualization"),
    "Analytics Engineer":              ("Analytics Engineer",               "Data Visualization"),
    "Reporting Analyst":               ("Reporting Analyst",                "Data Visualization"),
    # Cloud & Infrastructure
    "Cloud Infrastructure Engineer":   ("Cloud Infrastructure Engineer",    "Cloud & Infrastructure"),
    "Cloud Architect":                 ("Cloud Architect",                  "Cloud & Infrastructure"),
    "Site Reliability Engineer":       ("Site Reliability Engineer",        "Cloud & Infrastructure"),
    "Platform Engineer":               ("Platform Engineer",                "Cloud & Infrastructure"),
    # Technical Project Management
    "Technical Project Manager":       ("Technical Project Manager",        "Technical Project Management"),
    "Technical Product Manager":       ("Technical Project Manager",        "Technical Project Management"),
    "Agile Project Manager":           ("Agile Project Manager",            "Technical Project Management"),
    "Program Manager":                 ("Program Manager",                  "Technical Project Management"),
    "Scrum Master":                    ("Scrum Master",                     "Technical Project Management"),
    # DevOps
    "DevOps Engineer":                 ("DevOps Engineer",                  "DevOps"),
    "Automation Engineer":             ("DevOps Engineer",                  "DevOps"),
    "CI/CD Engineer":                  ("CI/CD Engineer",                   "DevOps"),
    "Infrastructure as Code Engineer": ("Infrastructure as Code Engineer",  "DevOps"),
    "Release Engineer":                ("Release Engineer",                 "DevOps"),
    "Containerization Engineer":       ("Containerization Engineer",        "DevOps"),
}


# ---------------------------------------------------------------------------
# Noise / skill filtering (kept for the standard import path)
# ---------------------------------------------------------------------------

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
    # High-frequency false positives
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
    "HEAD", "KEY SKILLS", "HTTPS", "PAYMENTS",
    "HTTP", "STORAGE", "SAAS",
}

SHORT_SKILL_ALLOWLIST = {
    "AI", "ML", "NLP", "AWS", "GCP", "SQL", "API", "BI", "SOC", "IAM",
    "CI/CD", "C++", "C#",
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def parse_pipe_list(raw) -> list:
    if raw is None:
        return []
    text = str(raw).strip()
    if not text:
        return []
    return [q.strip() for q in text.split("|") if q.strip()]


def is_valid_skill_label(skill: str) -> bool:
    if not skill:
        return False
    s = str(skill).strip().upper()
    if not s or s in BLOCKED_CONCEPTS:
        return False
    if len(s) <= 3 and s not in SHORT_SKILL_ALLOWLIST:
        return False
    return True


def company_self_tokens(company: str) -> set:
    if not company:
        return set()
    tokens = set()
    name_lower = company.strip().lower()
    for suffix in (" inc", " llc", " ltd", " corp", " co", " group",
                   " solutions", " consulting", " technologies", " technology",
                   " services", " partners", " labs", " studio", " studios"):
        name_lower = name_lower.replace(suffix, "")
    name_lower = name_lower.strip()
    tokens.add(name_lower)
    for word in re.split(r"[\s\-_,&()./]+", name_lower):
        word = word.strip()
        if len(word) >= 4:
            tokens.add(word)
    return tokens


def normalize_job_row(row: dict) -> dict:
    return {
        "company_name": (row.get("company_name") or "").strip(),
        "job_type":     (row.get("job_type") or "Unknown").strip(),
        "job_name":     (row.get("job_name") or "").strip(),
        "description":  (row.get("description") or "").strip(),
        "qualifications": parse_pipe_list(row.get("qualifications", "")),
    }


def is_noise_job(job: dict) -> bool:
    text = f"{job.get('company_name', '')} {job.get('job_name', '')}".upper()
    if any(p in text for p in NOISE_PATTERNS):
        return True
    desc_upper = (job.get("description") or "").upper()
    if any(p in desc_upper for p in NOISE_PATTERNS):
        return True
    return False


# ---------------------------------------------------------------------------
# --use-normalized path: Phase 1 aggregation
# ---------------------------------------------------------------------------

def aggregate_normalized_csv(csv_path: Path, verbose: bool) -> dict:
    """
    Read scraped_jobs_clean.csv (already normalized by normalize_csv.py).
    Returns a dict keyed by canonical display_name:
      {
        "Front-End Engineer": {
            "display_name": "Front-End Engineer",
            "domain":       "Software Engineering",
            "description":  "...",
            "total_postings": 20,
            "skill_counts": Counter({"PYTHON": 18, "REACT": 15, ...}),
            "companies":    {"GOOGLE", "META", ...},
        },
        ...
      }
    """
    aggregated = {}

    with open(csv_path, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            # Skip noise rows flagged by normalize_csv.py
            if str(row.get("is_noise_row", "")).strip().lower() in ("true", "1", "yes"):
                continue

            csv_title = (row.get("qualifications") or "").strip()
            if not csv_title:
                continue

            canonical = TITLE_TO_CANONICAL.get(csv_title)
            if not canonical:
                if verbose:
                    print(f"[TITLE-UNKNOWN] '{csv_title}' — skipping row")
                continue

            display_name, domain = canonical

            if display_name not in aggregated:
                aggregated[display_name] = {
                    "display_name":  display_name,
                    "domain":        domain,
                    "description":   "",
                    "total_postings": 0,
                    "skill_counts":  Counter(),
                    "companies":     set(),
                }

            bucket = aggregated[display_name]
            bucket["total_postings"] += 1

            # First non-empty description wins
            if not bucket["description"]:
                desc = (row.get("description") or "").strip()
                if desc:
                    bucket["description"] = desc

            # Company
            company = (row.get("company_name") or "").strip().upper()
            if company:
                bucket["companies"].add(company)

            # Skills from normalized_skills column
            for skill_raw in parse_pipe_list(row.get("normalized_skills", "")):
                skill_upper = skill_raw.strip().upper()
                if is_valid_skill_label(skill_upper):
                    bucket["skill_counts"][skill_upper] += 1

    return aggregated


def build_job_records(aggregated: dict) -> list:
    """
    Convert aggregated buckets into job records ready for Neo4jWriter.write_job().
    weight = mentions / total_postings  (for that job only)
    """
    records = []
    for display_name, bucket in aggregated.items():
        total = bucket["total_postings"]
        skills = []
        for skill_name, mentions in bucket["skill_counts"].items():
            weight = round(mentions / total, 4) if total > 0 else 0.0
            skills.append({
                "name":           skill_name,
                "weight":         weight,
                "mentions":       mentions,
                "total_postings": total,
            })
        # Sort by weight desc for readability in --verbose output
        skills.sort(key=lambda x: x["weight"], reverse=True)
        records.append({
            "display_name":  display_name,
            "domain":        bucket["domain"],
            "description":   bucket["description"],
            "total_postings": total,
            "skills":        skills,
            "companies":     sorted(bucket["companies"]),
        })
    return records


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Import scraped job CSV into Neo4j")
    parser.add_argument("--csv", required=True, help="Path to scraped CSV")
    parser.add_argument("--dry-run",        action="store_true",
                        help="Preview aggregation without writing to Neo4j")
    parser.add_argument("--verbose",        action="store_true",
                        help="Print per-job details")
    parser.add_argument("--source",         type=str, default="csv_import",
                        help="Source tag written on imported nodes/edges")
    parser.add_argument("--import-batch",   type=str, default="",
                        help="Optional batch id; autogenerated when omitted")
    parser.add_argument("--use-normalized", action="store_true",
                        help="Use normalized_skills column (skip re-extraction and fuzzy matching)")
    args = parser.parse_args()

    import_batch = args.import_batch or datetime.now(timezone.utc).strftime("csv_%Y%m%d_%H%M%S")

    dotenv_path = Path(__file__).parent.parent / ".env"
    load_dotenv(dotenv_path)

    neo4j_uri      = os.getenv("NEO4J_URI",      "neo4j://localhost:7687")
    neo4j_user     = os.getenv("NEO4J_USER",     "neo4j")
    neo4j_password = os.getenv("NEO4J_PASSWORD",  "password")

    csv_path = Path(args.csv)
    if not csv_path.exists():
        raise FileNotFoundError(f"CSV not found: {csv_path}")

    # -------------------------------------------------------------------------
    # --use-normalized path
    # -------------------------------------------------------------------------
    if args.use_normalized:
        print("=== --use-normalized mode ===")
        print(f"CSV:          {csv_path}")
        print(f"Source:       {args.source}")
        print(f"Import batch: {import_batch}")
        print()

        # Phase 1: Aggregate
        print("Phase 1: Aggregating CSV rows by canonical job title...")
        aggregated = aggregate_normalized_csv(csv_path, args.verbose)
        records    = build_job_records(aggregated)

        print(f"  Canonical jobs found: {len(records)}")
        for rec in records:
            print(f"    {rec['display_name']:40s} postings={rec['total_postings']:3d}  "
                  f"skills={len(rec['skills']):3d}  companies={len(rec['companies']):3d}")
            if args.verbose:
                for sk in rec["skills"][:10]:
                    print(f"      {sk['name']:30s} weight={sk['weight']:.4f}  "
                          f"mentions={sk['mentions']}/{sk['total_postings']}")

        if args.dry_run:
            print("\n[DRY RUN] No writes performed.")
            return

        # Phase 2: Write to Neo4j
        print("\nPhase 2: Writing to Neo4j...")
        writer = Neo4jWriter(neo4j_uri, neo4j_user, neo4j_password)
        try:
            for rec in records:
                rec["source"]       = args.source
                rec["import_batch"] = import_batch
                writer.write_job(rec)
                print(f"  Written: {rec['display_name']}")

            # Phase 3: Update Concept.jobs / Concept.job_count
            print("\nPhase 3: Updating Concept node job lists...")
            writer.update_concept_job_lists()
            print("  Done.")
        finally:
            writer.close()

        print(f"\nImport complete. {len(records)} canonical jobs written.")
        return

    # -------------------------------------------------------------------------
    # Standard path (original row-by-row logic)
    # -------------------------------------------------------------------------
    matcher = None
    writer  = None
    if not args.dry_run:
        matcher = DataMatcher(neo4j_uri, neo4j_user, neo4j_password)
        writer  = Neo4jWriter(neo4j_uri, neo4j_user, neo4j_password)

    imported              = 0
    skipped               = 0
    noise_skipped         = 0
    title_matched_count   = 0
    skill_total           = 0
    skill_matched_count   = 0
    skill_unmatched_count = 0

    with open(csv_path, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            job = normalize_job_row(row)

            if not job["job_name"]:
                skipped += 1
                continue

            if is_noise_job(job):
                skipped += 1
                noise_skipped += 1
                if args.verbose:
                    print(f"[SKIPPED-NOISE] {job['company_name']} | {job['job_name']}")
                continue

            if args.dry_run:
                print(f"[DRY RUN] {job['job_name']} @ {job['company_name']}")
                imported += 1
                continue

            original_title = job["job_name"]
            matched_title  = matcher.match_job_title(job["job_name"])
            if matched_title:
                job["job_name"] = matched_title
                title_matched_count += 1

            matched_quals    = []
            per_row_qual_debug = []
            self_tokens      = company_self_tokens(job.get("company_name", ""))
            dynamic_skills   = matcher.extract_dynamic_skills(
                f"{job.get('job_name', '')}\n{job.get('description', '')}",
                max_skills=25,
            )
            merged_quals = list(job.get("qualifications", [])) + dynamic_skills

            for qual in merged_quals:
                matched    = matcher.match_concept(qual, threshold=92)
                final_skill = matched if matched and is_valid_skill_label(matched) else qual
                if not is_valid_skill_label(final_skill):
                    if args.verbose:
                        print(f"[SKILL-DROPPED] {job['job_name']} | {qual} -> {final_skill}")
                    continue
                if final_skill.lower() in self_tokens:
                    if args.verbose:
                        print(f"[SKILL-SELF] {job['job_name']} | {final_skill} (company self-ref)")
                    continue
                matched_quals.append(final_skill)
                skill_total += 1
                if matched and final_skill == matched:
                    skill_matched_count += 1
                else:
                    skill_unmatched_count += 1
                if args.verbose:
                    per_row_qual_debug.append(f"{qual} -> {final_skill}")

            # Standard path uses legacy write_job signature — build a compatible record
            # NOTE: standard path still produces per-row writes; for best results use
            # --use-normalized which aggregates properly before writing.
            canonical = TITLE_TO_CANONICAL.get(job["job_name"])
            display_name = canonical[0] if canonical else job["job_name"]
            domain       = canonical[1] if canonical else ""

            writer.write_job({
                "display_name":  display_name,
                "domain":        domain,
                "description":   job.get("description", ""),
                "total_postings": 1,
                "skills": [{"name": s, "weight": 0.5, "mentions": 1, "total_postings": 1}
                           for s in set(matched_quals)],
                "companies":     [job["company_name"].upper()] if job.get("company_name") else [],
                "source":        args.source,
                "import_batch":  import_batch,
            })
            imported += 1

            if args.verbose:
                title_note = (f"title: {original_title} -> {display_name}"
                              if original_title != display_name else f"title: {display_name}")
                print(f"[IMPORTED] {job['company_name']} | {title_note}")
                if per_row_qual_debug:
                    print("  skills: " + "; ".join(per_row_qual_debug))

    print(f"Imported: {imported}")
    print(f"Skipped:  {skipped}")
    print(f"Skipped noise rows: {noise_skipped}")
    if not args.dry_run:
        print(f"Import source: {args.source}")
        print(f"Import batch:  {import_batch}")
        print(f"Title matched to existing jobs: {title_matched_count}")
        print(f"Skills processed:               {skill_total}")
        print(f"Skills matched to existing concepts: {skill_matched_count}")
        print(f"Skills left as-is:              {skill_unmatched_count}")


if __name__ == "__main__":
    main()
