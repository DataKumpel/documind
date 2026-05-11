"""
AI service for structured document analysis via Ollama.

Core flow:
  1. Load FieldDefinitions for a DocumentType from DB.
  2. Build a dynamic JSON schema from those fields.
  3. Send extracted text + schema to Ollama with the `format` parameter.
  4. Parse and return structured JSON matching the schema.
"""

import json
import logging
from pathlib import Path
from typing import Any

import ollama as ollama_client
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlmodel import select

from ..config import settings
from ..models import DocumentType

logger = logging.getLogger(__name__)


def _load_prompt_template() -> str:
    """Load the extraction prompt template from the resources directory."""
    template_path = Path(__file__).parent.parent / "resources" / "extraction_prompt.txt"
    raw = template_path.read_text(encoding="utf-8")
    # Strip comment lines (starting with #) from the template
    lines = [line for line in raw.splitlines() if not line.startswith("#")]
    return "\n".join(lines).strip()


# Load template once at module level
_PROMPT_TEMPLATE = _load_prompt_template()


def build_json_schema(doc_type: DocumentType) -> dict[str, Any]:
    """
    Build a JSON schema from a DocumentType's field definitions.

    This schema is passed to Ollama's `format` parameter to enforce
    structured output matching the admin-defined fields.
    """
    properties: dict[str, Any] = {}
    required: list[str] = []

    # Map our field types to JSON schema types
    type_map = {
        "string": "string",
        "number": "number",
        "boolean": "boolean",
        "date": "string",  # Dates as ISO strings
    }

    for field in doc_type.fields:
        json_type = type_map.get(field.field_type, "string")

        prop: dict[str, Any] = {"type": json_type}

        # Add description to help the LLM understand what to extract
        if field.description:
            prop["description"] = field.description

        # Date fields get a format hint
        if field.field_type == "date":
            prop["description"] = (prop.get("description", "") + " (Format: YYYY-MM-DD)").strip()

        properties[field.field_name] = prop

        if field.required:
            required.append(field.field_name)

    schema = {
        "type": "object",
        "properties": properties,
    }

    if required:
        schema["required"] = required

    return schema


def _build_prompt(text: str, doc_type: DocumentType) -> str:
    """Build the LLM prompt for structured extraction."""
    field_descriptions = []
    for field in sorted(doc_type.fields, key=lambda f: f.sort_order):
        req = " (Pflichtfeld)" if field.required else " (optional)"
        desc = f" — {field.description}" if field.description else ""
        field_descriptions.append(f"  - {field.field_name} ({field.field_type}){req}{desc}")

    fields_list = "\n".join(field_descriptions)
    doc_type_desc = f"Beschreibung: {doc_type.description}" if doc_type.description else ""

    return _PROMPT_TEMPLATE.format(
        doc_type_name=doc_type.name,
        doc_type_desc=doc_type_desc,
        fields_list=fields_list,
        text=text,
    )


async def analyze_document(
    text: str,
    doc_type: DocumentType,
) -> dict[str, Any]:
    """
    Send document text to Ollama for structured extraction.

    Args:
        text: Extracted document text.
        doc_type: DocumentType with loaded field definitions.

    Returns:
        dict with extracted key-value pairs matching the document type's fields.
    """
    schema = build_json_schema(doc_type)
    prompt = _build_prompt(text, doc_type)

    logger.info(
        f"Sending to Ollama ({settings.OLLAMA_MODEL}): "
        f"doc_type={doc_type.name}, fields={len(doc_type.fields)}, text_len={len(text)}"
    )

    try:
        client = ollama_client.AsyncClient(host=settings.OLLAMA_BASE_URL)
        response = await client.chat(
            model=settings.OLLAMA_MODEL,
            messages=[{"role": "user", "content": prompt}],
            format=schema,
            options={"temperature": 0.1},  # Low temperature for deterministic extraction
        )

        content = response["message"]["content"] if isinstance(response, dict) else response.message.content

        logger.info(f"Ollama response received: {len(content)} chars")

        # Parse the JSON response
        result = json.loads(content)
        logger.info(f"Extraction result: {list(result.keys())}")
        return result

    except json.JSONDecodeError as e:
        logger.error(f"Ollama returned invalid JSON: {e}")
        raise ValueError(f"KI-Antwort konnte nicht als JSON geparst werden: {e}")
    except Exception as e:
        logger.error(f"Ollama request failed: {e}")
        raise RuntimeError(f"KI-Analyse fehlgeschlagen: {e}")


async def load_document_type_with_fields(
    db: AsyncSession,
    doc_type_id: int,
) -> DocumentType:
    """Load a DocumentType with its FieldDefinitions eagerly loaded."""
    result = await db.execute(
        select(DocumentType)
        .where(DocumentType.id == doc_type_id)
        .options(selectinload(DocumentType.fields))
    )
    doc_type = result.scalar_one_or_none()
    if not doc_type:
        raise ValueError(f"Dokumenttyp mit ID {doc_type_id} nicht gefunden.")
    return doc_type
