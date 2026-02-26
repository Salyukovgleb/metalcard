# admin-next

Новая админка Metalcard на Next.js (React + TypeScript), работающая с той же структурой БД:
- `designs`
- `colors`
- `promos`
- `orders`
- `order_items`
- `payments`
- `users`

## Запуск локально

```bash
cd admin-next
npm install
npm run dev
```

Откройте `http://localhost:3000/login`.

## Переменные окружения

См. корневой `.env.example`.

Ключевые переменные:
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- `ADMIN_SESSION_SECRET`
- `USE_S3_MEDIA`, `S3_ENDPOINT_URL`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`
- `BACKUP_STATUS_FILE` (по умолчанию `/backup-status/last_backup.json`)

## Импорт принтов (designs) и цветов в БД + S3

Скрипт: `admin-next/scripts/sync-prints-colors.mjs`

Что делает:
- Загружает SVG принты в S3.
- Обновляет/создает записи в таблице `designs` из `designs.csv`.
- Обновляет/создает цвета из `colors.csv`.
- Отключает все цвета, кроме:
  - `black-silver-mat`
  - `black-gold-rib`
  - `gold-mirror`
  - `gold-mirror-black`
  - `red`
  - `blue`

Пример dry-run (проверка файлов, без записи в БД/S3):

```bash
node admin-next/scripts/sync-prints-colors.mjs \
  --source-dir frontend-next/origs \
  --designs-csv /path/to/designs_202602261604.csv \
  --colors-csv /path/to/colors_202602261604.csv \
  --dry-run
```

Пример запуска на сервере через Docker Compose:

```bash
docker compose -f docker-compose.prod.yml --env-file .env run --rm \
  -v \"$PWD/frontend-next/origs:/data/origs:ro\" \
  -v \"/path/to/bd:/data/csv:ro\" \
  admin node scripts/sync-prints-colors.mjs \
    --source-dir /data/origs \
    --designs-csv /data/csv/designs_202602261604.csv \
    --colors-csv /data/csv/colors_202602261604.csv
```
