"""
DocuMind Pydantic schemas.

Usage:
    from app.schemas import auth, admin, documents

    auth.UserCreate, auth.TokenResponse, ...
    admin.DocumentTypeCreate, admin.FieldDefinitionRead, ...
    documents.DocumentRead, documents.DocumentUpdate, ...
"""

from . import admin, auth, documents

__all__ = ["auth", "admin", "documents"]
