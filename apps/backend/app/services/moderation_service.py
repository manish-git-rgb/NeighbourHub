from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.comment import Comment
from app.models.moderation import ModerationCase
from app.models.post import Post
from app.schemas.moderation import (
    ModerationCreate,
    ModerationUpdate,
)
from app.services.notification_service import create_notification


VALID_STATUSES = {
    "OPEN",
    "UNDER_REVIEW",
    "RESOLVED",
    "REJECTED",
}


# -------------------------
# Validate Status
# -------------------------

def _validate_status(value: str) -> str:
    value = value.upper()

    if value not in VALID_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "status must be OPEN, UNDER_REVIEW, "
                "RESOLVED, or REJECTED"
            ),
        )

    return value


# -------------------------
# Create Moderation Case
# -------------------------

def create_moderation_case(
    db: Session,
    reporter_id: int,
    moderation_data: ModerationCreate,
) -> ModerationCase:

    # Must report either a post or a comment
    if (
        moderation_data.post_id is None
        and moderation_data.comment_id is None
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either post_id or comment_id is required",
        )

    # Cannot report both at the same time
    if (
        moderation_data.post_id is not None
        and moderation_data.comment_id is not None
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provide either post_id or comment_id, not both",
        )

    # Validate post
    if moderation_data.post_id is not None:
        post = (
            db.query(Post)
            .filter(
                Post.id == moderation_data.post_id
            )
            .first()
        )

        if not post:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Post not found",
            )

    # Validate comment
    if moderation_data.comment_id is not None:
        comment = (
            db.query(Comment)
            .filter(
                Comment.id == moderation_data.comment_id
            )
            .first()
        )

        if not comment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Comment not found",
            )

    moderation_case = ModerationCase(
        reporter_id=reporter_id,
        post_id=moderation_data.post_id,
        comment_id=moderation_data.comment_id,
        reason=moderation_data.reason,
        description=moderation_data.description,
        status="OPEN",
    )

    db.add(moderation_case)
    db.commit()
    db.refresh(moderation_case)

    return moderation_case


# -------------------------
# List Moderation Cases
# -------------------------

def get_moderation_cases(
    db: Session,
    page: int = 1,
    limit: int = 20,
    case_status: str | None = None,
):
    offset = (page - 1) * limit

    query = db.query(ModerationCase)

    if case_status is not None:
        query = query.filter(
            ModerationCase.status
            == _validate_status(case_status)
        )

    total = query.count()

    cases = (
        query
        .order_by(
            ModerationCase.created_at.desc()
        )
        .offset(offset)
        .limit(limit)
        .all()
    )

    return cases, total


# -------------------------
# Get Single Moderation Case
# -------------------------

def get_moderation_case(
    db: Session,
    case_id: int,
) -> ModerationCase:

    moderation_case = (
        db.query(ModerationCase)
        .filter(
            ModerationCase.id == case_id
        )
        .first()
    )

    if not moderation_case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Moderation case not found",
        )

    return moderation_case


# -------------------------
# Update Moderation Case
# -------------------------

def update_moderation_case(
    db: Session,
    case_id: int,
    moderation_data: ModerationUpdate,
) -> ModerationCase:

    moderation_case = get_moderation_case(
        db,
        case_id,
    )

    # Remember old status
    old_status = moderation_case.status

    # Validate and assign new status
    new_status = _validate_status(
        moderation_data.status
    )

    moderation_case.status = new_status

    db.commit()
    db.refresh(moderation_case)

    # -------------------------
    # Automatic notification
    # -------------------------

    # Notify only when the status actually changes.
    if old_status != new_status:
        create_notification(
            db=db,
            user_id=moderation_case.reporter_id,
            notification_type="MODERATION_STATUS",
            title="Moderation report updated",
            message=(
                f"Your moderation report status is now "
                f"{new_status}."
            ),
        )

    return moderation_case