from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class IssueReportCreate(BaseModel):
    neighborhood_id: int | None = None

    title: str = Field(
        min_length=1,
        max_length=200,
    )

    description: str = Field(
        min_length=1,
    )

    category: str = Field(
        min_length=1,
        max_length=50,
    )

    latitude: float | None = Field(
        default=None,
        ge=-90,
        le=90,
    )

    longitude: float | None = Field(
        default=None,
        ge=-180,
        le=180,
    )


class IssueReportUpdate(BaseModel):
    neighborhood_id: int | None = None

    title: str | None = Field(
        default=None,
        min_length=1,
        max_length=200,
    )

    description: str | None = Field(
        default=None,
        min_length=1,
    )

    category: str | None = Field(
        default=None,
        min_length=1,
        max_length=50,
    )

    status: str | None = Field(
        default=None,
        max_length=20,
    )

    latitude: float | None = Field(
        default=None,
        ge=-90,
        le=90,
    )

    longitude: float | None = Field(
        default=None,
        ge=-180,
        le=180,
    )


class IssueReportResponse(BaseModel):
    id: int
    user_id: int
    neighborhood_id: int | None = None

    title: str
    description: str
    category: str
    status: str

    latitude: float | None = None
    longitude: float | None = None

    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class NearbyIssueReportResponse(IssueReportResponse):
    distance_km: float


class IssueReportListResponse(BaseModel):
    success: bool
    data: list[IssueReportResponse]
    pagination: dict