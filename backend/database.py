import logging
from pathlib import Path
from urllib.parse import urlparse
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.orm import declarative_base, sessionmaker
from backend.config import settings

logger = logging.getLogger("luxura.database")

Base = declarative_base()

MIGRATIONS_DIR = Path(__file__).resolve().parent / "migrations"


def ensure_postgres_database_exists(db_url: str):
    """Create the target PostgreSQL database if it does not exist (best effort)."""
    db_name = ""
    try:
        import psycopg2
        from psycopg2 import sql
        from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

        parsed = urlparse(db_url)
        if not parsed.scheme.startswith("postgres"):
            return
        db_name = parsed.path.lstrip("/")
        if not db_name or db_name == "postgres":
            return

        conn = psycopg2.connect(
            dbname="postgres",
            user=parsed.username or "postgres",
            password=parsed.password or "",
            host=parsed.hostname or "localhost",
            port=parsed.port or 5432,
            connect_timeout=3,
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()
        cursor.execute("SELECT 1 FROM pg_database WHERE datname = %s;", (db_name,))
        if not cursor.fetchone():
            logger.info("Database '%s' does not exist. Creating it...", db_name)
            cursor.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(db_name)))
        cursor.close()
        conn.close()
    except Exception as e:  # pragma: no cover - depends on server privileges
        logger.warning("Could not verify/create PostgreSQL database '%s': %s", db_name, e)


def _normalise_url(url: str) -> str:
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+psycopg2://", 1)
    if url.startswith("postgresql://") and not url.startswith("postgresql+"):
        return url.replace("postgresql://", "postgresql+psycopg2://", 1)
    return url


def create_db_engine():
    """Create the SQLAlchemy engine. PostgreSQL in production; SQLite only when explicitly allowed."""
    primary_url = _normalise_url(settings.DATABASE_URL)

    if primary_url.startswith("sqlite"):
        engine = create_engine(primary_url, connect_args={"check_same_thread": False})
        return engine, "sqlite"

    if "postgres" in primary_url:
        try:
            ensure_postgres_database_exists(primary_url)
            # Single uvicorn worker: a small pool is plenty and leaves connections for
            # other apps sharing the PostgreSQL server.
            engine = create_engine(primary_url, pool_pre_ping=True, pool_size=5, max_overflow=5,
                                   pool_recycle=1800,
                                   connect_args={"connect_timeout": 5, "application_name": "exotique-backend"})
            with engine.connect() as conn:
                conn.execute(text("SELECT 1;"))
            logger.info("Connected to PostgreSQL at %s", primary_url.split("@")[-1])
            return engine, "postgresql"
        except Exception as e:
            logger.error("PostgreSQL connection failed: %s", e)
            if not settings.FALLBACK_TO_SQLITE or settings.is_production:
                raise
            logger.warning("Falling back to SQLite at %s (development only).", settings.SQLITE_URL)

    engine = create_engine(settings.SQLITE_URL, connect_args={"check_same_thread": False})
    with engine.connect() as conn:
        conn.execute(text("SELECT 1;"))
    return engine, "sqlite"


engine, DB_DIALECT = create_db_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _alembic_config():
    from alembic.config import Config

    cfg = Config()
    cfg.set_main_option("script_location", str(MIGRATIONS_DIR))
    cfg.attributes["connection_engine"] = engine
    return cfg


def init_db():
    """Bring the schema up to date using Alembic migrations.

    Databases created by the original `create_all()` code have the base tables but no
    `alembic_version` table; they are stamped at the baseline revision first so the
    upgrade only applies the new changes and never touches existing data.
    """
    from alembic import command

    import backend.models  # noqa: F401  (register models)

    cfg = _alembic_config()
    insp = inspect(engine)
    tables = set(insp.get_table_names())
    if "alembic_version" not in tables and "vehicles" in tables:
        logger.info("Legacy schema detected - stamping baseline revision 0001.")
        command.stamp(cfg, "0001_baseline")
    command.upgrade(cfg, "head")
    logger.info("Database schema is up to date.")
