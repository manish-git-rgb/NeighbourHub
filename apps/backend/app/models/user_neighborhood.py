from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, func

from app.db.database import Base


class UserNeighborhood(Base):
    __tablename__ = "user_neighborhoods"

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

    neighborhood_id = Column(
        Integer,
        ForeignKey("neighborhoods.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    is_primary = Column(
        Boolean,
        nullable=False,
        default=False,
    )

    joined_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )