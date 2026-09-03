from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.database import get_db
from app.models.user import User
from app.schemas.post import PostCreate, PostResponse, PostListResponse
from app.services.post_service import create_post, get_posts, get_post, update_post, delete_post


router = APIRouter(
    prefix="/posts",
    tags=["Posts"],
)


@router.post(
    "/",
    response_model=PostResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_new_post(
    post_data: PostCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return create_post(
        db=db,
        user_id=current_user.id,
        post_data=post_data,
    )


@router.get(
    "/",
    response_model=PostListResponse,
)
def list_posts(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    posts, total = get_posts(
        db=db,
        page=page,
        limit=limit,
    )

    return {
        "success": True,
        "data": posts,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
        },
    }


@router.get(
    "/{post_id}",
    response_model=PostResponse,
)
def get_single_post(
    post_id: int,
    db: Session = Depends(get_db),
):
    return get_post(
        db=db,
        post_id=post_id,
    )

@router.patch(
    "/{post_id}",
    response_model=PostResponse,
)
def update_existing_post(
    post_id: int,
    post_data: PostCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return update_post(
        db=db,
        post_id=post_id,
        user_id=current_user.id,
        post_data=post_data,
    )

@router.delete(
    "/{post_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_existing_post(
    post_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    delete_post(
        db=db,
        post_id=post_id,
        user_id=current_user.id,
    )