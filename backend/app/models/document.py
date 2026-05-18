"""Document model."""

from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Column, Text
from sqlalchemy.dialects.postgresql import JSON
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from .document_type import DocumentType
    from .user import User


class Document(SQLModel, table=True):
    """An uploaded document with its processing state and extraction results."""

    __tablename__ = "documents"

    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    document_type_id: int | None = Field(default=None, foreign_key="document_types.id", index=True)
    filename: str = Field(max_length=255)
    filepath: str = Field(max_length=500)
    upload_date: datetime = Field(default_factory=datetime.utcnow)
    status: str = Field(default="pending", max_length=20)  # pending | processing | completed | failed
    file_size: int = Field(default=0)
    is_deleted: bool = Field(default=False)
    raw_text: str | None = Field(default=None, sa_column=Column(Text))
    extraction_method: str | None = Field(default=None, max_length=20)
    extracted_data: dict | None = Field(default=None, sa_column=Column(JSON))
    error_message: str | None = Field(default=None, sa_column=Column(Text))

    # Relationships
    user: Optional["User"] = Relationship(back_populates="documents")
    document_type: Optional["DocumentType"] = Relationship(back_populates="documents")
