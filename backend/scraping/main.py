import os
import argparse
import asyncio
import csv
from pathlib import Path
from datetime import datetime, timezone
from dotenv import load_dotenv

from matcher import DataMatcher
from neo4j_writer import Neo4jWriter
from normalize_csv import run_normalize
from llm_parser import (
    get_audit_data,
    flush_audit_csvs,
    is_daily_quota_exhausted,
    reset_daily_quota_exhausted,
)

import spiders.indeed
import spiders.linkedin
import spiders.jobright
import spiders.intern_list
import spiders.handshake

# Load environment variables
dotenv_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
load_dotenv(dotenv_path)

NEO4J_URI = os.getenv("NEO4J_URI", "neo4j://localhost:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "password")


def write_jobs_csv(rows, output_path):
    """Write scraped jobs to CSV for offline analysis."""
    fieldnames = [
        "company_name",
        "job_type",
        "job_name",
        "description",
        "qualifications",
    ]
    out = Path(output_path)
    out.parent.mkdir(parents=True, exist_ok=True)

    with open(out, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow({
                "company_name": row.get("company_name", ""),
                "job_type": row.get("job_type", ""),
                "job_name": row.get("job_name", ""),
                "description": row.get("description", ""),
                "qualifications": "|".join(row.get("qualifications", [])),
            })
    print(f"[System] Wrote {len(rows)} jobs to CSV: {out}")


def append_progress_row(progress_csv, spider, keyword, mode, status, jobs_found=0, note=""):
    """Append one progress row for resumable scraping."""
    out = Path(progress_csv)
    out.parent.mkdir(parents=True, exist_ok=True)
    exists = out.exists()
    fieldnames = [
        "timestamp",
        "spider",
        "keyword",
        "mode",
        "status",
        "jobs_found",
        "note",
    ]
    with open(out, "a", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        if not exists:
            writer.writeheader()
        writer.writerow({
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "spider": spider,
            "keyword": keyword,
            "mode": mode,
            "status": status,
            "jobs_found": jobs_found,
            "note": note[:300],
        })


def load_completed_progress(progress_csv, mode):
    """Load completed (DONE) spider+keyword pairs for resume mode."""
    done = set()
    path = Path(progress_csv)
    if not path.exists():
        return done

    with open(path, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            if row.get("status") == "DONE" and row.get("mode") == mode:
                done.add((row.get("spider", ""), row.get("keyword", "")))
    return done

async def process_job(job_data, matcher, writer):
    """
    Passes a single scraped job through the matcher and writer.
    """
    matched_title = matcher.match_job_title(job_data.get("job_name", ""))
    if matched_title:
        job_data["job_name"] = matched_title
        
    dynamic_skills = matcher.extract_dynamic_skills(
        f"{job_data.get('job_name', '')}\n{job_data.get('description', '')}",
        max_skills=25,
    )
    merged_quals = list(job_data.get("qualifications", [])) + dynamic_skills

    matched_quals = []
    for qual in merged_quals:
        matched_qual = matcher.match_concept(qual)
        if matched_qual:
            matched_quals.append(matched_qual)
        else:
            matched_quals.append(qual)
            
    job_data["qualifications"] = list(set(matched_quals))

    # Write to Neo4j
    writer.write_job(job_data)
    print(f"Stored job: '{job_data.get('job_name')}' at {job_data.get('company_name')} with skills {job_data.get('qualifications')}")

async def main():
    parser = argparse.ArgumentParser(description="Run job scrapers and populate Neo4j")
    parser.add_argument("--spider", type=str, choices=["indeed", "linkedin", "jobright", "intern_list", "handshake", "all", "dummy"], default="dummy", help="Which spider to run")
    
    # Define the core careers RoleMap focuses on
    default_keywords = [
        "Front-End Engineer", "Back-End Engineer", "Full-Stack Engineer", "Mobile Engineer", "Systems Engineer", "Game Developer",
        "Security Analyst", "Penetration Tester", "Security Engineer", "Cloud Security Engineer", "SOC Analyst", "Application Security", "GRC Analyst",
        "Machine Learning Engineer", "Data Scientist", "AI Engineer", "NLP Engineer", "Computer Vision Engineer", "Research Scientist",
        "BI Developer", "Data Visualization Engineer", "Analytics Engineer", "Reporting Analyst",
        "Cloud Infrastructure Engineer", "Cloud Architect", "Site Reliability Engineer", "Platform Engineer",
        "Agile Project Manager", "Program Manager", "Technical Product Manager", "Scrum Master",
        "CI/CD Engineer", "Infrastructure as Code Engineer", "Release Engineer", "Automation Engineer", "Containerization Engineer"
    ]
    
    parser.add_argument("--keywords", type=str, nargs="+", default=default_keywords, help="Keywords to search for")
    parser.add_argument("--limit", type=int, default=5, help="Maximum number of jobs to fetch per keyword search")
    parser.add_argument("--dry-run", action="store_true", help="Print scraped data without writing to Neo4j")
    parser.add_argument("--no-llm", action="store_true", help="Disable Gemini and use local rule-based extraction")
    parser.add_argument("--csv-only", action="store_true", help="Scrape and export CSV without writing Neo4j")
    parser.add_argument("--csv-path", type=str, default="output/scraped_jobs.csv", help="Path to output CSV")
    parser.add_argument("--progress-csv", type=str, default="output/scrape_progress.csv", help="Progress log CSV for resume support")
    parser.add_argument("--resume", action="store_true", help="Skip spider+keyword entries already marked DONE in progress CSV")
    args = parser.parse_args()

    if args.csv_only:
        args.dry_run = True

    run_batch = datetime.now(timezone.utc).strftime("scrape_%Y%m%d_%H%M%S")
    print(f"[System] Import batch: {run_batch}")

    reset_daily_quota_exhausted()
    mode = "no-llm" if args.no_llm else "llm"
    completed = load_completed_progress(args.progress_csv, mode) if args.resume else set()

    matcher = None
    writer = None
    if not args.dry_run:
        print(f"[System] Connecting to Neo4j at {NEO4J_URI}...")
        try:
            matcher = DataMatcher(NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD)
            writer = Neo4jWriter(NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD)
            print("[System] Neo4j connection established.")
        except Exception as e:
            print(f"[System] CRITICAL: Neo4j connection failed: {e}")
            return

    try:
        all_scraped_jobs = []
        
        if args.spider == "dummy":
            print("[System] Running dummy extraction for testing Neo4j connectivity...")
            all_scraped_jobs = [
                {
                    "company_name": "TestCorp", 
                    "job_type": "Full-time", 
                    "job_name": "Sr. Software Eng", 
                    "description": "Backend role", 
                    "qualifications": ["Python Programming", "Neo4j Graph"]
                }
            ]
        else:
            spiders_to_run = []
            # Indeed is Cloudflare-blocked; intern_list domain doesn't exist.
            # They can still be run individually but are excluded from "all".
            if args.spider == "indeed": spiders_to_run.append(spiders.indeed)
            if args.spider == "linkedin" or args.spider == "all": spiders_to_run.append(spiders.linkedin)
            if args.spider == "jobright" or args.spider == "all": spiders_to_run.append(spiders.jobright)
            if args.spider == "intern_list": spiders_to_run.append(spiders.intern_list)
            if args.spider == "handshake" or args.spider == "all": spiders_to_run.append(spiders.handshake)

            stop_for_quota = False
            for spider in spiders_to_run:
                spider_name = spider.__name__.split(".")[-1]
                if stop_for_quota:
                    break

                for keyword in args.keywords:
                    if args.resume and (spider_name, keyword) in completed:
                        print(f"[Resume] Skipping already completed: {spider_name} | {keyword}")
                        continue

                    try:
                        jobs = await spider.scrape_jobs(
                            keywords=[keyword],
                            limit=args.limit,
                            use_llm=not args.no_llm,
                        )
                        for job in jobs:
                            job["import_source"] = spider_name
                            job["import_batch"] = run_batch
                        all_scraped_jobs.extend(jobs)

                        # If Gemini daily quota is exhausted, stop so user can continue tomorrow.
                        if not args.no_llm and is_daily_quota_exhausted():
                            append_progress_row(
                                args.progress_csv,
                                spider_name,
                                keyword,
                                mode,
                                "QUOTA_EXHAUSTED",
                                jobs_found=len(jobs),
                                note="Gemini daily quota exhausted",
                            )
                            stop_for_quota = True
                            print("[System] Stopping run because Gemini daily quota is exhausted.")
                            break

                        status = "DONE" if jobs else "NO_RESULTS"
                        append_progress_row(
                            args.progress_csv,
                            spider_name,
                            keyword,
                            mode,
                            status,
                            jobs_found=len(jobs),
                        )

                    except Exception as e:
                        append_progress_row(
                            args.progress_csv,
                            spider_name,
                            keyword,
                            mode,
                            "ERROR",
                            jobs_found=0,
                            note=str(e),
                        )
                        print(f"[System] Failed running {spider_name} for '{keyword}': {e}")

                if stop_for_quota:
                    break

            if stop_for_quota:
                print(f"[System] Resume later with: python main.py --spider {args.spider} --limit {args.limit} --resume --progress-csv {args.progress_csv}")


        for job in all_scraped_jobs:
            if args.dry_run:
                print(f"[DRY RUN] Would store: {job}")
            else:
                await process_job(job, matcher, writer)

        if all_scraped_jobs:
            write_jobs_csv(all_scraped_jobs, args.csv_path)
            run_normalize(args.csv_path, NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD)
        else:
            print("[System] No jobs scraped. CSV not written.")

        # --- Flush audit CSVs and print summary ---
        flush_audit_csvs()
        job_audit, skill_audit = get_audit_data()
        jobs_kept = sum(1 for r in job_audit if r["status"] == "KEPT")
        jobs_dropped = sum(1 for r in job_audit if r["status"] == "DROPPED")
        skills_kept = sum(1 for r in skill_audit if r["status"] == "KEPT")
        skills_dropped = sum(1 for r in skill_audit if r["status"] == "DROPPED")

        print("\n" + "=" * 50)
        print("  SCRAPE SUMMARY")
        print("=" * 50)
        print(f"  Jobs extracted:  {len(all_scraped_jobs)}")
        print(f"  Jobs kept:       {jobs_kept}")
        print(f"  Jobs dropped:    {jobs_dropped}")
        print(f"  Skills kept:     {skills_kept}")
        print(f"  Skills dropped:  {skills_dropped}")
        print(f"  Audit logs:      output/filter_jobs.csv")
        print(f"                   output/filter_skills.csv")
        print("=" * 50)
        print("[System] Scraping and GraphDB population completed.")

    finally:
        if matcher:
            matcher.close()
        if writer:
            writer.close()

if __name__ == "__main__":
    asyncio.run(main())
