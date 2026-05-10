"""
PDF text extraction service.

Strategy:
  1. Try PyPDF2 for native text extraction (fast, works for digitally-created PDFs).
  2. If extracted text is too short (< OCR_MIN_TEXT_LENGTH), fall back to OCR via Tesseract.
  3. OCR converts PDF pages to images (poppler/pdf2image), then runs Tesseract.

Both steps run in asyncio.to_thread() to avoid blocking the event loop.
"""

import asyncio
import logging
from pathlib import Path

import pytesseract
from pdf2image import convert_from_path
from PyPDF2 import PdfReader

from ..config import settings

logger = logging.getLogger(__name__)


def _extract_with_pypdf2(filepath: str) -> str:
    """Extract text from a PDF using PyPDF2 (native text layer)."""
    reader = PdfReader(filepath)
    pages_text: list[str] = []

    for i, page in enumerate(reader.pages):
        text = page.extract_text() or ""
        pages_text.append(text)
        logger.debug(f"PyPDF2 page {i + 1}: {len(text)} chars")

    return "\n\n".join(pages_text).strip()


def _extract_with_ocr(filepath: str) -> str:
    """Extract text from a PDF using Tesseract OCR (scanned documents)."""
    logger.info(f"Running OCR on: {filepath}")

    # Convert PDF pages to images (requires poppler-utils)
    images = convert_from_path(filepath, dpi=300)
    pages_text: list[str] = []

    for i, image in enumerate(images):
        text = pytesseract.image_to_string(image, lang="deu")
        pages_text.append(text)
        logger.debug(f"OCR page {i + 1}: {len(text)} chars")

    return "\n\n".join(pages_text).strip()


async def extract_text(filepath: str) -> tuple[str, str]:
    """
    Extract text from a PDF file.

    Returns:
        tuple[str, str]: (extracted_text, method) where method is 'pypdf2' or 'ocr'.

    Raises:
        ValueError: If no text could be extracted by either method.
    """
    path = Path(filepath)
    if not path.exists():
        raise FileNotFoundError(f"Datei nicht gefunden: {filepath}")

    if not path.suffix.lower() == ".pdf":
        raise ValueError(f"Nur PDF-Dateien werden unterstützt: {path.suffix}")

    # Step 1: Try PyPDF2 (fast, native text)
    logger.info(f"Extracting text from: {path.name}")
    text = await asyncio.to_thread(_extract_with_pypdf2, filepath)

    if len(text) >= settings.OCR_MIN_TEXT_LENGTH:
        logger.info(f"PyPDF2 extraction successful: {len(text)} chars")
        return text, "pypdf2"

    # Step 2: Fall back to OCR (slow, for scanned docs)
    logger.info(f"PyPDF2 text too short ({len(text)} chars), falling back to OCR...")
    ocr_text = await asyncio.to_thread(_extract_with_ocr, filepath)

    if len(ocr_text) >= settings.OCR_MIN_TEXT_LENGTH:
        logger.info(f"OCR extraction successful: {len(ocr_text)} chars")
        return ocr_text, "ocr"

    # If both methods fail, return whatever we have (or raise)
    combined = text or ocr_text
    if combined:
        logger.warning(f"Low text yield ({len(combined)} chars), returning anyway.")
        return combined, "ocr" if ocr_text else "pypdf2"

    raise ValueError("Kein Text konnte aus dem Dokument extrahiert werden.")
