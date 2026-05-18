"""
Background processing pipeline for document analysis.

Orchestrates: Upload → Text Extraction → AI Mapping → Result Storage.
Runs as a FastAPI BackgroundTask to avoid blocking the request.
"""

import logging

from sqlalchemy.ext.asyncio import AsyncSession

from ..database import async_session
from ..models import Document
from .ai_service import analyze_document, load_document_type_with_fields
from .extraction import extract_text

logger = logging.getLogger(__name__)


async def _run_pipeline_background(document_id: int) -> None:
    """Run the processing pipeline in a separate async task with its own DB session."""
    async with async_session() as db:
        await process_document(document_id, db)


async def _mark_processing(document: Document, db: AsyncSession) -> None:
    """Step 1: Set document status to 'processing'."""
    document.status = "processing"
    await db.commit()
    logger.info(f"Pipeline started for document {document.id}: {document.filename}")


async def _extract_and_store_text(document: Document, db: AsyncSession) -> str:
    """Step 2: Extract text from PDF (PyPDF2 → OCR fallback) and persist it."""
    text, method = await extract_text(document.filepath)
    if not text.strip():
        raise Exception("Kein Text im Dokument gefunden (weder über Text-Extraktion noch über OCR).")

    document.raw_text = text
    document.extraction_method = method
    await db.commit()
    logger.info(f"Text extracted ({method}): {len(text)} chars")
    return text


async def _run_ai_analysis(document: Document, text: str, db: AsyncSession) -> None:
    """Step 3: Run AI analysis if a document type with fields is assigned."""
    if not document.document_type_id:
        logger.info("No document type set — skipping AI analysis.")
        return

    doc_type = await load_document_type_with_fields(db, document.document_type_id)

    if not doc_type.fields:
        document.extracted_data = {}
        document.analyzed_schema_version = doc_type.schema_version
        logger.warning(f"Document type '{doc_type.name}' has no fields defined.")
        return

    extracted_data = await analyze_document(text, doc_type)
    document.extracted_data = extracted_data
    # Merke die Schema-Version der aktuellen Analyse
    document.analyzed_schema_version = doc_type.schema_version
    logger.info(f"AI extraction complete: {list(extracted_data.keys())} (schema_v{doc_type.schema_version})")


async def _mark_completed(document: Document, db: AsyncSession) -> None:
    """Step 4: Set document status to 'completed'."""
    document.status = "completed"
    await db.commit()
    logger.info(f"Pipeline completed for document {document.id}")


async def _mark_failed(document: Document, error: Exception, db: AsyncSession) -> None:
    """Set document status to 'failed' with error message."""
    logger.error(f"Pipeline failed for document {document.id}: {error}", exc_info=True)
    document.status = "failed"
    document.error_message = str(error)
    await db.commit()


async def process_document(document_id: int, db: AsyncSession) -> None:
    """
    Full pipeline for a single document.

    Orchestrates the individual steps and handles errors.
    On failure, sets status to 'failed' with error message.
    """
    document = await db.get(Document, document_id)
    if not document:
        logger.error(f"Document {document_id} not found in pipeline.")
        return

    try:
        await _mark_processing(document, db)
        text = await _extract_and_store_text(document, db)
        await _run_ai_analysis(document, text, db)
        await _mark_completed(document, db)
    except Exception as e:
        await _mark_failed(document, e, db)
