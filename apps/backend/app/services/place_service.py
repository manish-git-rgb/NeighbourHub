from fastapi import HTTPException, status
from geoalchemy2.shape import from_shape
from shapely.geometry import Point
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.neighborhood import Neighborhood
from app.models.place import Place
from app.schemas.place import PlaceCreate, PlaceUpdate


def _validate_neighborhood(
    db: Session,
    neighborhood_id: int | None,
) -> None:
    if neighborhood_id is None:
        return

    neighborhood = (
        db.query(Neighborhood)
        .filter(Neighborhood.id == neighborhood_id)
        .first()
    )

    if not neighborhood:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Neighborhood not found",
        )


def create_place(
    db: Session,
    user_id: int,
    place_data: PlaceCreate,
) -> Place:
    _validate_neighborhood(
        db,
        place_data.neighborhood_id,
    )

    location = from_shape(
        Point(
            place_data.longitude,
            place_data.latitude,
        ),
        srid=4326,
    )

    place = Place(
        user_id=user_id,
        neighborhood_id=place_data.neighborhood_id,
        name=place_data.name,
        description=place_data.description,
        category=place_data.category,
        address=place_data.address,
        location=location,
    )

    db.add(place)
    db.commit()
    db.refresh(place)

    return place


def get_places(
    db: Session,
    page: int = 1,
    limit: int = 20,
) -> tuple[list[Place], int]:
    offset = (page - 1) * limit

    total = db.query(Place).count()

    places = (
        db.query(Place)
        .order_by(Place.name.asc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    return places, total


def get_place(
    db: Session,
    place_id: int,
) -> Place:
    place = (
        db.query(Place)
        .filter(Place.id == place_id)
        .first()
    )

    if not place:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Place not found",
        )

    return place


def get_nearby_places(
    db: Session,
    latitude: float,
    longitude: float,
    radius_km: float = 5,
    page: int = 1,
    limit: int = 20,
    category: str | None = None,
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
        func.Geography(Place.location),
        func.Geography(user_point),
    )

    query = (
        db.query(
            Place,
            (distance / 1000).label("distance_km"),
        )
        .filter(
            Place.location.isnot(None),
            func.ST_DWithin(
                func.Geography(Place.location),
                func.Geography(user_point),
                radius_meters,
            ),
        )
    )

    if category is not None:
        query = query.filter(
            Place.category == category
        )

    offset = (page - 1) * limit

    return (
        query
        .order_by(
            distance,
            Place.name.asc(),
        )
        .offset(offset)
        .limit(limit)
        .all()
    )


def update_place(
    db: Session,
    place_id: int,
    user_id: int,
    place_data: PlaceUpdate,
) -> Place:
    place = (
        db.query(Place)
        .filter(Place.id == place_id)
        .first()
    )

    if not place:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Place not found",
        )

    if place.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not allowed to update this place",
        )

    if place_data.neighborhood_id is not None:
        _validate_neighborhood(
            db,
            place_data.neighborhood_id,
        )
        place.neighborhood_id = place_data.neighborhood_id

    if place_data.name is not None:
        place.name = place_data.name

    if place_data.description is not None:
        place.description = place_data.description

    if place_data.category is not None:
        place.category = place_data.category

    if place_data.address is not None:
        place.address = place_data.address

    if (
        place_data.latitude is not None
        and place_data.longitude is not None
    ):
        place.location = from_shape(
            Point(
                place_data.longitude,
                place_data.latitude,
            ),
            srid=4326,
        )

    db.commit()
    db.refresh(place)

    return place


def delete_place(
    db: Session,
    place_id: int,
    user_id: int,
) -> None:
    place = (
        db.query(Place)
        .filter(Place.id == place_id)
        .first()
    )

    if not place:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Place not found",
        )

    if place.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not allowed to delete this place",
        )

    db.delete(place)
    db.commit()