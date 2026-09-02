from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.schemas.common import Pagination


class PostCreate(BaseModel):
    category: str
    title: str
    content: str
    visibility: str = "NEIGHBORHOOD"


class PostResponse(BaseModel):
    id: int
    user_id: int
    category: str
    title: str
    content: str
    visibility: str
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PostListResponse(BaseModel):
    success: bool
    data: list[PostResponse]
    pagination: Pagination