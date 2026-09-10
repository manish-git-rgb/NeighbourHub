from fastapi import APIRouter, Depends, Query

from sqlalchemy.orm import Session

from app.core.security import require_admin
from app.db.database import get_db
from app.models.user import User
from app.schemas.admin import (
    AdminRoleUpdate,
    AdminRoleUpdateResponse,
    AdminUserListResponse,
    AdminUserResponse,
)
from app.services.admin_service import (
    get_admin_user,
    get_admin_users,
    update_user_role,
)


router = APIRouter(
    prefix="/admin",
    tags=["Admin"],
)


# -------------------------
# List Users
# -------------------------

@router.get(
    "/users",
    response_model=AdminUserListResponse,
)
def list_users(
    page: int = Query(
        1,
        ge=1,
    ),
    limit: int = Query(
        20,
        ge=1,
        le=100,
    ),
    role: str | None = Query(None),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    users, total = get_admin_users(
        db=db,
        page=page,
        limit=limit,
        user_role=role,
    )

    return {
        "success": True,
        "data": users,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
        },
    }


# -------------------------
# Get One User
# -------------------------

@router.get(
    "/users/{user_id}",
    response_model=AdminUserResponse,
)
def get_user(
    user_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return get_admin_user(
        db=db,
        user_id=user_id,
    )


# -------------------------
# Update User Role
# -------------------------

@router.patch(
    "/users/{user_id}/role",
    response_model=AdminRoleUpdateResponse,
)
def change_user_role(
    user_id: int,
    role_data: AdminRoleUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    user = update_user_role(
        db=db,
        user_id=user_id,
        role_data=role_data,
        current_user_id=current_user.id,
    )

    return {
        "success": True,
        "message": "User role updated successfully",
        "data": user,
    }