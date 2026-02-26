#!/bin/sh
set -eu

: "${DB_HOST:=db}"
: "${DB_PORT:=5432}"
: "${DB_NAME:=metalcard}"
: "${DB_USER:=metalcard}"
: "${DB_PASSWORD:=metalcard}"

: "${BACKUP_DIR:=/backups}"
: "${BACKUP_STATUS_FILE:=/backup-status/last_backup.json}"
: "${BACKUP_FILE_PREFIX:=metalcard}"
: "${BACKUP_INTERVAL_HOURS:=6}"
: "${BACKUP_RETENTION_DAYS:=14}"

: "${BACKUP_S3_ENABLED:=true}"
: "${BACKUP_S3_ENDPOINT_URL:=${S3_ENDPOINT_URL:-}}"
: "${BACKUP_S3_REGION:=${S3_REGION:-us-east-1}}"
: "${BACKUP_S3_BUCKET:=${S3_BUCKET:-}}"
: "${BACKUP_S3_ACCESS_KEY:=${S3_ACCESS_KEY:-}}"
: "${BACKUP_S3_SECRET_KEY:=${S3_SECRET_KEY:-}}"
: "${BACKUP_S3_PREFIX:=db-backups}"
: "${BACKUP_S3_FORCE_PATH_STYLE:=true}"

export PGPASSWORD="${DB_PASSWORD}"

mkdir -p "${BACKUP_DIR}" "$(dirname "${BACKUP_STATUS_FILE}")"

json_escape() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

human_size() {
  bytes="$1"
  awk -v b="${bytes}" '
    function human(x) {
      split("B KB MB GB TB", u, " ")
      i = 1
      while (x >= 1024 && i < 5) {
        x = x / 1024
        i++
      }
      return sprintf("%.2f %s", x, u[i])
    }
    BEGIN { print human(b) }
  '
}

is_true() {
  case "$(printf '%s' "${1:-}" | tr '[:upper:]' '[:lower:]')" in
    1|true|yes|on) return 0 ;;
    *) return 1 ;;
  esac
}

write_status() {
  ok="$1"
  label="$2"
  file="$3"
  size_bytes="$4"
  size_human="$5"
  started_at="$6"
  finished_at="$7"
  s3_ok="$8"
  s3_key="$9"
  s3_error="${10}"
  generated_at="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  tmp_file="${BACKUP_STATUS_FILE}.tmp"

  cat > "${tmp_file}" <<EOF
{
  "ok": ${ok},
  "label": "$(json_escape "${label}")",
  "file": "$(json_escape "${file}")",
  "size_bytes": ${size_bytes},
  "size_human": "$(json_escape "${size_human}")",
  "started_at": "${started_at}",
  "finished_at": "${finished_at}",
  "s3_ok": ${s3_ok},
  "s3_key": "$(json_escape "${s3_key}")",
  "s3_error": "$(json_escape "${s3_error}")",
  "generated_at": "${generated_at}"
}
EOF
  mv "${tmp_file}" "${BACKUP_STATUS_FILE}"
}

upload_to_s3() {
  upload_local_file="$1"
  upload_local_name="$2"

  if ! is_true "${BACKUP_S3_ENABLED}"; then
    printf '%s\n' "S3 upload disabled"
    return 2
  fi

  if [ -z "${BACKUP_S3_BUCKET}" ] || [ -z "${BACKUP_S3_ENDPOINT_URL}" ] || [ -z "${BACKUP_S3_ACCESS_KEY}" ] || [ -z "${BACKUP_S3_SECRET_KEY}" ]; then
    printf '%s\n' "S3 vars are incomplete"
    return 1
  fi

  prefix="$(printf '%s' "${BACKUP_S3_PREFIX}" | sed 's#^/*##; s#/*$##')"
  if [ -n "${prefix}" ]; then
    s3_key="${prefix}/${upload_local_name}"
  else
    s3_key="${upload_local_name}"
  fi

  export BCK_S3_ENDPOINT_URL="${BACKUP_S3_ENDPOINT_URL}"
  export BCK_S3_REGION="${BACKUP_S3_REGION}"
  export BCK_S3_BUCKET="${BACKUP_S3_BUCKET}"
  export BCK_S3_ACCESS_KEY="${BACKUP_S3_ACCESS_KEY}"
  export BCK_S3_SECRET_KEY="${BACKUP_S3_SECRET_KEY}"
  export BCK_S3_FORCE_PATH_STYLE="${BACKUP_S3_FORCE_PATH_STYLE}"
  export BCK_LOCAL_FILE="${upload_local_file}"
  export BCK_S3_KEY="${s3_key}"

  python3 - <<'PY'
import os
import sys
import boto3
from botocore.config import Config

endpoint = os.environ["BCK_S3_ENDPOINT_URL"].strip()
region = os.environ["BCK_S3_REGION"].strip() or "us-east-1"
bucket = os.environ["BCK_S3_BUCKET"].strip()
access_key = os.environ["BCK_S3_ACCESS_KEY"].strip()
secret_key = os.environ["BCK_S3_SECRET_KEY"].strip()
local_file = os.environ["BCK_LOCAL_FILE"].strip()
key = os.environ["BCK_S3_KEY"].strip()
force_path = os.environ.get("BCK_S3_FORCE_PATH_STYLE", "true").strip().lower() in {"1", "true", "yes", "on"}

client = boto3.client(
    "s3",
    endpoint_url=endpoint,
    region_name=region,
    aws_access_key_id=access_key,
    aws_secret_access_key=secret_key,
    config=Config(s3={"addressing_style": "path" if force_path else "virtual"}),
)

client.upload_file(local_file, bucket, key, ExtraArgs={"ContentType": "application/gzip"})
print(key)
PY
}

wait_for_db() {
  i=0
  until pg_isready -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" >/dev/null 2>&1; do
    i=$((i + 1))
    if [ "${i}" -gt 120 ]; then
      echo "DB is not ready after 120 checks"
      exit 1
    fi
    sleep 1
  done
}

run_backup() {
  started_at="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  ts="$(date -u +"%Y%m%d_%H%M%S")"
  filename="${BACKUP_FILE_PREFIX}_${ts}.sql.gz"
  output="${BACKUP_DIR}/${filename}"

  if pg_dump -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" --clean --if-exists --no-owner --no-privileges | gzip > "${output}"; then
    size_bytes="$(wc -c < "${output}" | tr -d ' ')"
    size_human="$(human_size "${size_bytes}")"
    s3_ok=false
    s3_key=""
    s3_error=""
    status_label="Успешно (локально)"

    if is_true "${BACKUP_S3_ENABLED}"; then
      upload_result="$(upload_to_s3 "${output}" "${filename}" 2>&1)" || true
      upload_last_line="$(printf '%s' "${upload_result}" | tail -n 1)"
      case "${upload_last_line}" in
        *"${filename}")
        s3_ok=true
        s3_key="${upload_last_line}"
        status_label="Успешно (локально + S3)"
        ;;
        *)
        s3_error="$(printf '%s' "${upload_result}" | tail -n 5 | tr '\n' ' ' | sed 's/  */ /g')"
        status_label="Локально ок, S3 ошибка"
        ;;
      esac
    fi

    finished_at="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
    write_status true "${status_label}" "${filename}" "${size_bytes}" "${size_human}" "${started_at}" "${finished_at}" "${s3_ok}" "${s3_key}" "${s3_error}"
    echo "[backup] ${filename} (${size_human})"
  else
    rm -f "${output}"
    finished_at="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
    write_status false "Ошибка создания бэкапа" "" 0 "" "${started_at}" "${finished_at}" false "" ""
    echo "[backup] failed"
  fi

  if [ "${BACKUP_RETENTION_DAYS}" -gt 0 ] 2>/dev/null; then
    find "${BACKUP_DIR}" -type f -name "${BACKUP_FILE_PREFIX}_*.sql.gz" -mtime +"${BACKUP_RETENTION_DAYS}" -delete
  fi
}

wait_for_db
echo "[backup] connected to ${DB_HOST}:${DB_PORT}/${DB_NAME}"

run_backup

interval_seconds=$((BACKUP_INTERVAL_HOURS * 3600))
if [ "${interval_seconds}" -lt 300 ]; then
  interval_seconds=300
fi

while true; do
  sleep "${interval_seconds}"
  run_backup
done
