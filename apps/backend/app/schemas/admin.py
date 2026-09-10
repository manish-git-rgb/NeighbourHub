from pydantic import BaseModel, Field


# -------------------------
# Admin User Response
# -------------------------

class AdminUserResponse(BaseModel):
    id: int
    name: str
    username: str
    email: str
    profile_image: str | None = None
    bio: str | None = None
    role: str


# -------------------------
# Admin User List Response
# -------------------------

class AdminUserListResponse(BaseModel):
    success: bool
    data: list[AdminUserResponse]
    pagination: dict


# -------------------------
# Update User Role
# -------------------------

class AdminRoleUpdate(BaseModel):
    role: str = Field(
        ...,
        description="USER, MODERATOR, or ADMIN",
    )


# -------------------------
# Role Update Response
# -------------------------

class AdminRoleUpdateResponse(BaseModel):
    success: bool
    message: str
    data: AdminUserResponse