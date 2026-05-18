"""Admin schemas: document types and field definitions."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class FieldDefinitionCreate(BaseModel):
    """Create a field definition within a document type."""
    field_name: str = Field(min_length=1, max_length=100)
    field_type: str = Field(default="string", pattern=r"^(string|number|boolean|date)$")
    required: bool = False
    description: str | None = Field(default=None, max_length=500)
    sort_order: int = Field(default=0, ge=0)


class FieldDefinitionRead(BaseModel):
    """Field definition response."""
    id: int
    field_name: str
    field_type: str
    required: bool
    description: str | None
    sort_order: int

    model_config = {"from_attributes": True}


class FieldDefinitionUpdate(BaseModel):
    """Update a field definition."""
    field_name: str | None = Field(default=None, min_length=1, max_length=100)
    field_type: str | None = Field(default=None, pattern=r"^(string|number|boolean|date)$")
    required: bool | None = None
    description: str | None = None
    sort_order: int | None = Field(default=None, ge=0)


class DocumentTypeCreate(BaseModel):
    """Create a document type with initial fields."""
    name: str = Field(min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=500)
    fields: list[FieldDefinitionCreate] = Field(default_factory=list)


class DocumentTypeRead(BaseModel):
    """Document type response with its fields."""
    id: int
    name: str
    description: str | None
    created_at: datetime
    is_active: bool
    schema_version: int
    fields: list[FieldDefinitionRead] = []

    model_config = {"from_attributes": True}


class DocumentTypeUpdate(BaseModel):
    """Update a document type's metadata or activation state."""
    name: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = None
    is_active: bool | None = None


# ═══════════════════════════════════════════════════════════════════════
# RE-ANALYSE SCHEMAS
# ═══════════════════════════════════════════════════════════════════════

class OutdatedDocumentInfo(BaseModel):
    """Info about a document that needs re-analysis."""
    id: int
    filename: str
    upload_date: datetime
    has_manual_corrections: bool  # True wenn extracted_data manuell geändert wurde


class ReanalyzeResult(BaseModel):
    """Result of triggering a bulk re-analysis."""
    triggered: int  # Anzahl gestarteter Re-Analysen


# ═══════════════════════════════════════════════════════════════════════
# USER MANAGEMENT SCHEMAS
# ═══════════════════════════════════════════════════════════════════════

class AdminUserRead(BaseModel):
    """User details with stats for admin."""
    id: int
    email: str
    is_admin: bool
    is_active: bool
    theme: str
    created_at: datetime
    document_count: int = 0
    total_upload_bytes: int = 0
    percentage_of_total_size: float = 0.0


class AdminDatabaseStats(BaseModel):
    """Global database stats."""
    total_users: int
    total_documents: int
    total_database_bytes: int


class TempPasswordUpdate(BaseModel):
    """Schema for assigning a temporary password."""
    new_password: str = Field(min_length=6, max_length=100)
