"""
O*NET API client — fetches technology_skills and job overview per SOC code.

Auth:
    - Preferred: API key via X-API-Key header (ONET_API_KEY)
    - Fallback: HTTP Basic (ONET_USERNAME / ONET_PASSWORD)
Caches responses to data/raw/{soc_code}_tools.json
"""

import json
import os
import time
from pathlib import Path

import requests
from dotenv import load_dotenv

load_dotenv()

ONET_BASE = os.environ.get("ONET_BASE", "https://api-v2.onetcenter.org")
RAW_DIR = Path(__file__).parent.parent / "data" / "raw"
RAW_DIR.mkdir(parents=True, exist_ok=True)


def _auth() -> tuple[str, str]:
    username = os.environ.get("ONET_USERNAME", "")
    password = os.environ.get("ONET_PASSWORD", "")
    if not username or not password:
        raise EnvironmentError(
            "ONET_USERNAME and ONET_PASSWORD must be set in .env"
        )
    return username, password


def _api_key() -> str:
    return os.environ.get("ONET_API_KEY", "").strip()


def _get(path: str, params: dict | None = None) -> dict:
    """Perform an authenticated GET against the O*NET web services API."""
    url = f"{ONET_BASE}{path}"
    headers = {"Accept": "application/json"}

    api_key = _api_key()
    if api_key:
        headers["X-API-Key"] = api_key
        resp = requests.get(url, headers=headers, params=params, timeout=30)
    else:
        # Backward-compatible fallback for existing setups using basic auth.
        resp = requests.get(url, auth=_auth(), headers=headers, params=params, timeout=30)

    resp.raise_for_status()
    return resp.json()


def fetch_job_overview(soc_code: str, use_cache: bool = True) -> dict:
    """
    Fetch the career overview for a SOC code.
    Returns a dict with at least: title, description.
    """
    cache_path = RAW_DIR / f"{soc_code}_overview.json"
    if use_cache and cache_path.exists():
        with cache_path.open() as f:
            return json.load(f)

    print(f"  [O*NET] Fetching overview for {soc_code}...")
    data = _get(f"/mnm/careers/{soc_code}")
    time.sleep(0.5)  # be polite to the API

    with cache_path.open("w") as f:
        json.dump(data, f, indent=2)

    return data


def fetch_technology_skills(soc_code: str, use_cache: bool = True) -> list[dict]:
    """
    Fetch technology skills for a SOC code.

    Returns a list of dicts:
        {
            "name": str,
            "hot_technology": bool,   # → industry_standard on edge
            "in_demand": bool,
        }
    """
    cache_path = RAW_DIR / f"{soc_code}_tools.json"
    if use_cache and cache_path.exists():
        with cache_path.open() as f:
            return json.load(f)

    print(f"  [O*NET] Fetching technology for {soc_code}...")
    # API v2: /technology
    # Legacy fallback: /technology_skills
    try:
        data = _get(f"/mnm/careers/{soc_code}/technology")
    except Exception:
        data = _get(f"/mnm/careers/{soc_code}/technology_skills")
    time.sleep(0.5)

    tools: list[dict] = []
    # v2 can return a list of categories [{title, example:[{title, hot_technology}, ...]}, ...]
    if isinstance(data, list):
        for category in data:
            for example in category.get("example", []):
                name = (example.get("title") or example.get("name") or "").strip()
                if not name:
                    continue
                tools.append(
                    {
                        "name": name,
                        "hot_technology": bool(example.get("hot_technology", False)),
                        "in_demand": bool(example.get("in_demand", False)),
                    }
                )
    else:
        # legacy shape
        for category in data.get("category", []):
            for example in category.get("example", []):
                name = (example.get("name") or example.get("title") or "").strip()
                if not name:
                    continue
                tools.append(
                    {
                        "name": name,
                        "hot_technology": bool(example.get("hot_technology", False)),
                        "in_demand": bool(example.get("in_demand", False)),
                    }
                )

    with cache_path.open("w") as f:
        json.dump(tools, f, indent=2)

    return tools
