"""Stage 1: PDF path → list[TextItem].

Uses pdfplumber's extract_words() for correct word boundaries (spaces preserved),
then maps font metadata from the underlying chars for bold detection.
"""
import re
from pathlib import Path

import pdfplumber

from models import TextItem

_FONT_PREFIX_RE = re.compile(r"^[A-Z]{6}\+")


def _clean_font(fontname: str) -> str:
    return _FONT_PREFIX_RE.sub("", fontname)


def _is_bold(fontname: str) -> bool:
    f = _clean_font(fontname).lower()
    return "bold" in f or f.endswith("-bd") or f.endswith("bd") or ",bold" in f


def _build_char_rows(chars: list[dict]) -> dict[int, list[dict]]:
    """Index chars by rounded top value for O(1) row lookup."""
    rows: dict[int, list[dict]] = {}
    for ch in chars:
        key = round(ch["top"])
        rows.setdefault(key, []).append(ch)
    return rows


def _word_is_bold(word: dict, char_rows: dict) -> bool:
    """Determine boldness by checking the font of chars that overlap the word bbox."""
    x0, x1 = float(word["x0"]), float(word["x1"])
    top_key = round(float(word["top"]))

    bold_w = 0.0
    total_w = 0.0

    for dy in range(-2, 3):
        for ch in char_rows.get(top_key + dy, []):
            ch_x0, ch_x1 = float(ch.get("x0", 0)), float(ch.get("x1", 0))
            # Char must overlap the word's x range
            if ch_x1 < x0 - 1 or ch_x0 > x1 + 1:
                continue
            w = ch.get("width", 0) or 0
            total_w += w
            if _is_bold(ch.get("fontname", "")):
                bold_w += w

    if total_w == 0:
        return _is_bold(word.get("fontname", ""))

    return (bold_w / total_w) > 0.5


def read_pdf(path: str | Path) -> list[TextItem]:
    """Extract all TextItems from a PDF, preserving font metadata."""
    path = Path(path)
    if not path.exists():
        raise FileNotFoundError(f"PDF not found: {path}")

    all_items: list[TextItem] = []

    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            chars = page.chars
            if not chars:
                print("[warn] No text layer detected — falling back to OCR.")
                from ocr.reader import read_pdf_ocr
                return read_pdf_ocr(path)

            # extract_words handles word boundaries and spacing correctly
            words = page.extract_words(
                x_tolerance=3,
                y_tolerance=3,
                extra_attrs=["fontname", "size"],
            )

            # Build char index for accurate per-word bold detection
            char_rows = _build_char_rows(chars)

            for word in words:
                text = word.get("text", "").strip()
                # Strip Unicode replacement characters (mojibake from custom PDF fonts,
                # e.g. ● rendered as \ufffd when the font encoding is missing)
                text = text.replace("\ufffd", "").strip()
                if not text:
                    continue

                fontname = word.get("fontname", "")
                size = float(word.get("size") or 0)
                bold = _word_is_bold(word, char_rows)

                all_items.append(TextItem(
                    text=text,
                    x=float(word["x0"]),
                    y=float(word["top"]),
                    width=float(word["x1"]) - float(word["x0"]),
                    height=size if size > 0 else float(word.get("height", 0)),
                    font=_clean_font(fontname),
                    is_bold=bold,
                ))

    return all_items
