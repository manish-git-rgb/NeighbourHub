from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.database import get_db
from app.models.user import User
from app.schemas.notification import (
    NotificationCreate,
    NotificationListResponse,
    NotificationResponse,
)
from app.services.notification_service import (
    create_notification,
    delete_notification,
    get_notification,
    get_notifications,
    mark_notification_as_read,
)


router = APIRouter(
    prefix="/notifications",
    tags=["Notifications"],
)


@router.post(
    "/",
    response_model=NotificationResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_new_notification(
    notification_data: NotificationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # For now, prevent users from creating notifications
    # for other users.
    if notification_data.user_id != current_user.id:
        from fastapi import HTTPException

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only create notifications for yourself",
        )

    return create_notification(
        db=db,
        notification_data=notification_data,
    )


@router.get(
    "/",
    response_model=NotificationListResponse,
)
def list_my_notifications(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    is_read: bool | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    notifications, total = get_notifications(
        db=db,
        user_id=current_user.id,
        page=page,
        limit=limit,
        is_read=is_read,
    )

    return {
        "success": True,
        "data": notifications,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
        },
    }


@router.get(
    "/{notification_id}",
    response_model=NotificationResponse,
)
def get_single_notification(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_notification(
        db=db,
        notification_id=notification_id,
        user_id=current_user.id,
    )


@router.patch(
    "/{notification_id}/read",
    response_model=NotificationResponse,
)
def mark_notification_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return mark_notification_as_read(
        db=db,
        notification_id=notification_id,
        user_id=current_user.id,
    )


@router.delete(
    "/{notification_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_my_notification(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    delete_notification(
        db=db,
        notification_id=notification_id,
        user_id=current_user.id,
    )

    return None