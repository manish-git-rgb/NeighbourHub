"""create issue reports table

Revision ID: e160b551981e
Revises: 9458621c76c9
Create Date: 2026-09-07 02:35:34.445407
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import geoalchemy2


revision: str = "e160b551981e"
down_revision: Union[str, Sequence[str], None] = "9458621c76c9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""

    op.create_table(
        "issue_reports",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("neighborhood_id", sa.Integer(), nullable=True),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("category", sa.String(length=50), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column(
            "location",
            geoalchemy2.types.Geometry(
                geometry_type="POINT",
                srid=4326,
                dimension=2,
                spatial_index=False,
                from_text="ST_GeomFromEWKT",
                name="geometry",
            ),
            nullable=True,
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
            ["neighborhood_id"],
            ["neighborhoods.id"],
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        "idx_issue_reports_location",
        "issue_reports",
        ["location"],
        unique=False,
        postgresql_using="gist",
    )

    op.create_index(
        op.f("ix_issue_reports_category"),
        "issue_reports",
        ["category"],
        unique=False,
    )

    op.create_index(
        op.f("ix_issue_reports_id"),
        "issue_reports",
        ["id"],
        unique=False,
    )

    op.create_index(
        op.f("ix_issue_reports_neighborhood_id"),
        "issue_reports",
        ["neighborhood_id"],
        unique=False,
    )

    op.create_index(
        op.f("ix_issue_reports_user_id"),
        "issue_reports",
        ["user_id"],
        unique=False,
    )


def downgrade() -> None:
    """Downgrade schema."""

    op.drop_index(
        op.f("ix_issue_reports_user_id"),
        table_name="issue_reports",
    )

    op.drop_index(
        op.f("ix_issue_reports_neighborhood_id"),
        table_name="issue_reports",
    )

    op.drop_index(
        op.f("ix_issue_reports_id"),
        table_name="issue_reports",
    )

    op.drop_index(
        op.f("ix_issue_reports_category"),
        table_name="issue_reports",
    )

    op.drop_index(
        "idx_issue_reports_location",
        table_name="issue_reports",
        postgresql_using="gist",
    )

    op.drop_table("issue_reports")