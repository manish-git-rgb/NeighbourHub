"""create lost found table

Revision ID: 9458621c76c9
Revises: d2c7435c4fc2
Create Date: 2026-09-07 02:04:38.534725
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "9458621c76c9"
down_revision: Union[str, Sequence[str], None] = "d2c7435c4fc2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""

    op.create_table(
        "lost_found",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("post_id", sa.Integer(), nullable=False),
        sa.Column("type", sa.String(length=10), nullable=False),
        sa.Column("item_name", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "last_seen_location",
            sa.String(length=300),
            nullable=True,
        ),
        sa.Column(
            "contact_info",
            sa.String(length=300),
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
            ["post_id"],
            ["posts.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        op.f("ix_lost_found_id"),
        "lost_found",
        ["id"],
        unique=False,
    )

    op.create_index(
        op.f("ix_lost_found_post_id"),
        "lost_found",
        ["post_id"],
        unique=True,
    )


def downgrade() -> None:
    """Downgrade schema."""

    op.drop_index(
        op.f("ix_lost_found_post_id"),
        table_name="lost_found",
    )

    op.drop_index(
        op.f("ix_lost_found_id"),
        table_name="lost_found",
    )

    op.drop_table("lost_found")