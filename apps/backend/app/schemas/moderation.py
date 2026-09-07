from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ModerationCreate(BaseModel):
    post_id: int | None = Field(default=None, ge=1)
    comment_id: int | None = Field(default=None, ge=1)

    reason: str = Field(
        min_length=1,
        max_length=100,
    )

    description: str | None = None


class ModerationUpdate(BaseModel):
    status: str = Field(
        min_length=1,
        max_length=20,
    )


class ModerationResponse(BaseModel):
    id: int
    reporter_id: int
    post_id: int | None = None
    comment_id: int | None = None
    reason: str
    description: str | None = None
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ModerationListResponse(BaseModel):
    success: bool
    data: list[ModerationResponse]
    pagination: dict