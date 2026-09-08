from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.enums import (
    PostCategory,
    PostStatus,
    PostVisibility,
)
from app.core.security import get_current_user
from app.db.database import get_db
from app.models.user import User

from app.schemas.post import (
    NearbyPostResponse,
    PostCreate,
    PostListResponse,
    PostResponse,
)

from app.services.post_service import (
    create_post,
    delete_post,
    get_nearby_posts,
    get_post,
    get_posts,
    update_post,
)


router = APIRouter(
    prefix="/posts",
    tags=["Posts"],
)


# ---------------------------------
# Create Post
# ---------------------------------

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


# ---------------------------------
# List / Search / Filter Posts
# ---------------------------------

@router.get(
    "/",
    response_model=PostListResponse,
)
def list_posts(
    page: int = Query(
        1,
        ge=1,
    ),
    limit: int = Query(
        20,
        ge=1,
        le=100,
    ),
    category: PostCategory | None = Query(None),
    post_status: PostStatus | None = Query(
        None,
        alias="status",
    ),
    visibility: PostVisibility | None = Query(None),
    keyword: str | None = Query(
        None,
        min_length=1,
        max_length=100,
    ),
    db: Session = Depends(get_db),
):
    posts, total = get_posts(
        db=db,
        page=page,
        limit=limit,
        category=category,
        post_status=post_status,
        visibility=visibility,
        keyword=keyword,
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


# ---------------------------------
# Nearby Posts
# ---------------------------------

@router.get(
    "/nearby",
    response_model=list[NearbyPostResponse],
)
def nearby_posts(
    latitude: float = Query(
        ...,
        ge=-90,
        le=90,
    ),
    longitude: float = Query(
        ...,
        ge=-180,
        le=180,
    ),
    radius_km: float = Query(
        5,
        gt=0,
        le=100,
    ),
    page: int = Query(
        1,
        ge=1,
    ),
    limit: int = Query(
        20,
        ge=1,
        le=100,
    ),
    category: PostCategory | None = Query(None),
    post_status: PostStatus | None = Query(
        None,
        alias="status",
    ),
    visibility: PostVisibility | None = Query(None),
    keyword: str | None = Query(
        None,
        min_length=1,
        max_length=100,
    ),
    db: Session = Depends(get_db),
):
    results = get_nearby_posts(
        db=db,
        latitude=latitude,
        longitude=longitude,
        radius_km=radius_km,
        page=page,
        limit=limit,
        category=category,
        post_status=post_status,
        visibility=visibility,
        keyword=keyword,
    )

    response = []

    for post, distance_km in results:
        response.append(
            NearbyPostResponse(
                id=post.id,
                user_id=post.user_id,
                category=post.category,
                title=post.title,
                content=post.content,
                visibility=post.visibility,
                status=post.status,
                latitude=post.latitude,
                longitude=post.longitude,
                distance_km=round(
                    float(distance_km),
                    3,
                ),
                created_at=post.created_at,
                updated_at=post.updated_at,
            )
        )

    return response


# ---------------------------------
# Get Single Post
# ---------------------------------

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


# ---------------------------------
# Update Post
# ---------------------------------

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


# ---------------------------------
# Delete Post
# ---------------------------------

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

    return None