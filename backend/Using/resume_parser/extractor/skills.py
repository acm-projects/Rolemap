"""Extract flat skills list."""
import re
from models import Section


_SPLIT_RE = re.compile(r"[,|;•()\u2022\u2023\u25e6\u2043]+")
_BULLET_PREFIX = re.compile(r"^[\u2022\u2023\u25cf\u25e6\u2043\-\*•]\s*")

# Matches embedded category labels like "Languages :", "AI/ML :", "Frameworks :"
# These appear mid-string when two-column PDFs are merged into one line.
_CATEGORY_RE = re.compile(r"[A-Za-z][A-Za-z/\-]{0,19}\s*:")


# Only strip COMPLETE parenthetical expressions "(like this)" — not orphaned "("
_PAREN_RE = re.compile(r"\([^)]+\)")

# Cross-line paren repair for two-column PDFs:
# "Transformers (Hugging" on line N and "Face), YOLOv11..." on line N+1
# → captures the fragment inside the unclosed ( before the first , or end
_UNCLOSED_FRAG_RE = re.compile(r"\(([^,)]+)")
# Orphan close-paren: line starting with "Word)" (the continuation from prev line)
_ORPHAN_CLOSE_RE = re.compile(r"^([A-Za-z0-9][^,)]*?)\)")

# Section names that carry skills content (sub-categories within a skills block)
_SKILL_ADJACENT = {"languages", "frameworks", "tools", "libraries", "technologies"}


def _split_at_categories(text: str) -> list[str]:
    """Split a merged two-column line at category label boundaries.

    Each column in a two-column skills table starts with a category label
    (e.g. "Languages :", "AI/ML :"). Splitting at these boundaries gives one
    segment per column, which can then be processed independently.

    "AI/ML : PyTorch, Transformers (Hugging Tools : Git, Docker"
    → ["PyTorch, Transformers (Hugging ", "Git, Docker"]

    If no category labels are found the original text is returned as-is.
    """
    segments: list[str] = []
    last_end = 0
    for m in _CATEGORY_RE.finditer(text):
        before = text[last_end:m.start()].strip().strip(",")
        if before:
            segments.append(before)
        last_end = m.end()
    remainder = text[last_end:].strip().strip(",")
    if remainder:
        segments.append(remainder)
    return segments if segments else [text]


def _collect_skill_lines(sections: list[Section]) -> list[str]:
    texts: list[str] = []
    in_skills_block = False

    for s in sections:
        if "skill" in s.name:
            in_skills_block = True
            if s.header_line:
                h = s.header_line.text.strip()
                if ":" in h:
                    texts.append(h.split(":", 1)[1])
            for line in s.lines:
                texts.append(line.text.strip())

        elif in_skills_block and s.name in _SKILL_ADJACENT:
            if s.header_line:
                texts.append(s.header_line.text.strip())
            for line in s.lines:
                texts.append(line.text.strip())

        else:
            if in_skills_block:
                in_skills_block = False

    return texts


def extract_skills(sections: list[Section]) -> list[str]:
    if not any("skill" in s.name for s in sections):
        return []

    raw_lines = _collect_skill_lines(sections)

    # Try LLM extraction first; fall back to rule-based if unavailable or broken
    try:
        from extractor.skills_llm import extract_skills_with_llm
        result = extract_skills_with_llm(raw_lines)
        if result is not None:
            return result
    except Exception:
        pass

    raw_tokens: list[str] = []
    pending_fragment: str | None = None  # skill fragment from an unclosed ( on the prev line

    for text in raw_lines:
        text = _BULLET_PREFIX.sub("", text).strip()

        # Split merged two-column lines at category label boundaries.
        # e.g. "AI/ML : PyTorch, Transformers (Hugging Tools : Git, Docker"
        # → ["PyTorch, Transformers (Hugging ", "Git, Docker"]
        # Each column is processed as its own independent segment.
        segments = _split_at_categories(text)

        for seg in segments:
            # If previous segment/line had an unclosed (, check if this segment
            # opens with "Word)" — the continuation of the split skill name.
            # e.g. pending="Hugging", seg="Face), YOLOv11..." → "Hugging Face"
            if pending_fragment is not None:
                stripped = seg.lstrip(",").strip()
                m = _ORPHAN_CLOSE_RE.match(stripped)
                if m:
                    continuation = m.group(1).strip()
                    if continuation:
                        raw_tokens.append(f"{pending_fragment} {continuation}")
                    close_token = m.group(0)
                    close_pos = seg.find(close_token)
                    if close_pos != -1:
                        seg = seg[close_pos + len(close_token):]
                    pending_fragment = None  # only consume when orphan is found

            # Detect unclosed ( — skill name that wraps into the next segment/line
            m = _UNCLOSED_FRAG_RE.search(seg)
            if m and ")" not in seg[m.start():]:
                frag = m.group(1).strip().strip(",")
                if frag:
                    pending_fragment = frag
                seg = seg[:m.start()]

            seg = _PAREN_RE.sub("", seg)
            parts = _SPLIT_RE.split(seg)
            raw_tokens.extend(parts)

    skills = []
    seen: set[str] = set()
    for token in raw_tokens:
        t = token.strip().strip(".,;-–—")
        # Strip trailing " API" suffix (e.g. "Stable Baselines3 API" → "Stable Baselines3")
        # unless the token is only "API" or a well-known API product name
        if t.endswith(" API") and len(t) > 4:
            t = t[:-4].strip()
        if not t:
            continue
        key = t.lower()
        if key not in seen:
            seen.add(key)
            skills.append(t)

    return skills
