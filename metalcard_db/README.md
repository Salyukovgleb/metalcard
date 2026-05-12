# Metalcard DB

Dockerized Postgres database for Metalcard with automatic schema initialization.

## Quick start

- Requirements: Docker and Docker Compose
- Default connection:
  - Host: `localhost`
  - Port: `5433` (mapped to container `5432`)
  - Database: `metalcard`
  - User: `metalcard`
  - Password: `metalcard`

### Run

1. From repository root:
   
   ```bash
   cd metalcard_db
   docker compose up -d
   ```

2. On first startup, Postgres runs all `init/*.sql` in lexicographic order (`01_schema.sql`, `02_add_price_overrides.sql`, `03_add_sort_order.sql`, …) and creates tables, types, and indexes.

### Stop and remove

```bash
docker compose down
```

To reset the database (including re-running init SQL on next start), remove the data directory:

```bash
docker compose down
rm -rf data
docker compose up -d
```

### Verify

Use any Postgres client, for example:

```bash
psql postgresql://metalcard:metalcard@localhost:5433/metalcard -c "\\dt" 
```

You should see `designs`, `colors`, `promos`, `orders`, `order_items`, `payments` and the defined enum types.

## Notes

- Root `docker-compose.yml` and `docker-compose.prod.yml` mount `./metalcard_db/init` into the `db` service the same way.
- The init SQL runs only on a fresh data directory (standard Postgres behavior).
- Change credentials/port in `docker-compose.yml` if needed.
- Persisted data lives in `metalcard_db/data/`.
