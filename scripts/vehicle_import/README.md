# Exotique Machines — Production Vehicle & Image Importer

Enterprise-grade, idempotent, and auditable data import utility for the Exotique luxury car showroom platform.

---

## 🛠️ System Overview

This utility transfers vehicle inventory records and their associated photography into the deployed application through **existing backend API contracts**:
1. Authenticates against the backend using JWT administrator credentials (`/api/auth/login`).
2. Performs a pre-flight schema, duplicate, and image integrity validation.
3. Automatically triggers and verifies a **timestamped database backup** before any write operation.
4. Uploads images in batches using the existing multipart endpoint (`POST /api/upload`).
5. Creates vehicle records through the existing creation endpoint (`POST /api/vehicles`).
6. Verifies every created record on the live application.
7. Tracks state in a persistent manifest (`import_manifest.json`) for seamless pause/resume capabilities and duplicate prevention.

---

## 📁 Directory Structure

```text
scripts/vehicle_import/
├── importer.py           # Main CLI orchestrator
├── validator.py          # Data validation & duplicate detection
├── image_handler.py      # Safe ZIP extraction & image signature checks
├── api_client.py         # HTTP client with retries, rate-limiting & auth
├── backup.py             # PostgreSQL pg_dump & SQLite snapshot manager
├── config.py             # Environment configuration reader
├── logger.py             # Masked auditing logger
└── README.md             # Operating manual
```

---

## ⚙️ Configuration

Configure through environment variables or command-line flags:

```bash
# Production API Configuration
export EXOTIQUE_API_BASE_URL="https://your-production-domain.com"
export EXOTIQUE_ADMIN_USERNAME="superadmin"
export EXOTIQUE_ADMIN_PASSWORD="YourSecurePasswordHere"

# Optional Pre-Issued JWT Token
export EXOTIQUE_API_TOKEN="eyJhbGciOi..."

# Data File Paths (Defaults to data/ folder)
export IMPORT_JSON_PATH="data/vehicles.json"
export IMPORT_IMAGES_ZIP="data/vehicle-images.zip"

# Rate Limiting & Safety
export EXOTIQUE_RATE_LIMIT_DELAY="0.25"
export EXOTIQUE_REQUEST_TIMEOUT="30"
export EXOTIQUE_MAX_RETRIES="3"
```

---

## 🚀 Step-by-Step Usage Guide

### Step 1: Execute Dry Run (Mandatory Pre-Flight)

The dry run validates your JSON schema, tests image extraction, verifies API connectivity, checks for duplicates, and confirms authentication **without writing any data**:

```bash
python scripts/vehicle_import/importer.py --dry-run
```

Expected output:
```text
============================================================
EXOTIQUE VEHICLE IMPORT — VALIDATION REPORT
============================================================
Total vehicle records found: 8
Valid vehicle records:       5
Invalid vehicle records:     1
Duplicate candidates:        1
------------------------------------------------------------
Total images in archive:     21
Matched images:              20
Missing images:              2
Unused images:               1
Corrupted/invalid images:    0
------------------------------------------------------------
Validation Status:           REVIEW REQUIRED
============================================================
```

### Step 2: Database Backup & Verification

Prior to any write operations in production, the tool creates a verified database backup in `backups/`:

- **PostgreSQL**: Invokes `pg_dump -F c -b -v -f backups/postgres_<db>_<timestamp>.dump`.
- **SQLite (Fallback)**: Creates a snapshot copy in `backups/sqlite_luxura_<timestamp>.db`.
- **Verification**: Asserts the backup file exists and has non-zero byte size before proceeding.

#### Restoration Procedures

**To restore a PostgreSQL backup:**
```bash
pg_restore -h <host> -p <port> -U <user> -d <dbname> --clean --if-exists backups/postgres_<db>_<timestamp>.dump
```

**To restore an SQLite backup:**
```bash
cp backups/sqlite_luxura_<timestamp>.db luxura.db
```

### Step 3: Production Import Execution

Once the dry-run report is reviewed and authorized, trigger production writes with the explicit `--confirm` flag:

```bash
python scripts/vehicle_import/importer.py --production --confirm
```

### Step 4: Resume or Status Check

If an import was interrupted by a network blip or rate limit:
```bash
# Check status of all records in manifest
python scripts/vehicle_import/importer.py --status

# Re-run production import (already-imported records are safely skipped)
python scripts/vehicle_import/importer.py --production --confirm
```

### Step 5: Rollback (Emergency Only)

To remove vehicles created during this import batch:
```bash
python scripts/vehicle_import/importer.py --rollback
```
