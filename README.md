# metalcard

- `frontend-next` — сайт (Next.js)
- `admin-next` — админка (Next.js, React + TypeScript)
- `docker/db-backup` — регулярные backup PostgreSQL (локально + S3)
- `docker-compose.yml` — локальный/dev запуск
- `docker-compose.prod.yml` — production запуск с Nginx и TLS

## Local (dev)

```bash
docker compose up --build -d
```

Сервисы:
- сайт: `http://localhost:3000`
- админка: `http://localhost:3001/login`
- PostgreSQL: `localhost:5433`

## Production deploy (85.198.85.90)

Целевые домены:
- `metalcards.uz` (и `www.metalcards.uz`) — сайт
- `admin.metalcards.uz` — админка
- `paycom.metalcards.uz` — endpoint оплаты/callback Payme

Рекомендуемые URL в кабинете Paycom:
- Merchant API: `https://paycom.metalcards.uz/paycom/`
- Callback: `https://paycom.metalcards.uz/`

### 1) DNS

Проверьте A-записи:
- `metalcards.uz` -> `85.198.85.90`
- `www.metalcards.uz` -> `85.198.85.90`
- `admin.metalcards.uz` -> `85.198.85.90`
- `paycom.metalcards.uz` -> `85.198.85.90`

### 2) Подготовка сервера

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-plugin
sudo systemctl enable --now docker
```

Откройте порты `80` и `443` в firewall/security group.

### 3) Переменные окружения

```bash
cp .env.example .env
```

Сгенерируйте секреты и вставьте в `.env`:

```bash
openssl rand -hex 32
openssl rand -base64 48
```

- `DB_PASSWORD` <- `openssl rand -hex 32`
- `ADMIN_SESSION_SECRET` <- `openssl rand -base64 48`

### 4) Выпуск первого TLS сертификата (Let's Encrypt)

Перед первым запуском `nginx` выпустите сертификат.
Если на сервере уже кто-то слушает `80` порт (например, другой Nginx), сначала остановите этот сервис.

```bash
./deploy/issue-certs.sh .env
```

### 5) Запуск production-стека

```bash
docker compose -f docker-compose.prod.yml --env-file .env up -d --build
```

После запуска:
- сайт: `https://metalcards.uz`
- админка: `https://admin.metalcards.uz/login`

### 6) Автообновление сертификатов

Добавьте cron на сервере (`crontab -e`):

```cron
0 */12 * * * cd /opt/metalcards && ./deploy/renew-certs.sh .env >/dev/null 2>&1
```

Подставьте фактический путь проекта вместо `/opt/metalcards`.

### 7) Проверка состояния

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f nginx
docker compose -f docker-compose.prod.yml logs -f site
docker compose -f docker-compose.prod.yml logs -f admin
```

### 8) Backup

- Локально: Docker volume `metalcard_db_backups`
- Статус последнего backup: читается админкой из `backup_status` volume
- S3 выгрузка управляется переменными:
  - `BACKUP_S3_ENABLED`
  - `S3_ENDPOINT_URL`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`
