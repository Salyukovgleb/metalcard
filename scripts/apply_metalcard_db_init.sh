#!/usr/bin/env bash
# Apply metalcard_db/init/*.sql to the running Postgres container (Next.js schema).
# Requires: docker, running container metalcard_db (or PG_CONTAINER), .env with DB_*.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

: "${DB_USER:=metalcard}"
: "${DB_NAME:=metalcard}"
: "${DB_PASSWORD:?DB_PASSWORD must be set (e.g. in .env)}"
CONTAINER="${PG_CONTAINER:-metalcard_db}"

for f in metalcard_db/init/01_schema.sql metalcard_db/init/02_add_price_overrides.sql metalcard_db/init/03_add_sort_order.sql; do
  if [[ ! -f "$f" ]]; then
    echo "Missing file: $f" >&2
    exit 1
  fi
  echo "==> $f"
  docker exec -i -e PGPASSWORD="${DB_PASSWORD}" "${CONTAINER}" \
    psql -U "${DB_USER}" -d "${DB_NAME}" -v ON_ERROR_STOP=1 <"$f"
done

echo "Done. Re-run import scripts if needed."
