from fastapi import HTTPException, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.core.enums import (
    PostCategory,
    PostStatus,
    PostVisibility,
)
from app.models.post import Post
from app.schemas.post import PostCreate

from geoalchemy2.shape import from_shape
from shapely.geometry import Point


# ---------------------------------
# Create Post
# ---------------------------------

def create_post(
    db: Session,
    user_id: int,
    post_data: PostCreate,
) -> Post:

    location = from_shape(
        Point(
            post_data.longitude,
            post_data.latitude,
        ),
        srid=4326,
    )

    post = Post(
        user_id=user_id,
        category=post_data.category,
        title=post_data.title,
        content=post_data.content,
        visibility=post_data.visibility,
        location=location,
    )

    db.add(post)
    db.commit()
    db.refresh(post)

    return post


# ---------------------------------
# Get / Search / Filter Posts
# ---------------------------------

def get_posts(
    db: Session,
    page: int = 1,
    limit: int = 20,
    category: PostCategory | None = None,
    post_status: PostStatus | None = None,
    visibility: PostVisibility | None = None,
    keyword: str | None = None,
):
    offset = (page - 1) * limit

    query = db.query(Post)

    # Category filter
    if category is not None:
        query = query.filter(
            Post.category == category
        )

    # Status filter
    if post_status is not None:
        query = query.filter(
            Post.status == post_status
        )

    # Visibility filter
    if visibility is not None:
        query = query.filter(
            Post.visibility == visibility
        )

    # Keyword search
    if keyword is not None:
        keyword = keyword.strip()

        if keyword:
            search_pattern = f"%{keyword}%"

            query = query.filter(
                or_(
                    Post.title.ilike(search_pattern),
                    Post.content.ilike(search_pattern),
                )
            )

    # Count after filters
    total = query.count()

    # Pagination
    posts = (
        query
        .order_by(Post.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    return posts, total


# ---------------------------------
# Get Single Post
# ---------------------------------

def get_post(
    db: Session,
    post_id: int,
) -> Post:

    post = (
        db.query(Post)
        .filter(Post.id == post_id)
        .first()
    )

    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found",
        )

    return post


# ---------------------------------
# Update Post
# ---------------------------------

def update_post(
    db: Session,
    post_id: int,
    user_id: int,
    post_data: PostCreate,
) -> Post:

    post = (
        db.query(Post)
        .filter(Post.id == post_id)
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
            detail="You are not allowed to update this post",
        )

    post.category = post_data.category
    post.title = post_data.title
    post.content = post_data.content
    post.visibility = post_data.visibility

    db.commit()
    db.refresh(post)

    return post


# ---------------------------------
# Nearby Posts
# ---------------------------------

def get_nearby_posts(
    db: Session,
    latitude: float,
    longitude: float,
    radius_km: float = 5,
    page: int = 1,
    limit: int = 20,
    category: PostCategory | None = None,
    post_status: PostStatus | None = None,
    visibility: PostVisibility | None = None,
    keyword: str | None = None,
):
    user_point = func.ST_SetSRID(
        func.ST_MakePoint(
            longitude,
            latitude,
        ),
        4326,
    )

    radius_meters = radius_km * 1000

    distance = func.ST_Distance(
        func.Geography(Post.location),
        func.Geography(user_point),
    )

    query = (
        db.query(
            Post,
            (distance / 1000).label("distance_km"),
        )
        .filter(
            Post.location.isnot(None),
            func.ST_DWithin(
                func.Geography(Post.location),
                func.Geography(user_point),
                radius_meters,
            ),
        )
    )

    # Category filter
    if category is not None:
        query = query.filter(
            Post.category == category
        )

    # Status filter
    if post_status is not None:
        query = query.filter(
            Post.status == post_status
        )

    # Visibility filter
    if visibility is not None:
        query = query.filter(
            Post.visibility == visibility
        )

    # Keyword search
    if keyword is not None:
        keyword = keyword.strip()

        if keyword:
            search_pattern = f"%{keyword}%"

            query = query.filter(
                or_(
                    Post.title.ilike(search_pattern),
                    Post.content.ilike(search_pattern),
                )
            )

    offset = (page - 1) * limit

    return (
        query
        .order_by(distance)
        .offset(offset)
        .limit(limit)
        .all()
    )


# ---------------------------------
# Delete Post
# ---------------------------------

def delete_post(
    db: Session,
    post_id: int,
    user_id: int,
) -> None:

    post = (
        db.query(Post)
        .filter(Post.id == post_id)
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
            detail="You are not allowed to delete this post",
        )

    db.delete(post)
    db.commit()
    