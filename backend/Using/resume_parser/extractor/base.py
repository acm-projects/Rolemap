"""Scoring engine — mirrors open-resume's feature-scoring approach."""
from dataclasses import dataclass
from typing import Callable

from models import TextItem, Line


@dataclass
class FeatureSet:
    predicate: Callable[[TextItem], bool]
    score: float


def score_candidates(
    candidates: list[TextItem],
    feature_sets: list[FeatureSet],
    allow_multi: bool = False,
) -> list[TextItem]:
    """
    Score each candidate TextItem by summing scores for matched predicates.
    Returns the item(s) with the highest positive total score.
    If allow_multi is True, returns all items with a positive score (sorted desc).
    """
    if not candidates:
        return []

    scored: list[tuple[float, TextItem]] = []
    for item in candidates:
        total = sum(fs.score for fs in feature_sets if fs.predicate(item))
        scored.append((total, item))

    # Sort descending by score
    scored.sort(key=lambda t: t[0], reverse=True)

    if allow_multi:
        return [item for score, item in scored if score > 0]

    best_score, best_item = scored[0]
    if best_score > 0:
        return [best_item]
    return []


def lines_to_items(lines: list[Line]) -> list[TextItem]:
    """Flatten a list of Lines into their constituent TextItems."""
    return [item for line in lines for item in line.items]


def line_as_item(line: Line) -> TextItem:
    """Represent an entire Line as a single TextItem (for line-level scoring)."""
    return TextItem(
        text=line.text,
        x=line.items[0].x if line.items else 0.0,
        y=line.y,
        width=sum(i.width for i in line.items),
        height=max((i.height for i in line.items), default=0.0),
        font=line.items[0].font if line.items else "",
        is_bold=line.is_bold,
    )
