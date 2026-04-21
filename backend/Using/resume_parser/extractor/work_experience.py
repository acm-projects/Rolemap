"""Extract work experience entries."""
from __future__ import annotations
import re
from models import Section, Line
from utils import has_date, extract_date, DATE_RE

_BULLET_RE = re.compile(r"^[\u2022\u2023\u25cf\u25e6\u2043\-\*•]\s*")

# Strips a trailing date range from a title line: "Job Title  Sep 2025 – Present"
_MON = r"(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*"
_DATE_SUFFIX_RE = re.compile(
    rf"""
    \s*
    (?:
        # Full range: "Sep 2025 – Nov 2025" or "Sep 2025 – Present"
        {_MON}\s+\d{{4}}\s*[-–—]\s*(?:{_MON}\s+)?\d{{4}}
        |{_MON}\s+\d{{4}}\s*[-–—]\s*(?:Present|Current|Now)
        # Year range: "2019 – 2022" or "2019 – Present"
        |\d{{4}}\s*[-–—]\s*(?:\d{{4}}|Present|Current|Now)
        # Single month-year: "Nov 2025"
        |{_MON}\s+\d{{4}}
        # Single year: "2025"
        |\d{{4}}
    )
    \s*$
    """,
    re.VERBOSE | re.IGNORECASE,
)


def _looks_like_bullet(text: str) -> bool:
    return bool(_BULLET_RE.match(text))


def _is_entry_boundary(line: Line) -> bool:
    """A non-bullet line shorter than 120 chars that contains a date starts a new entry."""
    t = line.text.strip()
    if not t or _looks_like_bullet(t):
        return False
    if has_date(t) and len(t) < 120:
        return True
    if line.is_bold:
        return True
    return False


def _split_into_entries(lines: list[Line]) -> list[list[Line]]:
    entries: list[list[Line]] = []
    current: list[Line] = []

    for line in lines:
        t = line.text.strip()
        if not t:
            continue
        if current and _is_entry_boundary(line):
            entries.append(current)
            current = [line]
        else:
            current.append(line)

    if current:
        entries.append(current)

    return entries


def _strip_date_suffix(text: str) -> str:
    """Remove trailing date from a title line."""
    cleaned = _DATE_SUFFIX_RE.sub("", text).strip()
    return cleaned.rstrip(" -–—|").strip()


def _extract_entry(entry_lines: list[Line]) -> dict:
    """Positional extraction: line[0]=title+date, line[1]=company, rest=descriptions."""
    if not entry_lines:
        return {"company": "", "job_title": "", "date": "", "descriptions": []}

    # Line 0 is always the date-bearing title line
    title_text = entry_lines[0].text.strip()
    date = extract_date(title_text)
    job_title = _strip_date_suffix(title_text)

    # Line 1 is company only if it's the IMMEDIATE next line and not a bullet.
    # Project entries start with a bullet on line 1 → no company.
    company = ""
    desc_start = 1
    if len(entry_lines) > 1:
        second = entry_lines[1].text.strip()
        if second and not _looks_like_bullet(second) and not has_date(second):
            company = second
            desc_start = 2

    descriptions = [
        _BULLET_RE.sub("", l.text.strip()).strip()
        for l in entry_lines[desc_start:]
        if l.text.strip()
    ]

    return {
        "company": company,
        "job_title": job_title,
        "date": date,
        "descriptions": descriptions,
    }


def extract_work_experience(sections: list[Section]) -> list[dict]:
    exp_section = next(
        (s for s in sections if "experience" in s.name), None
    )
    if not exp_section:
        return []

    entries = _split_into_entries(exp_section.lines)
    results = []
    for e in entries:
        if not e:
            continue
        entry = _extract_entry(e)
        # Skip stub entries (no title — likely bare cert/label lines)
        if entry["job_title"] or entry["company"]:
            results.append(entry)
    return results
