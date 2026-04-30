"""Stage 2: list[TextItem] → list[Line]."""
from models import TextItem, Line

_Y_TOLERANCE = 3.0  # pts — items within this band → same line


def group_into_lines(items: list[TextItem]) -> list[Line]:
    """Group TextItems by y-coordinate into Lines, sorted top-to-bottom."""
    if not items:
        return []

    # Sort by y ascending (top of page = smallest y)
    sorted_items = sorted(items, key=lambda i: (i.y, i.x))

    lines: list[Line] = []
    current: list[TextItem] = [sorted_items[0]]

    for item in sorted_items[1:]:
        if abs(item.y - current[0].y) <= _Y_TOLERANCE:
            current.append(item)
        else:
            lines.append(_make_line(current))
            current = [item]

    lines.append(_make_line(current))
    return lines


def _make_line(items: list[TextItem]) -> Line:
    # Sort items left-to-right within the line
    items_sorted = sorted(items, key=lambda i: i.x)

    # Boldness: >60% of total character width from bold items
    bold_w = sum(i.width for i in items_sorted if i.is_bold)
    total_w = sum(i.width for i in items_sorted) or 1
    is_bold = (bold_w / total_w) > 0.6

    y = items_sorted[0].y
    return Line(items=items_sorted, y=y, is_bold=is_bold)
