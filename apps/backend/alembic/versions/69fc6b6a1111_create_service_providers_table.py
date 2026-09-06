"""create service providers table

Revision ID: 69fc6b6a1111
Revises: 530e338c8d51
Create Date: 2026-09-06 13:05:29.385913
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import geoalchemy2


revision: str = "69fc6b6a1111"
down_revision: Union[str, Sequence[str], None] = "530e338c8d51"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""

    op.create_table(
        "service_providers",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("neighborhood_id", sa.Integer(), nullable=True),
        sa.Column("business_name", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("category", sa.String(length=50), nullable=False),
        sa.Column("phone", sa.String(length=20), nullable=True),
        sa.Column("address", sa.String(length=300), nullable=True),
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
        "idx_service_providers_location",
        "service_providers",
        ["location"],
        unique=False,
        postgresql_using="gist",
    )

    op.create_index(
        op.f("ix_service_providers_category"),
        "service_providers",
        ["category"],
        unique=False,
    )

    op.create_index(
        op.f("ix_service_providers_id"),
        "service_providers",
        ["id"],
        unique=False,
    )

    op.create_index(
        op.f("ix_service_providers_neighborhood_id"),
        "service_providers",
        ["neighborhood_id"],
        unique=False,
    )

    op.create_index(
        op.f("ix_service_providers_user_id"),
        "service_providers",
        ["user_id"],
        unique=False,
    )


def downgrade() -> None:
    """Downgrade schema."""

    op.drop_index(
        op.f("ix_service_providers_user_id"),
        table_name="service_providers",
    )

    op.drop_index(
        op.f("ix_service_providers_neighborhood_id"),
        table_name="service_providers",
    )

    op.drop_index(
        op.f("ix_service_providers_id"),
        table_name="service_providers",
    )

    op.drop_index(
        op.f("ix_service_providers_category"),
        table_name="service_providers",
    )

    op.drop_index(
        "idx_service_providers_location",
        table_name="service_providers",
        postgresql_using="gist",
    )

    op.drop_table("service_providers")