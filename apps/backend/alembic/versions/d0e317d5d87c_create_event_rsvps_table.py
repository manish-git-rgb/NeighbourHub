"""create event rsvps table

Revision ID: d0e317d5d87c
Revises: 2ac3e33f6d95
Create Date: 2026-09-06 12:29:37.290279
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "d0e317d5d87c"
down_revision: Union[str, Sequence[str], None] = "2ac3e33f6d95"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""

    op.create_table(
        "event_rsvps",
        sa.Column(
            "id",
            sa.Integer(),
            nullable=False,
        ),
        sa.Column(
            "event_id",
            sa.Integer(),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            sa.Integer(),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["event_id"],
            ["events.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "event_id",
            "user_id",
            name="uq_event_rsvp",
        ),
    )

    op.create_index(
        op.f("ix_event_rsvps_id"),
        "event_rsvps",
        ["id"],
        unique=False,
    )

    op.create_index(
        op.f("ix_event_rsvps_event_id"),
        "event_rsvps",
        ["event_id"],
        unique=False,
    )

    op.create_index(
        op.f("ix_event_rsvps_user_id"),
        "event_rsvps",
        ["user_id"],
        unique=False,
    )


def downgrade() -> None:
    """Downgrade schema."""

    op.drop_index(
        op.f("ix_event_rsvps_user_id"),
        table_name="event_rsvps",
    )

    op.drop_index(
        op.f("ix_event_rsvps_event_id"),
        table_name="event_rsvps",
    )

    op.drop_index(
        op.f("ix_event_rsvps_id"),
        table_name="event_rsvps",
    )

    op.drop_table("event_rsvps")