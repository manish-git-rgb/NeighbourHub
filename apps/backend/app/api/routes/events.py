from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.database import get_db
from app.models.user import User
from app.schemas.event import (
    EventCreate,
    EventResponse,
    NearbyEventResponse,
    EventListResponse,
    EventUpdate
)
from app.services.event_service import (
    create_event,
    get_event,
    get_events,
    get_nearby_events,
    update_event,
    delete_event,
)


router = APIRouter(
    prefix="/events",
    tags=["Events"],
)


# ---------------------------------
# Create Event
# ---------------------------------

@router.post(
    "/",
    response_model=EventResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_new_event(
    event_data: EventCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return create_event(
        db=db,
        user_id=current_user.id,
        event_data=event_data,
    )


# ---------------------------------
# List Events
# ---------------------------------

@router.get(
    "/",
    response_model=EventListResponse,
)
def list_events(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    events, total = get_events(
        db=db,
        page=page,
        limit=limit,
    )

    data = [
        EventResponse(
            id=event.id,
            user_id=event.user_id,
            title=event.title,
            description=event.description,
            location_name=event.location_name,
            latitude=event.latitude,
            longitude=event.longitude,
            start_time=event.start_time,
            end_time=event.end_time,
            status=event.status,
            created_at=event.created_at,
            updated_at=event.updated_at,
        )
        for event in events
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
# --------------------------------
# Nearby Events
# --------------------------------

@router.get(
    "/nearby",
    response_model=list[NearbyEventResponse],
)
def nearby_events(
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180),
    radius_km: float = Query(5, gt=0, le=100),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    results = get_nearby_events(
        db=db,
        latitude=latitude,
        longitude=longitude,
        radius_km=radius_km,
        page=page,
        limit=limit,
    )

    response = []

    for event, distance_km in results:
        response.append(
            NearbyEventResponse(
                id=event.id,
                user_id=event.user_id,
                title=event.title,
                description=event.description,
                location_name=event.location_name,
                latitude=event.latitude,
                longitude=event.longitude,
                start_time=event.start_time,
                end_time=event.end_time,
                status=event.status,
                distance_km=round(float(distance_km), 3),
                created_at=event.created_at,
                updated_at=event.updated_at,
            )
        )

    return response


# ---------------------------------
# Get Single Event
# ---------------------------------

@router.get(
    "/{event_id}",
    response_model=EventResponse,
)
def get_single_event(
    event_id: int,
    db: Session = Depends(get_db),
):
    return get_event(
        db=db,
        event_id=event_id,
    )

# ---------------------------------
# Update Event
# ---------------------------------

@router.patch(
    "/{event_id}",
    response_model=EventResponse,
)
def update_existing_event(
    event_id: int,
    event_data: EventUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return update_event(
        db=db,
        event_id=event_id,
        user_id=current_user.id,
        event_data=event_data,
    )

# ---------------------------------
# Delete Event
# ---------------------------------

@router.delete(
    "/{event_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_existing_event(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    delete_event(
        db=db,
        event_id=event_id,
        user_id=current_user.id,
    )