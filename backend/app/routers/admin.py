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
from ..models import Document, DocumentType, FieldDefinition, User
from ..schemas.admin import (
    AdminDatabaseStats,
    AdminUserRead,
    DocumentTypeCreate,
    DocumentTypeRead,
    DocumentTypeUpdate,
    FieldDefinitionCreate,
    FieldDefinitionRead,
    FieldDefinitionUpdate,
    TempPasswordUpdate,
)
from ..schemas.documents import DocumentRead
from ..services.auth_service import get_current_admin, hash_password
from pathlib import Path

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


# ═══════════════════════════════════════════════════════════════════════
# USER MANAGEMENT
# ═══════════════════════════════════════════════════════════════════════

@router.get("/users")
async def list_users(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """List all users with their statistics."""
    # Get all users
    users_result = await db.execute(select(User).order_by(User.id))
    users = users_result.scalars().all()

    # Calculate global stats
    total_users = len(users)
    
    docs_result = await db.execute(select(Document).where(Document.is_deleted.is_(False)))
    documents = docs_result.scalars().all()
    total_documents = len(documents)
    total_database_bytes = sum(doc.file_size for doc in documents)

    # Calculate per-user stats
    user_stats = []
    for user in users:
        user_docs = [d for d in documents if d.user_id == user.id]
        doc_count = len(user_docs)
        upload_bytes = sum(d.file_size for d in user_docs)
        percentage = (upload_bytes / total_database_bytes * 100) if total_database_bytes > 0 else 0.0

        user_stats.append(AdminUserRead(
            id=user.id,
            email=user.email,
            is_admin=user.is_admin,
            is_active=user.is_active,
            created_at=user.created_at,
            document_count=doc_count,
            total_upload_bytes=upload_bytes,
            percentage_of_total_size=round(percentage, 2)
        ))

    return {
        "users": user_stats,
        "stats": AdminDatabaseStats(
            total_users=total_users,
            total_documents=total_documents,
            total_database_bytes=total_database_bytes
        )
    }


@router.post("/users/{user_id}/temp-password")
async def set_temp_password(
    user_id: int,
    data: TempPasswordUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Assign a temporary password to a user."""
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Benutzer nicht gefunden.")

    user.hashed_password = hash_password(data.new_password)
    await db.commit()
    logger.info(f"Temporary password set for user {user.email} by {admin.email}")
    return {"message": "Passwort erfolgreich geändert."}


@router.put("/users/{user_id}/toggle-active")
async def toggle_user_active(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Activate or deactivate a user."""
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Sie können sich nicht selbst deaktivieren.")

    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Benutzer nicht gefunden.")

    # Prevent deactivating the last active admin
    if user.is_admin and user.is_active:
        active_admins_result = await db.execute(
            select(User).where(User.is_admin.is_(True), User.is_active.is_(True))
        )
        active_admins = active_admins_result.scalars().all()
        if len(active_admins) <= 1:
            raise HTTPException(
                status_code=400,
                detail="Es muss mindestens ein aktiver Administrator im System verbleiben.",
            )

    user.is_active = not user.is_active
    await db.commit()
    logger.info(f"User {user.email} is_active set to {user.is_active} by {admin.email}")
    return {"is_active": user.is_active}


@router.put("/users/{user_id}/toggle-admin")
async def toggle_user_admin(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Promote or demote a user to/from admin."""
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Sie können sich nicht selbst die Admin-Rechte entziehen.")

    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Benutzer nicht gefunden.")

    # Prevent removing admin rights from the last active admin
    if user.is_admin:
        active_admins_result = await db.execute(
            select(User).where(User.is_admin.is_(True), User.is_active.is_(True))
        )
        active_admins = active_admins_result.scalars().all()
        if len(active_admins) <= 1:
            raise HTTPException(
                status_code=400,
                detail="Es muss mindestens ein aktiver Administrator im System verbleiben.",
            )

    user.is_admin = not user.is_admin
    await db.commit()
    logger.info(f"User {user.email} is_admin set to {user.is_admin} by {admin.email}")
    return {"is_admin": user.is_admin}


# ═══════════════════════════════════════════════════════════════════════
# DELETED DOCUMENTS MANAGEMENT
# ═══════════════════════════════════════════════════════════════════════

@router.get("/documents/deleted", response_model=list[DocumentRead])
async def list_deleted_documents(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """List all soft-deleted documents."""
    result = await db.execute(
        select(Document)
        .options(selectinload(Document.user))
        .where(Document.is_deleted.is_(True))
        .order_by(Document.upload_date.desc())
    )
    documents = result.scalars().all()
    
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


@router.post("/documents/{doc_id}/restore", response_model=DocumentRead)
async def restore_document(
    doc_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Restore a soft-deleted document."""
    document = await db.get(Document, doc_id)
    if not document or not document.is_deleted:
        raise HTTPException(status_code=404, detail="Gelöschtes Dokument nicht gefunden.")

    document.is_deleted = False
    await db.commit()
    await db.refresh(document)
    logger.info(f"Document {doc_id} restored by {admin.email}")
    return DocumentRead.model_validate(document)


@router.delete("/documents/{doc_id}/hard", status_code=status.HTTP_204_NO_CONTENT)
async def hard_delete_document(
    doc_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Permanently delete a document and its file."""
    document = await db.get(Document, doc_id)
    if not document:
        raise HTTPException(status_code=404, detail="Dokument nicht gefunden.")

    # Delete file from disk
    filepath = Path(document.filepath)
    if filepath.exists():
        filepath.unlink()
        logger.info(f"File physically deleted: {filepath}")

    logger.info(f"Document {doc_id} permanently deleted by {admin.email}")
    await db.delete(document)
    await db.commit()
