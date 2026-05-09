"""FieldDefinition model."""

from typing import TYPE_CHECKING, Optional

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from .document_type import DocumentType


class FieldDefinition(SQLModel, table=True):
    """A single extractable field within a document type."""

    __tablename__ = "field_definitions"

    id: int | None = Field(default=None, primary_key=True)
    document_type_id: int = Field(foreign_key="document_types.id", index=True)
    field_name: str = Field(max_length=100)
    field_type: str = Field(default="string", max_length=20)  # string | number | boolean | date
    required: bool = Field(default=False)
    description: str | None = Field(default=None, max_length=500)  # Helps the LLM understand what to extract
    sort_order: int = Field(default=0)

    # Relationships
    document_type: Optional["DocumentType"] = Relationship(back_populates="fields")
