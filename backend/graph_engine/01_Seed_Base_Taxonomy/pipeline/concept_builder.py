"""
LLM gap-filler for jobs with no roadmap.sh coverage (currently: BI Developer).

Input:  job title + O*NET tool list
Prompt: "Given a {job_title} who uses tools {tool_list}, generate 15-20 granular
         learnable concepts as a JSON array: [{name, description, prereqs: []}].
         Return valid JSON only."
Cache:  data/llm_concepts/{job_slug}.json
"""

import json
import os
import re
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

LLM_DIR = Path(__file__).parent.parent / "data" / "llm_concepts"
LLM_DIR.mkdir(parents=True, exist_ok=True)

# Jobs that have no roadmap.sh slug and need LLM gap-fill
GAP_FILL_JOBS = {"BI Developer"}


def _slug(display_name: str) -> str:
    return re.sub(r"[^\w]+", "-", display_name.lower()).strip("-")


def _build_prompt(job_title: str, tools: list[str]) -> str:
    tool_str = ", ".join(tools[:30]) if tools else "general tools"
    return (
        f"You are a curriculum designer for software engineers. "
        f"A '{job_title}' commonly uses these tools: {tool_str}.\n\n"
        f"Generate 15-20 granular, learnable concepts that someone must master "
        f"to become a {job_title}. These should be specific, teachable topics "
        f"(e.g. 'SQL Window Functions', 'Star Schema Design', 'DAX Measures') — "
        f"not broad categories.\n\n"
        f"Return ONLY a valid JSON array with this exact structure:\n"
        f'[{{"name": "...", "description": "one sentence", "prereqs": ["concept name", ...]}}]\n'
        f"prereqs must reference other concept names from your list. "
        f"Return ONLY the JSON array, no markdown, no explanation."
    )


def generate_concepts_for_job(
    job: dict, tools: list[str], use_cache: bool = True
) -> list[dict]:
    """
    Generate concepts for a gap-fill job using OpenAI.

    Returns a list of dicts:
        {"name": str, "description": str, "prereqs": [str, ...]}
    """
    job_title = job["display_name"]
    job_slug = _slug(job_title)
    cache_path = LLM_DIR / f"{job_slug}.json"

    if use_cache and cache_path.exists():
        with cache_path.open() as f:
            data = json.load(f)
        print(f"  [LLM] Using cached concepts for '{job_title}' ({len(data)} concepts)")
        return data

    api_key = os.environ.get("GEMINI_API_KEY", "")
    if not api_key:
        print(f"  [LLM] GEMINI_API_KEY not set — skipping gap-fill for '{job_title}'")
        return []

    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=api_key)
        prompt = _build_prompt(job_title, tools)

        print(f"  [LLM] Generating concepts for '{job_title}' with Gemini...")
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.2,
                max_output_tokens=2000,
            ),
        )

        raw = response.text.strip()

        # Strip markdown code fences if present
        raw = re.sub(r"^```(?:json)?\s*", "", raw)
        raw = re.sub(r"\s*```$", "", raw)

        concepts = json.loads(raw)
        if not isinstance(concepts, list):
            raise ValueError("LLM response is not a JSON array")

        with cache_path.open("w") as f:
            json.dump(concepts, f, indent=2)

        print(f"  [LLM] Generated {len(concepts)} concepts for '{job_title}'")
        return concepts

    except Exception as exc:
        print(f"  [LLM] ERROR generating concepts for '{job_title}': {exc}")
        return []


def run_gap_fill(
    jobs: list[dict], tools_by_soc: dict[str, list[str]], use_cache: bool = True
) -> dict[str, list[dict]]:
    """
    Run LLM gap-fill for all jobs that need it.

    Args:
        jobs: list of job dicts from config/jobs.py
        tools_by_soc: {soc_code: [tool_name, ...]}

    Returns:
        {job_display_name: [concept_dict, ...]}
    """
    results: dict[str, list[dict]] = {}

    for job in jobs:
        if job["display_name"] not in GAP_FILL_JOBS:
            continue
        soc = job["soc_code"]
        tool_names = tools_by_soc.get(soc, [])
        concepts = generate_concepts_for_job(job, tool_names, use_cache=use_cache)
        results[job["display_name"]] = concepts

    return results
