from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.database import get_db
from app.models.user import User

from app.schemas.place import (
    NearbyPlaceResponse,
    PlaceCreate,
    PlaceResponse,
    PlaceUpdate,
)

from app.services.place_service import (
    create_place,
    delete_place,
    get_nearby_places,
    get_place,
    get_places,
    update_place,
)


router = APIRouter(
    prefix="/places",
    tags=["Places"],
)


# ---------------------------------
# Create Place
# ---------------------------------

@router.post(
    "/",
    response_model=PlaceResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_new_place(
    place_data: PlaceCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return create_place(
        db=db,
        user_id=current_user.id,
        place_data=place_data,
    )


# ---------------------------------
# List / Search / Filter Places
# ---------------------------------

@router.get(
    "/",
)
def list_places(
    page: int = Query(
        1,
        ge=1,
    ),
    limit: int = Query(
        20,
        ge=1,
        le=100,
    ),
    keyword: str | None = Query(
        None,
        min_length=1,
        max_length=100,
    ),
    category: str | None = Query(
        None,
        min_length=1,
        max_length=50,
    ),
    neighborhood_id: int | None = Query(
        None,
        ge=1,
    ),
    db: Session = Depends(get_db),
):
    places, total = get_places(
        db=db,
        page=page,
        limit=limit,
        keyword=keyword,
        category=category,
        neighborhood_id=neighborhood_id,
    )

    data = [
        PlaceResponse.model_validate(place)
        for place in places
    ]

    return {
        "success": True,
        "data": data,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
        },
    }


# ---------------------------------
# Nearby Places
# ---------------------------------

@router.get(
    "/nearby",
    response_model=list[NearbyPlaceResponse],
)
def nearby_places(
    latitude: float = Query(
        ...,
        ge=-90,
        le=90,
    ),
    longitude: float = Query(
        ...,
        ge=-180,
        le=180,
    ),
    radius_km: float = Query(
        5,
        gt=0,
        le=100,
    ),
    page: int = Query(
        1,
        ge=1,
    ),
    limit: int = Query(
        20,
        ge=1,
        le=100,
    ),
    category: str | None = Query(
        None,
        min_length=1,
        max_length=50,
    ),
    keyword: str | None = Query(
        None,
        min_length=1,
        max_length=100,
    ),
    neighborhood_id: int | None = Query(
        None,
        ge=1,
    ),
    db: Session = Depends(get_db),
):
    results = get_nearby_places(
        db=db,
        latitude=latitude,
        longitude=longitude,
        radius_km=radius_km,
        page=page,
        limit=limit,
        category=category,
        keyword=keyword,
        neighborhood_id=neighborhood_id,
    )

    return [
        NearbyPlaceResponse(
            id=place.id,
            user_id=place.user_id,
            neighborhood_id=place.neighborhood_id,
            name=place.name,
            description=place.description,
            category=place.category,
            address=place.address,
            latitude=place.latitude,
            longitude=place.longitude,
            distance_km=round(
                float(distance_km),
                3,
            ),
            created_at=place.created_at,
            updated_at=place.updated_at,
        )
        for place, distance_km in results
    ]


# ---------------------------------
# Get Single Place
# ---------------------------------

@router.get(
    "/{place_id}",
    response_model=PlaceResponse,
)
def get_single_place(
    place_id: int,
    db: Session = Depends(get_db),
):
    return get_place(
        db=db,
        place_id=place_id,
    )


# ---------------------------------
# Update Place
# ---------------------------------

@router.patch(
    "/{place_id}",
    response_model=PlaceResponse,
)
def update_existing_place(
    place_id: int,
    place_data: PlaceUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return update_place(
        db=db,
        place_id=place_id,
        user_id=current_user.id,
        place_data=place_data,
    )


# ---------------------------------
# Delete Place
# ---------------------------------

@router.delete(
    "/{place_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_existing_place(
    place_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    delete_place(
        db=db,
        place_id=place_id,
        user_id=current_user.id,
    )

    return None