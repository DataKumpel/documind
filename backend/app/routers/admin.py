"""
Admin routes: document type and field definition management.
All routes require admin privileges.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlmodel import select

from ..database import get_db
from ..models import DocumentType, FieldDefinition, User
from ..schemas.admin import (
    DocumentTypeCreate,
    DocumentTypeRead,
    DocumentTypeUpdate,
    FieldDefinitionCreate,
    FieldDefinitionRead,
    FieldDefinitionUpdate,
)
from ..services.auth_service import get_current_admin

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["admin"])


# ═══════════════════════════════════════════════════════════════════════
# DOCUMENT TYPES
# ═══════════════════════════════════════════════════════════════════════

@router.post("/document-types", response_model=DocumentTypeRead, status_code=status.HTTP_201_CREATED)
async def create_document_type(
    data: DocumentTypeCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Create a new document type with optional initial fields."""

    # Check for duplicate name
    result = await db.execute(select(DocumentType).where(DocumentType.name == data.name))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Dokumenttyp '{data.name}' existiert bereits.",
        )

    doc_type = DocumentType(name=data.name, description=data.description)
    db.add(doc_type)
    await db.flush()  # Get the ID before adding fields

    # Add initial fields
    for field_data in data.fields:
        field = FieldDefinition(
            document_type_id=doc_type.id,
            **field_data.model_dump(),
        )
        db.add(field)

    await db.commit()
    await db.refresh(doc_type)

    # Reload with fields
    result = await db.execute(
        select(DocumentType)
        .where(DocumentType.id == doc_type.id)
        .options(selectinload(DocumentType.fields))
    )
    doc_type = result.scalar_one()

    logger.info(f"Document type created: {doc_type.name} (by {admin.email})")
    return DocumentTypeRead.model_validate(doc_type)


@router.get("/document-types", response_model=list[DocumentTypeRead])
async def list_document_types(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """List all document types with their fields."""
    result = await db.execute(
        select(DocumentType)
        .options(selectinload(DocumentType.fields))
        .order_by(DocumentType.name)
    )
    return [DocumentTypeRead.model_validate(dt) for dt in result.scalars().all()]


@router.get("/document-types/{doc_type_id}", response_model=DocumentTypeRead)
async def get_document_type(
    doc_type_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Get a single document type with its fields."""
    result = await db.execute(
        select(DocumentType)
        .where(DocumentType.id == doc_type_id)
        .options(selectinload(DocumentType.fields))
    )
    doc_type = result.scalar_one_or_none()
    if not doc_type:
        raise HTTPException(status_code=404, detail="Dokumenttyp nicht gefunden.")
    return DocumentTypeRead.model_validate(doc_type)


@router.put("/document-types/{doc_type_id}", response_model=DocumentTypeRead)
async def update_document_type(
    doc_type_id: int,
    data: DocumentTypeUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Update a document type's name or description."""
    result = await db.execute(
        select(DocumentType)
        .where(DocumentType.id == doc_type_id)
        .options(selectinload(DocumentType.fields))
    )
    doc_type = result.scalar_one_or_none()
    if not doc_type:
        raise HTTPException(status_code=404, detail="Dokumenttyp nicht gefunden.")

    if data.name is not None:
        # Check for duplicate name
        existing = await db.execute(
            select(DocumentType).where(DocumentType.name == data.name, DocumentType.id != doc_type_id)
        )
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=409, detail=f"Dokumenttyp '{data.name}' existiert bereits.")
        doc_type.name = data.name

    if data.description is not None:
        doc_type.description = data.description

    await db.commit()
    await db.refresh(doc_type)

    logger.info(f"Document type updated: {doc_type.name} (by {admin.email})")
    return DocumentTypeRead.model_validate(doc_type)


@router.delete("/document-types/{doc_type_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document_type(
    doc_type_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Delete a document type and all its field definitions."""
    result = await db.execute(select(DocumentType).where(DocumentType.id == doc_type_id))
    doc_type = result.scalar_one_or_none()
    if not doc_type:
        raise HTTPException(status_code=404, detail="Dokumenttyp nicht gefunden.")

    logger.info(f"Document type deleted: {doc_type.name} (by {admin.email})")
    await db.delete(doc_type)
    await db.commit()


# ═══════════════════════════════════════════════════════════════════════
# FIELD DEFINITIONS
# ═══════════════════════════════════════════════════════════════════════

@router.post("/document-types/{doc_type_id}/fields", response_model=FieldDefinitionRead, status_code=status.HTTP_201_CREATED)
async def add_field(
    doc_type_id: int,
    data: FieldDefinitionCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Add a field definition to a document type."""
    result = await db.execute(select(DocumentType).where(DocumentType.id == doc_type_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Dokumenttyp nicht gefunden.")

    field = FieldDefinition(document_type_id=doc_type_id, **data.model_dump())
    db.add(field)
    await db.commit()
    await db.refresh(field)

    logger.info(f"Field added: {field.field_name} to type {doc_type_id} (by {admin.email})")
    return FieldDefinitionRead.model_validate(field)


@router.put("/fields/{field_id}", response_model=FieldDefinitionRead)
async def update_field(
    field_id: int,
    data: FieldDefinitionUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Update a field definition."""
    result = await db.execute(select(FieldDefinition).where(FieldDefinition.id == field_id))
    field = result.scalar_one_or_none()
    if not field:
        raise HTTPException(status_code=404, detail="Feld nicht gefunden.")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(field, key, value)

    await db.commit()
    await db.refresh(field)

    logger.info(f"Field updated: {field.field_name} (by {admin.email})")
    return FieldDefinitionRead.model_validate(field)


@router.delete("/fields/{field_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_field(
    field_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Delete a field definition."""
    result = await db.execute(select(FieldDefinition).where(FieldDefinition.id == field_id))
    field = result.scalar_one_or_none()
    if not field:
        raise HTTPException(status_code=404, detail="Feld nicht gefunden.")

    logger.info(f"Field deleted: {field.field_name} (by {admin.email})")
    await db.delete(field)
    await db.commit()
