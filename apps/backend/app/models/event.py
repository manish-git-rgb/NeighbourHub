from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from geoalchemy2 import Geometry
from geoalchemy2.shape import to_shape
from app.db.database import Base


class Event(Base):
    __tablename__ = "events"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
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

    location_name = Column(
        String(200),
        nullable=False,
    )

    location = Column(
        Geometry(
            geometry_type="POINT",
            srid=4326,
            spatial_index=True,
        ),
        nullable=True,
    )

    start_time = Column(
        DateTime(timezone=True),
        nullable=False,
    )

    end_time = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    status = Column(
        String(20),
        nullable=False,
        default="ACTIVE",
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

        return float(to_shape(self.location).y)


    @property
    def longitude(self) -> float | None:
        if self.location is None:
            return None

        return float(to_shape(self.location).x)