"""Stage 3: list[Line] → list[Section]."""
from models import Line, Section
from utils import normalise, SECTION_KEYWORDS


def _is_section_header(line: Line) -> tuple[bool, str]:
    """Return (is_header, normalised_name)."""
    text = line.text.strip()
    if not text:
        return False, ""

    norm = normalise(text)

    # Condition A: bold AND all-uppercase
    if line.is_bold and text == text.upper() and len(text) > 1:
        # Try to match to a known keyword
        for kw in SECTION_KEYWORDS:
            if kw in norm:
                return True, kw
        # Still treat as a section header even if keyword unknown
        return True, norm

    # Condition B: text contains a known section keyword.
    # Guard: long lines (>60 chars) are content, not headers — skip.
    if len(text) <= 60:
        for kw in SECTION_KEYWORDS:
            if kw in norm:
                return True, kw

    return False, ""


def detect_sections(lines: list[Line]) -> list[Section]:
    """Split lines into named sections."""
    sections: list[Section] = []
    pre_header: list[Line] = []
    found_first_header = False

    current_section: Section | None = None

    for line in lines:
        is_header, name = _is_section_header(line)

        if is_header:
            if not found_first_header:
                # Everything before the first header → synthetic "profile" section
                if pre_header:
                    sections.append(Section(name="profile", header_line=None, lines=pre_header))
                found_first_header = True

            if current_section is not None:
                sections.append(current_section)

            current_section = Section(name=name, header_line=line, lines=[])
        else:
            if not found_first_header:
                pre_header.append(line)
            elif current_section is not None:
                current_section.lines.append(line)

    # Flush last section
    if current_section is not None:
        sections.append(current_section)

    # Edge case: no headers found at all
    if not sections and lines:
        sections.append(Section(name="profile", header_line=None, lines=lines))

    return sections
