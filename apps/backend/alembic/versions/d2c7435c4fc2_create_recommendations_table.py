"""create recommendations table

Revision ID: d2c7435c4fc2
Revises: 69fc6b6a1111
Create Date: 2026-09-06 19:43:40.980807
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d2c7435c4fc2"
down_revision: Union[str, Sequence[str], None] = "69fc6b6a1111"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""

    op.create_table(
        "recommendations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("place_id", sa.Integer(), nullable=False),
        sa.Column("content", sa.Text(), nullable=True),
        sa.Column("rating", sa.Integer(), nullable=True),
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
            ["place_id"],
            ["places.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        op.f("ix_recommendations_id"),
        "recommendations",
        ["id"],
        unique=False,
    )

    op.create_index(
        op.f("ix_recommendations_place_id"),
        "recommendations",
        ["place_id"],
        unique=False,
    )

    op.create_index(
        op.f("ix_recommendations_user_id"),
        "recommendations",
        ["user_id"],
        unique=False,
    )


def downgrade() -> None:
    """Downgrade schema."""

    op.drop_index(
        op.f("ix_recommendations_user_id"),
        table_name="recommendations",
    )

    op.drop_index(
        op.f("ix_recommendations_place_id"),
        table_name="recommendations",
    )

    op.drop_index(
        op.f("ix_recommendations_id"),
        table_name="recommendations",
    )

    op.drop_table("recommendations")