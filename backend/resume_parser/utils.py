import re

# --- Regex patterns ---

EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}")

PHONE_RE = re.compile(
    r"(\+?\d[\d\s\-().]{6,}\d)"
)

URL_RE = re.compile(
    r"((?:https?://)?(?:www\.)?[a-zA-Z0-9\-]+\.[a-zA-Z]{2,}(?:/[^\s]*)?)"
)

DATE_RE = re.compile(
    r"""
    (?:
        (?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|
           Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)
        [\s,]+\d{4}
    )
    |(?:\d{4}\s*[-–—]\s*(?:\d{4}|Present|Current|Now))
    |(?:\d{4})
    |(?:Present|Current)
    """,
    re.VERBOSE | re.IGNORECASE,
)

GPA_RE = re.compile(r"\b(?:GPA|gpa)[:\s]*(\d+\.\d+)")

SECTION_KEYWORDS = {
    "experience", "education", "skills", "projects", "summary",
    "objective", "profile", "contact", "certifications", "certificate",
    "awards", "volunteer", "languages", "publications", "interests",
    "achievements", "honors",
}

JOB_TITLE_KEYWORDS = {
    "engineer", "developer", "manager", "analyst", "designer", "architect",
    "consultant", "specialist", "coordinator", "director", "lead", "head",
    "intern", "associate", "senior", "junior", "staff", "principal",
    "scientist", "researcher", "administrator", "officer", "executive",
}

SCHOOL_KEYWORDS = {
    "university", "college", "institute", "school", "academy",
    "polytechnic", "conservatory",
}

DEGREE_KEYWORDS = {
    "bachelor", "master", "phd", "doctorate", "associate", "b.s.", "b.a.",
    "m.s.", "m.a.", "m.eng", "b.eng", "b.sc", "m.sc", "mba", "bs", "ms", "ba", "ma",
}


# --- Predicates ---

def has_email(text: str) -> bool:
    return bool(EMAIL_RE.search(text))


def has_phone(text: str) -> bool:
    m = PHONE_RE.search(text)
    if not m:
        return False
    digits = re.sub(r"\D", "", m.group())
    return len(digits) >= 7


def has_url(text: str) -> bool:
    return bool(URL_RE.search(text))


def has_date(text: str) -> bool:
    return bool(DATE_RE.search(text))


def extract_email(text: str) -> str:
    m = EMAIL_RE.search(text)
    return m.group() if m else ""


def extract_phone(text: str) -> str:
    m = PHONE_RE.search(text)
    return m.group().strip() if m else ""


def extract_url(text: str) -> str:
    """Return first URL that isn't a substring of the email address."""
    email = extract_email(text)
    for m in URL_RE.finditer(text):
        u = m.group().strip()
        if email and u in email:
            continue
        return u
    return ""


def extract_date(text: str) -> str:
    m = DATE_RE.search(text)
    return m.group().strip() if m else ""


def extract_gpa(text: str) -> str:
    m = GPA_RE.search(text)
    return m.group(1) if m else ""


def looks_like_name(text: str) -> bool:
    """Heuristic: 2-4 capitalised words, no digits, no punctuation (besides hyphen/apostrophe)."""
    if has_email(text) or has_phone(text) or has_date(text):
        return False
    tokens = text.split()
    if not 2 <= len(tokens) <= 4:
        return False
    return all(re.match(r"^[A-Z][a-zA-Z'\-]+$", t) for t in tokens)


def normalise(text: str) -> str:
    return re.sub(r"[^a-z0-9\s]", "", text.lower()).strip()


def contains_any(text: str, keywords: set[str]) -> bool:
    norm = normalise(text)
    return any(kw in norm for kw in keywords)
