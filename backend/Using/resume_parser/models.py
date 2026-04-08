from dataclasses import dataclass, field


@dataclass
class TextItem:
    text: str
    x: float
    y: float
    width: float
    height: float
    font: str
    is_bold: bool


@dataclass
class Line:
    items: list[TextItem]
    y: float
    is_bold: bool

    @property
    def text(self) -> str:
        return " ".join(item.text for item in self.items).strip()


@dataclass
class Section:
    name: str
    header_line: "Line | None"
    lines: list[Line] = field(default_factory=list)
