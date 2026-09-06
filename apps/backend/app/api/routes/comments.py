from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.database import get_db
from app.models.user import User
from app.schemas.comment import (
    CommentCreate,
    CommentListResponse,
    CommentResponse,
    CommentUpdate,
)
from app.services.comment_service import (
    create_comment,
    delete_comment,
    get_comment,
    get_comments,
    update_comment,
)


router = APIRouter(
    prefix="/comments",
    tags=["Comments"],
)


@router.post(
    "/",
    response_model=CommentResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_new_comment(
    comment_data: CommentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return create_comment(
        db=db,
        user_id=current_user.id,
        comment_data=comment_data,
    )


@router.get(
    "/",
    response_model=CommentListResponse,
)
def list_comments(
    post_id: int = Query(..., ge=1),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    comments, total = get_comments(
        db=db,
        post_id=post_id,
        page=page,
        limit=limit,
    )

    return {
        "success": True,
        "data": comments,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
        },
    }


@router.get(
    "/{comment_id}",
    response_model=CommentResponse,
)
def get_single_comment(
    comment_id: int,
    db: Session = Depends(get_db),
):
    return get_comment(
        db=db,
        comment_id=comment_id,
    )


@router.patch(
    "/{comment_id}",
    response_model=CommentResponse,
)
def update_existing_comment(
    comment_id: int,
    comment_data: CommentUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return update_comment(
        db=db,
        comment_id=comment_id,
        user_id=current_user.id,
        comment_data=comment_data,
    )


@router.delete(
    "/{comment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_existing_comment(
    comment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    delete_comment(
        db=db,
        comment_id=comment_id,
        user_id=current_user.id,
    )

    return None