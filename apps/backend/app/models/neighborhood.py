from sqlalchemy import Column, DateTime, Integer, String, Text, func

from app.db.database import Base


class Neighborhood(Base):
    __tablename__ = "neighborhoods"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

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