"""create reactions table

Revision ID: 6f80e41804f1
Revises: fb3e23e99099
Create Date: 2026-09-07 03:17:54.272597
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "6f80e41804f1"
down_revision: Union[str, Sequence[str], None] = "fb3e23e99099"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""

    op.create_table(
        "reactions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("post_id", sa.Integer(), nullable=False),
        sa.Column(
            "reaction_type",
            sa.String(length=20),
            nullable=False,
        ),
        sa.Column(
            "created_at",
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
        sa.UniqueConstraint(
            "user_id",
            "post_id",
            name="uq_reaction_user_post",
        ),
    )

    op.create_index(
        op.f("ix_reactions_id"),
        "reactions",
        ["id"],
        unique=False,
    )

    op.create_index(
        op.f("ix_reactions_post_id"),
        "reactions",
        ["post_id"],
        unique=False,
    )

    op.create_index(
        op.f("ix_reactions_user_id"),
        "reactions",
        ["user_id"],
        unique=False,
    )


def downgrade() -> None:
    """Downgrade schema."""

    op.drop_index(
        op.f("ix_reactions_user_id"),
        table_name="reactions",
    )

    op.drop_index(
        op.f("ix_reactions_post_id"),
        table_name="reactions",
    )

    op.drop_index(
        op.f("ix_reactions_id"),
        table_name="reactions",
    )

    op.drop_table("reactions")