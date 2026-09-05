from fastapi import HTTPException, status
from geoalchemy2.shape import from_shape
from shapely.geometry import Point
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.event import Event
from app.schemas.event import EventCreate, EventUpdate


def create_event(
    db: Session,
    user_id: int,
    event_data: EventCreate,
) -> Event:
    # Validate event time range
    if (
        event_data.end_time is not None
        and event_data.end_time <= event_data.start_time
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="End time must be after start time",
        )

    # Convert latitude/longitude into PostGIS POINT
    location = from_shape(
        Point(
            event_data.longitude,
            event_data.latitude,
        ),
        srid=4326,
    )

    event = Event(
        user_id=user_id,
        title=event_data.title,
        description=event_data.description,
        location_name=event_data.location_name,
        location=location,
        start_time=event_data.start_time,
        end_time=event_data.end_time,
        status="ACTIVE",
    )

    db.add(event)
    db.commit()
    db.refresh(event)

    return event


def get_events(
    db: Session,
    page: int = 1,
    limit: int = 20,
) -> tuple[list[Event], int]:
    offset = (page - 1) * limit

    total = db.query(Event).count()

    events = (
        db.query(Event)
        .order_by(Event.start_time.asc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    return events, total


def get_event(
    db: Session,
    event_id: int,
) -> Event:
    event = (
        db.query(Event)
        .filter(Event.id == event_id)
        .first()
    )

    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found",
        )

    return event


def get_nearby_events(
    db: Session,
    latitude: float,
    longitude: float,
    radius_km: float = 5,
    page: int = 1,
    limit: int = 20,
):
    # Create geographic point from user's coordinates
    user_point = func.ST_SetSRID(
        func.ST_MakePoint(
            longitude,
            latitude,
        ),
        4326,
    )

    radius_meters = radius_km * 1000

    # Calculate distance in meters
    distance = func.ST_Distance(
        func.Geography(Event.location),
        func.Geography(user_point),
    )

    query = (
        db.query(
            Event,
            (distance / 1000).label("distance_km"),
        )
        .filter(
            Event.location.isnot(None),
            Event.status == "ACTIVE",
            func.ST_DWithin(
                func.Geography(Event.location),
                func.Geography(user_point),
                radius_meters,
            ),
        )
    )

    offset = (page - 1) * limit

    return (
        query
        .order_by(
            distance,
            Event.start_time.asc(),
        )
        .offset(offset)
        .limit(limit)
        .all()
    )


def update_event(
    db: Session,
    event_id: int,
    user_id: int,
    event_data: EventUpdate,
) -> Event:
    event = (
        db.query(Event)
        .filter(Event.id == event_id)
        .first()
    )

    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found",
        )

    if event.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not allowed to update this event",
        )

    if (
        event_data.start_time is not None
        and event_data.end_time is not None
        and event_data.end_time <= event_data.start_time
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="End time must be after start time",
        )

    if event_data.title is not None:
        event.title = event_data.title

    if event_data.description is not None:
        event.description = event_data.description

    if event_data.location_name is not None:
        event.location_name = event_data.location_name

    if (
        event_data.latitude is not None
        and event_data.longitude is not None
    ):
        event.location = from_shape(
            Point(
                event_data.longitude,
                event_data.latitude,
            ),
            srid=4326,
        )

    if event_data.start_time is not None:
        event.start_time = event_data.start_time

    if event_data.end_time is not None:
        event.end_time = event_data.end_time

    db.commit()
    db.refresh(event)

    return event


def delete_event(
    db: Session,
    event_id: int,
    user_id: int,
) -> None:
    event = (
        db.query(Event)
        .filter(Event.id == event_id)
        .first()
    )

    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found",
        )

    if event.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not allowed to delete this event",
        )

    db.delete(event)
    db.commit()