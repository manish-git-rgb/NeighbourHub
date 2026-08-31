from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr

class UserCreate(BaseModel):
    name: str
    username: str
    email: EmailStr 
    password: str


class UserResponse(BaseModel):
    id: int
    name: str
    username: str
    email: EmailStr 
    profile_image: str | None = None
    bio: str | None = None
    role: str 
    created_at: datetime
    updated_at: datetime

    model_config  = ConfigDict(from_attributes=True)