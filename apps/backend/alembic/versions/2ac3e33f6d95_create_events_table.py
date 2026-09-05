"""create events table

Revision ID: 2ac3e33f6d95
Revises: 0fd034b6a47e
Create Date: 2026-09-05 15:34:55.563413
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import geoalchemy2


# revision identifiers, used by Alembic.
revision: str = "2ac3e33f6d95"
down_revision: Union[str, Sequence[str], None] = "0fd034b6a47e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""

    op.create_table(
        "events",
        sa.Column(
            "id",
            sa.Integer(),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            sa.Integer(),
            nullable=False,
        ),
        sa.Column(
            "title",
            sa.String(length=200),
            nullable=False,
        ),
        sa.Column(
            "description",
            sa.Text(),
            nullable=False,
        ),
        sa.Column(
            "location_name",
            sa.String(length=200),
            nullable=False,
        ),
        sa.Column(
            "location",
            geoalchemy2.types.Geometry(
                geometry_type="POINT",
                srid=4326,
                dimension=2,
                from_text="ST_GeomFromEWKT",
                spatial_index=False,
            ),
            nullable=True,
        ),
        sa.Column(
            "start_time",
            sa.DateTime(timezone=True),
            nullable=False,
        ),
        sa.Column(
            "end_time",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
        sa.Column(
            "status",
            sa.String(length=20),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        "idx_events_location",
        "events",
        ["location"],
        unique=False,
        postgresql_using="gist",
    )

    op.create_index(
        op.f("ix_events_id"),
        "events",
        ["id"],
        unique=False,
    )

    op.create_index(
        op.f("ix_events_user_id"),
        "events",
        ["user_id"],
        unique=False,
    )


def downgrade() -> None:
    """Downgrade schema."""

    op.drop_index(
        op.f("ix_events_user_id"),
        table_name="events",
    )

    op.drop_index(
        op.f("ix_events_id"),
        table_name="events",
    )

    op.drop_index(
        "idx_events_location",
        table_name="events",
        postgresql_using="gist",
    )

    op.drop_table("events")