import logging
from urllib.parse import urlparse
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker
from backend.config import settings

logger = logging.getLogger("luxura.database")

Base = declarative_base()

def ensure_postgres_database_exists(db_url: str):
    """
    Connect to PostgreSQL 'postgres' template database to ensure the target database exists.
    If not, creates it automatically.
    """
    try:
        parsed = urlparse(db_url)
        # Check if this is a postgres URL
        if not parsed.scheme.startswith("postgres"):
            return

        db_name = parsed.path.lstrip("/")
        if not db_name or db_name == "postgres":
            return

        user = parsed.username or "postgres"
        password = parsed.password or ""
        host = parsed.hostname or "localhost"
        port = parsed.port or 5432

        # Connect to default postgres DB
        conn = psycopg2.connect(
            dbname="postgres",
            user=user,
            password=password,
            host=host,
            port=port,
            connect_timeout=3
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()

        # Check if database exists
        cursor.execute("SELECT 1 FROM pg_database WHERE datname = %s;", (db_name,))
        exists = cursor.fetchone()

        if not exists:
            logger.info(f"Database '{db_name}' does not exist. Creating database automatically...")
            cursor.execute(f'CREATE DATABASE "{db_name}";')
            logger.info(f"Database '{db_name}' created successfully on PostgreSQL.")

        cursor.close()
        conn.close()
    except Exception as e:
        logger.warning(f"Could not automatically verify/create PostgreSQL database '{db_name}': {e}")


def create_db_engine():
    """
    Create SQLAlchemy engine. Attempts PostgreSQL first, then falls back to SQLite
    if PostgreSQL is unreachable and fallback is enabled.
    """
    primary_url = settings.DATABASE_URL
    if primary_url.startswith("postgres://"):
        primary_url = primary_url.replace("postgres://", "postgresql+psycopg2://", 1)
    elif primary_url.startswith("postgresql://") and not primary_url.startswith("postgresql+"):
        primary_url = primary_url.replace("postgresql://", "postgresql+psycopg2://", 1)

    # 1. Attempt PostgreSQL
    if "postgres" in primary_url:
        try:
            ensure_postgres_database_exists(primary_url)
            engine = create_engine(
                primary_url,
                pool_pre_ping=True,
                pool_size=10,
                max_overflow=20
            )
            # Test connection
            with engine.connect() as conn:
                conn.execute(text("SELECT 1;"))
            logger.info(f" Connected to PostgreSQL database successfully at: {primary_url.split('@')[-1]}")
            return engine, "postgresql"
        except Exception as e:
            logger.error(f" PostgreSQL connection failed: {e}")
            if not settings.FALLBACK_TO_SQLITE:
                raise e
            logger.warning(
                f"⚠️  Falling back to SQLite at {settings.SQLITE_URL} so the application remains operable. "
                "Update DATABASE_URL in your .env file with your PostgreSQL password once ready."
            )

    # 2. SQLite Fallback
    engine = create_engine(
        settings.SQLITE_URL,
        connect_args={"check_same_thread": False}
    )
    with engine.connect() as conn:
        conn.execute(text("SELECT 1;"))
    logger.info(f" Running with SQLite database: {settings.SQLITE_URL}")
    return engine, "sqlite"


engine, DB_DIALECT = create_db_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    """
    FastAPI dependency that yields a SQLAlchemy database session and ensures it is closed.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """
    Initialize all database tables.
    """
    import backend.models  # Import models so Base has metadata registered
    Base.metadata.create_all(bind=engine)
    logger.info(" Database tables verified / created successfully.")
