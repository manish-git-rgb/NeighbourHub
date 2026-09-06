from fastapi import HTTPException, status
from geoalchemy2.shape import from_shape
from shapely.geometry import Point
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.issue_report import IssueReport
from app.models.neighborhood import Neighborhood
from app.schemas.issue_report import (
    IssueReportCreate,
    IssueReportUpdate,
)


VALID_STATUSES = {
    "OPEN",
    "IN_PROGRESS",
    "RESOLVED",
    "REJECTED",
}


def _validate_neighborhood(
    db: Session,
    neighborhood_id: int | None,
) -> None:
    if neighborhood_id is None:
        return

    neighborhood = (
        db.query(Neighborhood)
        .filter(Neighborhood.id == neighborhood_id)
        .first()
    )

    if not neighborhood:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Neighborhood not found",
        )


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


def get_issue_reports(
    db: Session,
    page: int = 1,
    limit: int = 20,
    category: str | None = None,
    issue_status: str | None = None,
):
    offset = (page - 1) * limit

    query = db.query(IssueReport)

    if category is not None:
        query = query.filter(
            IssueReport.category == category
        )

    if issue_status is not None:
        query = query.filter(
            IssueReport.status == _validate_status(
                issue_status
            )
        )

    total = query.count()

    issues = (
        query
        .order_by(IssueReport.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    return issues, total


def get_issue_report(
    db: Session,
    issue_id: int,
) -> IssueReport:

    issue_report = (
        db.query(IssueReport)
        .filter(IssueReport.id == issue_id)
        .first()
    )

    if not issue_report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Issue report not found",
        )

    return issue_report


def get_nearby_issue_reports(
    db: Session,
    latitude: float,
    longitude: float,
    radius_km: float = 5,
    page: int = 1,
    limit: int = 20,
    category: str | None = None,
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

    if category is not None:
        query = query.filter(
            IssueReport.category == category
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


def update_issue_report(
    db: Session,
    issue_id: int,
    user_id: int,
    issue_data: IssueReportUpdate,
) -> IssueReport:

    issue_report = get_issue_report(
        db,
        issue_id,
    )

    if issue_report.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not allowed to update this issue report",
        )

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
        issue_report.description = issue_data.description

    if issue_data.category is not None:
        issue_report.category = issue_data.category

    if issue_data.status is not None:
        issue_report.status = _validate_status(
            issue_data.status
        )

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

    return issue_report


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
            detail="You are not allowed to delete this issue report",
        )

    db.delete(issue_report)
    db.commit()