"""add post location

Revision ID: 0fd034b6a47e
Revises: a7e87d2fb507
Create Date: 2026-09-05 10:21:48.382436
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import geoalchemy2


# revision identifiers, used by Alembic.
revision: str = "0fd034b6a47e"
down_revision: Union[str, Sequence[str], None] = "a7e87d2fb507"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""

    op.add_column(
        "posts",
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
    )

    op.create_index(
        "idx_posts_location",
        "posts",
        ["location"],
        unique=False,
        postgresql_using="gist",
    )


def downgrade() -> None:
    """Downgrade schema."""

    op.drop_index(
        "idx_posts_location",
        table_name="posts",
        postgresql_using="gist",
    )

    op.drop_column(
        "posts",
        "location",
    )