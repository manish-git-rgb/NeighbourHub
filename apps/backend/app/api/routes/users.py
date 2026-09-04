from fastapi import APIRouter, Depends

from app.core.security import get_current_user
from app.db.database import get_db
from app.models.user import User
from app.schemas.user import UserResponse, UserUpdate
from app.services.user_service import update_user

from sqlalchemy.orm import Session
from app.schemas.neighborhood import NeighborhoodMembershipResponse
from app.services.neighborhood_service import get_user_neighborhoods

router = APIRouter(
    prefix="/users",
    tags=["Users"],
)


@router.get(
    "/me",
    response_model=UserResponse,
)
def get_me(
    current_user: User = Depends(get_current_user),
):
    return current_user


@router.patch(
    "/me",
    response_model=UserResponse,
)
def update_me(
    user_data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return update_user(
        db=db,
        current_user=current_user,
        user_data=user_data,
    )


@router.get(
    "/me/neighborhoods",
    response_model=list[NeighborhoodMembershipResponse],
)
def get_my_neighborhoods(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_user_neighborhoods(
        db=db,
        user_id=current_user.id,
    )