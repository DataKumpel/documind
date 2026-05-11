"""
DocuMind — Intelligente Dokumentenanalyse.

FastAPI application entry point with CORS, lifespan events, and router includes.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import init_db

from .routers.auth import router as auth_router
from .routers.admin import router as admin_router
from .routers.documents import router as documents_router

from fastapi.responses import JSONResponse
from fastapi import Request

logger = logging.getLogger(__name__)

# ── Configure logging ─────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
    datefmt="%H:%M:%S",
)


# ── Lifespan ──────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: init DB. Shutdown: cleanup."""
    logger.info("Starting DocuMind Backend...")
    await init_db()
    logger.info("Database initialized.")
    yield
    logger.info("Shutting down DocuMind Backend.")


# ── App ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="DocuMind API",
    description="Intelligente Dokumentenanalyse mit KI",
    version="0.1.0",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",      # Vite dev server
        "http://127.0.0.1:5173",
        "http://frontend:5173",       # Docker internal
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Error Handling ────────────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Ein interner Serverfehler ist aufgetreten. Bitte versuchen Sie es später erneut."},
    )


# ── Routers ───────────────────────────────────────────────────────────
app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(documents_router)


# ── Health Check ──────────────────────────────────────────────────────
@app.get("/health", tags=["system"])
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "documind-backend"}
