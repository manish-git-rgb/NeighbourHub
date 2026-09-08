from datetime import datetime

from fastapi import HTTPException, status
from geoalchemy2.shape import from_shape
from shapely.geometry import Point
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.models.event import Event
from app.models.event_rsvp import EventRSVP
from app.models.neighborhood import Neighborhood
from app.schemas.event import EventCreate, EventUpdate
from app.services.notification_service import create_notification


# -------------------------
# Create Event
# -------------------------

def create_event(
    db: Session,
    user_id: int,
    event_data: EventCreate,
) -> Event:

    if (
        event_data.end_time is not None
        and event_data.end_time <= event_data.start_time
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="End time must be after start time",
        )

    if event_data.neighborhood_id is not None:
        neighborhood = (
            db.query(Neighborhood)
            .filter(
                Neighborhood.id == event_data.neighborhood_id
            )
            .first()
        )

        if not neighborhood:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Neighborhood not found",
            )

    location = from_shape(
        Point(
            event_data.longitude,
            event_data.latitude,
        ),
        srid=4326,
    )

    event = Event(
        user_id=user_id,
        neighborhood_id=event_data.neighborhood_id,
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


# -------------------------
# List / Search / Filter Events
# -------------------------

def get_events(
    db: Session,
    page: int = 1,
    limit: int = 20,
    keyword: str | None = None,
    event_status: str | None = None,
    neighborhood_id: int | None = None,
    start_date: datetime | None = None,
    end_date: datetime | None = None,
):
    offset = (page - 1) * limit

    query = db.query(Event)

    # Keyword search
    if keyword is not None:
        keyword = keyword.strip()

        if keyword:
            search_pattern = f"%{keyword}%"

            query = query.filter(
                or_(
                    Event.title.ilike(search_pattern),
                    Event.description.ilike(search_pattern),
                    Event.location_name.ilike(search_pattern),
                )
            )

    # Status filter
    if event_status is not None:
        query = query.filter(
            Event.status == event_status.upper()
        )

    # Neighborhood filter
    if neighborhood_id is not None:
        query = query.filter(
            Event.neighborhood_id == neighborhood_id
        )

    # Start date filter
    if start_date is not None:
        query = query.filter(
            Event.start_time >= start_date
        )

    # End date filter
    if end_date is not None:
        query = query.filter(
            Event.start_time <= end_date
        )

    total = query.count()

    events = (
        query
        .order_by(Event.start_time.asc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    return events, total


# -------------------------
# Get Single Event
# -------------------------

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


# -------------------------
# Nearby Events
# -------------------------

def get_nearby_events(
    db: Session,
    latitude: float,
    longitude: float,
    radius_km: float = 5,
    page: int = 1,
    limit: int = 20,
    keyword: str | None = None,
    event_status: str | None = None,
    neighborhood_id: int | None = None,
):
    user_point = func.ST_SetSRID(
        func.ST_MakePoint(
            longitude,
            latitude,
        ),
        4326,
    )

    radius_meters = radius_km * 1000

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
            func.ST_DWithin(
                func.Geography(Event.location),
                func.Geography(user_point),
                radius_meters,
            ),
        )
    )

    # Keyword search
    if keyword is not None:
        keyword = keyword.strip()

        if keyword:
            search_pattern = f"%{keyword}%"

            query = query.filter(
                or_(
                    Event.title.ilike(search_pattern),
                    Event.description.ilike(search_pattern),
                    Event.location_name.ilike(search_pattern),
                )
            )

    # Status filter
    if event_status is not None:
        query = query.filter(
            Event.status == event_status.upper()
        )

    # Neighborhood filter
    if neighborhood_id is not None:
        query = query.filter(
            Event.neighborhood_id == neighborhood_id
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


# -------------------------
# Update Event
# -------------------------

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

    # Validate neighborhood
    if event_data.neighborhood_id is not None:
        neighborhood = (
            db.query(Neighborhood)
            .filter(
                Neighborhood.id == event_data.neighborhood_id
            )
            .first()
        )

        if not neighborhood:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Neighborhood not found",
            )

        event.neighborhood_id = event_data.neighborhood_id

    # Update normal fields
    if event_data.title is not None:
        event.title = event_data.title

    if event_data.description is not None:
        event.description = event_data.description

    if event_data.location_name is not None:
        event.location_name = event_data.location_name

    if event_data.start_time is not None:
        event.start_time = event_data.start_time

    if event_data.end_time is not None:
        event.end_time = event_data.end_time

    # Validate dates after updates
    if (
        event.end_time is not None
        and event.end_time <= event.start_time
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="End time must be after start time",
        )

    # Update location
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

    db.commit()
    db.refresh(event)

    return event


# -------------------------
# Delete Event
# -------------------------

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


# -------------------------
# Create RSVP
# -------------------------

def create_rsvp(
    db: Session,
    event_id: int,
    user_id: int,
) -> EventRSVP:

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

    if event.status != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot RSVP to an inactive event",
        )

    existing = (
        db.query(EventRSVP)
        .filter(
            EventRSVP.event_id == event_id,
            EventRSVP.user_id == user_id,
        )
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You have already RSVP'd to this event",
        )

    rsvp = EventRSVP(
        event_id=event_id,
        user_id=user_id,
    )

    db.add(rsvp)
    db.commit()
    db.refresh(rsvp)

    # Automatic notification
    if event.user_id != user_id:
        create_notification(
            db=db,
            user_id=event.user_id,
            notification_type="EVENT_RSVP",
            title="New RSVP for your event",
            message=f"Someone joined your event: {event.title}",
        )

    return rsvp


# -------------------------
# Delete RSVP
# -------------------------

def delete_rsvp(
    db: Session,
    event_id: int,
    user_id: int,
) -> None:

    rsvp = (
        db.query(EventRSVP)
        .filter(
            EventRSVP.event_id == event_id,
            EventRSVP.user_id == user_id,
        )
        .first()
    )

    if not rsvp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="RSVP not found",
        )

    db.delete(rsvp)
    db.commit()


# -------------------------
# Get Event Attendees
# -------------------------

def get_event_attendees(
    db: Session,
    event_id: int,
):

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

    attendees = (
        db.query(EventRSVP)
        .filter(EventRSVP.event_id == event_id)
        .order_by(EventRSVP.created_at.asc())
        .all()
    )

    return attendees