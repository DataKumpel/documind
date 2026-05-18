"""
Document routes: upload, list, get, update, delete.
Upload triggers background processing pipeline.
"""

import asyncio
import logging
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlmodel import select

from ..config import settings
from ..database import async_session, get_db
from ..models import Document, DocumentType, User
from ..schemas.documents import DocumentRead, DocumentUpdate
from ..schemas.admin import DocumentTypeRead
from ..services.auth_service import get_current_user
from ..services.pipeline import process_document

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/documents", tags=["documents"])


async def _run_pipeline_background(document_id: int) -> None:
    """Run the processing pipeline in a separate async task with its own DB session."""
    async with async_session() as db:
        await process_document(document_id, db)


# ═══════════════════════════════════════════════════════════════════════
# UPLOAD
# ═══════════════════════════════════════════════════════════════════════

@router.post("/upload", response_model=DocumentRead, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    document_type_id: int = Form(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Upload a PDF document and start background processing.

    The file is saved with a UUID filename, a DB record is created,
    and the extraction pipeline is triggered as a background task.
    """
    # Validate file type
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nur PDF-Dateien sind erlaubt.",
        )

    # Validate file size
    content = await file.read()
    if len(content) > settings.max_upload_size_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Datei ist zu groß. Maximum: {settings.MAX_UPLOAD_SIZE_MB} MB.",
        )

    # Save file with UUID name
    upload_dir = Path(settings.UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)

    file_ext = Path(file.filename).suffix
    safe_filename = f"{uuid.uuid4()}{file_ext}"
    filepath = upload_dir / safe_filename

    filepath.write_bytes(content)
    logger.info(f"File saved: {filepath} ({len(content)} bytes)")

    # Create DB record
    document = Document(
        user_id=current_user.id,
        document_type_id=document_type_id,
        filename=file.filename,
        filepath=str(filepath),
        status="pending",
    )
    db.add(document)
    await db.commit()
    await db.refresh(document)

    logger.info(f"Document created: id={document.id}, type={document_type_id}")

    # Start background processing
    asyncio.create_task(_run_pipeline_background(document.id))

    return DocumentRead.model_validate(document)


# ═══════════════════════════════════════════════════════════════════════
# LIST
# ═══════════════════════════════════════════════════════════════════════

@router.get("", response_model=list[DocumentRead])
async def list_documents(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all documents for the current user (admins see all)."""
    if current_user.is_admin:
        result = await db.execute(
            select(Document)
            .options(selectinload(Document.user))
            .order_by(Document.upload_date.desc())
        )
    else:
        result = await db.execute(
            select(Document)
            .options(selectinload(Document.user))
            .where(Document.user_id == current_user.id)
            .order_by(Document.upload_date.desc())
        )

    documents = result.scalars().all()

    # Enrich with document type names
    response = []
    for doc in documents:
        doc_read = DocumentRead.model_validate(doc)
        if doc.document_type_id:
            dt_result = await db.get(DocumentType, doc.document_type_id)
            if dt_result:
                doc_read.document_type_name = dt_result.name
        if doc.user:
            doc_read.user_email = doc.user.email
        response.append(doc_read)

    return response


# ═══════════════════════════════════════════════════════════════════════
# DOCUMENT TYPES (public — for upload dropdown)
# ═══════════════════════════════════════════════════════════════════════

@router.get("/types", response_model=list[DocumentTypeRead])
async def list_document_types(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all document types (for upload dropdown). Requires auth but not admin."""
    result = await db.execute(
        select(DocumentType)
        .options(selectinload(DocumentType.fields))
        .order_by(DocumentType.name)
    )
    return [DocumentTypeRead.model_validate(dt) for dt in result.scalars().all()]


# ═══════════════════════════════════════════════════════════════════════
# GET SINGLE
# ═══════════════════════════════════════════════════════════════════════

@router.get("/{document_id}", response_model=DocumentRead)
async def get_document(
    document_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single document by ID."""
    document = await db.get(Document, document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Dokument nicht gefunden.")

    # Only owner or admin can access
    if document.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Kein Zugriff auf dieses Dokument.")

    doc_read = DocumentRead.model_validate(document)
    if document.document_type_id:
        dt = await db.get(DocumentType, document.document_type_id)
        if dt:
            doc_read.document_type_name = dt.name

    return doc_read


# ═══════════════════════════════════════════════════════════════════════
# GET FILE
# ═══════════════════════════════════════════════════════════════════════

@router.get("/{document_id}/file")
async def get_document_file(
    document_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the original PDF file of a document."""
    document = await db.get(Document, document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Dokument nicht gefunden.")

    # Only owner or admin can access
    if document.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Kein Zugriff auf dieses Dokument.")

    filepath = Path(document.filepath)
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Datei nicht gefunden.")

    return FileResponse(
        path=filepath, 
        media_type="application/pdf", 
        filename=document.filename
    )


# ═══════════════════════════════════════════════════════════════════════
# UPDATE (manual correction of extracted data)
# ═══════════════════════════════════════════════════════════════════════

@router.put("/{document_id}", response_model=DocumentRead)
async def update_document(
    document_id: int,
    data: DocumentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update extracted data (manual correction by user)."""
    document = await db.get(Document, document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Dokument nicht gefunden.")

    if document.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Kein Zugriff auf dieses Dokument.")

    document.extracted_data = data.extracted_data
    await db.commit()
    await db.refresh(document)

    logger.info(f"Document {document_id} updated by {current_user.email}")
    return DocumentRead.model_validate(document)


# ═══════════════════════════════════════════════════════════════════════
# DELETE
# ═══════════════════════════════════════════════════════════════════════

@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    document_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a document and its file."""
    document = await db.get(Document, document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Dokument nicht gefunden.")

    if document.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Kein Zugriff auf dieses Dokument.")

    # Delete file from disk
    filepath = Path(document.filepath)
    if filepath.exists():
        filepath.unlink()
        logger.info(f"File deleted: {filepath}")

    logger.info(f"Document {document_id} deleted by {current_user.email}")
    await db.delete(document)
    await db.commit()


