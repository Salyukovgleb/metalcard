#!/bin/bash
# Скрипт для исправления прав доступа к файлам базы данных PostgreSQL
# Использование: выполнить на сервере

echo "Исправление прав доступа к базе данных PostgreSQL..."

# Путь к директории данных (из docker-compose.yml)
DATA_DIR="./metalcard_db/data"

if [ ! -d "$DATA_DIR" ]; then
    echo "ОШИБКА: Директория $DATA_DIR не найдена!"
    echo "Убедитесь, что вы находитесь в правильной директории."
    exit 1
fi

echo "Остановка контейнера базы данных..."
cd metalcard_db || exit 1
docker compose down

echo ""
echo "Исправление прав доступа..."
# PostgreSQL в контейнере обычно использует UID 999
# Даем полные права на директорию
sudo chown -R 999:999 "$DATA_DIR"
sudo chmod -R 700 "$DATA_DIR"

echo ""
echo "Запуск контейнера..."
docker compose up -d

echo ""
echo "Ожидание готовности базы данных..."
sleep 5

echo ""
echo "Проверка статуса..."
docker compose ps

echo ""
echo "✓ Готово! База данных должна работать."

