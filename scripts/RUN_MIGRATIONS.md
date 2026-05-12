# Запуск всех миграций и скриптов инициализации БД

## Быстрый запуск

На сервере выполните:

```bash
cd /root/metalcard

# Установите переменные окружения для БД
export DB_HOST=85.198.85.90
export DB_PORT=5433
export DB_NAME=metalcard
export DB_USER=metalcard
export DB_PASSWORD=metalcard

# Запустите скрипт
./scripts/run_all_migrations.sh
```

## Что делает скрипт

Скрипт `run_all_migrations.sh` выполняет все миграции и инициализацию в правильном порядке:

1. **Проверка подключения к БД** - убеждается, что PostgreSQL доступен
2. **Django миграции** - запускает миграции для admin_metalcard (создает таблицы auth_user и др.)
3. **Импорт цветов** - импортирует все цвета карт в таблицу colors
4. **Импорт дизайнов** - импортирует все SVG дизайны из папки origs в таблицу designs
5. **Настройка цен** - устанавливает базовые цены для цветов и специальных дизайнов
6. **Сброс цен дизайнов** - устанавливает base_price=0 для всех дизайнов
7. **Создание администратора** - создает суперпользователя Django
8. **Сборка статики Netlify** - собирает статические файлы для Netlify
9. **Скачивание шрифтов** - скачивает недостающие шрифты из Google Fonts
10. **Тест шрифтов** - проверяет наличие и корректность всех шрифтов

## Параметры администратора

По умолчанию создается администратор:
- **Username:** admin
- **Email:** Salyukov.gleb033@mail.com
- **Password:** 123490ru

Можно изменить через переменные окружения:

```bash
export ADMIN_USERNAME=admin
export ADMIN_EMAIL=Salyukov.gleb033@mail.com
export ADMIN_PASSWORD=123490ru

./scripts/run_all_migrations.sh
```

## Запуск отдельных скриптов

Если нужно запустить только определенные скрипты:

```bash
# Импорт цветов
python3 scripts/import_colors.py

# Импорт дизайнов
python3 scripts/import_designs.py

# Настройка цен
python3 scripts/setup_prices.py

# Создание администратора
python3 scripts/create_admin_superuser.py \
  --username admin \
  --email Salyukov.gleb033@mail.com \
  --password 123490ru

# Или через raw SQL
DB_HOST=85.198.85.90 DB_PORT=5433 DB_NAME=metalcard DB_USER=metalcard DB_PASSWORD=metalcard \
python3 scripts/create_admin_raw.py \
  --username admin \
  --email Salyukov.gleb033@mail.com \
  --password 123490ru

# Сборка статики
python3 scripts/build_netlify_static.py

# Скачивание шрифтов
python3 scripts/download_fonts.py

# Тест шрифтов
python3 scripts/test_all_fonts.py
```

## Требования

- Python 3 с установленными пакетами:
  - psycopg2-binary (для подключения к PostgreSQL)
  - Django (для миграций и создания администратора)
- Доступ к PostgreSQL на 85.198.85.90:5433
- Установленные зависимости проекта

## Проверка результатов

После выполнения скрипта проверьте:

```bash
# Подключение к БД
psql -h 85.198.85.90 -p 5433 -U metalcard -d metalcard

# Проверка таблиц
\dt

# Проверка цветов
SELECT COUNT(*) FROM colors;

# Проверка дизайнов
SELECT COUNT(*) FROM designs;

# Проверка администратора
SELECT username, email, is_superuser FROM auth_user;
```

---

**Дата:** 2026-01-09  
**Скрипт:** run_all_migrations.sh  
**БД:** 85.198.85.90:5433/metalcard
