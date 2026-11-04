# Exotique Machines — website

Certified pre-owned luxury car showroom, Lucknow. Public website, staff portal and CMS.

| Part | Stack |
|---|---|
| Frontend | React 19 + TypeScript, Vite 6, Tailwind 4, served by nginx (`exotique-frontend`) |
| Backend | FastAPI, SQLAlchemy 2, Alembic, PostgreSQL (`exotique-backend`) |
| Images | Pillow pipeline: original kept untouched, sanitised master, WebP + AVIF at 320–1920 px |
| SEO | Server-rendered head tags, JSON-LD and content snapshot for every page; sitemap, robots, llms.txt |

Everything a visitor sees (hero slides, featured cars, offers, reviews, contact details, FAQ, SEO
text, home page sections) is edited in **/admin → Website**. See `docs/CMS_ADMIN_GUIDE.md`.

## Run locally

```bash
# backend (SQLite is fine for development)
pip install -r backend/requirements-dev.txt
export ENVIRONMENT=development FALLBACK_TO_SQLITE=true SUPERADMIN_USERNAME=owner SUPERADMIN_PASSWORD='Choose#A-Strong-One1'
python run_backend.py            # http://localhost:5000

# frontend
npm ci
npm run dev                      # http://localhost:3000 (proxies /api and /uploads)
```

## Checks

```bash
python -m pytest backend/tests -q   # 55 tests: security, CMS, SEO, image pipeline
npm run build                       # TypeScript check + production build
```

## Deploy

On the VPS, from the project folder: `bash deploy/deploy.sh` (checks `.env`, backs up the database and
uploads, pulls, builds, starts and verifies). Full guide, rollback and image warm-up are in the
documentation pack (`DEPLOYMENT.md`), which is shared separately and not kept in this repository
(`docs/` is git-ignored).
