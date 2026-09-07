from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.post import Post
from app.models.reaction import Reaction
from app.schemas.reaction import ReactionCreate


VALID_REACTION_TYPES = {
    "LIKE",
    "HELPFUL",
    "INTERESTING",
}


def _validate_reaction_type(value: str) -> str:
    value = value.upper()

    if value not in VALID_REACTION_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "reaction_type must be LIKE, "
                "HELPFUL, or INTERESTING"
            ),
        )

    return value


def create_reaction(
    db: Session,
    user_id: int,
    reaction_data: ReactionCreate,
) -> Reaction:

    post = (
        db.query(Post)
        .filter(Post.id == reaction_data.post_id)
        .first()
    )

    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found",
        )

    reaction_type = _validate_reaction_type(
        reaction_data.reaction_type
    )

    existing = (
        db.query(Reaction)
        .filter(
            Reaction.user_id == user_id,
            Reaction.post_id == reaction_data.post_id,
        )
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You have already reacted to this post",
        )

    reaction = Reaction(
        user_id=user_id,
        post_id=reaction_data.post_id,
        reaction_type=reaction_type,
    )

    db.add(reaction)

    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You have already reacted to this post",
        )

    db.refresh(reaction)

    return reaction


def get_reactions(
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
        db.query(Reaction)
        .filter(Reaction.post_id == post_id)
    )

    total = query.count()

    reactions = (
        query
        .order_by(Reaction.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    return reactions, total


def delete_reaction(
    db: Session,
    reaction_id: int,
    user_id: int,
) -> None:

    reaction = (
        db.query(Reaction)
        .filter(Reaction.id == reaction_id)
        .first()
    )

    if not reaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reaction not found",
        )

    if reaction.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not allowed to delete this reaction",
        )

    db.delete(reaction)
    db.commit()