from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class NotificationCreate(BaseModel):
    user_id: int = Field(ge=1)

    type: str = Field(
        min_length=1,
        max_length=50,
    )

    title: str = Field(
        min_length=1,
        max_length=200,
    )

    message: str = Field(
        min_length=1,
    )


class NotificationResponse(BaseModel):
    id: int
    user_id: int
    type: str
    title: str
    message: str
    is_read: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class NotificationListResponse(BaseModel):
    success: bool
    data: list[NotificationResponse]
    pagination: dict