"""create comments table

Revision ID: fb3e23e99099
Revises: e160b551981e
Create Date: 2026-09-07 03:09:49.459907
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "fb3e23e99099"
down_revision: Union[str, Sequence[str], None] = "e160b551981e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""

    op.create_table(
        "comments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("post_id", sa.Integer(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
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
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        op.f("ix_comments_id"),
        "comments",
        ["id"],
        unique=False,
    )

    op.create_index(
        op.f("ix_comments_post_id"),
        "comments",
        ["post_id"],
        unique=False,
    )

    op.create_index(
        op.f("ix_comments_user_id"),
        "comments",
        ["user_id"],
        unique=False,
    )


def downgrade() -> None:
    """Downgrade schema."""

    op.drop_index(
        op.f("ix_comments_user_id"),
        table_name="comments",
    )

    op.drop_index(
        op.f("ix_comments_post_id"),
        table_name="comments",
    )

    op.drop_index(
        op.f("ix_comments_id"),
        table_name="comments",
    )

    op.drop_table("comments")