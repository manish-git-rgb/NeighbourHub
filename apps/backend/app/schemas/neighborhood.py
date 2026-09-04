from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class NeighborhoodCreate(BaseModel):
    name: str
    slug: str
    description: str | None = None
    city: str
    state: str | None = None
    country: str

    latitude: float = Field(
        ge=-90,
        le=90,
    )

    longitude: float = Field(
        ge=-180,
        le=180,
    )


class NeighborhoodResponse(BaseModel):
    id: int
    name: str
    slug: str
    description: str | None = None
    city: str
    state: str | None = None
    country: str

    latitude: float | None = None
    longitude: float | None = None

    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class NeighborhoodMembershipResponse(BaseModel):
    id: int
    neighborhood_id: int
    is_primary: bool
    joined_at: datetime

    model_config = ConfigDict(from_attributes=True)