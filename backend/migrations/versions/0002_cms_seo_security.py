"""CMS tables, vehicle listing facts, enquiry leads and auth hardening columns.

Additive only: no existing column is dropped or rewritten. Vehicle listing facts are
backfilled only from text that already states them (see services/listing_facts.py).

Revision ID: 0002_cms_seo_security
Revises: 0001_baseline
"""
from alembic import op
import sqlalchemy as sa

revision = "0002_cms_seo_security"
down_revision = "0001_baseline"
branch_labels = None
depends_on = None


def _ts(name, **kw):
    return sa.Column(name, sa.DateTime(timezone=True), **kw)


def upgrade():
    # ---- users: auth hardening ------------------------------------------------
    with op.batch_alter_table("users") as b:
        b.add_column(sa.Column("token_version", sa.Integer(), nullable=False, server_default="0"))
        b.add_column(sa.Column("role_preset", sa.String(50), nullable=True))

    # ---- vehicles: listing facts + publication --------------------------------
    with op.batch_alter_table("vehicles") as b:
        b.add_column(sa.Column("year", sa.Integer(), nullable=True))
        b.add_column(sa.Column("km_driven", sa.Integer(), nullable=True))
        b.add_column(sa.Column("owners", sa.Integer(), nullable=True))
        b.add_column(sa.Column("registration", sa.String(40), nullable=True))
        b.add_column(sa.Column("condition", sa.String(20), nullable=False, server_default="used"))
        b.add_column(sa.Column("status", sa.String(20), nullable=False, server_default="available"))
        b.add_column(sa.Column("is_published", sa.Boolean(), nullable=False, server_default=sa.true()))
    op.create_index("ix_vehicles_status", "vehicles", ["status"])
    op.create_index("ix_vehicles_is_published", "vehicles", ["is_published"])

    # Backfill facts that are already written in the record's text.
    from backend.services.listing_facts import extract_facts

    conn = op.get_bind()
    vehicles = sa.table(
        "vehicles",
        sa.column("id", sa.String), sa.column("badge", sa.String), sa.column("mileage", sa.String),
        sa.column("description", sa.Text), sa.column("features", sa.JSON),
        sa.column("year", sa.Integer), sa.column("km_driven", sa.Integer),
        sa.column("owners", sa.Integer), sa.column("registration", sa.String),
    )
    rows = conn.execute(sa.select(vehicles.c.id, vehicles.c.badge, vehicles.c.mileage,
                                  vehicles.c.description, vehicles.c.features)).fetchall()
    for r in rows:
        facts = extract_facts({"id": r.id, "badge": r.badge, "mileage": r.mileage,
                               "description": r.description, "features": r.features or []})
        values = {k: v for k, v in facts.items() if v is not None}
        if values:
            conn.execute(vehicles.update().where(vehicles.c.id == r.id).values(**values))

    # ---- leads ----------------------------------------------------------------
    op.create_table(
        "enquiries",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("phone", sa.String(50), nullable=False),
        sa.Column("email", sa.String(200), nullable=True),
        sa.Column("vehicle_interest", sa.String(200), nullable=True),
        sa.Column("message", sa.Text(), nullable=True),
        sa.Column("source", sa.String(50), nullable=False, server_default="website"),
        sa.Column("status", sa.String(50), nullable=False, server_default="new"),
        _ts("created_at", server_default=sa.func.now()),
    )
    op.create_index("ix_enquiries_id", "enquiries", ["id"])
    op.create_index("ix_enquiries_created_at", "enquiries", ["created_at"])

    # ---- CMS ------------------------------------------------------------------
    op.create_table(
        "media_assets",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("url", sa.String(500), nullable=False),
        sa.Column("filename", sa.String(255), nullable=False),
        sa.Column("original_name", sa.String(255)),
        sa.Column("mime_type", sa.String(50), nullable=False),
        sa.Column("width", sa.Integer()),
        sa.Column("height", sa.Integer()),
        sa.Column("size_bytes", sa.Integer()),
        sa.Column("sha256", sa.String(64)),
        sa.Column("alt", sa.String(300)),
        sa.Column("folder", sa.String(50), nullable=False, server_default="general"),
        sa.Column("uploaded_by", sa.String(64)),
        _ts("created_at", server_default=sa.func.now()),
    )
    op.create_index("ix_media_assets_url", "media_assets", ["url"], unique=True)
    op.create_index("ix_media_assets_sha256", "media_assets", ["sha256"])
    op.create_index("ix_media_assets_created_at", "media_assets", ["created_at"])

    op.create_table(
        "hero_slides",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("eyebrow", sa.String(120)),
        sa.Column("description", sa.Text()),
        sa.Column("watermark", sa.String(60)),
        sa.Column("cta_label", sa.String(80)),
        sa.Column("cta_url", sa.String(300)),
        sa.Column("desktop_image", sa.String(500), nullable=False),
        sa.Column("mobile_image", sa.String(500)),
        sa.Column("image_alt", sa.String(300)),
        sa.Column("vehicle_id", sa.String(128), sa.ForeignKey("vehicles.id", ondelete="SET NULL")),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("status", sa.String(20), nullable=False, server_default="draft"),
        _ts("starts_at", nullable=True),
        _ts("ends_at", nullable=True),
        sa.Column("updated_by", sa.String(100)),
        _ts("created_at", server_default=sa.func.now()),
        _ts("updated_at", server_default=sa.func.now()),
    )
    op.create_index("ix_hero_slides_status", "hero_slides", ["status"])

    op.create_table(
        "featured_vehicles",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("vehicle_id", sa.String(128), sa.ForeignKey("vehicles.id", ondelete="CASCADE"),
                  nullable=False, unique=True),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_visible", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("label", sa.String(80)),
        sa.Column("card_image", sa.String(500)),
        _ts("created_at", server_default=sa.func.now()),
        _ts("updated_at", server_default=sa.func.now()),
    )

    op.create_table(
        "reviews",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("customer_name", sa.String(120), nullable=False),
        sa.Column("customer_title", sa.String(160)),
        sa.Column("rating", sa.Integer()),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("photo", sa.String(500)),
        sa.Column("vehicle_id", sa.String(128), sa.ForeignKey("vehicles.id", ondelete="SET NULL")),
        sa.Column("source", sa.String(60), nullable=False, server_default="website"),
        sa.Column("source_url", sa.String(500)),
        _ts("review_date", nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("is_featured", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("submitted_ip", sa.String(64)),
        sa.Column("moderated_by", sa.String(100)),
        _ts("created_at", server_default=sa.func.now()),
        _ts("updated_at", server_default=sa.func.now()),
    )
    op.create_index("ix_reviews_status", "reviews", ["status"])

    op.create_table(
        "offers",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("slug", sa.String(160), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("summary", sa.String(300)),
        sa.Column("description", sa.Text()),
        sa.Column("terms", sa.Text()),
        sa.Column("vehicle_id", sa.String(128), sa.ForeignKey("vehicles.id", ondelete="SET NULL")),
        sa.Column("discount_type", sa.String(20), nullable=False, server_default="none"),
        sa.Column("discount_value", sa.Float()),
        sa.Column("image", sa.String(500)),
        sa.Column("cta_label", sa.String(80)),
        _ts("starts_at", nullable=False),
        _ts("ends_at", nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="draft"),
        sa.Column("show_on_home", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("author_id", sa.String(64)),
        sa.Column("author_name", sa.String(200)),
        _ts("created_at", server_default=sa.func.now()),
        _ts("updated_at", server_default=sa.func.now()),
    )
    op.create_index("ix_offers_slug", "offers", ["slug"], unique=True)
    op.create_index("ix_offers_status", "offers", ["status"])

    op.create_table(
        "site_settings",
        sa.Column("key", sa.String(60), primary_key=True),
        sa.Column("draft_value", sa.JSON()),
        sa.Column("published_value", sa.JSON()),
        sa.Column("updated_by", sa.String(100)),
        sa.Column("published_by", sa.String(100)),
        _ts("updated_at", server_default=sa.func.now()),
        _ts("published_at", nullable=True),
    )

    op.create_table(
        "content_audit_logs",
        sa.Column("id", sa.String(64), primary_key=True),
        _ts("timestamp", server_default=sa.func.now()),
        sa.Column("actor_id", sa.String(64), nullable=False),
        sa.Column("actor_username", sa.String(100), nullable=False),
        sa.Column("entity_type", sa.String(50), nullable=False),
        sa.Column("entity_id", sa.String(160), nullable=False),
        sa.Column("action", sa.String(50), nullable=False),
        sa.Column("before", sa.JSON()),
        sa.Column("after", sa.JSON()),
    )
    op.create_index("ix_content_audit_logs_timestamp", "content_audit_logs", ["timestamp"])
    op.create_index("ix_content_audit_logs_entity_type", "content_audit_logs", ["entity_type"])
    op.create_index("ix_content_audit_logs_entity_id", "content_audit_logs", ["entity_id"])


def downgrade():
    for t in ("content_audit_logs", "site_settings", "offers", "reviews", "featured_vehicles",
              "hero_slides", "media_assets", "enquiries"):
        op.drop_table(t)
    op.drop_index("ix_vehicles_is_published", "vehicles")
    op.drop_index("ix_vehicles_status", "vehicles")
    with op.batch_alter_table("vehicles") as b:
        for c in ("is_published", "status", "condition", "registration", "owners", "km_driven", "year"):
            b.drop_column(c)
    with op.batch_alter_table("users") as b:
        b.drop_column("role_preset")
        b.drop_column("token_version")
