from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Integer,
    UniqueConstraint,
    func,
)

from app.db.database import Base


class EventRSVP(Base):
    __tablename__ = "event_rsvps"

    __table_args__ = (
        UniqueConstraint(
            "event_id",
            "user_id",
            name="uq_event_rsvp",
        ),
    )

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    event_id = Column(
        Integer,
        ForeignKey("events.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )