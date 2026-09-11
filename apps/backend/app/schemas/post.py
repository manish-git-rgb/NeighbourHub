from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.core.enums import (
    PostCategory,
    PostVisibility,
)
from app.schemas.common import Pagination


# ---------------------------------
# Create / Update Post
# ---------------------------------

class PostCreate(BaseModel):
    category: PostCategory

    title: str = Field(
        ...,
        min_length=1,
        max_length=200,
    )

    content: str = Field(
        ...,
        min_length=1,
        max_length=5000,
    )

    visibility: PostVisibility = (
        PostVisibility.NEIGHBORHOOD
    )

    latitude: float = Field(
        ...,
        ge=-90,
        le=90,
    )

    longitude: float = Field(
        ...,
        ge=-180,
        le=180,
    )


# ---------------------------------
# Post Response
# ---------------------------------

class PostResponse(BaseModel):
    id: int
    user_id: int
    category: PostCategory
    title: str
    content: str
    visibility: PostVisibility
    status: str
    latitude: float | None = None
    longitude: float | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )


# ---------------------------------
# Post List Response
# ---------------------------------

class PostListResponse(BaseModel):
    success: bool
    data: list[PostResponse]
    pagination: Pagination


# ---------------------------------
# Nearby Post Response
# ---------------------------------

class NearbyPostResponse(BaseModel):
    id: int
    user_id: int
    category: PostCategory
    title: str
    content: str
    visibility: PostVisibility
    status: str
    latitude: float | None = None
    longitude: float | None = None
    distance_km: float
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )