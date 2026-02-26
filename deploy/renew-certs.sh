#!/usr/bin/env sh
set -eu

ENV_FILE="${1:-.env}"

if [ ! -f "${ENV_FILE}" ]; then
  echo "Env file not found: ${ENV_FILE}"
  exit 1
fi

docker compose -f docker-compose.prod.yml --env-file "${ENV_FILE}" --profile certbot run --rm certbot
docker compose -f docker-compose.prod.yml --env-file "${ENV_FILE}" exec -T nginx nginx -s reload

echo "Certificates renewed and nginx reloaded"
