from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, func
from geoalchemy2 import Geometry

from app.db.database import Base


class IssueReport(Base):
    __tablename__ = "issue_reports"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    neighborhood_id = Column(
        Integer,
        ForeignKey("neighborhoods.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    title = Column(
        String(200),
        nullable=False,
    )

    description = Column(
        Text,
        nullable=False,
    )

    category = Column(
        String(50),
        nullable=False,
        index=True,
    )

    status = Column(
        String(20),
        nullable=False,
        default="OPEN",
    )

    location = Column(
        Geometry(
            geometry_type="POINT",
            srid=4326,
            spatial_index=True,
        ),
        nullable=True,
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    @property
    def latitude(self) -> float | None:
        if self.location is None:
            return None

        from geoalchemy2.shape import to_shape

        return float(to_shape(self.location).y)

    @property
    def longitude(self) -> float | None:
        if self.location is None:
            return None

        from geoalchemy2.shape import to_shape

        return float(to_shape(self.location).x)
    