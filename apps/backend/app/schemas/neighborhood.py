from datetime import datetime

from pydantic import BaseModel, ConfigDict


class NeighborhoodCreate(BaseModel):
    name: str
    slug: str
    description: str | None = None
    city: str
    state: str | None = None
    country: str


class NeighborhoodResponse(BaseModel):
    id: int
    name: str
    slug: str
    description: str | None = None
    city: str
    state: str | None = None
    country: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class NeighborhoodMembershipResponse(BaseModel):
    id: int
    neighborhood_id: int
    is_primary: bool
    joined_at: datetime

    model_config = ConfigDict(from_attributes=True)