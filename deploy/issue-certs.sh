#!/usr/bin/env sh
set -eu

ENV_FILE="${1:-.env}"

case "${ENV_FILE}" in
  /*|./*|../*) ENV_PATH="${ENV_FILE}" ;;
  *) ENV_PATH="./${ENV_FILE}" ;;
esac

if [ ! -f "${ENV_PATH}" ]; then
  echo "Env file not found: ${ENV_PATH}"
  exit 1
fi

read_env_value() {
  awk -v key="$1" '
    index($0, key "=") == 1 {
      value = substr($0, length(key) + 2)
    }
    END {
      sub(/\r$/, "", value)
      if ((substr(value, 1, 1) == "\"" && substr(value, length(value), 1) == "\"") ||
          (substr(value, 1, 1) == "\047" && substr(value, length(value), 1) == "\047")) {
        value = substr(value, 2, length(value) - 2)
      }
      print value
    }
  ' "${ENV_PATH}"
}

SITE_DOMAIN="$(read_env_value SITE_DOMAIN)"
ADMIN_DOMAIN="$(read_env_value ADMIN_DOMAIN)"
PAYCOM_DOMAIN="$(read_env_value PAYCOM_DOMAIN)"
LETSENCRYPT_EMAIL="$(read_env_value LETSENCRYPT_EMAIL)"

SITE_DOMAIN="${SITE_DOMAIN:-metalcards.uz}"
ADMIN_DOMAIN="${ADMIN_DOMAIN:-admin.metalcards.uz}"
PAYCOM_DOMAIN="${PAYCOM_DOMAIN:-paycom.metalcards.uz}"

if [ -z "${LETSENCRYPT_EMAIL}" ]; then
  echo "LETSENCRYPT_EMAIL is empty in ${ENV_FILE}"
  exit 1
fi

if [ "${SITE_DOMAIN}" = "${ADMIN_DOMAIN}" ] || [ "${SITE_DOMAIN}" = "${PAYCOM_DOMAIN}" ] || [ "${ADMIN_DOMAIN}" = "${PAYCOM_DOMAIN}" ]; then
  echo "SITE_DOMAIN, ADMIN_DOMAIN and PAYCOM_DOMAIN must be different"
  exit 1
fi

echo "Issuing Let's Encrypt certificate for: ${SITE_DOMAIN}, www.${SITE_DOMAIN}, ${ADMIN_DOMAIN}, ${PAYCOM_DOMAIN}"
docker volume create metalcard_letsencrypt >/dev/null

docker run --rm -p 80:80 \
  -v metalcard_letsencrypt:/etc/letsencrypt \
  certbot/certbot:latest certonly --standalone --preferred-challenges http \
  -d "${SITE_DOMAIN}" -d "www.${SITE_DOMAIN}" -d "${ADMIN_DOMAIN}" -d "${PAYCOM_DOMAIN}" \
  --email "${LETSENCRYPT_EMAIL}" --agree-tos --no-eff-email

echo "Certificate issued. Start stack with:"
echo "docker compose -f docker-compose.prod.yml --env-file ${ENV_FILE} up -d --build"
