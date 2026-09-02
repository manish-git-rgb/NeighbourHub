from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import (
    create_access_token,
    create_refresh_token,
    verify_refresh_token,
)
from app.db.database import get_db
from app.schemas.user import (
    RefreshTokenRequest,
    TokenResponse,
    UserCreate,
    UserLogin,
    UserResponse,
)
from app.services.user_service import authenticate_user, create_user, save_refresh_token, get_refresh_token, revoke_refresh_token
 

router = APIRouter(
    prefix="/auth",
    tags=["Auth"],
)


# -------------------------
# Register
# -------------------------

@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
def register(
    user_data: UserCreate,
    db: Session = Depends(get_db),
):
    return create_user(db, user_data)


# -------------------------
# Login
# -------------------------

@router.post(
    "/login",
    response_model=TokenResponse,
)
def login(
    login_data: UserLogin,
    db: Session = Depends(get_db),
):
    user = authenticate_user(db, login_data)

    access_token = create_access_token(
        {
            "sub": str(user.id),
        }
    )

    refresh_token = create_refresh_token(
        {
            "sub": str(user.id),
        }
    )

    save_refresh_token(
        db,
        user.id,
        refresh_token,
    )

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }


# -------------------------
# Refresh token
# -------------------------

@router.post(
    "/refresh",
    response_model=TokenResponse,
)
def refresh_token(
    token_data: RefreshTokenRequest,
    db: Session = Depends(get_db),
):
    stored_token = get_refresh_token(
        db,
        token_data.refresh_token,
    )

    if not stored_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    if stored_token.revoked:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has been revoked",
        )

    if stored_token.expires_at <= datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has expired",
        )

    user_id = verify_refresh_token(
        token_data.refresh_token,
    )

    access_token = create_access_token(
        {
            "sub": user_id,
        }
    )

    new_refresh_token = create_refresh_token(
        {
            "sub": user_id,
        }
    )

    # Revoke the old refresh token
    stored_token.revoked = True

    # Store the new refresh token
    save_refresh_token(
        db,
        int(user_id),
        new_refresh_token,
    )

    return {
        "access_token": access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer",
    }

# -------------------------
# Logout
# -------------------------

@router.post("/logout")
def logout(
    token_data: RefreshTokenRequest,
    db: Session = Depends(get_db),
):
    revoked = revoke_refresh_token(
        db,
        token_data.refresh_token,
    )

    if not revoked:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Refresh token not found",
        )

    return {
        "message": "Logged out successfully"
    }