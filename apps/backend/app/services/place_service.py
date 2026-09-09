from fastapi import HTTPException, status
from geoalchemy2.shape import from_shape
from shapely.geometry import Point
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.models.neighborhood import Neighborhood
from app.models.place import Place
from app.schemas.place import PlaceCreate, PlaceUpdate


# ---------------------------------
# Validate Neighborhood
# ---------------------------------

def _validate_neighborhood(
    db: Session,
    neighborhood_id: int | None,
) -> None:

    if neighborhood_id is None:
        return

    neighborhood = (
        db.query(Neighborhood)
        .filter(
            Neighborhood.id == neighborhood_id
        )
        .first()
    )

    if not neighborhood:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Neighborhood not found",
        )


# ---------------------------------
# Create Place
# ---------------------------------

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


# ---------------------------------
# List / Search / Filter Places
# ---------------------------------

def get_places(
    db: Session,
    page: int = 1,
    limit: int = 20,
    keyword: str | None = None,
    category: str | None = None,
    neighborhood_id: int | None = None,
) -> tuple[list[Place], int]:

    offset = (page - 1) * limit

    query = db.query(Place)

    # Keyword search
    if keyword is not None:
        keyword = keyword.strip()

        if keyword:
            search_pattern = f"%{keyword}%"

            query = query.filter(
                or_(
                    Place.name.ilike(search_pattern),
                    Place.description.ilike(search_pattern),
                    Place.address.ilike(search_pattern),
                )
            )

    # Category filter
    if category is not None:
        query = query.filter(
            Place.category == category
        )

    # Neighborhood filter
    if neighborhood_id is not None:
        query = query.filter(
            Place.neighborhood_id == neighborhood_id
        )

    total = query.count()

    places = (
        query
        .order_by(Place.name.asc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    return places, total


# ---------------------------------
# Get Single Place
# ---------------------------------

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


# ---------------------------------
# Nearby Places
# ---------------------------------

def get_nearby_places(
    db: Session,
    latitude: float,
    longitude: float,
    radius_km: float = 5,
    page: int = 1,
    limit: int = 20,
    category: str | None = None,
    keyword: str | None = None,
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

    # Category filter
    if category is not None:
        query = query.filter(
            Place.category == category
        )

    # Keyword search
    if keyword is not None:
        keyword = keyword.strip()

        if keyword:
            search_pattern = f"%{keyword}%"

            query = query.filter(
                or_(
                    Place.name.ilike(search_pattern),
                    Place.description.ilike(search_pattern),
                    Place.address.ilike(search_pattern),
                )
            )

    # Neighborhood filter
    if neighborhood_id is not None:
        query = query.filter(
            Place.neighborhood_id == neighborhood_id
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


# ---------------------------------
# Update Place
# ---------------------------------

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

        place.neighborhood_id = (
            place_data.neighborhood_id
        )

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


# ---------------------------------
# Delete Place
# ---------------------------------

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