from fastapi import HTTPException, status
from geoalchemy2.shape import from_shape
from shapely.geometry import Point
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.models.neighborhood import Neighborhood
from app.models.service_provider import ServiceProvider
from app.schemas.service_provider import (
    ServiceProviderCreate,
    ServiceProviderUpdate,
)


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
        .filter(Neighborhood.id == neighborhood_id)
        .first()
    )

    if not neighborhood:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Neighborhood not found",
        )


# ---------------------------------
# Create Service Provider
# ---------------------------------

def create_service_provider(
    db: Session,
    user_id: int,
    service_data: ServiceProviderCreate,
) -> ServiceProvider:

    _validate_neighborhood(
        db,
        service_data.neighborhood_id,
    )

    location = from_shape(
        Point(
            service_data.longitude,
            service_data.latitude,
        ),
        srid=4326,
    )

    service_provider = ServiceProvider(
        user_id=user_id,
        neighborhood_id=service_data.neighborhood_id,
        business_name=service_data.business_name,
        description=service_data.description,
        category=service_data.category,
        phone=service_data.phone,
        address=service_data.address,
        location=location,
    )

    db.add(service_provider)
    db.commit()
    db.refresh(service_provider)

    return service_provider


# ---------------------------------
# List / Search / Filter Services
# ---------------------------------

def get_service_providers(
    db: Session,
    page: int = 1,
    limit: int = 20,
    keyword: str | None = None,
    category: str | None = None,
    neighborhood_id: int | None = None,
):
    offset = (page - 1) * limit

    query = db.query(ServiceProvider)

    # Keyword search
    if keyword is not None:
        keyword = keyword.strip()

        if keyword:
            search_pattern = f"%{keyword}%"

            query = query.filter(
                or_(
                    ServiceProvider.business_name.ilike(
                        search_pattern
                    ),
                    ServiceProvider.description.ilike(
                        search_pattern
                    ),
                    ServiceProvider.address.ilike(
                        search_pattern
                    ),
                )
            )

    # Category filter
    if category is not None:
        query = query.filter(
            ServiceProvider.category == category
        )

    # Neighborhood filter
    if neighborhood_id is not None:
        query = query.filter(
            ServiceProvider.neighborhood_id == neighborhood_id
        )

    total = query.count()

    service_providers = (
        query
        .order_by(
            ServiceProvider.business_name.asc()
        )
        .offset(offset)
        .limit(limit)
        .all()
    )

    return service_providers, total


# ---------------------------------
# Get Single Service Provider
# ---------------------------------

def get_service_provider(
    db: Session,
    service_id: int,
) -> ServiceProvider:

    service_provider = (
        db.query(ServiceProvider)
        .filter(ServiceProvider.id == service_id)
        .first()
    )

    if not service_provider:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service provider not found",
        )

    return service_provider


# ---------------------------------
# Nearby Service Providers
# ---------------------------------

def get_nearby_service_providers(
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
        func.Geography(ServiceProvider.location),
        func.Geography(user_point),
    )

    query = (
        db.query(
            ServiceProvider,
            (distance / 1000).label("distance_km"),
        )
        .filter(
            ServiceProvider.location.isnot(None),
            func.ST_DWithin(
                func.Geography(ServiceProvider.location),
                func.Geography(user_point),
                radius_meters,
            ),
        )
    )

    # Category filter
    if category is not None:
        query = query.filter(
            ServiceProvider.category == category
        )

    # Keyword search
    if keyword is not None:
        keyword = keyword.strip()

        if keyword:
            search_pattern = f"%{keyword}%"

            query = query.filter(
                or_(
                    ServiceProvider.business_name.ilike(
                        search_pattern
                    ),
                    ServiceProvider.description.ilike(
                        search_pattern
                    ),
                    ServiceProvider.address.ilike(
                        search_pattern
                    ),
                )
            )

    # Neighborhood filter
    if neighborhood_id is not None:
        query = query.filter(
            ServiceProvider.neighborhood_id == neighborhood_id
        )

    offset = (page - 1) * limit

    return (
        query
        .order_by(
            distance,
            ServiceProvider.business_name.asc(),
        )
        .offset(offset)
        .limit(limit)
        .all()
    )


# ---------------------------------
# Update Service Provider
# ---------------------------------

def update_service_provider(
    db: Session,
    service_id: int,
    user_id: int,
    service_data: ServiceProviderUpdate,
) -> ServiceProvider:

    service_provider = (
        db.query(ServiceProvider)
        .filter(ServiceProvider.id == service_id)
        .first()
    )

    if not service_provider:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service provider not found",
        )

    if service_provider.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not allowed to update this service provider",
        )

    if service_data.neighborhood_id is not None:
        _validate_neighborhood(
            db,
            service_data.neighborhood_id,
        )

        service_provider.neighborhood_id = (
            service_data.neighborhood_id
        )

    if service_data.business_name is not None:
        service_provider.business_name = (
            service_data.business_name
        )

    if service_data.description is not None:
        service_provider.description = (
            service_data.description
        )

    if service_data.category is not None:
        service_provider.category = service_data.category

    if service_data.phone is not None:
        service_provider.phone = service_data.phone

    if service_data.address is not None:
        service_provider.address = service_data.address

    if (
        service_data.latitude is not None
        and service_data.longitude is not None
    ):
        service_provider.location = from_shape(
            Point(
                service_data.longitude,
                service_data.latitude,
            ),
            srid=4326,
        )

    db.commit()
    db.refresh(service_provider)

    return service_provider


# ---------------------------------
# Delete Service Provider
# ---------------------------------

def delete_service_provider(
    db: Session,
    service_id: int,
    user_id: int,
) -> None:

    service_provider = (
        db.query(ServiceProvider)
        .filter(ServiceProvider.id == service_id)
        .first()
    )

    if not service_provider:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service provider not found",
        )

    if service_provider.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not allowed to delete this service provider",
        )

    db.delete(service_provider)
    db.commit()