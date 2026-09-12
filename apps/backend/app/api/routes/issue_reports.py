from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.database import get_db
from app.models.user import User 
from app.schemas.issue_report import (
    IssueReportCreate,
    IssueReportListResponse,
    IssueReportResponse,
    IssueReportUpdate,
    NearbyIssueReportResponse,
)
from app.services.issue_report_service import ( 
    create_issue_report,
    delete_issue_report,
    get_issue_report,
    get_issue_reports,
    get_nearby_issue_reports,
    update_issue_report,
)


router = APIRouter(
    prefix="/issues",
    tags=["Issue Reports"],
)


# ---------------------------------
# Create Issue Report
# ---------------------------------

@router.post(
    "/",
    response_model=IssueReportResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_new_issue_report(
    issue_data: IssueReportCreate,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):
    return create_issue_report(
        db=db,
        user_id=current_user.id,
        issue_data=issue_data,
    )


# ---------------------------------
# List / Search / Filter Issues
# ---------------------------------

@router.get(
    "/",
    response_model=IssueReportListResponse,
)
def list_issue_reports(
    page: int = Query(
        1,
        ge=1,
    ),
    limit: int = Query(
        20,
        ge=1,
        le=100,
    ),
    category: str | None = Query(
        None,
        min_length=1,
        max_length=50,
    ),
    issue_status: str | None = Query(
        None,
        min_length=1,
        max_length=20,
        alias="status",
    ),
    keyword: str | None = Query(
        None,
        min_length=1,
        max_length=100,
    ),
    neighborhood_id: int | None = Query(
        None,
        ge=1,
    ),
    db: Session = Depends(get_db),
):
    issues, total = get_issue_reports(
        db=db,
        page=page,
        limit=limit,
        category=category,
        issue_status=issue_status,
        keyword=keyword,
        neighborhood_id=neighborhood_id,
    )

    return {
        "success": True,
        "data": issues,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
        },
    }


# ---------------------------------
# Nearby Issue Reports
# ---------------------------------

@router.get(
    "/nearby",
    response_model=list[NearbyIssueReportResponse],
)
def nearby_issue_reports(
    latitude: float = Query(
        ...,
        ge=-90,
        le=90,
    ),
    longitude: float = Query(
        ...,
        ge=-180,
        le=180,
    ),
    radius_km: float = Query(
        5,
        gt=0,
        le=100,
    ),
    page: int = Query(
        1,
        ge=1,
    ),
    limit: int = Query(
        20,
        ge=1,
        le=100,
    ),
    category: str | None = Query(
        None,
        min_length=1,
        max_length=50,
    ),
    issue_status: str | None = Query(
        None,
        min_length=1,
        max_length=20,
        alias="status",
    ),
    keyword: str | None = Query(
        None,
        min_length=1,
        max_length=100,
    ),
    neighborhood_id: int | None = Query(
        None,
        ge=1,
    ),
    db: Session = Depends(get_db),
):
    results = get_nearby_issue_reports(
        db=db,
        latitude=latitude,
        longitude=longitude,
        radius_km=radius_km,
        page=page,
        limit=limit,
        category=category,
        issue_status=issue_status,
        keyword=keyword,
        neighborhood_id=neighborhood_id,
    )

    response = []

    for issue_report, distance_km in results:
        response.append(
            NearbyIssueReportResponse(
                id=issue_report.id,
                user_id=issue_report.user_id,
                neighborhood_id=issue_report.neighborhood_id,
                title=issue_report.title,
                description=issue_report.description,
                category=issue_report.category,
                status=issue_report.status,
                latitude=issue_report.latitude,
                longitude=issue_report.longitude,
                created_at=issue_report.created_at,
                updated_at=issue_report.updated_at,
                distance_km=round(
                    float(distance_km),
                    3,
                ),
            )
        )

    return response


# ---------------------------------
# Get Single Issue Report
# ---------------------------------

@router.get(
    "/{issue_id}",
    response_model=IssueReportResponse,
)
def get_single_issue_report(
    issue_id: int,
    db: Session = Depends(get_db),
):
    return get_issue_report(
        db=db,
        issue_id=issue_id,
    )


# ---------------------------------
# Update Issue Report
# ---------------------------------

@router.patch(
    "/{issue_id}",
    response_model=IssueReportResponse,
)
def update_existing_issue_report(
    issue_id: int,
    issue_data: IssueReportUpdate,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):
    return update_issue_report(
        db=db,
        issue_id=issue_id,
        current_user=current_user,
        issue_data=issue_data,
    )


# ---------------------------------
# Delete Issue Report
# ---------------------------------

@router.delete(
    "/{issue_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_existing_issue_report(
    issue_id: int,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):
    delete_issue_report(
        db=db,
        issue_id=issue_id,
        user_id=current_user.id,
    )

    return None