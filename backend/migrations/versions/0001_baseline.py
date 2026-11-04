"""Baseline: the schema created by the original create_all() code (v1.0).

Existing production databases are *stamped* at this revision (no DDL runs).
Fresh databases get these tables created here.

Revision ID: 0001_baseline
Revises:
"""
from alembic import op
import sqlalchemy as sa

revision = "0001_baseline"
down_revision = None
branch_labels = None
depends_on = None


def _ts(name, **kw):
    return sa.Column(name, sa.DateTime(timezone=True), **kw)


def upgrade():
    op.create_table(
        "users",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("username", sa.String(100), nullable=False, unique=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("role", sa.String(50), nullable=False),
        sa.Column("permissions", sa.JSON(), nullable=False),
        sa.Column("status", sa.String(50), nullable=False),
        sa.Column("must_change_password", sa.Boolean()),
        _ts("created_at", server_default=sa.func.now()),
        _ts("updated_at", server_default=sa.func.now()),
        _ts("last_login", nullable=True),
    )
    op.create_index("ix_users_id", "users", ["id"])
    op.create_index("ix_users_username", "users", ["username"], unique=True)

    op.create_table(
        "vehicles",
        sa.Column("id", sa.String(128), primary_key=True),
        sa.Column("brand", sa.String(100), nullable=False),
        sa.Column("model", sa.String(100), nullable=False),
        sa.Column("badge", sa.String(100), nullable=False),
        sa.Column("type", sa.String(100), nullable=False),
        sa.Column("category", sa.String(50), nullable=False),
        sa.Column("lifestyle", sa.String(50), nullable=False),
        sa.Column("fuel", sa.String(50), nullable=False),
        sa.Column("transmission", sa.String(50), nullable=False),
        sa.Column("price", sa.Float(), nullable=False),
        sa.Column("emi", sa.Integer(), nullable=False),
        sa.Column("seats", sa.Integer(), nullable=False),
        sa.Column("engine", sa.String(200), nullable=False),
        sa.Column("power", sa.String(200), nullable=False),
        sa.Column("mileage", sa.String(200), nullable=False),
        sa.Column("images", sa.JSON(), nullable=False),
        sa.Column("colors", sa.JSON(), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("features", sa.JSON(), nullable=False),
        sa.Column("rating", sa.Float()),
        sa.Column("is_recent", sa.Boolean()),
        _ts("created_at", server_default=sa.func.now()),
        _ts("updated_at", server_default=sa.func.now()),
    )
    for col in ("id", "brand", "model", "category", "fuel"):
        op.create_index(f"ix_vehicles_{col}", "vehicles", [col])

    op.create_table(
        "activity_logs",
        sa.Column("id", sa.String(64), primary_key=True),
        _ts("timestamp", server_default=sa.func.now()),
        sa.Column("actor_id", sa.String(64), nullable=False),
        sa.Column("actor_username", sa.String(100), nullable=False),
        sa.Column("actor_role", sa.String(50), nullable=False),
        sa.Column("action", sa.String(100), nullable=False),
        sa.Column("target", sa.String(255)),
        sa.Column("details", sa.Text()),
        sa.Column("ip", sa.String(64)),
    )
    for col in ("id", "timestamp", "actor_username", "action"):
        op.create_index(f"ix_activity_logs_{col}", "activity_logs", [col])

    op.create_table(
        "finance_applications",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("phone", sa.String(50), nullable=False),
        sa.Column("whatsapp_updates", sa.Boolean()),
        sa.Column("model", sa.String(200), nullable=False),
        sa.Column("status", sa.String(50)),
        _ts("created_at", server_default=sa.func.now()),
    )
    op.create_index("ix_finance_applications_id", "finance_applications", ["id"])

    op.create_table(
        "test_drive_bookings",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("model_id", sa.String(128), nullable=False),
        sa.Column("model_name", sa.String(200), nullable=False),
        sa.Column("date", sa.String(50), nullable=False),
        sa.Column("time", sa.String(50), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("phone", sa.String(50), nullable=False),
        sa.Column("email", sa.String(200), nullable=False),
        sa.Column("has_license", sa.Boolean()),
        sa.Column("status", sa.String(50)),
        _ts("created_at", server_default=sa.func.now()),
    )
    op.create_index("ix_test_drive_bookings_id", "test_drive_bookings", ["id"])

    op.create_table(
        "service_bookings",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("vehicle_model", sa.String(200), nullable=False),
        sa.Column("service_type", sa.String(100), nullable=False),
        sa.Column("preferred_date", sa.String(50), nullable=False),
        sa.Column("customer_name", sa.String(200), nullable=False),
        sa.Column("customer_phone", sa.String(50), nullable=False),
        sa.Column("notes", sa.Text()),
        sa.Column("status", sa.String(50)),
        _ts("created_at", server_default=sa.func.now()),
    )
    op.create_index("ix_service_bookings_id", "service_bookings", ["id"])


def downgrade():
    for t in ("service_bookings", "test_drive_bookings", "finance_applications", "activity_logs", "vehicles", "users"):
        op.drop_table(t)
