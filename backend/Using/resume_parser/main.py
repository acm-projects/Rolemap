"""Resume parser entry point.

Usage:
    python backend/resume_parser/main.py
    python backend/resume_parser/main.py --pdf path/to/resume.pdf --out path/to/output.json
"""
import argparse
import io
import json
import sys
from pathlib import Path

# Force UTF-8 output on Windows to handle Unicode characters in resume text
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

# Ensure local imports resolve when run from repo root
sys.path.insert(0, str(Path(__file__).parent))

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / ".env")  # backend/.env

from pdf_reader import read_pdf
from line_grouper import group_into_lines
from section_detector import detect_sections
from extractor import (
    extract_profile,
    extract_work_experience,
    extract_education,
    extract_skills,
    extract_projects,
)

_DEFAULT_INPUT_DIR = Path(__file__).parent.parent / "input"
_DEFAULT_OUTPUT = Path(__file__).parent.parent / "output" / "result.json"


def _find_pdf(input_dir: Path) -> Path:
    pdfs = sorted(input_dir.glob("*.pdf"))
    if not pdfs:
        raise FileNotFoundError(
            f"No PDF found in {input_dir}. Drop a resume PDF there and retry."
        )
    if len(pdfs) > 1:
        print(f"[warn] Multiple PDFs found, using first: {pdfs[0].name}")
    return pdfs[0]


def parse_resume(pdf_path: Path) -> dict:
    print(f"[1/4] Reading PDF: {pdf_path.name}")
    items = read_pdf(pdf_path)
    print(f"      → {len(items)} text items extracted")

    print("[2/4] Grouping into lines")
    lines = group_into_lines(items)
    print(f"      → {len(lines)} lines")

    print("[3/4] Detecting sections")
    sections = detect_sections(lines)
    for s in sections:
        print(f"      section '{s.name}': {len(s.lines)} lines")

    print("[4/4] Extracting fields")
    result = {
        "profile": extract_profile(sections),
        "work_experiences": extract_work_experience(sections),
        "educations": extract_education(sections),
        "skills": extract_skills(sections),
        "projects": extract_projects(sections),
    }
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description="Parse a resume PDF to JSON")
    parser.add_argument("--pdf", type=Path, default=None, help="Path to PDF file")
    parser.add_argument(
        "--out", type=Path, default=_DEFAULT_OUTPUT, help="Output JSON path"
    )
    args = parser.parse_args()

    pdf_path: Path = args.pdf or _find_pdf(_DEFAULT_INPUT_DIR)
    out_path: Path = args.out

    try:
        result = parse_resume(pdf_path)
    except ValueError as e:
        print(f"[error] {e}", file=sys.stderr)
        sys.exit(1)

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\nDone! Output written to: {out_path}")

    # Summary
    p = result["profile"]
    print(f"  name     : {p.get('name') or '(not found)'}")
    print(f"  email    : {p.get('email') or '(not found)'}")
    print(f"  phone    : {p.get('phone') or '(not found)'}")
    print(f"  jobs     : {len(result['work_experiences'])}")
    print(f"  education: {len(result['educations'])}")
    print(f"  skills   : {len(result['skills'])}")
    print(f"  projects : {len(result['projects'])}")


if __name__ == "__main__":
    main()
