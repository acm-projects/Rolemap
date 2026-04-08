"""Extract profile section: name, email, phone, location, url."""
from models import Section, TextItem
from utils import (
    has_email, has_phone, has_url, looks_like_name,
    extract_email, extract_phone, extract_url,
)
from extractor.base import FeatureSet, score_candidates, lines_to_items, line_as_item


def _large_font(item: TextItem) -> bool:
    return item.height >= 14.0


def extract_profile(sections: list[Section]) -> dict:
    profile_section = next(
        (s for s in sections if s.name in ("profile", "contact", "summary", "objective")),
        None,
    )

    # Gather all lines from both the header-less profile section and any contact section
    lines = []
    for s in sections:
        if s.name in ("profile", "contact"):
            lines.extend(s.lines if s.header_line is None else [s.header_line] + s.lines)

    # Also include the very first section unconditionally (name is usually at top)
    if sections and sections[0].header_line is None:
        for line in sections[0].lines[:10]:
            if line not in lines:
                lines.append(line)

    # Represent each line as a single candidate item for name scoring
    line_items = [line_as_item(line) for line in lines]

    # --- Name ---
    name_features = [
        FeatureSet(lambda i: looks_like_name(i.text), 3.0),
        FeatureSet(lambda i: i.is_bold, 2.0),
        FeatureSet(_large_font, 2.0),
        FeatureSet(lambda i: has_email(i.text), -4.0),
        FeatureSet(lambda i: has_phone(i.text), -4.0),
        FeatureSet(lambda i: has_url(i.text), -2.0),
    ]
    name_candidates = score_candidates(line_items, name_features)
    name = name_candidates[0].text if name_candidates else ""

    # --- Email / Phone / URL --- (scan all text in section)
    all_text_items = lines_to_items(lines)
    all_text = " ".join(i.text for i in all_text_items)

    email = extract_email(all_text)
    phone = extract_phone(all_text)
    url = extract_url(all_text)

    # Remove email/url from url if they overlap
    if url and email and url in email:
        url = ""

    # --- Location --- heuristic: a line that is NOT name/email/phone/url
    location = ""
    for line in lines:
        t = line.text.strip()
        if not t:
            continue
        if t == name or has_email(t) or has_phone(t) or looks_like_name(t):
            continue
        if has_url(t):
            continue
        # Must look like a city/state combo: contains comma or known patterns
        import re
        if re.search(r"[A-Za-z].*,\s*[A-Z]{2}", t) or re.search(r"\b[A-Z][a-z]+,\s*[A-Z]", t):
            location = t
            break

    return {
        "name": name,
        "email": email,
        "phone": phone,
        "location": location,
        "url": url,
    }
