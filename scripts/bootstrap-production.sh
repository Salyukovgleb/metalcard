#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

ENV_FILE=".env"
ADMIN_EMAIL=""
ADMIN_NAME="Administrator"
SKIP_ADMIN=false
SYNC_EXISTING=false

usage() {
  cat <<'EOF'
Usage: ./scripts/bootstrap-production.sh [options]

Options:
  --env-file PATH       Environment file (default: .env)
  --admin-email EMAIL   Admin login; prompts for it when omitted
  --admin-name NAME     Admin display name (default: Administrator)
  --skip-admin          Do not create or reset an admin account
  --sync-existing       Replace existing catalog titles/prices with project defaults
  -h, --help            Show this help
EOF
}

while (($#)); do
  case "$1" in
    --env-file) ENV_FILE="${2:?Missing value for --env-file}"; shift 2 ;;
    --admin-email) ADMIN_EMAIL="${2:?Missing value for --admin-email}"; shift 2 ;;
    --admin-name) ADMIN_NAME="${2:?Missing value for --admin-name}"; shift 2 ;;
    --skip-admin) SKIP_ADMIN=true; shift ;;
    --sync-existing) SYNC_EXISTING=true; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage >&2; exit 2 ;;
  esac
done

command -v docker >/dev/null || { echo "Docker is required" >&2; exit 1; }
[[ -s "$ENV_FILE" ]] || { echo "Environment file is missing or empty: $ENV_FILE" >&2; exit 1; }
[[ -f deploy/postgres/init/01_schema.sql ]] || { echo "Database schema file is missing" >&2; exit 1; }

svg_count="$(find frontend-next/origs -type f -name '*.svg' | wc -l | tr -d ' ')"
font_count="$(find frontend-next/public/fonts -type f | wc -l | tr -d ' ')"
image_count="$(find frontend-next/public/images -type f | wc -l | tr -d ' ')"
((svg_count > 0 && font_count > 0 && image_count > 0)) || { echo "Project assets are incomplete" >&2; exit 1; }
echo "[assets] SVG=$svg_count fonts=$font_count images=$image_count"

COMPOSE=(docker compose -f docker-compose.prod.yml --env-file "$ENV_FILE")
"${COMPOSE[@]}" config --quiet
"${COMPOSE[@]}" up -d --wait db

backup_dir="$ROOT_DIR/.bootstrap-backups"
mkdir -p "$backup_dir"
chmod 700 "$backup_dir"
backup_file="$backup_dir/metalcard-before-bootstrap-$(date -u +%Y%m%dT%H%M%SZ).dump"
"${COMPOSE[@]}" exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' >"$backup_file"
chmod 600 "$backup_file"
echo "[backup] $backup_file"

"${COMPOSE[@]}" exec -T db sh -c 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' \
  < deploy/postgres/init/01_schema.sql

"${COMPOSE[@]}" build admin
seed_args=(node scripts/bootstrap-project-data.mjs --source-dir /app/frontend-next/origs)
if [[ "$SYNC_EXISTING" == true ]]; then seed_args+=(--sync-existing); fi
"${COMPOSE[@]}" run --rm --no-deps -T admin "${seed_args[@]}"

if [[ "$SKIP_ADMIN" != true ]]; then
  if [[ -z "$ADMIN_EMAIL" ]]; then
    read -r -p "Admin email: " ADMIN_EMAIL </dev/tty
  fi
  read -r -s -p "New admin password (12+ characters): " ADMIN_PASSWORD </dev/tty
  echo >/dev/tty
  read -r -s -p "Repeat admin password: " ADMIN_PASSWORD_REPEAT </dev/tty
  echo >/dev/tty
  [[ "$ADMIN_PASSWORD" == "$ADMIN_PASSWORD_REPEAT" ]] || { echo "Passwords do not match" >&2; exit 1; }
  printf '%s' "$ADMIN_PASSWORD" | "${COMPOSE[@]}" run --rm --no-deps -T admin \
    node scripts/create-admin.mjs --email "$ADMIN_EMAIL" --name "$ADMIN_NAME"
  unset ADMIN_PASSWORD ADMIN_PASSWORD_REPEAT
fi

"${COMPOSE[@]}" up -d --build --wait
"${COMPOSE[@]}" exec -T db sh -c \
  'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atc "SELECT '\''designs='\''||count(*) FROM designs UNION ALL SELECT '\''active_colors='\''||count(*) FROM colors WHERE active IS TRUE UNION ALL SELECT '\''admins='\''||count(*) FROM users;"'
"${COMPOSE[@]}" ps
echo "[done] Production bootstrap completed successfully"
