"""create user neighborhood memberships

Revision ID: eafb366b9f00
Revises: 842bfdbc255d
Create Date: 2026-09-04 20:22:56.871513
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "eafb366b9f00"
down_revision: Union[str, Sequence[str], None] = "842bfdbc255d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""

    op.create_table(
        "user_neighborhoods",
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
            "neighborhood_id",
            sa.Integer(),
            nullable=False,
        ),
        sa.Column(
            "is_primary",
            sa.Boolean(),
            nullable=False,
        ),
        sa.Column(
            "joined_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["neighborhood_id"],
            ["neighborhoods.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "user_id",
            "neighborhood_id",
            name="uq_user_neighborhood",
        ),
    )

    op.create_index(
        op.f("ix_user_neighborhoods_id"),
        "user_neighborhoods",
        ["id"],
        unique=False,
    )

    op.create_index(
        op.f("ix_user_neighborhoods_user_id"),
        "user_neighborhoods",
        ["user_id"],
        unique=False,
    )

    op.create_index(
        op.f("ix_user_neighborhoods_neighborhood_id"),
        "user_neighborhoods",
        ["neighborhood_id"],
        unique=False,
    )


def downgrade() -> None:
    """Downgrade schema."""

    op.drop_index(
        op.f("ix_user_neighborhoods_neighborhood_id"),
        table_name="user_neighborhoods",
    )

    op.drop_index(
        op.f("ix_user_neighborhoods_user_id"),
        table_name="user_neighborhoods",
    )

    op.drop_index(
        op.f("ix_user_neighborhoods_id"),
        table_name="user_neighborhoods",
    )

    op.drop_table("user_neighborhoods")