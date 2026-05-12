# Исправление ошибки PostgreSQL "could not open directory 'pg_notify'"

## Проблема

PostgreSQL контейнер постоянно перезапускается с ошибкой:
```
FATAL:  could not open directory "pg_notify": No such file or directory
```

## Причина

Директория данных PostgreSQL повреждена или неполная. Отсутствуют необходимые директории или неправильные права доступа.

## Решение

### Вариант 1: Исправить права и структуру (сохранит данные)

```bash
cd /root/metalcard/metalcard_db
chmod +x fix_postgres.sh
sudo ./fix_postgres.sh
# Выберите вариант 1
```

### Вариант 2: Пересоздать базу данных с нуля (удалит все данные!)

```bash
cd /root/metalcard/metalcard_db

# Остановить контейнер
docker compose down

# Удалить данные
rm -rf data

# Запустить заново
docker compose up -d
```

### Вариант 3: Ручное исправление

```bash
cd /root/metalcard/metalcard_db

# Остановить контейнер
docker compose down

# Исправить права
sudo chown -R 999:999 data
sudo chmod -R 700 data

# Создать недостающие директории
sudo mkdir -p data/pg_notify
sudo mkdir -p data/pg_stat_tmp
sudo mkdir -p data/pg_stat
sudo mkdir -p data/pg_snapshots
sudo mkdir -p data/pg_replslot
sudo mkdir -p data/pg_tblspc
sudo mkdir -p data/pg_twophase
sudo mkdir -p data/pg_wal

# Установить права
sudo chmod 700 data/pg_notify
sudo chmod 700 data/pg_stat_tmp
sudo chmod 700 data/pg_stat
sudo chmod 700 data/pg_snapshots
sudo chmod 700 data/pg_replslot
sudo chmod 700 data/pg_tblspc
sudo chmod 700 data/pg_twophase
sudo chmod 700 data/pg_wal

# Запустить контейнер
docker compose up -d
```

## Проверка

После исправления проверьте:

```bash
# Статус контейнера
docker ps | grep metalcard_db

# Логи
docker logs metalcard_db

# Подключение к базе
docker exec metalcard_db pg_isready -U metalcard -d metalcard
```

## Если проблема сохраняется

1. Проверьте логи: `docker logs -f metalcard_db`
2. Проверьте права: `ls -la data/`
3. Попробуйте вариант 2 (пересоздание с нуля)
4. Убедитесь, что достаточно места на диске: `df -h`

---

**Дата:** 2026-01-09  
**Проблема:** PostgreSQL не может открыть директорию pg_notify  
**Решение:** Исправить права доступа или пересоздать базу данных
