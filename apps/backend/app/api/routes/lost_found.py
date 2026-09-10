from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.database import get_db
from app.models.user import User

from app.schemas.lost_found import (
    LostFoundCreate,
    LostFoundListResponse,
    LostFoundResponse,
    LostFoundUpdate,
)

from app.services.lost_found_service import (
    create_lost_found,
    delete_lost_found,
    get_lost_found,
    get_lost_found_items,
    update_lost_found,
)


router = APIRouter(
    prefix="/lost-found",
    tags=["Lost & Found"],
)


# ---------------------------------
# Create Lost & Found
# ---------------------------------

@router.post(
    "/",
    response_model=LostFoundResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_new_lost_found(
    lost_found_data: LostFoundCreate,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):
    return create_lost_found(
        db=db,
        user_id=current_user.id,
        lost_found_data=lost_found_data,
    )


# ---------------------------------
# List / Search / Filter
# ---------------------------------

@router.get(
    "/",
    response_model=LostFoundListResponse,
)
def list_lost_found(
    page: int = Query(
        1,
        ge=1,
    ),
    limit: int = Query(
        20,
        ge=1,
        le=100,
    ),
    item_type: str | None = Query(
        None,
        min_length=1,
        max_length=10,
    ),
    item_status: str | None = Query(
        None,
        min_length=1,
        max_length=20,
    ),
    keyword: str | None = Query(
        None,
        min_length=1,
        max_length=100,
    ),
    db: Session = Depends(get_db),
):
    items, total = get_lost_found_items(
        db=db,
        page=page,
        limit=limit,
        item_type=item_type,
        item_status=item_status,
        keyword=keyword,
    )

    return {
        "success": True,
        "data": items,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
        },
    }


# ---------------------------------
# Get Single Lost & Found
# ---------------------------------

@router.get(
    "/{lost_found_id}",
    response_model=LostFoundResponse,
)
def get_single_lost_found(
    lost_found_id: int,
    db: Session = Depends(get_db),
):
    return get_lost_found(
        db=db,
        lost_found_id=lost_found_id,
    )


# ---------------------------------
# Update Lost & Found
# ---------------------------------

@router.patch(
    "/{lost_found_id}",
    response_model=LostFoundResponse,
)
def update_existing_lost_found(
    lost_found_id: int,
    lost_found_data: LostFoundUpdate,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):
    return update_lost_found(
        db=db,
        lost_found_id=lost_found_id,
        user_id=current_user.id,
        lost_found_data=lost_found_data,
    )


# ---------------------------------
# Delete Lost & Found
# ---------------------------------

@router.delete(
    "/{lost_found_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_existing_lost_found(
    lost_found_id: int,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):
    delete_lost_found(
        db=db,
        lost_found_id=lost_found_id,
        user_id=current_user.id,
    )

    return None