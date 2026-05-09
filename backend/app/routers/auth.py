"""
Auth routes: registration and login.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from ..database import get_db
from ..models import User
from ..schemas.auth import TokenResponse, UserCreate, UserLogin, UserRead
from ..services.auth_service import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(data: UserCreate, db: AsyncSession = Depends(get_db)):
    """Register a new user. The first user automatically becomes admin."""

    # Check if email already exists
    result = await db.execute(select(User).where(User.email == data.email))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="E-Mail-Adresse bereits registriert.",
        )

    # First user becomes admin
    result = await db.execute(select(User).limit(1))
    is_first_user = result.scalar_one_or_none() is None

    user = User(
        email=data.email,
        hashed_password=hash_password(data.password),
        is_admin=is_first_user,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    logger.info(f"User registered: {user.email} (admin={user.is_admin})")

    token = create_access_token(user.id, user.email, user.is_admin)
    return TokenResponse(
        access_token=token,
        user=UserRead.model_validate(user),
    )


@router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin, db: AsyncSession = Depends(get_db)):
    """Authenticate a user and return a JWT token."""

    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Ungültige E-Mail oder Passwort.",
        )

    logger.info(f"User logged in: {user.email}")

    token = create_access_token(user.id, user.email, user.is_admin)
    return TokenResponse(
        access_token=token,
        user=UserRead.model_validate(user),
    )


@router.get("/me", response_model=UserRead)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get the current user's profile."""
    return UserRead.model_validate(current_user)
