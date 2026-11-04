import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from starlette.exceptions import HTTPException as StarletteHTTPException

from backend.config import settings
from backend.database import DB_DIALECT, engine
from backend.logging_setup import configure_logging, RequestLogMiddleware
from backend.seed import seed_database
from backend.routes import auth, admins, vehicles, logs, bookings, cms_public, cms_admin, seo, media

configure_logging()
logger = logging.getLogger("luxura.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("starting %s v%s (database: %s, environment: %s)", settings.APP_NAME, settings.APP_VERSION,
                DB_DIALECT, settings.ENVIRONMENT)
    # A failed migration must stop the container (so the old one keeps serving) rather
    # than start an app against a half-migrated schema.
    seed_database()  # runs Alembic migrations first
    yield
    logger.info("shutting down")


docs_enabled = settings.ENABLE_API_DOCS or not settings.is_production
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Exotique Machines website API: inventory, CMS, leads and SEO rendering.",
    lifespan=lifespan,
    docs_url="/docs" if docs_enabled else None,
    redoc_url="/redoc" if docs_enabled else None,
    openapi_url="/openapi.json" if docs_enabled else None,
)

if settings.CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
        allow_headers=["Content-Type", "X-Requested-With", "Authorization"],
    )


NO_STORE_PREFIXES = ("/api/auth", "/api/admin", "/api/activity-logs", "/api/finance/applications",
                     "/api/service/bookings")


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    path = request.url.path
    h = response.headers
    h.setdefault("X-Content-Type-Options", "nosniff")
    h.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    h.setdefault("X-Frame-Options", "DENY")
    if path.startswith("/uploads/") or path.startswith("/media/"):
        # User-supplied files: never executable, even if a browser sniffs them as HTML.
        h["Content-Security-Policy"] = "default-src 'none'; img-src 'self'; style-src 'none'; sandbox"
        h["Cross-Origin-Resource-Policy"] = "same-origin"
    elif path.startswith("/api/"):
        h.setdefault("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'")
    if (path.startswith(NO_STORE_PREFIXES) or (path.startswith("/api/") and request.method != "GET")
            or (path == "/api/test-drives" and request.method == "GET")):
        h["Cache-Control"] = "no-store"
    return response



# --------------------------------------------------------------------------
# Errors: one JSON shape, no stack traces or SQL in responses.
# --------------------------------------------------------------------------


@app.exception_handler(StarletteHTTPException)
async def http_error(request: Request, exc: StarletteHTTPException):
    detail = exc.detail
    message = detail.get("message") if isinstance(detail, dict) else str(detail)
    return JSONResponse({"success": False, "error": message, "detail": detail}, status_code=exc.status_code,
                        headers=getattr(exc, "headers", None))


@app.exception_handler(RequestValidationError)
async def validation_error(request: Request, exc: RequestValidationError):
    errors = []
    for err in exc.errors()[:20]:
        loc = ".".join(str(p) for p in err.get("loc", []) if p not in ("body", "query", "path"))
        errors.append({"field": loc, "message": err.get("msg", "Invalid value")})
    first = errors[0] if errors else {"field": "", "message": "Invalid request"}
    message = f"{first['field']}: {first['message']}" if first["field"] else first["message"]
    return JSONResponse({"success": False, "error": message, "detail": errors}, status_code=422)


@app.exception_handler(Exception)
async def unhandled_error(request: Request, exc: Exception):
    logger.exception("unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse({"success": False, "error": "Something went wrong. Please try again.",
                         "detail": "internal_error"}, status_code=500)


# --------------------------------------------------------------------------
# Routes
# --------------------------------------------------------------------------

app.mount("/uploads", StaticFiles(directory=str(settings.UPLOADS_DIR)), name="uploads")

for r in (auth, admins, vehicles, logs, bookings, cms_public, cms_admin, seo, media):
    app.include_router(r.router)


@app.get("/api/health", tags=["System"])
def health_check():
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        db_ok = False
    return JSONResponse({"status": "healthy" if db_ok else "degraded", "version": settings.APP_VERSION,
                         "database": "ok" if db_ok else "unavailable"}, status_code=200 if db_ok else 503)


# Single-container mode (run_backend.py serving dist/). In Docker, nginx serves the SPA.
if settings.DIST_DIR.exists() and (settings.DIST_DIR / "assets").exists():
    from backend.routes.seo import _render
    from backend.database import SessionLocal

    app.mount("/assets", StaticFiles(directory=str(settings.DIST_DIR / "assets")), name="assets")

    @app.middleware("http")
    async def spa_fallback(request: Request, call_next):
        response = await call_next(request)
        path = request.url.path
        if (response.status_code == 404 and request.method == "GET"
                and not path.startswith(("/api", "/uploads", "/media", "/docs", "/redoc", "/openapi.json", "/__seo"))):
            static = (settings.DIST_DIR / path.lstrip("/")).resolve()
            if static.is_file() and settings.DIST_DIR.resolve() in static.parents:
                return FileResponse(static)
            with SessionLocal() as db:
                return _render(path, db)
        return response


# Added last so it is the outermost layer and logs the final status of every response.
app.add_middleware(RequestLogMiddleware)
