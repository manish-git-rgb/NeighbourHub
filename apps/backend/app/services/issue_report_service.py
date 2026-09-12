from fastapi import HTTPException, status
from geoalchemy2.shape import from_shape
from shapely.geometry import Point
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.models.issue_report import IssueReport
from app.models.neighborhood import Neighborhood
from app.models.user import User
from app.schemas.issue_report import (
    IssueReportCreate,
    IssueReportUpdate,
)
from app.services.notification_service import create_notification


VALID_STATUSES = {
    "OPEN",
    "IN_PROGRESS",
    "RESOLVED",
    "REJECTED",
}

STAFF_ROLES = {
    "ADMIN",
    "MODERATOR",
}


# ---------------------------------
# Validate Neighborhood
# ---------------------------------

def _validate_neighborhood(
    db: Session,
    neighborhood_id: int | None,
) -> None:

    if neighborhood_id is None:
        return

    neighborhood = (
        db.query(Neighborhood)
        .filter(
            Neighborhood.id == neighborhood_id
        )
        .first()
    )

    if not neighborhood:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Neighborhood not found",
        )


# ---------------------------------
# Validate Status
# ---------------------------------

def _validate_status(value: str) -> str:
    value = value.upper()

    if value not in VALID_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "status must be OPEN, IN_PROGRESS, "
                "RESOLVED, or REJECTED"
            ),
        )

    return value


# ---------------------------------
# Create Issue Report
# ---------------------------------

def create_issue_report(
    db: Session,
    user_id: int,
    issue_data: IssueReportCreate,
) -> IssueReport:

    _validate_neighborhood(
        db,
        issue_data.neighborhood_id,
    )

    location = None

    if (
        issue_data.latitude is not None
        and issue_data.longitude is not None
    ):
        location = from_shape(
            Point(
                issue_data.longitude,
                issue_data.latitude,
            ),
            srid=4326,
        )

    issue_report = IssueReport(
        user_id=user_id,
        neighborhood_id=issue_data.neighborhood_id,
        title=issue_data.title,
        description=issue_data.description,
        category=issue_data.category,
        status="OPEN",
        location=location,
    )

    db.add(issue_report)
    db.commit()
    db.refresh(issue_report)

    return issue_report


# ---------------------------------
# List / Search / Filter Issues
# ---------------------------------

def get_issue_reports(
    db: Session,
    page: int = 1,
    limit: int = 20,
    category: str | None = None,
    issue_status: str | None = None,
    keyword: str | None = None,
    neighborhood_id: int | None = None,
):
    offset = (page - 1) * limit

    query = db.query(IssueReport)

    # Category filter
    if category is not None:
        query = query.filter(
            IssueReport.category == category
        )

    # Status filter
    if issue_status is not None:
        query = query.filter(
            IssueReport.status
            == _validate_status(issue_status)
        )

    # Neighborhood filter
    if neighborhood_id is not None:
        query = query.filter(
            IssueReport.neighborhood_id
            == neighborhood_id
        )

    # Keyword search
    if keyword is not None:
        keyword = keyword.strip()

        if keyword:
            search_pattern = f"%{keyword}%"

            query = query.filter(
                or_(
                    IssueReport.title.ilike(
                        search_pattern
                    ),
                    IssueReport.description.ilike(
                        search_pattern
                    ),
                    IssueReport.category.ilike(
                        search_pattern
                    ),
                )
            )

    total = query.count()

    issues = (
        query
        .order_by(
            IssueReport.created_at.desc()
        )
        .offset(offset)
        .limit(limit)
        .all()
    )

    return issues, total


# ---------------------------------
# Get Single Issue Report
# ---------------------------------

def get_issue_report(
    db: Session,
    issue_id: int,
) -> IssueReport:

    issue_report = (
        db.query(IssueReport)
        .filter(
            IssueReport.id == issue_id
        )
        .first()
    )

    if not issue_report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Issue report not found",
        )

    return issue_report


# ---------------------------------
# Nearby Issue Reports
# ---------------------------------

def get_nearby_issue_reports(
    db: Session,
    latitude: float,
    longitude: float,
    radius_km: float = 5,
    page: int = 1,
    limit: int = 20,
    category: str | None = None,
    issue_status: str | None = None,
    keyword: str | None = None,
    neighborhood_id: int | None = None,
):
    user_point = func.ST_SetSRID(
        func.ST_MakePoint(
            longitude,
            latitude,
        ),
        4326,
    )

    radius_meters = radius_km * 1000

    distance = func.ST_Distance(
        func.Geography(IssueReport.location),
        func.Geography(user_point),
    )

    query = (
        db.query(
            IssueReport,
            (distance / 1000).label("distance_km"),
        )
        .filter(
            IssueReport.location.isnot(None),
            func.ST_DWithin(
                func.Geography(IssueReport.location),
                func.Geography(user_point),
                radius_meters,
            ),
        )
    )

    # Category filter
    if category is not None:
        query = query.filter(
            IssueReport.category == category
        )

    # Status filter
    if issue_status is not None:
        query = query.filter(
            IssueReport.status
            == _validate_status(issue_status)
        )

    # Neighborhood filter
    if neighborhood_id is not None:
        query = query.filter(
            IssueReport.neighborhood_id
            == neighborhood_id
        )

    # Keyword search
    if keyword is not None:
        keyword = keyword.strip()

        if keyword:
            search_pattern = f"%{keyword}%"

            query = query.filter(
                or_(
                    IssueReport.title.ilike(
                        search_pattern
                    ),
                    IssueReport.description.ilike(
                        search_pattern
                    ),
                    IssueReport.category.ilike(
                        search_pattern
                    ),
                )
            )

    offset = (page - 1) * limit

    return (
        query
        .order_by(
            distance,
            IssueReport.created_at.desc(),
        )
        .offset(offset)
        .limit(limit)
        .all()
    )


# ---------------------------------
# Update Issue Report
# ---------------------------------

def update_issue_report(
    db: Session,
    issue_id: int,
    current_user: User,
    issue_data: IssueReportUpdate,
) -> IssueReport:

    issue_report = get_issue_report(
        db,
        issue_id,
    )

    is_owner = issue_report.user_id == current_user.id
    is_staff = current_user.role in STAFF_ROLES

    # ---------------------------------
    # Permission checks
    # ---------------------------------

    # Non-owner users cannot modify issue details.
    if not is_owner and not is_staff:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "You are not allowed to update "
                "this issue report"
            ),
        )

    # A staff member who is not the owner may only
    # change the status.
    if not is_owner and is_staff:
        has_non_status_update = any(
            value is not None
            for value in [
                issue_data.neighborhood_id,
                issue_data.title,
                issue_data.description,
                issue_data.category,
                issue_data.latitude,
                issue_data.longitude,
            ]
        )

        if has_non_status_update:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    "Admins and moderators can only "
                    "change the issue status"
                ),
            )

        if issue_data.status is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No update fields provided",
            )

    # ---------------------------------
    # Remember old status
    # ---------------------------------

    old_status = issue_report.status

    # ---------------------------------
    # Update details
    # ---------------------------------

    if issue_data.neighborhood_id is not None:
        _validate_neighborhood(
            db,
            issue_data.neighborhood_id,
        )

        issue_report.neighborhood_id = (
            issue_data.neighborhood_id
        )

    if issue_data.title is not None:
        issue_report.title = issue_data.title

    if issue_data.description is not None:
        issue_report.description = (
            issue_data.description
        )

    if issue_data.category is not None:
        issue_report.category = (
            issue_data.category
        )

    # ---------------------------------
    # Update status
    # ---------------------------------

    if issue_data.status is not None:
        new_status = _validate_status(
            issue_data.status
        )

        # Only staff or the owner can submit a status
        # change. For production behavior, status changes
        # should normally be done by staff.
        if not is_owner and not is_staff:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not allowed to change issue status",
            )

        issue_report.status = new_status

    # ---------------------------------
    # Update location
    # ---------------------------------

    if (
        issue_data.latitude is not None
        and issue_data.longitude is not None
    ):
        issue_report.location = from_shape(
            Point(
                issue_data.longitude,
                issue_data.latitude,
            ),
            srid=4326,
        )

    db.commit()
    db.refresh(issue_report)

    # ---------------------------------
    # Automatic status notification
    # ---------------------------------

    if (
        issue_data.status is not None
        and old_status != issue_report.status
    ):
        create_notification(
            db=db,
            user_id=issue_report.user_id,
            notification_type="ISSUE_STATUS",
            title="Issue report status updated",
            message=(
                f'Your issue report "{issue_report.title}" '
                f'is now {issue_report.status}.'
            ),
        )

    return issue_report


# ---------------------------------
# Delete Issue Report
# ---------------------------------

def delete_issue_report(
    db: Session,
    issue_id: int,
    user_id: int,
) -> None:

    issue_report = get_issue_report(
        db,
        issue_id,
    )

    if issue_report.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "You are not allowed to delete "
                "this issue report"
            ),
        )

    db.delete(issue_report)
    db.commit()