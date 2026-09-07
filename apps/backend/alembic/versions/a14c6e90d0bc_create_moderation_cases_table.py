"""create moderation cases table

Revision ID: a14c6e90d0bc
Revises: 6f80e41804f1
Create Date: 2026-09-07 13:48:04.302218
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a14c6e90d0bc"
down_revision: Union[str, Sequence[str], None] = "6f80e41804f1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""

    op.create_table(
        "moderation_cases",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("reporter_id", sa.Integer(), nullable=False),
        sa.Column("post_id", sa.Integer(), nullable=True),
        sa.Column("comment_id", sa.Integer(), nullable=True),
        sa.Column("reason", sa.String(length=100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False),
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
            ["comment_id"],
            ["comments.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["post_id"],
            ["posts.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["reporter_id"],
            ["users.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        op.f("ix_moderation_cases_comment_id"),
        "moderation_cases",
        ["comment_id"],
        unique=False,
    )

    op.create_index(
        op.f("ix_moderation_cases_id"),
        "moderation_cases",
        ["id"],
        unique=False,
    )

    op.create_index(
        op.f("ix_moderation_cases_post_id"),
        "moderation_cases",
        ["post_id"],
        unique=False,
    )

    op.create_index(
        op.f("ix_moderation_cases_reporter_id"),
        "moderation_cases",
        ["reporter_id"],
        unique=False,
    )


def downgrade() -> None:
    """Downgrade schema."""

    op.drop_index(
        op.f("ix_moderation_cases_reporter_id"),
        table_name="moderation_cases",
    )

    op.drop_index(
        op.f("ix_moderation_cases_post_id"),
        table_name="moderation_cases",
    )

    op.drop_index(
        op.f("ix_moderation_cases_id"),
        table_name="moderation_cases",
    )

    op.drop_index(
        op.f("ix_moderation_cases_comment_id"),
        table_name="moderation_cases",
    )

    op.drop_table("moderation_cases")