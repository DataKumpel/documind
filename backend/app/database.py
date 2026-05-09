"""
Async SQLAlchemy engine, session factory, and dependency injection.
"""

import logging

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlmodel import SQLModel

from .config import settings

logger = logging.getLogger(__name__)

# ── Engine ────────────────────────────────────────────────────────────
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    pool_size=5,
    max_overflow=10,
)

# ── Session Factory ───────────────────────────────────────────────────
async_session = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


# ── Dependency ────────────────────────────────────────────────────────
async def get_db():
    """FastAPI dependency: yields an async DB session, auto-closes."""
    async with async_session() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise


# ── Init ──────────────────────────────────────────────────────────────
async def init_db():
    """Create all tables from SQLModel metadata. For dev only — use Alembic in prod."""
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
    logger.info("Database tables created / verified.")
