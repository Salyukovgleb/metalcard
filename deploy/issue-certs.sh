#!/usr/bin/env sh
set -eu

ENV_FILE="${1:-.env}"

if [ ! -f "${ENV_FILE}" ]; then
  echo "Env file not found: ${ENV_FILE}"
  exit 1
fi

# shellcheck disable=SC1090
set -a
. "${ENV_FILE}"
set +a

SITE_DOMAIN="${SITE_DOMAIN:-metalcards.uz}"
ADMIN_DOMAIN="${ADMIN_DOMAIN:-admin.metalcards.uz}"
LETSENCRYPT_EMAIL="${LETSENCRYPT_EMAIL:-}"

if [ -z "${LETSENCRYPT_EMAIL}" ]; then
  echo "LETSENCRYPT_EMAIL is empty in ${ENV_FILE}"
  exit 1
fi

if [ "${SITE_DOMAIN}" = "${ADMIN_DOMAIN}" ]; then
  echo "SITE_DOMAIN and ADMIN_DOMAIN must be different"
  exit 1
fi

echo "Issuing Let's Encrypt certificate for: ${SITE_DOMAIN}, www.${SITE_DOMAIN}, ${ADMIN_DOMAIN}"
docker volume create metalcard_letsencrypt >/dev/null

docker run --rm -p 80:80 \
  -v metalcard_letsencrypt:/etc/letsencrypt \
  certbot/certbot:latest certonly --standalone --preferred-challenges http \
  -d "${SITE_DOMAIN}" -d "www.${SITE_DOMAIN}" -d "${ADMIN_DOMAIN}" \
  --email "${LETSENCRYPT_EMAIL}" --agree-tos --no-eff-email

echo "Certificate issued. Start stack with:"
echo "docker compose -f docker-compose.prod.yml --env-file ${ENV_FILE} up -d --build"
