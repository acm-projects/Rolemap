"""Extract education entries."""
from models import Section, Line
from utils import (
    has_date, extract_date, extract_gpa,
    contains_any, SCHOOL_KEYWORDS, DEGREE_KEYWORDS, DATE_RE,
)
from extractor.base import FeatureSet, score_candidates, line_as_item


def _split_into_entries(lines: list[Line]) -> list[list[Line]]:
    entries: list[list[Line]] = []
    current: list[Line] = []

    for line in lines:
        t = line.text.strip()
        if not t:
            continue
        if line.is_bold and current:
            entries.append(current)
            current = [line]
        else:
            current.append(line)

    if current:
        entries.append(current)

    return entries


def _extract_entry(entry_lines: list[Line]) -> dict:
    line_items = [line_as_item(line) for line in entry_lines]
    all_text = " ".join(l.text for l in entry_lines)

    # --- Date ---
    date_features = [FeatureSet(lambda i: has_date(i.text), 4.0)]
    date_hits = score_candidates(line_items, date_features)
    date = extract_date(date_hits[0].text) if date_hits else ""

    # --- GPA ---
    gpa = extract_gpa(all_text)

    # --- School ---
    school_features = [
        FeatureSet(lambda i: i.is_bold, 2.0),
        FeatureSet(lambda i: contains_any(i.text, SCHOOL_KEYWORDS), 3.0),
        FeatureSet(lambda i: has_date(i.text), -3.0),
        FeatureSet(lambda i: contains_any(i.text, DEGREE_KEYWORDS), -1.0),
    ]
    school_hits = score_candidates(line_items, school_features)
    school = school_hits[0].text if school_hits else ""

    # --- Degree & Field ---
    degree = ""
    field = ""
    for line in entry_lines:
        t = line.text.strip()
        if contains_any(t, DEGREE_KEYWORDS):
            import re as _re
            # Matches: "Bachelor of Science in Data Science ..."
            m = _re.match(
                r"(?P<base>Bachelor|Master|PhD|Doctorate|Associate|B\.?S\.?|M\.?S\.?|B\.?A\.?|M\.?A\.?|MBA|M\.Eng|B\.Eng)"
                r"(?:\s+of\s+(?P<kind>Science|Arts|Engineering|Business|Technology|Applied Science|Fine Arts))?"
                r"(?:\s+in\s+(?P<field>[^,\n]+))?",
                t, _re.IGNORECASE
            )
            if m:
                parts = [m.group("base")]
                if m.group("kind"):
                    parts += ["of", m.group("kind")]
                degree = " ".join(parts).strip()
                raw_field = (m.group("field") or "").strip()
                # Strip dates, then strip orphaned separators like "– Expected"
                field = DATE_RE.sub("", raw_field).strip()
                import re as _re2
                field = _re2.sub(
                    r"\s*[-–—]\s*(?:Expected|Anticipated|Current|Present)\s*$",
                    "", field, flags=_re2.IGNORECASE
                ).strip().rstrip(".-,;").strip()
            else:
                degree = t
            break

    return {
        "school": school,
        "degree": degree,
        "field": field,
        "date": date,
        "gpa": gpa,
    }


def extract_education(sections: list[Section]) -> list[dict]:
    edu_section = next(
        (s for s in sections if "education" in s.name), None
    )
    if not edu_section:
        return []

    entries = _split_into_entries(edu_section.lines)
    return [_extract_entry(e) for e in entries if e]
