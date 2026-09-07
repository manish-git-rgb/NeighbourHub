from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ReactionCreate(BaseModel):
    post_id: int = Field(ge=1)

    reaction_type: str = Field(
        min_length=1,
        max_length=20,
    )


class ReactionResponse(BaseModel):
    id: int
    user_id: int
    post_id: int
    reaction_type: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ReactionListResponse(BaseModel):
    success: bool
    data: list[ReactionResponse]
    pagination: dict