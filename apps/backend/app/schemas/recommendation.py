from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class RecommendationCreate(BaseModel):
    place_id: int
    content: str | None = None
    rating: int | None = Field(default=None, ge=1, le=5)


class RecommendationUpdate(BaseModel):
    content: str | None = None
    rating: int | None = Field(default=None, ge=1, le=5)


class RecommendationResponse(BaseModel):
    id: int
    user_id: int
    place_id: int
    content: str | None = None
    rating: int | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RecommendationListResponse(BaseModel):
    success: bool
    data: list[RecommendationResponse]
    pagination: dict