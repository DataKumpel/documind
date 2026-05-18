"""Document schemas: read and update."""

from datetime import datetime

from pydantic import BaseModel


class DocumentRead(BaseModel):
    """Document response."""
    id: int
    filename: str
    upload_date: datetime
    status: str
    document_type_id: int | None
    document_type_name: str | None = None
    user_email: str | None = None
    raw_text: str | None = None
    extraction_method: str | None = None
    extracted_data: dict | None = None
    error_message: str | None = None

    model_config = {"from_attributes": True}


class DocumentUpdate(BaseModel):
    """Update extracted data (manual correction)."""
    extracted_data: dict
