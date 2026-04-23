import io
import re
from pdfminer.high_level import extract_text_to_fp
from pdfminer.layout import LAParams


def parse_pdf(file_bytes: bytes) -> str:
    output = io.StringIO()
    extract_text_to_fp(
        io.BytesIO(file_bytes),
        output,
        laparams=LAParams(),
        output_type="text",
        codec="utf-8",
    )
    text = output.getvalue()
    return _clean_text(text)


def _clean_text(text: str) -> str:
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"[ \t]+", " ", text)
    return text.strip()
