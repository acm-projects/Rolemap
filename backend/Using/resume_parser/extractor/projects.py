"""Extract project entries."""
import re
from models import Section, Line
from utils import has_date, extract_date, extract_url, has_url
from extractor.base import FeatureSet, score_candidates, line_as_item

_BULLET_RE = re.compile(r"^[\u2022\u2023\u25cf\u25e6\u2043\-\*•]\s*")


def _is_description(line: Line) -> bool:
    t = line.text.strip()
    return bool(_BULLET_RE.match(t)) or (len(t) > 40 and not has_date(t) and not has_url(t))


def _split_into_entries(lines: list[Line]) -> list[list[Line]]:
    entries: list[list[Line]] = []
    current: list[Line] = []

    for line in lines:
        t = line.text.strip()
        if not t:
            continue
        if (line.is_bold or not _is_description(line)) and current:
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

    # --- URL ---
    url = extract_url(all_text)

    # --- Name --- first bold or short non-description line
    name = ""
    for line in entry_lines:
        t = line.text.strip()
        if t and not has_date(t) and not _is_description(line):
            name = t
            break

    # --- Descriptions ---
    descriptions = [
        _BULLET_RE.sub("", line.text.strip()).strip()
        for line in entry_lines
        if _is_description(line) and line.text.strip() != name
    ]

    return {
        "name": name,
        "date": date,
        "descriptions": descriptions,
        "url": url,
    }


def extract_projects(sections: list[Section]) -> list[dict]:
    proj_section = next(
        (s for s in sections if "project" in s.name), None
    )
    if not proj_section:
        return []

    entries = _split_into_entries(proj_section.lines)
    return [_extract_entry(e) for e in entries if e]
