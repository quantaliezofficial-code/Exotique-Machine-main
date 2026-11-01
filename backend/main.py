import os
import logging
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from backend.config import settings
from backend.database import init_db, DB_DIALECT
from backend.seed import seed_database
from backend.routes import auth, admins, vehicles, logs, bookings

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("luxura.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize Database and run seeding
    logger.info("====================================================")
    logger.info(f"🚀 Starting {settings.APP_NAME} (FastAPI v{settings.APP_VERSION})")
    logger.info(f"🗄️  Active Database Engine: {DB_DIALECT.upper()}")
    logger.info("====================================================")
    try:
        init_db()
        seed_database()
        logger.info(" Database initialization & initial fleet seeding completed.")
    except Exception as e:
        logger.error(f"Error during startup database initialization: {e}", exc_info=True)

    yield

    # Shutdown
    logger.info("🛑 Shutting down Exotique Machines Backend.")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="High-performance FastAPI Backend for Exotique Machines Luxura with PostgreSQL RBAC & Fleet Management.",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Uploads directory for static media
app.mount("/uploads", StaticFiles(directory=str(settings.UPLOADS_DIR)), name="uploads")

# Include API Routers
app.include_router(auth.router)
app.include_router(admins.router)
app.include_router(vehicles.router)
app.include_router(logs.router)
app.include_router(bookings.router)


@app.get("/api/health", tags=["System"])
def health_check():
    """System health check endpoint."""
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "database": DB_DIALECT
    }


# Frontend SPA Static Files & Fallback
if settings.DIST_DIR.exists():
    app.mount("/assets", StaticFiles(directory=str(settings.DIST_DIR / "assets")), name="assets")

    @app.middleware("http")
    async def spa_fallback_middleware(request: Request, call_next):
        response = await call_next(request)
        if response.status_code == 404:
            path = request.url.path
            if not path.startswith("/api") and not path.startswith("/uploads") and not path.startswith("/docs") and not path.startswith("/redoc") and not path.startswith("/openapi.json"):
                index_file = settings.DIST_DIR / "index.html"
                if index_file.exists():
                    return FileResponse(index_file)
        return response
