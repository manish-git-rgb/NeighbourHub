from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.security import (
    get_current_user,
    require_moderator_or_admin,
)
from app.db.database import get_db
from app.models.user import User
from app.schemas.moderation import (
    ModerationCreate,
    ModerationListResponse,
    ModerationResponse,
    ModerationUpdate,
)
from app.services.moderation_service import (
    create_moderation_case,
    get_moderation_case,
    get_moderation_cases,
    update_moderation_case,
    
)


router = APIRouter(
    prefix="/moderation",
    tags=["Moderation"],
)


# -------------------------
# Create moderation report
# -------------------------

@router.post(
    "/",
    response_model=ModerationResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_new_moderation_case(
    moderation_data: ModerationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return create_moderation_case(
        db=db,
        reporter_id=current_user.id,
        moderation_data=moderation_data,
    )


# -------------------------
# List moderation reports
# -------------------------

@router.get(
    "/",
    response_model=ModerationListResponse,
)
def list_moderation_cases(
    page: int = Query(
        1,
        ge=1,
    ),
    limit: int = Query(
        20,
        ge=1,
        le=100,
    ),
    case_status: str | None = Query(None),
    current_user: User = Depends(
        require_moderator_or_admin
    ),
    db: Session = Depends(get_db),
):
    cases, total = get_moderation_cases(
        db=db,
        page=page,
        limit=limit,
        case_status=case_status,
    )

    return {
        "success": True,
        "data": cases,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
        },
    }


# -------------------------
# Get one moderation report
# -------------------------

@router.get(
    "/{case_id}",
    response_model=ModerationResponse,
)
def get_single_moderation_case(
    case_id: int,
    current_user: User = Depends(
        require_moderator_or_admin
    ),
    db: Session = Depends(get_db),
):
    return get_moderation_case(
        db=db,
        case_id=case_id,
    )


# -------------------------
# Update moderation report
# -------------------------

@router.patch(
    "/{case_id}",
    response_model=ModerationResponse,
)
def update_existing_moderation_case(
    case_id: int,
    moderation_data: ModerationUpdate,
    current_user: User = Depends(
        require_moderator_or_admin
    ),
    db: Session = Depends(get_db),
):
    return update_moderation_case(
        db=db,
        case_id=case_id,
        moderation_data=moderation_data,
    )