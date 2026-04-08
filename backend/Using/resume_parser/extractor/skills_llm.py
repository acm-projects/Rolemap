"""LLM-powered skills extraction using Gemini (gemini-2.5-flash).

Called as an optional post-processing step after rule-based extraction.
Falls back gracefully if GEMINI_API_KEY is not set or the call fails.
"""
import json
import os


def extract_skills_with_llm(raw_lines: list[str]) -> list[str] | None:
    """Clean and deduplicate skill tokens using gpt-4o-mini.

    Args:
        raw_lines: Raw text lines collected from the skills section.

    Returns:
        Cleaned list of skill strings, or None if LLM is unavailable.
    """
    try:
        from google import genai
        from google.genai import types
    except ImportError:
        return None

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return None

    raw_text = "\n".join(line for line in raw_lines if line.strip())

    client = genai.Client(api_key=api_key)
    
    prompt = (
        "You extract a clean, deduplicated list of technical skills from resume skills section text. "
        "Return ONLY a JSON array of strings — no explanation, no markdown fences. "
        "Rules:\n"
        "- Merge fragmented tokens that belong together (e.g. 'Hugging' + 'Face' → 'Hugging Face').\n"
        "- Strip generic trailing qualifiers like ' API' unless they are part of the official product name "
        "(e.g. 'Stable Baselines3 API' → 'Stable Baselines3', but keep 'Google Maps API').\n"
        "- Preserve correct capitalisation (e.g. 'PyTorch', 'scikit-learn', 'YOLOv11').\n"
        "- Remove obvious non-skills (category headers, punctuation fragments, single letters).\n"
        "- Do not add skills that are not in the input.\n\n"
        f"Text:\n{raw_text}"
    )

    response = client.models.generate_content(
        model='gemini-2.5-flash',
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            temperature=0,
        ),
    )

    content = response.text.strip()

    return json.loads(content)
