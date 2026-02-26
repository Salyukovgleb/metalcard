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
