from sqlalchemy import Column, DateTime, Integer, String, Text, func
from geoalchemy2 import Geometry
from geoalchemy2.shape import to_shape

from app.db.database import Base


class Neighborhood(Base):
    __tablename__ = "neighborhoods"

    id = Column(Integer, primary_key=True, index=True)

    name = Column(
        String(100),
        nullable=False,
        unique=True,
        index=True,
    )

    slug = Column(
        String(120),
        nullable=False,
        unique=True,
        index=True,
    )

    description = Column(
        Text,
        nullable=True,
    )

    city = Column(
        String(100),
        nullable=False,
        index=True,
    )

    state = Column(
        String(100),
        nullable=True,
    )

    country = Column(
        String(100),
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