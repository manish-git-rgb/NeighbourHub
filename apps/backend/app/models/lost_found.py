from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, func

from app.db.database import Base


class LostFound(Base):
    __tablename__ = "lost_found"

    id = Column(Integer, primary_key=True, index=True)

    post_id = Column(
        Integer,
        ForeignKey("posts.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )

    type = Column(
        String(10),
        nullable=False,
    )

    item_name = Column(
        String(200),
        nullable=False,
    )

    description = Column(
        Text,
        nullable=True,
    )

    last_seen_location = Column(
        String(300),
        nullable=True,
    )

    contact_info = Column(
        String(300),
        nullable=True,
    )

    status = Column(
        String(20),
        nullable=False,
        default="OPEN",
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