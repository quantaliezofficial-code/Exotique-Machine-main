# Exotique Machines: Vehicle Fleet Importer & Hostinger Settlement Pipeline

## Executive Overview

The **Exotique Machines** vehicle import and settlement system is fully prepared. It provides a non-destructive, multi-tier ingestion workflow designed to safely take your vehicle fleet data (`vehicles.json`) and image archive (`vehicle-images.zip`), validate and match all records, create automated timestamped backups, and settle the data across both your local stores and your deployed project on **Hostinger**.

---

## 1. What You Need to Upload

Place the following two files in the project root directory (`c:\Users\ACER\code\exotique machines\`):

| File | Purpose | Example Format / Contents |
| :--- | :--- | :--- |
| **`vehicles.json`** | Fleet specifications with image references | Array of vehicle objects matching the schema below |
| **`vehicle-images.zip`** | Archive of high-resolution vehicle photos | `.jpg`, `.jpeg`, `.png`, or `.webp` files (flat or organized in folders) |

---

## 2. Recommended `vehicles.json` Schema

```json
[
  {
    "brand": "BMW",
    "model": "X5 xDrive40i",
    "price": 8500000,
    "badge": "Featured",
    "type": "SUV",
    "category": "Luxury SUV",
    "lifestyle": "SUV",
    "fuel": "Petrol",
    "transmission": "Automatic",
    "emi": 145000,
    "seats": 5,
    "engine": "3.0L TwinPower Turbo",
    "power": "335 HP",
    "mileage": "12 km/l",
    "description": "Luxury SUV with advanced comfort and performance features.",
    "features": "Panoramic roof, Adaptive cruise control, 360-degree camera",
    "colors": "Black, White, Blue",
    "rating": 5,
    "image_files": [
      "bmw-x5-01.jpg",
      "bmw-x5-02.jpg",
      "bmw-x5-03.jpg"
    ]
  }
]
```

### Key Formatting Rules & Auto-Conversions

- **Required Fields**: `brand`, `model`, and `price`.
- **Price Intelligence**:
  - Full INR amounts (e.g. `8500000` or `"85,00,000"`) are automatically normalized to Lakhs (`85.0`).
  - Direct Lakh amounts (e.g. `85.0` or `17.25`) are preserved.
- **EMI Calculation**: If `emi` is missing or `0`, it is auto-computed based on the showroom price.
- **Colors**: Can be specified as comma-separated text (e.g., `"Black, White, Blue"`); the importer automatically maps them to luxury hex color codes (`#0B0C0E`, `#FDFCFA`, `#1E3A8A`).
- **Features**: Can be comma-separated or newline-separated strings; the importer parses them into clean arrays.
- **Images**: `image_files` must list the exact filenames (or relative paths) present inside `vehicle-images.zip`.

---

## 3. Automated Safety & Backup Safeguards

Before any record or file is modified, the importer automatically creates timestamped backups in `server/data/backups/`:
1. `vehicles_backup_<timestamp>.json`: Preserves the current `server/data/vehicles.json`.
2. `data_ts_backup_<timestamp>.ts`: Preserves the current `src/data.ts`.
3. `db_vehicles_<timestamp>.json`: Dumps all current database records.

---

## 4. Execution Commands

Once you have placed `vehicles.json` and `vehicle-images.zip` in the root folder, run:

### Step 1: Pre-flight Dry Run (Non-destructive)
```bash
python scripts/import_vehicles.py --dry-run
# or via npm
npm run import:dry-run
```
*Validates all records, tests image matching, checks missing files, and previews the normalized records without altering any files or databases.*

### Step 2: Full Import & Hostinger Build
```bash
python scripts/import_vehicles.py --build-hostinger
# or via npm
npm run import:vehicles
npm run build:hostinger
```

---

## 5. Hostinger Push & Settlement Options

Depending on your Hostinger hosting plan:

### Option A: Hostinger Shared / Cloud Web Hosting (Static SPA & Media)
1. Run `npm run build:hostinger` (creates `dist/` with updated bundle and `dist/uploads/`).
2. Log in to **Hostinger hPanel** &rarr; **File Manager**.
3. Open `public_html/`.
4. Upload all files and folders from your local `dist/` directory into `public_html/` (including `index.html`, `assets/`, `uploads/`, and `.htaccess`).
5. Your newly imported vehicles and high-resolution images are live immediately.

### Option B: Hostinger VPS (Full-Stack Docker / FastAPI + PostgreSQL)
1. Commit the settled data and push to GitHub:
   ```bash
   git add server/data/ src/data.ts server/uploads/
   git commit -m "feat(fleet): import new vehicle fleet and media assets"
   git push origin master
   ```
2. SSH into your Hostinger VPS and pull the latest changes:
   ```bash
   git pull origin master
   docker compose up -d --build
   ```
