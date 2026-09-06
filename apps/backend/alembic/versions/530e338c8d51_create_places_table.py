"""create places table

Revision ID: 530e338c8d51
Revises: a23361e760aa
Create Date: 2026-09-06 12:55:46.514050
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import geoalchemy2


# revision identifiers, used by Alembic.
revision: str = "530e338c8d51"
down_revision: Union[str, Sequence[str], None] = "a23361e760aa"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""

    op.create_table(
        "places",
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
            nullable=True,
        ),
        sa.Column(
            "name",
            sa.String(length=200),
            nullable=False,
        ),
        sa.Column(
            "description",
            sa.Text(),
            nullable=True,
        ),
        sa.Column(
            "category",
            sa.String(length=50),
            nullable=False,
        ),
        sa.Column(
            "address",
            sa.String(length=300),
            nullable=True,
        ),
        sa.Column(
            "location",
            geoalchemy2.types.Geometry(
                geometry_type="POINT",
                srid=4326,
                dimension=2,
                from_text="ST_GeomFromEWKT",
                spatial_index=False,
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
        "idx_places_location",
        "places",
        ["location"],
        unique=False,
        postgresql_using="gist",
    )

    op.create_index(
        op.f("ix_places_category"),
        "places",
        ["category"],
        unique=False,
    )

    op.create_index(
        op.f("ix_places_id"),
        "places",
        ["id"],
        unique=False,
    )

    op.create_index(
        op.f("ix_places_neighborhood_id"),
        "places",
        ["neighborhood_id"],
        unique=False,
    )

    op.create_index(
        op.f("ix_places_user_id"),
        "places",
        ["user_id"],
        unique=False,
    )


def downgrade() -> None:
    """Downgrade schema."""

    op.drop_index(
        op.f("ix_places_user_id"),
        table_name="places",
    )

    op.drop_index(
        op.f("ix_places_neighborhood_id"),
        table_name="places",
    )

    op.drop_index(
        op.f("ix_places_id"),
        table_name="places",
    )

    op.drop_index(
        op.f("ix_places_category"),
        table_name="places",
    )

    op.drop_index(
        "idx_places_location",
        table_name="places",
        postgresql_using="gist",
    )

    op.drop_table("places")