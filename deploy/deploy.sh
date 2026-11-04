#!/usr/bin/env bash
# Deploy / update Exotique Machines on the VPS.
#
#   cd /path/to/exotique-machines && bash deploy/deploy.sh
#
# Steps: pre-flight checks → database + uploads backup → git pull → build → start →
# health checks. Stops at the first problem. Never removes volumes.
set -euo pipefail

cd "$(dirname "$0")/.."
BACKUP_DIR="${BACKUP_DIR:-$HOME/exotique-backups}"
PG_CONTAINER="${PG_CONTAINER:-postgresql-swar-postgresql-1}"
SITE="${SITE:-http://127.0.0.1:3001}"
STAMP="$(date +%Y%m%d-%H%M%S)"

say()  { printf '\n\033[1m==> %s\033[0m\n' "$*"; }
fail() { printf '\n\033[31mERROR: %s\033[0m\n' "$*" >&2; exit 1; }

# ------------------------------------------------------------------ pre-flight
say "Pre-flight checks"
command -v docker >/dev/null || fail "docker is not installed"
docker compose version >/dev/null 2>&1 || fail "docker compose plugin is missing"
[ -f .env ] || fail ".env not found. Copy .env.example to .env and fill it in."

get_env() { grep -E "^$1=" .env | tail -1 | cut -d= -f2- | tr -d '"' | tr -d "'"; }
JWT="$(get_env JWT_SECRET)"; SAPW="$(get_env SUPERADMIN_PASSWORD)"; DBURL="$(get_env DATABASE_URL)"
[ "${#JWT}" -ge 32 ] || fail "JWT_SECRET must be at least 32 random characters"
case "$JWT" in *exotique_machines_jwt_secret*|*CHANGE_ME*) fail "JWT_SECRET is a published/default value; generate a new one";; esac
[ "${#SAPW}" -ge 10 ] || fail "SUPERADMIN_PASSWORD must be set (10+ characters)"
case "$SAPW" in superadmin123|admin123|admin12345|*CHANGE_ME*) fail "SUPERADMIN_PASSWORD is a published/default value";; esac
[ -n "$DBURL" ] || fail "DATABASE_URL is missing"
docker network inspect exotique_network >/dev/null 2>&1 || fail "Docker network exotique_network does not exist (docker network create exotique_network)"
echo "ok"

# ------------------------------------------------------------------ backups
say "Backups → $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"
if docker ps --format '{{.Names}}' | grep -qx "$PG_CONTAINER"; then
  DB_USER="$(echo "$DBURL" | sed -E 's#^[^:]+://([^:@/]+).*#\1#')"
  DB_NAME="$(echo "$DBURL" | sed -E 's#.*/([^/?]+)(\?.*)?$#\1#')"
  docker exec "$PG_CONTAINER" pg_dump -U "$DB_USER" -Fc "$DB_NAME" > "$BACKUP_DIR/db-$STAMP.dump" \
    || fail "database backup failed"
  echo "database: $BACKUP_DIR/db-$STAMP.dump ($(du -h "$BACKUP_DIR/db-$STAMP.dump" | cut -f1))"
else
  echo "WARNING: PostgreSQL container '$PG_CONTAINER' not found; set PG_CONTAINER=<name> to back up the database."
  read -r -p "Continue WITHOUT a database backup? [y/N] " ans; [ "${ans:-N}" = "y" ] || exit 1
fi
UPLOADS_VOL="$(docker volume ls --format '{{.Name}}' | grep -E '(^|_)exotique_uploads$' | head -1 || true)"
if [ -n "$UPLOADS_VOL" ]; then
  docker run --rm -v "$UPLOADS_VOL":/v:ro -v "$BACKUP_DIR":/b alpine tar czf "/b/uploads-$STAMP.tgz" -C /v .
  echo "uploads ($UPLOADS_VOL): $BACKUP_DIR/uploads-$STAMP.tgz"
else
  echo "No existing uploads volume found (first deploy?)."
fi
docker image ls --format '{{.Repository}}:{{.Tag}} {{.ID}} {{.Size}}' | grep -i exotique > "$BACKUP_DIR/images-$STAMP.txt" || true

# ------------------------------------------------------------------ code
say "Updating code"
if [ -d .git ]; then
  git pull --ff-only
  git log --oneline -1
fi

# ------------------------------------------------------------------ build & start
say "Building images"
docker compose build --pull
say "Starting containers"
docker compose up -d --remove-orphans

say "Waiting for the backend (migrations run on first start)"
for i in $(seq 1 60); do
  state="$(docker inspect -f '{{.State.Health.Status}}' exotique-backend 2>/dev/null || echo starting)"
  [ "$state" = "healthy" ] && break
  if [ "$(docker inspect -f '{{.State.Status}}' exotique-backend 2>/dev/null)" = "exited" ]; then
    docker compose logs --tail=60 backend; fail "backend exited — see the log above"
  fi
  sleep 3
done
[ "$state" = "healthy" ] || { docker compose logs --tail=60 backend; fail "backend not healthy after 3 minutes"; }

# ------------------------------------------------------------------ checks
say "Checks against $SITE"
check() { code="$(curl -s -o /dev/null -w '%{http_code}' "$SITE$1")"; printf '%-22s %s (expected %s)\n' "$1" "$code" "$2"; [ "$code" = "$2" ] || FAILED=1; }
FAILED=0
check /               200
check /cars           200
check /api/health     200
check /sitemap.xml    200
check /robots.txt     200
check /__seo/         404
check /docs           404
curl -s "$SITE/" | grep -q 'application/ld+json' && echo "structured data      present" || { echo "structured data      MISSING"; FAILED=1; }
docker compose logs backend 2>/dev/null | grep -E '"level": "critical"' | tail -5 || true
[ "$FAILED" = 0 ] || fail "some checks failed (containers are running; inspect with: docker compose logs -f)"

say "Deployed. Next (one-off, safe):"
cat <<'EOF'
  docker compose exec backend python -m backend.scripts.warm_images --dry-run
  docker compose exec backend python -m backend.scripts.warm_images
  docker compose exec backend python -m backend.scripts.warm_images --sanitize-legacy
Roll back: docker compose down (never -v) && git checkout <previous-commit> && docker compose up -d --build
EOF
