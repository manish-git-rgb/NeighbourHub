from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ServiceProviderCreate(BaseModel):
    business_name: str = Field(min_length=1, max_length=200)
    description: str | None = None
    category: str = Field(min_length=1, max_length=50)
    phone: str | None = Field(default=None, max_length=20)
    address: str | None = Field(default=None, max_length=300)

    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)

    neighborhood_id: int | None = None


class ServiceProviderUpdate(BaseModel):
    business_name: str | None = Field(
        default=None,
        min_length=1,
        max_length=200,
    )
    description: str | None = None
    category: str | None = Field(
        default=None,
        min_length=1,
        max_length=50,
    )
    phone: str | None = Field(default=None, max_length=20)
    address: str | None = Field(default=None, max_length=300)

    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)

    neighborhood_id: int | None = None


class ServiceProviderResponse(BaseModel):
    id: int
    user_id: int
    neighborhood_id: int | None = None

    business_name: str
    description: str | None = None
    category: str
    phone: str | None = None
    address: str | None = None

    latitude: float | None = None
    longitude: float | None = None

    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class NearbyServiceProviderResponse(ServiceProviderResponse):
    distance_km: float

class ServiceProviderListResponse(BaseModel):
    success: bool
    data: list[ServiceProviderResponse]
    pagination: dict

    model_config = ConfigDict(from_attributes=True)