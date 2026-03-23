"""
Resource seed data loader.

Reads data/resources_seed.json and returns normalised resource records.
Each record maps to a Resource node with TEACHES edges to Concept or Tool nodes.
"""

import json
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data"
SEED_PATH = DATA_DIR / "resources_seed.json"


def load_resources(path: Path = SEED_PATH) -> list[dict]:
    """
    Load resource seed data from JSON.

    Expected format:
    [
      {
        "url": "https://...",
        "format": "article" | "video" | "course" | "book" | "docs",
        "teaches_concepts": ["Concept Name", ...],
        "teaches_tools": ["Tool Name", ...]
      },
      ...
    ]
    """
    if not path.exists():
        print(f"  [resources] Seed file not found at {path}. Skipping resources.")
        return []

    with path.open(encoding="utf-8") as f:
        data = json.load(f)

    print(f"  [resources] Loaded {len(data)} resource entries from seed file.")
    return data
