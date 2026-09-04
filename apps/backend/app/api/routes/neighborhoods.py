from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.database import get_db
from app.models.user import User
from app.schemas.neighborhood import (
    NeighborhoodCreate,
    NeighborhoodMembershipResponse,
    NeighborhoodResponse,
)
from app.services.neighborhood_service import (
    create_neighborhood,
    get_neighborhoods,
    get_nearby_neighborhoods,
    get_user_neighborhoods,
    join_neighborhood,
    leave_neighborhood,
)


router = APIRouter(
    prefix="/neighborhoods",
    tags=["Neighborhoods"],
)


@router.post(
    "/",
    response_model=NeighborhoodResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_new_neighborhood(
    neighborhood_data: NeighborhoodCreate,
    db: Session = Depends(get_db),
):
    return create_neighborhood(
        db=db,
        neighborhood_data=neighborhood_data,
    )


@router.get(
    "/",
    response_model=list[NeighborhoodResponse],
)
def list_neighborhoods(
    db: Session = Depends(get_db),
):
    return get_neighborhoods(db=db)


@router.post(
    "/{neighborhood_id}/join",
    response_model=NeighborhoodMembershipResponse,
    status_code=status.HTTP_201_CREATED,
)
def join_new_neighborhood(
    neighborhood_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return join_neighborhood(
        db=db,
        user_id=current_user.id,
        neighborhood_id=neighborhood_id,
    )


@router.post(
    "/{neighborhood_id}/leave",
    status_code=status.HTTP_204_NO_CONTENT,
)
def leave_current_neighborhood(
    neighborhood_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    leave_neighborhood(
        db=db,
        user_id=current_user.id,
        neighborhood_id=neighborhood_id,
    )

@router.get(
    "/nearby",
    response_model=list[NeighborhoodResponse],
)
def nearby_neighborhoods(
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180),
    radius_km: float = Query(5, gt=0, le=100),
    db: Session = Depends(get_db),
):
    return get_nearby_neighborhoods(
        db=db,
        latitude=latitude,
        longitude=longitude,
        radius_km=radius_km,
    )