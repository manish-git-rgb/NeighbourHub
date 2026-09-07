from sqlalchemy.orm import Session

from app.models.notification import Notification
from app.models.user import User


def create_notification(
    db: Session,
    user_id: int,
    notification_type: str,
    title: str,
    message: str,
) -> Notification:

    user = (
        db.query(User)
        .filter(User.id == user_id)
        .first()
    )

    if not user:
        return None

    notification = Notification(
        user_id=user_id,
        type=notification_type,
        title=title,
        message=message,
        is_read=False,
    )

    db.add(notification)
    db.commit()
    db.refresh(notification)

    return notification


def get_notifications(
    db: Session,
    user_id: int,
    page: int = 1,
    limit: int = 20,
    is_read: bool | None = None,
):
    offset = (page - 1) * limit

    query = (
        db.query(Notification)
        .filter(Notification.user_id == user_id)
    )

    if is_read is not None:
        query = query.filter(
            Notification.is_read == is_read
        )

    total = query.count()

    notifications = (
        query
        .order_by(Notification.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    return notifications, total


def get_notification(
    db: Session,
    notification_id: int,
    user_id: int,
) -> Notification:

    return (
        db.query(Notification)
        .filter(
            Notification.id == notification_id,
            Notification.user_id == user_id,
        )
        .first()
    )


def mark_notification_as_read(
    db: Session,
    notification_id: int,
    user_id: int,
) -> Notification:

    notification = get_notification(
        db,
        notification_id,
        user_id,
    )

    if not notification:
        from fastapi import HTTPException, status

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )

    notification.is_read = True

    db.commit()
    db.refresh(notification)

    return notification


def delete_notification(
    db: Session,
    notification_id: int,
    user_id: int,
) -> None:

    notification = get_notification(
        db,
        notification_id,
        user_id,
    )

    if not notification:
        from fastapi import HTTPException, status

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )

    db.delete(notification)
    db.commit()