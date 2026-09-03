from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.core.enums import PostCategory, PostVisibility
from app.schemas.common import Pagination


class PostCreate(BaseModel):
    category: PostCategory
    title: str
    content: str
    visibility: PostVisibility = PostVisibility.NEIGHBORHOOD


class PostResponse(BaseModel):
    id: int
    user_id: int
    category: PostCategory
    title: str
    content: str
    visibility: PostVisibility
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PostListResponse(BaseModel):
    success: bool
    data: list[PostResponse]
    pagination: Pagination