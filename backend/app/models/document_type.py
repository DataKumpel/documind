"""DocumentType model."""

from datetime import datetime
from typing import TYPE_CHECKING

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from .document import Document
    from .field_definition import FieldDefinition


class DocumentType(SQLModel, table=True):
    """Admin-defined document category with configurable extraction fields."""

    __tablename__ = "document_types"

    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(unique=True, index=True, max_length=100)
    description: str | None = Field(default=None, max_length=500)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    # Soft-delete: inaktive Typen sind nicht mehr für neue Uploads verfügbar
    is_active: bool = Field(default=True)
    # Schema-Versionierung: wird bei jeder Feldänderung inkrementiert
    schema_version: int = Field(default=1)

    # Relationships
    fields: list["FieldDefinition"] = Relationship(
        back_populates="document_type",
        sa_relationship_kwargs={"cascade": "all, delete-orphan", "order_by": "FieldDefinition.sort_order"},
    )
    documents: list["Document"] = Relationship(back_populates="document_type")
