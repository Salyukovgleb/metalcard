# metalcard

- `frontend-next` — новый сайт (Next.js)
- `admin-next` — новая админка (Next.js, React + TypeScript)
- `Metalcard/metalcard_db/init` — инициализация схемы БД

## Docker

```bash
docker compose up --build -d
```

Сервисы:
- сайт: `http://localhost:3000`
- админка: `http://localhost:3001/login`
- PostgreSQL: `localhost:5433`
- бэкапы: локально в Docker volume `db_backups` + выгрузка в S3 (Beget)

Используйте `.env.example` как шаблон переменных окружения (DB, S3 Beget, backup, платежи).
