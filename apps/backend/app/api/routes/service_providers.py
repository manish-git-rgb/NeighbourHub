from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.database import get_db
from app.models.user import User

from app.schemas.service_provider import (
    NearbyServiceProviderResponse,
    ServiceProviderCreate,
    ServiceProviderListResponse,
    ServiceProviderResponse,
    ServiceProviderUpdate,
)

from app.services.service_provider_service import (
    create_service_provider,
    delete_service_provider,
    get_nearby_service_providers,
    get_service_provider,
    get_service_providers,
    update_service_provider,
)


router = APIRouter(
    prefix="/services",
    tags=["Service Providers"],
)


# ---------------------------------
# Create Service Provider
# ---------------------------------

@router.post(
    "/",
    response_model=ServiceProviderResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_new_service_provider(
    service_data: ServiceProviderCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return create_service_provider(
        db=db,
        user_id=current_user.id,
        service_data=service_data,
    )


# ---------------------------------
# List / Search / Filter Services
# ---------------------------------

@router.get(
    "/",
    response_model=ServiceProviderListResponse,
)
def list_service_providers(
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
    service_providers, total = get_service_providers(
        db=db,
        page=page,
        limit=limit,
        keyword=keyword,
        category=category,
        neighborhood_id=neighborhood_id,
    )

    return {
        "success": True,
        "data": service_providers,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
        },
    }


# ---------------------------------
# Nearby Service Providers
# ---------------------------------

@router.get(
    "/nearby",
    response_model=list[NearbyServiceProviderResponse],
)
def nearby_service_providers(
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
    results = get_nearby_service_providers(
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

    response = []

    for service_provider, distance_km in results:
        response.append(
            NearbyServiceProviderResponse(
                id=service_provider.id,
                user_id=service_provider.user_id,
                neighborhood_id=service_provider.neighborhood_id,
                business_name=service_provider.business_name,
                description=service_provider.description,
                category=service_provider.category,
                phone=service_provider.phone,
                address=service_provider.address,
                latitude=service_provider.latitude,
                longitude=service_provider.longitude,
                distance_km=round(
                    float(distance_km),
                    3,
                ),
                created_at=service_provider.created_at,
                updated_at=service_provider.updated_at,
            )
        )

    return response


# ---------------------------------
# Get Single Service Provider
# ---------------------------------

@router.get(
    "/{service_id}",
    response_model=ServiceProviderResponse,
)
def get_single_service_provider(
    service_id: int,
    db: Session = Depends(get_db),
):
    return get_service_provider(
        db=db,
        service_id=service_id,
    )


# ---------------------------------
# Update Service Provider
# ---------------------------------

@router.patch(
    "/{service_id}",
    response_model=ServiceProviderResponse,
)
def update_existing_service_provider(
    service_id: int,
    service_data: ServiceProviderUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return update_service_provider(
        db=db,
        service_id=service_id,
        user_id=current_user.id,
        service_data=service_data,
    )


# ---------------------------------
# Delete Service Provider
# ---------------------------------

@router.delete(
    "/{service_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_existing_service_provider(
    service_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    delete_service_provider(
        db=db,
        service_id=service_id,
        user_id=current_user.id,
    )

    return None