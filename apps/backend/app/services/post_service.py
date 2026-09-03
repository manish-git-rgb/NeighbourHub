from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.post import Post
from app.schemas.post import PostCreate


def create_post(
    db: Session,
    user_id: int,
    post_data: PostCreate,
) -> Post:

    post = Post(
        user_id=user_id,
        category=post_data.category,
        title=post_data.title,
        content=post_data.content,
        visibility=post_data.visibility,
    )

    db.add(post)
    db.commit()
    db.refresh(post)

    return post


def get_posts(
    db: Session,
    page: int = 1,
    limit: int = 20,
):
    offset = (page - 1) * limit

    total = db.query(Post).count()

    posts = (
        db.query(Post)
        .order_by(Post.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    return posts, total


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