from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.user import User
from app.schemas.admin import AdminRoleUpdate


VALID_ROLES = {
    "USER",
    "MODERATOR",
    "ADMIN",
}


# -------------------------
# Validate Role
# -------------------------

def _validate_role(value: str) -> str:
    value = value.upper()

    if value not in VALID_ROLES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="role must be USER, MODERATOR, or ADMIN",
        )

    return value


# -------------------------
# Get Users
# -------------------------

def get_admin_users(
    db: Session,
    page: int = 1,
    limit: int = 20,
    user_role: str | None = None,
):
    offset = (page - 1) * limit

    query = db.query(User)

    if user_role is not None:
        query = query.filter(
            User.role == _validate_role(user_role)
        )

    total = query.count()

    users = (
        query
        .order_by(User.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    return users, total


# -------------------------
# Get One User
# -------------------------

def get_admin_user(
    db: Session,
    user_id: int,
) -> User:

    user = (
        db.query(User)
        .filter(User.id == user_id)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    return user


# -------------------------
# Update User Role
# -------------------------

def update_user_role(
    db: Session,
    user_id: int,
    role_data: AdminRoleUpdate,
    current_user_id: int,
) -> User:

    user = get_admin_user(
        db=db,
        user_id=user_id,
    )

    new_role = _validate_role(role_data.role)

    # Prevent admin from changing their own role
    if user.id == current_user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot change your own role",
        )

    # Prevent removing the last admin
    if user.role == "ADMIN" and new_role != "ADMIN":
        admin_count = (
            db.query(User)
            .filter(User.role == "ADMIN")
            .count()
        )

        if admin_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot remove the last admin",
            )

    user.role = new_role

    db.commit()
    db.refresh(user)

    return user