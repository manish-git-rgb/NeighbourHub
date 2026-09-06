from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class LostFoundCreate(BaseModel):
    post_id: int = Field(ge=1)

    type: str = Field(
        min_length=3,
        max_length=10,
    )

    item_name: str = Field(
        min_length=1,
        max_length=200,
    )

    description: str | None = None

    last_seen_location: str | None = Field(
        default=None,
        max_length=300,
    )

    contact_info: str | None = Field(
        default=None,
        max_length=300,
    )


class LostFoundUpdate(BaseModel):
    type: str | None = Field(
        default=None,
        min_length=3,
        max_length=10,
    )

    item_name: str | None = Field(
        default=None,
        min_length=1,
        max_length=200,
    )

    description: str | None = None

    last_seen_location: str | None = Field(
        default=None,
        max_length=300,
    )

    contact_info: str | None = Field(
        default=None,
        max_length=300,
    )

    status: str | None = Field(
        default=None,
        max_length=20,
    )


class LostFoundResponse(BaseModel):
    id: int
    post_id: int
    type: str
    item_name: str
    description: str | None = None
    last_seen_location: str | None = None
    contact_info: str | None = None
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class LostFoundListResponse(BaseModel):
    success: bool
    data: list[LostFoundResponse]
    pagination: dict