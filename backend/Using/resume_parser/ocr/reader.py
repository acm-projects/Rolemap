"""OCR fallback for scanned/image-only PDFs.

Converts each page to a PIL image via pdf2image, then runs pytesseract
word-level extraction. Returns the same list[TextItem] contract as
pdf_reader.read_pdf() so the rest of the pipeline is unaffected.

Bold detection is not available from OCR — is_bold defaults to False.
Confidence threshold of 40 filters out noise without dropping short words.
"""
from pathlib import Path

from models import TextItem


_CONF_THRESHOLD = 40  # tesseract confidence 0-100; below this = noise


def read_pdf_ocr(path: str | Path) -> list[TextItem]:
    """OCR a scanned PDF and return TextItems with word-level coordinates."""
    try:
        from pdf2image import convert_from_path
        import pytesseract
        from pytesseract import Output
    except ImportError as e:
        raise ImportError(
            f"OCR dependencies missing: {e}. "
            "Run: pip install pdf2image pytesseract\n"
            "Also install Tesseract: https://github.com/UB-Mannheim/tesseract/wiki"
        ) from e

    path = Path(path)
    images = convert_from_path(str(path), dpi=300)

    all_items: list[TextItem] = []

    for page_num, image in enumerate(images):
        # Cumulative y-offset so items from page 2+ don't overlap page 1
        y_offset = page_num * image.height

        data = pytesseract.image_to_data(image, output_type=Output.DICT)

        n = len(data["text"])
        for i in range(n):
            text = data["text"][i].strip()
            if not text:
                continue

            conf = int(data["conf"][i])
            if conf < _CONF_THRESHOLD:
                continue

            x = float(data["left"][i])
            y = float(data["top"][i]) + y_offset
            width = float(data["width"][i])
            height = float(data["height"][i])

            all_items.append(TextItem(
                text=text,
                x=x,
                y=y,
                width=width,
                height=height,
                font="",
                is_bold=False,
            ))

    return all_items
