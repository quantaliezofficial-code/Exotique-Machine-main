"""Alembic environment. The engine is supplied by backend.database (see init_db)."""
from alembic import context

from backend.database import Base, engine as app_engine
import backend.models  # noqa: F401

config = context.config
target_metadata = Base.metadata


def run_migrations_online():
    connectable = config.attributes.get("connection_engine") or app_engine
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            render_as_batch=connection.dialect.name == "sqlite",
            compare_type=True,
        )
        with context.begin_transaction():
            context.run_migrations()
        connection.commit()


run_migrations_online()
