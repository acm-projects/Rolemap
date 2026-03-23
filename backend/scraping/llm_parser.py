import os
import re
import csv
import json
import time
from pathlib import Path
from google import genai
from pydantic import BaseModel
from typing import List
from dotenv import load_dotenv
from thefuzz import fuzz

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'))

# ---------- Output directory for CSVs ----------
OUTPUT_DIR = Path(__file__).parent.parent / "output"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# ---------- Multi-key rotation ----------
_api_keys: list[str] = []
for env_var in ["GEMINI_API_KEY"] + [f"GEMINI_API_KEY_{i}" for i in range(2, 10)]:
    key = os.getenv(env_var)
    if key:
        _api_keys.append(key)

if not _api_keys:
    print("[LLM Parser] WARNING: No GEMINI_API_KEY* found in .env")

_clients: list[genai.Client] = [genai.Client(api_key=k) for k in _api_keys]
_current_key_idx = 0
_daily_quota_exhausted = False


def is_daily_quota_exhausted() -> bool:
    return _daily_quota_exhausted


def reset_daily_quota_exhausted() -> None:
    global _daily_quota_exhausted
    _daily_quota_exhausted = False


def _next_client() -> genai.Client | None:
    """Return the next client in the rotation, or None if no keys."""
    global _current_key_idx, _clients, _api_keys
    if not _clients:
        return None
    client = _clients[_current_key_idx % len(_clients)]
    _current_key_idx += 1
    return client


# ---------- Pydantic schemas ----------
class JobExtraction(BaseModel):
    company_name: str
    job_type: str
    qualifications: List[str]
    job_name: str
    description: str

class JobExtractionList(BaseModel):
    jobs: List[JobExtraction]


# ---------- Retry config ----------
MAX_RETRIES = 5
INITIAL_BACKOFF_SECS = 10


# ---------- Tech-role keyword set for relevance filtering ----------
_TECH_KEYWORDS = {
    "engineer", "developer", "programmer", "architect", "analyst",
    "scientist", "devops", "devsecops", "security", "cyber", "soc",
    "data", "cloud", "sre", "ml", "ai", "qa", "tester", "testing",
    "scrum", "product manager", "project manager", "program manager",
    "software", "backend", "frontend", "front-end", "back-end",
    "full-stack", "fullstack", "mobile", "ios", "android", "web",
    "infrastructure", "platform", "reliability", "containerization",
    "automation", "ci/cd", "release", "nlp", "machine learning",
    "deep learning", "computer vision", "research", "bi developer",
    "visualization", "analytics", "reporting", "penetration",
    "grc", "governance", "compliance", "game", "systems",
}

# ---------- Skill cleanup config ----------
_SKILL_BLOCKLIST_PATTERNS = [
    "csrconnect", "employee engagement", "professional software development",
    "years professional", "5+ years", "improvement of front-end",
    "ownership of front-end", "expansion of front-end", "reuse of front-end",
    "backend engineering collaboration", "ai engineering collaboration",
    "client-server interaction", "backend systems knowledge",
    "integrate dynamic content", "integrate apis",
    "end-to-end ownership", "end-to-end delivery",
    "collaborate with back-end", "coaching junior",
    "mentoring junior", "best coding practices",
    "implementing best practices", "high degree of ownership",
]


# ---------- CSV audit logging ----------
_job_audit_rows: list[dict] = []
_skill_audit_rows: list[dict] = []


def get_audit_data() -> tuple[list[dict], list[dict]]:
    """Return (job_audit_rows, skill_audit_rows) for external use."""
    return _job_audit_rows, _skill_audit_rows


def flush_audit_csvs():
    """Write accumulated audit rows to CSV files."""
    job_csv = OUTPUT_DIR / "filter_jobs.csv"
    with open(job_csv, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["keyword", "company", "job_name", "status", "reason"])
        writer.writeheader()
        if _job_audit_rows:
            writer.writerows(_job_audit_rows)
    print(f"[Audit] Job filter log updated: {job_csv} ({len(_job_audit_rows)} rows)")

    skill_csv = OUTPUT_DIR / "filter_skills.csv"
    with open(skill_csv, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["job_name", "skill", "status", "reason"])
        writer.writeheader()
        if _skill_audit_rows:
            writer.writerows(_skill_audit_rows)
    print(f"[Audit] Skill filter log updated: {skill_csv} ({len(_skill_audit_rows)} rows)")


# ---------- Relevance filter ----------
def _is_relevant_job(job_name: str, source_keyword: str) -> tuple[bool, str]:
    """
    Check if a job title is relevant to the search keyword.
    Returns (is_relevant, reason).
    """
    job_lower = job_name.lower().strip()
    keyword_lower = source_keyword.lower().strip()

    # Check 1: fuzzy match against the source keyword
    score = fuzz.token_set_ratio(job_lower, keyword_lower)
    if score >= 40:
        return True, f"fuzzy_match={score}"

    # Check 2: does the job title contain any known tech keyword?
    for kw in _TECH_KEYWORDS:
        if kw in job_lower:
            return True, f"tech_keyword='{kw}'"

    return False, f"no_match (fuzzy={score}, no tech keyword)"


# ---------- Skill cleanup ----------
def _clean_skills(qualifications: list[str], job_name: str) -> list[str]:
    """
    Remove hallucinated or garbage skills. Logs each decision to the audit list.
    """
    cleaned = []
    for skill in qualifications:
        skill_stripped = skill.strip()
        if not skill_stripped:
            continue

        # Rule 1: too long (real skills are concise)
        if len(skill_stripped) > 60:
            _skill_audit_rows.append({"job_name": job_name, "skill": skill_stripped, "status": "DROPPED", "reason": f"too_long ({len(skill_stripped)} chars)"})
            continue

        # Rule 2: contains "X+ years" pattern — experience requirement, not a skill
        if re.search(r"\d+\+?\s*years?", skill_stripped, re.IGNORECASE):
            _skill_audit_rows.append({"job_name": job_name, "skill": skill_stripped, "status": "DROPPED", "reason": "years_pattern"})
            continue

        # Rule 3: ALL CAPS with 4+ words — scraping artifact
        words = skill_stripped.split()
        if len(words) >= 4 and skill_stripped == skill_stripped.upper():
            _skill_audit_rows.append({"job_name": job_name, "skill": skill_stripped, "status": "DROPPED", "reason": "all_caps_noise"})
            continue

        # Rule 4: matches blocklist
        skill_check = skill_stripped.lower()
        blocked = False
        for pattern in _SKILL_BLOCKLIST_PATTERNS:
            if pattern in skill_check:
                _skill_audit_rows.append({"job_name": job_name, "skill": skill_stripped, "status": "DROPPED", "reason": f"blocklist='{pattern}'"})
                blocked = True
                break
        if blocked:
            continue

        # Passed all checks
        _skill_audit_rows.append({"job_name": job_name, "skill": skill_stripped, "status": "KEPT", "reason": "passed_all_checks"})
        cleaned.append(skill_stripped)

    return cleaned


def _extract_jobs_rule_based(text: str, source_keyword: str, max_jobs: int = 10) -> List[dict]:
    """
    Lightweight local extractor used when LLM is unavailable/quota-exhausted.
    It extracts likely job titles from page text and pairs them with nearby company names.
    Also extracts description text when available.
    """
    noise_substrings = {
        "skip to main content", "sign in", "join now", "clear text", "any time",
        "company", "job type", "experience level", "location", "salary", "remote",
        "create job alert", "be an early applicant", "jobs in", "filters", "sort by",
        "set alert", "actively hiring",
        "for employers", "about us", "blog", "ai agent", "resume ai", "try for free",
        "do it with ai", "real results", "trusted users", "no more solo job hunting",
        "access the largest job hub", "interviews landed", "time saved on job search",
        "no.1 choice", "total jobs", "get matched jobs", "autofill applications",
    }

    bad_exact = {
        "unknown company", "for employers", "about us", "blog", "try for free",
        "ai agent", "resume ai", "do it with ai", "features",
    }

    def _looks_like_location_or_meta(line: str) -> bool:
        lower = line.lower().strip()
        if lower in bad_exact:
            return True
        if re.fullmatch(r"\d+%?", lower):
            return True
        if re.search(r"\b\d+\s+(minutes?|hours?|days?|weeks?|months?|years?)\s+ago\b", lower):
            return True
        if re.search(r"\b(united states|remote|metropolitan area|medical insurance|benefits)\b", lower):
            return True
        if "set alert" in lower or "actively hiring" in lower:
            return True
        if re.search(r"\b[a-zA-Z\s]+,\s*[A-Z]{2}\b", line):
            return True
        return False

    def _is_noise(line: str) -> bool:
        lower = line.lower()
        if any(token in lower for token in noise_substrings):
            return True
        if re.search(r"\b\d+[,+]?\d*\+?\s+\w+\s+jobs\b", lower):
            return True
        if len(line) > 120:
            return True
        if _looks_like_location_or_meta(line):
            return True
        return False

    lines = [ln.strip() for ln in text.splitlines() if ln and ln.strip()]
    lines = [ln for ln in lines if not _is_noise(ln)]

    extracted: list[dict] = []
    seen: set[tuple[str, str]] = set()

    for i, line in enumerate(lines):
        if len(extracted) >= max_jobs:
            break

        is_relevant, _ = _is_relevant_job(line, source_keyword)
        if not is_relevant:
            continue

        if _looks_like_location_or_meta(line):
            continue

        title = line
        company_name = "Unknown Company"
        company_idx = -1

        # Find nearest likely company line after title
        for j in range(i + 1, min(i + 5, len(lines))):
            candidate = lines[j]
            candidate_lower = candidate.lower()
            if _is_noise(candidate):
                continue
            if _is_relevant_job(candidate, source_keyword)[0]:
                continue
            if re.search(r"\b\d+\s+(day|days|week|weeks|month|months|year|years)\s+ago\b", candidate_lower):
                continue
            if re.search(r"\b(united states|remote|new york|san francisco|los angeles|seattle|austin)\b", candidate_lower):
                continue
            if _looks_like_location_or_meta(candidate):
                continue
            company_name = candidate
            company_idx = j
            break

        # Extract description from lines after company name
        description = ""
        if company_idx >= 0:
            description_lines = []
            for j in range(company_idx + 1, min(company_idx + 4, len(lines))):
                desc_line = lines[j]
                # Stop if we hit another job title or location/time stamp
                if _is_relevant_job(desc_line, source_keyword)[0]:
                    break
                if re.search(r"\b\d+\s+(day|days|week|weeks|month|months|year|years)\s+ago\b", desc_line.lower()):
                    break
                if re.search(r"\b(united states|remote|new york|san francisco|los angeles|seattle|austin|ca|ny|tx)\b", desc_line.lower(), re.IGNORECASE):
                    break
                description_lines.append(desc_line)
            
            if description_lines:
                description = " ".join(description_lines)[:200]  # Limit to 200 chars
            else:
                description = ""

        if _looks_like_location_or_meta(company_name):
            continue

        sig = (company_name.lower(), title.lower())
        if sig in seen:
            continue
        seen.add(sig)

        extracted.append({
            "company_name": company_name,
            "job_type": "Unknown",
            "qualifications": [source_keyword],
            "job_name": title,
            "description": description,
        })

    print(f"[LLM Parser] Local fallback extracted {len(extracted)} jobs for '{source_keyword}'.")
    return extracted


# ---------- Main extraction ----------
def extract_jobs_from_text(text: str, source_keyword: str) -> List[dict]:
    """
    Extract job cards from raw page text using Gemini LLM.
    Applies relevance filtering and skill cleanup post-extraction.
    Retries with exponential backoff on rate limits, cycles API keys.
    """
    global _current_key_idx, _clients, _api_keys, _daily_quota_exhausted

    if not _clients:
        print("[LLM Parser] No GEMINI_API_KEY found. Using local fallback extraction.")
        return _extract_jobs_rule_based(text, source_keyword)

    print(f"[LLM Parser] Extracting jobs via LLM for keyword '{source_keyword}'...")

    prompt = f"""
    You are an expert data scraper. I am providing you the raw text extracted from a job search page for the query '{source_keyword}'.
    
    IMPORTANT RULES:
    1. ONLY extract jobs whose title is clearly related to '{source_keyword}' or the broader technology/IT field.
       SKIP any listings that are clearly non-tech roles (e.g., marketing directors, HR coordinators, merchandising, medical, legal, finance roles).
    2. For qualifications: ONLY extract skills that are EXPLICITLY mentioned in the text.
       Do NOT infer, guess, or hallucinate skills. If no technical skills are listed, return an empty array [].
    
    For each relevant tech job, extract:
    - company_name
    - job_type (e.g., Full-time, Internship, Contract. Infer if possible, else default to 'Full-time')
    - qualifications (List of concise skill/technology names ONLY from the text, e.g. ['Python', 'React', 'SQL']. Max 50 chars per skill.)
    - job_name (The role title)
    - description (A short 1-2 sentence snippet of the core responsibilities)

    Return ONLY a valid JSON object matching the requested schema. Do not return markdown blocks.
    Here is the raw page text:
    ---
    {text[:15000]}
    ---
    """

    backoff = INITIAL_BACKOFF_SECS

    for attempt in range(1, MAX_RETRIES + 1):
        client = _next_client()
        try:
            raw_jobs = []
            response = client.models.generate_content(
                model='gemini-2.0-flash',
                contents=prompt,
                config=genai.types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=JobExtractionList,
                    temperature=0.1
                ),
            )

            # If using response_schema with SDK v2, the data is in response.parsed
            if hasattr(response, 'parsed') and response.parsed:
                raw_jobs_list = response.parsed
                if hasattr(raw_jobs_list, 'jobs'):
                    raw_jobs = [j.model_dump() if hasattr(j, 'model_dump') else j for j in raw_jobs_list.jobs]
                elif isinstance(raw_jobs_list, dict):
                    raw_jobs = raw_jobs_list.get("jobs", [])
            else:
                # Fallback to response.text
                print(f"[LLM Parser] Raw response for '{source_keyword}': {response.text[:200]}...")
                data = json.loads(response.text)
                if isinstance(data, dict):
                    raw_jobs = data.get("jobs", [])
                elif isinstance(data, list):
                    raw_jobs = data

            # Deduplicate
            unique_jobs = []
            seen = set()
            for job in raw_jobs:
                sig = (job.get("company_name", "").lower(), job.get("job_name", "").lower())
                if sig not in seen:
                    seen.add(sig)
                    unique_jobs.append(job)

            print(f"[LLM Parser] Found {len(unique_jobs)} distinct jobs after deduction.")
            for j in unique_jobs:
                print(f"  - Job: {j.get('job_name')} @ {j.get('company_name')} | Skills from LLM: {j.get('qualifications')}")

            # --- FILTER 1: Job relevance ---
            relevant_jobs = []
            for job in unique_jobs:
                is_relevant, reason = _is_relevant_job(job.get("job_name", ""), source_keyword)
                if is_relevant:
                    _job_audit_rows.append({
                        "keyword": source_keyword,
                        "company": job.get("company_name", ""),
                        "job_name": job.get("job_name", ""),
                        "status": "KEPT",
                        "reason": reason,
                    })
                    relevant_jobs.append(job)
                else:
                    _job_audit_rows.append({
                        "keyword": source_keyword,
                        "company": job.get("company_name", ""),
                        "job_name": job.get("job_name", ""),
                        "status": "DROPPED",
                        "reason": reason,
                    })
                    print(f"[Filter] Dropped irrelevant job: '{job.get('job_name')}' at {job.get('company_name')}")

            dropped_count = len(unique_jobs) - len(relevant_jobs)
            if dropped_count > 0:
                print(f"[Filter] Kept {len(relevant_jobs)}/{len(unique_jobs)} jobs for '{source_keyword}'")

            # --- FILTER 2: Skill cleanup ---
            for job in relevant_jobs:
                old_skills = job.get("qualifications", [])
                job["qualifications"] = _clean_skills(old_skills, job.get("job_name", ""))
                print(f"  - Cleaned skills for '{job.get('job_name')}': {len(old_skills)} -> {len(job['qualifications'])}")

            return relevant_jobs

        except Exception as e:
            error_str = str(e)

            # Handle invalid API keys
            if "API_KEY_INVALID" in error_str or ("400" in error_str and "API key not valid" in error_str):
                bad_idx = (_current_key_idx - 1) % len(_clients)
                print(f"[LLM Parser] API key #{bad_idx + 1} is invalid — removing from rotation.")
                if len(_clients) > 1:
                    _clients.pop(bad_idx)
                    _api_keys.pop(bad_idx)
                    _current_key_idx = _current_key_idx % len(_clients)
                    print(f"[LLM Parser] {len(_clients)} key(s) remaining. Retrying immediately...")
                    continue  # don't burn an attempt
                else:
                    print("[LLM Parser] No valid API keys remaining. Aborting.")
                    return []

            elif "429" in error_str or "RESOURCE_EXHAUSTED" in error_str:
                # Permanent quota exhaustion: fail fast instead of waiting through backoff.
                if "GenerateRequestsPerDayPerProjectPerModel-FreeTier" in error_str or "limit: 0" in error_str:
                    _daily_quota_exhausted = True
                    print("[LLM Parser] Daily Gemini quota exhausted. Stopping LLM extraction for this run.")
                    return []

                retry_delay = backoff
                if "retryDelay" in error_str:
                    try:
                        match = re.search(r"retryDelay.*?(\d+\.?\d*)", error_str)
                        if match:
                            retry_delay = max(float(match.group(1)), backoff)
                    except:
                        pass

                key_num = (_current_key_idx - 1) % len(_clients) + 1
                print(f"[LLM Parser] Rate limited (key #{key_num}), "
                      f"attempt {attempt}/{MAX_RETRIES}. "
                      f"Waiting {retry_delay:.0f}s before retry...")
                time.sleep(retry_delay)
                backoff = min(backoff * 2, 120)
            else:
                print(f"[LLM Parser] Error extracting jobs: {e}")
                return []

    print(f"[LLM Parser] Exhausted all {MAX_RETRIES} retries. Falling back to local extraction.")
    return _extract_jobs_rule_based(text, source_keyword)
