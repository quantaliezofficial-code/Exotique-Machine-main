# Exotique Machines - Luxura FastAPI & PostgreSQL Backend

High-performance, enterprise-grade Python backend built with **FastAPI**, **PostgreSQL**, **SQLAlchemy 2.0**, **Pydantic v2**, and **JWT RBAC Authentication**.

---

## 🚀 Key Highlights & Architecture

- **Framework**: FastAPI (Asynchronous & Synchronous endpoints, OpenAPI 3.1 & Swagger interactive docs).
- **Database**: PostgreSQL with `psycopg2-binary` & `asyncpg` drivers via SQLAlchemy ORM.
- **Auto-Provisioning**: Automatic target database creation (`luxura_db`) and automatic fleet seeding from `server/data/` JSON records on startup.
- **Graceful Fallback**: SQLite fallback mode enabled by default if PostgreSQL connection credentials are temporarily pending, keeping development unblocked.
- **Security & RBAC**:
  - Bcrypt password hashing (12 rounds)
  - JWT session issuance & verification (HS256)
  - Superadmin & Granular Staff Admin roles
  - Granular permissions: `inventory:view`, `inventory:create`, `inventory:edit`, `inventory:delete`, `pricing:edit`, `logs:view`
  - Real-time account revocation (immediate lockout for deactivated accounts)
  - Brute-force & rate-limiting protection (temporary lockout after 5 consecutive failed attempts)
  - Full audit logging (`activity_logs`) for all administrative actions

---

## 📁 Backend Structure

```
luxura/backend/
├── __init__.py
├── config.py           # Environment & application settings (Pydantic Settings)
├── database.py         # SQLAlchemy engine, session maker & auto database creator
├── models.py           # Database ORM models (User, Vehicle, ActivityLog, Bookings)
├── schemas.py          # Pydantic schemas with TypeScript camelCase compatibility
├── security.py         # Bcrypt, JWT tokens, RBAC dependencies, brute force guard
├── seed.py             # Automatic fleet & user migration from JSON files to PostgreSQL
├── test_backend.py     # Automated pytest test suite
├── requirements.txt    # Python dependencies
└── routes/
    ├── __init__.py
    ├── auth.py         # /api/auth/login, /api/auth/me, password & profile management
    ├── admins.py       # /api/auth/admins CRUD (Super Admin authority)
    ├── vehicles.py     # /api/vehicles CRUD & /api/upload photo handler
    ├── logs.py         # /api/activity-logs audit trails
    └── bookings.py     # /api/finance/apply, /api/test-drives, /api/service/book
```

---

## 🛠️ Configuration & Database Setup

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Configure your PostgreSQL connection string in `.env`:
   ```env
   # Format: postgresql+psycopg2://<user>:<password>@<host>:<port>/<dbname>
   DATABASE_URL=postgresql+psycopg2://postgres:YOUR_PASSWORD@localhost:5432/luxura_db
   ```
   *Note: If the `luxura_db` database does not exist yet on your PostgreSQL server, the backend automatically creates it on startup.*

---

## 🏃 Running the Backend

### Using Python directly:
```bash
python run_backend.py
```

### Using npm:
```bash
npm run backend
# or
npm run fastapi
```

---

## 🧪 Running the Test Suite

Run the comprehensive pytest suite verifying all endpoints, auth, and database operations:
```bash
python -m pytest backend/test_backend.py -v
```

---

## 📖 Interactive API Documentation

Once the backend is running on `http://localhost:5000`:
- **Swagger UI**: [http://localhost:5000/docs](http://localhost:5000/docs)
- **ReDoc**: [http://localhost:5000/redoc](http://localhost:5000/redoc)
- **Health Check**: [http://localhost:5000/api/health](http://localhost:5000/api/health)
