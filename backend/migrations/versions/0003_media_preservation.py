"""Media preservation and listing index.

* media_assets: path of the untouched original, its size, a tiny blur placeholder and
  whether optimised variants have been generated.
* vehicles: composite index for the public listing query
  (WHERE is_published ORDER BY created_at DESC).

Additive only.

Revision ID: 0003_media_preservation
Revises: 0002_cms_seo_security
"""
from alembic import op
import sqlalchemy as sa

revision = "0003_media_preservation"
down_revision = "0002_cms_seo_security"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("media_assets") as b:
        b.add_column(sa.Column("original_path", sa.String(500), nullable=True))
        b.add_column(sa.Column("original_bytes", sa.Integer(), nullable=True))
        b.add_column(sa.Column("placeholder", sa.Text(), nullable=True))
        b.add_column(sa.Column("variants_ready", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.create_index("ix_vehicles_published_created", "vehicles", ["is_published", "created_at"])


def downgrade():
    op.drop_index("ix_vehicles_published_created", "vehicles")
    with op.batch_alter_table("media_assets") as b:
        for c in ("variants_ready", "placeholder", "original_bytes", "original_path"):
            b.drop_column(c)
