"""
Application configuration via pydantic-settings.
All values can be overridden via environment variables or a .env file.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central configuration for the DocuMind backend."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # ── Database ──────────────────────────────────────────────────────
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@db:5432/documind"

    # ── Ollama / LLM ─────────────────────────────────────────────────
    OLLAMA_BASE_URL: str = "http://ollama:11434"
    OLLAMA_MODEL: str = "qwen2.5:7b"

    # ── JWT Authentication ───────────────────────────────────────────
    JWT_SECRET: str = "documind-dev-secret-change-in-production-!!"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60

    # ── File Uploads ─────────────────────────────────────────────────
    UPLOAD_DIR: str = "/app/uploads"
    MAX_UPLOAD_SIZE_MB: int = 50

    # ── OCR Settings ─────────────────────────────────────────────────
    OCR_MIN_TEXT_LENGTH: int = 50

    @property
    def max_upload_size_bytes(self) -> int:
        """Max upload size in bytes."""
        return self.MAX_UPLOAD_SIZE_MB * 1024 * 1024


settings = Settings()
