"""add post enums

Revision ID: 27a48ca54d30
Revises: 973dc2a05f40
Create Date: 2026-09-03 14:11:04.614596
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "27a48ca54d30"
down_revision: Union[str, Sequence[str], None] = "973dc2a05f40"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""

    post_category = sa.Enum(
        "DISCUSSION",
        "RECOMMENDATION",
        "EVENT",
        "SERVICE",
        "LOST_FOUND",
        "ISSUE",
        "ALERT",
        name="post_category",
    )

    post_visibility = sa.Enum(
        "PUBLIC",
        "NEIGHBORHOOD",
        name="post_visibility",
    )

    post_status = sa.Enum(
        "ACTIVE",
        "HIDDEN",
        "DELETED",
        name="post_status",
    )

    # Create PostgreSQL enum types first
    post_category.create(op.get_bind(), checkfirst=True)
    post_visibility.create(op.get_bind(), checkfirst=True)
    post_status.create(op.get_bind(), checkfirst=True)

    # Convert existing VARCHAR columns to ENUM
    op.alter_column(
        "posts",
        "category",
        existing_type=sa.VARCHAR(length=30),
        type_=post_category,
        existing_nullable=False,
        postgresql_using="category::text::post_category",
    )

    op.alter_column(
        "posts",
        "visibility",
        existing_type=sa.VARCHAR(length=20),
        type_=post_visibility,
        existing_nullable=False,
        postgresql_using="visibility::text::post_visibility",
    )

    op.alter_column(
        "posts",
        "status",
        existing_type=sa.VARCHAR(length=20),
        type_=post_status,
        existing_nullable=False,
        postgresql_using="status::text::post_status",
    )


def downgrade() -> None:
    """Downgrade schema."""

    # Convert ENUM columns back to VARCHAR
    op.alter_column(
        "posts",
        "status",
        existing_type=sa.Enum(
            "ACTIVE",
            "HIDDEN",
            "DELETED",
            name="post_status",
        ),
        type_=sa.VARCHAR(length=20),
        existing_nullable=False,
        postgresql_using="status::text",
    )

    op.alter_column(
        "posts",
        "visibility",
        existing_type=sa.Enum(
            "PUBLIC",
            "NEIGHBORHOOD",
            name="post_visibility",
        ),
        type_=sa.VARCHAR(length=20),
        existing_nullable=False,
        postgresql_using="visibility::text",
    )

    op.alter_column(
        "posts",
        "category",
        existing_type=sa.Enum(
            "DISCUSSION",
            "RECOMMENDATION",
            "EVENT",
            "SERVICE",
            "LOST_FOUND",
            "ISSUE",
            "ALERT",
            name="post_category",
        ),
        type_=sa.VARCHAR(length=30),
        existing_nullable=False,
        postgresql_using="category::text",
    )

    # Remove PostgreSQL enum types
    post_status = sa.Enum(
        "ACTIVE",
        "HIDDEN",
        "DELETED",
        name="post_status",
    )

    post_visibility = sa.Enum(
        "PUBLIC",
        "NEIGHBORHOOD",
        name="post_visibility",
    )

    post_category = sa.Enum(
        "DISCUSSION",
        "RECOMMENDATION",
        "EVENT",
        "SERVICE",
        "LOST_FOUND",
        "ISSUE",
        "ALERT",
        name="post_category",
    )

    post_status.drop(op.get_bind(), checkfirst=True)
    post_visibility.drop(op.get_bind(), checkfirst=True)
    post_category.drop(op.get_bind(), checkfirst=True)