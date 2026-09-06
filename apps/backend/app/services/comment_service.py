from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.comment import Comment
from app.models.post import Post
from app.schemas.comment import CommentCreate, CommentUpdate


def create_comment(
    db: Session,
    user_id: int,
    comment_data: CommentCreate,
) -> Comment:

    post = (
        db.query(Post)
        .filter(Post.id == comment_data.post_id)
        .first()
    )

    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found",
        )

    comment = Comment(
        user_id=user_id,
        post_id=comment_data.post_id,
        content=comment_data.content,
    )

    db.add(comment)
    db.commit()
    db.refresh(comment)

    return comment


def get_comments(
    db: Session,
    post_id: int,
    page: int = 1,
    limit: int = 20,
):
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

    offset = (page - 1) * limit

    query = (
        db.query(Comment)
        .filter(Comment.post_id == post_id)
    )

    total = query.count()

    comments = (
        query
        .order_by(Comment.created_at.asc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    return comments, total


def get_comment(
    db: Session,
    comment_id: int,
) -> Comment:

    comment = (
        db.query(Comment)
        .filter(Comment.id == comment_id)
        .first()
    )

    if not comment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comment not found",
        )

    return comment


def update_comment(
    db: Session,
    comment_id: int,
    user_id: int,
    comment_data: CommentUpdate,
) -> Comment:

    comment = get_comment(
        db,
        comment_id,
    )

    if comment.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not allowed to update this comment",
        )

    comment.content = comment_data.content

    db.commit()
    db.refresh(comment)

    return comment


def delete_comment(
    db: Session,
    comment_id: int,
    user_id: int,
) -> None:

    comment = get_comment(
        db,
        comment_id,
    )

    if comment.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not allowed to delete this comment",
        )

    db.delete(comment)
    db.commit()