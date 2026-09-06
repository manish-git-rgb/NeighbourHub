from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class PlaceCreate(BaseModel):
    name: str = Field(
        min_length=1,
        max_length=200,
    )

    description: str | None = Field(
        default=None,
    )

    category: str = Field(
        min_length=1,
        max_length=50,
    )

    address: str | None = Field(
        default=None,
        max_length=300,
    )

    latitude: float = Field(
        ge=-90,
        le=90,
    )

    longitude: float = Field(
        ge=-180,
        le=180,
    )

    neighborhood_id: int | None = None


class PlaceUpdate(BaseModel):
    name: str | None = Field(
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

    address: str | None = Field(
        default=None,
        max_length=300,
    )

    latitude: float | None = Field(
        default=None,
        ge=-90,
        le=90,
    )

    longitude: float | None = Field(
        default=None,
        ge=-180,
        le=180,
    )

    neighborhood_id: int | None = None


class PlaceResponse(BaseModel):
    id: int
    user_id: int
    neighborhood_id: int | None = None
    name: str
    description: str | None = None
    category: str
    address: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class NearbyPlaceResponse(BaseModel):
    id: int
    user_id: int
    neighborhood_id: int | None = None
    name: str
    description: str | None = None
    category: str
    address: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    distance_km: float
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)