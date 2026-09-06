"""add event neighborhood

Revision ID: a23361e760aa
Revises: d0e317d5d87c
Create Date: 2026-09-06 12:49:24.369517
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "a23361e760aa"
down_revision: Union[str, Sequence[str], None] = "d0e317d5d87c"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""

    op.add_column(
        "events",
        sa.Column(
            "neighborhood_id",
            sa.Integer(),
            nullable=True,
        ),
    )

    op.create_index(
        op.f("ix_events_neighborhood_id"),
        "events",
        ["neighborhood_id"],
        unique=False,
    )

    op.create_foreign_key(
        "fk_events_neighborhood_id_neighborhoods",
        "events",
        "neighborhoods",
        ["neighborhood_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    """Downgrade schema."""

    op.drop_constraint(
        "fk_events_neighborhood_id_neighborhoods",
        "events",
        type_="foreignkey",
    )

    op.drop_index(
        op.f("ix_events_neighborhood_id"),
        table_name="events",
    )

    op.drop_column(
        "events",
        "neighborhood_id",
    )