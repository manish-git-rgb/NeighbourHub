from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class EventCreate(BaseModel):
    title: str = Field(
        min_length=1,
        max_length=200,
    )

    description: str = Field(
        min_length=1,
    )

    location_name: str = Field(
        min_length=1,
        max_length=200,
    )

    latitude: float = Field(
        ge=-90,
        le=90,
    )

    longitude: float = Field(
        ge=-180,
        le=180,
    )

    start_time: datetime

    end_time: datetime | None = None


class EventUpdate(BaseModel):
    title: str | None = Field(
        default=None,
        min_length=1,
        max_length=200,
    )

    description: str | None = Field(
        default=None,
        min_length=1,
    )

    location_name: str | None = Field(
        default=None,
        min_length=1,
        max_length=200,
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

    start_time: datetime | None = None

    end_time: datetime | None = None


class EventResponse(BaseModel):
    id: int
    user_id: int
    title: str
    description: str
    location_name: str

    latitude: float | None = None
    longitude: float | None = None

    start_time: datetime
    end_time: datetime | None = None
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class NearbyEventResponse(BaseModel):
    id: int
    user_id: int
    title: str
    description: str
    location_name: str

    latitude: float | None = None
    longitude: float | None = None

    start_time: datetime
    end_time: datetime | None = None
    status: str
    distance_km: float

    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class EventListResponse(BaseModel):
    success: bool
    data: list[EventResponse]
    pagination: dict