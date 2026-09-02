from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.user import User
from app.schemas.user import UserCreate, UserLogin

from datetime import datetime, timedelta, timezone

from app.core.security import (
    create_refresh_token,
    hash_password,
    verify_password,
)
from app.models.refresh_token import RefreshToken


def create_user(db: Session, user_data: UserCreate) -> User:
    existing_username = (
        db.query(User)
        .filter(User.username == user_data.username)
        .first()
    )

    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username already taken",
        )

    existing_email = (
        db.query(User)
        .filter(User.email == user_data.email)
        .first()
    )

    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    hashed_password = hash_password(user_data.password)

    user = User(
        name=user_data.name,
        username=user_data.username,
        email=user_data.email,
        password_hash=hashed_password,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return user


def authenticate_user(db: Session, login_data: UserLogin) -> User:
    user = (
        db.query(User)
        .filter(User.email == login_data.email)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not verify_password(
        login_data.password,
        user.password_hash,
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    return user

def save_refresh_token(db: Session, user_id: int, token: str) -> RefreshToken:
    refresh_token = RefreshToken(
        user_id=user_id,
        token=token,
        expires_at=datetime.now(timezone.utc) + timedelta(days=7),
    )

    db.add(refresh_token)
    db.commit()
    db.refresh(refresh_token)

    return refresh_token


def get_refresh_token(
    db: Session,
    token: str,
) -> RefreshToken | None:
    return (
        db.query(RefreshToken)
        .filter(RefreshToken.token == token)
        .first()
    )


def revoke_refresh_token(
    db: Session,
    token: str,
) -> bool:
    refresh_token = get_refresh_token(db, token)

    if not refresh_token:
        return False

    refresh_token.revoked = True

    db.commit()

    return True