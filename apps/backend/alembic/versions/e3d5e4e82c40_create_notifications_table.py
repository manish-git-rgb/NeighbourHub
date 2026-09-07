"""create notifications table

Revision ID: e3d5e4e82c40
Revises: a14c6e90d0bc
Create Date: 2026-09-07 14:04:06.256010
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "e3d5e4e82c40"
down_revision: Union[str, Sequence[str], None] = "a14c6e90d0bc"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""

    op.create_table(
        "notifications",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("type", sa.String(length=50), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("is_read", sa.Boolean(), nullable=False),
        sa.Column(
            "created_at",
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
        op.f("ix_notifications_id"),
        "notifications",
        ["id"],
        unique=False,
    )

    op.create_index(
        op.f("ix_notifications_user_id"),
        "notifications",
        ["user_id"],
        unique=False,
    )


def downgrade() -> None:
    """Downgrade schema."""

    op.drop_index(
        op.f("ix_notifications_user_id"),
        table_name="notifications",
    )

    op.drop_index(
        op.f("ix_notifications_id"),
        table_name="notifications",
    )

    op.drop_table("notifications")