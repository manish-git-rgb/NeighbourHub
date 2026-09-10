from fastapi import HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.lost_found import LostFound
from app.models.post import Post
from app.schemas.lost_found import (
    LostFoundCreate,
    LostFoundUpdate,
)


VALID_TYPES = {"LOST", "FOUND"}

VALID_STATUSES = {"OPEN", "RESOLVED"}


# ---------------------------------
# Validate Type
# ---------------------------------

def _validate_type(value: str) -> str:
    value = value.upper()

    if value not in VALID_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="type must be LOST or FOUND",
        )

    return value


# ---------------------------------
# Validate Status
# ---------------------------------

def _validate_status(value: str) -> str:
    value = value.upper()

    if value not in VALID_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="status must be OPEN or RESOLVED",
        )

    return value


# ---------------------------------
# Create Lost & Found
# ---------------------------------

def create_lost_found(
    db: Session,
    user_id: int,
    lost_found_data: LostFoundCreate,
) -> LostFound:

    post = (
        db.query(Post)
        .filter(Post.id == lost_found_data.post_id)
        .first()
    )

    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found",
        )

    if post.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "You can only attach Lost & Found "
                "details to your own post"
            ),
        )

    existing = (
        db.query(LostFound)
        .filter(
            LostFound.post_id
            == lost_found_data.post_id
        )
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Lost & Found details already exist "
                "for this post"
            ),
        )

    lost_found = LostFound(
        post_id=lost_found_data.post_id,
        type=_validate_type(
            lost_found_data.type
        ),
        item_name=lost_found_data.item_name,
        description=lost_found_data.description,
        last_seen_location=(
            lost_found_data.last_seen_location
        ),
        contact_info=(
            lost_found_data.contact_info
        ),
        status="OPEN",
    )

    db.add(lost_found)
    db.commit()
    db.refresh(lost_found)

    return lost_found


# ---------------------------------
# List / Search / Filter
# ---------------------------------

def get_lost_found_items(
    db: Session,
    page: int = 1,
    limit: int = 20,
    item_type: str | None = None,
    item_status: str | None = None,
    keyword: str | None = None,
):
    offset = (page - 1) * limit

    query = db.query(LostFound)

    # Type filter
    if item_type is not None:
        query = query.filter(
            LostFound.type
            == _validate_type(item_type)
        )

    # Status filter
    if item_status is not None:
        query = query.filter(
            LostFound.status
            == _validate_status(item_status)
        )

    # Keyword search
    if keyword is not None:
        keyword = keyword.strip()

        if keyword:
            search_pattern = f"%{keyword}%"

            query = query.filter(
                or_(
                    LostFound.item_name.ilike(
                        search_pattern
                    ),
                    LostFound.description.ilike(
                        search_pattern
                    ),
                    LostFound.last_seen_location.ilike(
                        search_pattern
                    ),
                )
            )

    total = query.count()

    items = (
        query
        .order_by(
            LostFound.created_at.desc()
        )
        .offset(offset)
        .limit(limit)
        .all()
    )

    return items, total


# ---------------------------------
# Get Single Lost & Found
# ---------------------------------

def get_lost_found(
    db: Session,
    lost_found_id: int,
) -> LostFound:

    item = (
        db.query(LostFound)
        .filter(
            LostFound.id == lost_found_id
        )
        .first()
    )

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lost & Found item not found",
        )

    return item


# ---------------------------------
# Update Lost & Found
# ---------------------------------

def update_lost_found(
    db: Session,
    lost_found_id: int,
    user_id: int,
    lost_found_data: LostFoundUpdate,
) -> LostFound:

    item = get_lost_found(
        db,
        lost_found_id,
    )

    post = (
        db.query(Post)
        .filter(Post.id == item.post_id)
        .first()
    )

    if not post or post.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not allowed to update this item",
        )

    if lost_found_data.type is not None:
        item.type = _validate_type(
            lost_found_data.type
        )

    if lost_found_data.item_name is not None:
        item.item_name = (
            lost_found_data.item_name
        )

    if lost_found_data.description is not None:
        item.description = (
            lost_found_data.description
        )

    if (
        lost_found_data.last_seen_location
        is not None
    ):
        item.last_seen_location = (
            lost_found_data.last_seen_location
        )

    if lost_found_data.contact_info is not None:
        item.contact_info = (
            lost_found_data.contact_info
        )

    if lost_found_data.status is not None:
        item.status = _validate_status(
            lost_found_data.status
        )

    db.commit()
    db.refresh(item)

    return item


# ---------------------------------
# Delete Lost & Found
# ---------------------------------

def delete_lost_found(
    db: Session,
    lost_found_id: int,
    user_id: int,
) -> None:

    item = get_lost_found(
        db,
        lost_found_id,
    )

    post = (
        db.query(Post)
        .filter(Post.id == item.post_id)
        .first()
    )

    if not post or post.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not allowed to delete this item",
        )

    db.delete(item)
    db.commit()