#!/bin/bash
# Скрипт для проверки базы данных metalcard на сервере

echo "==================================="
echo "Проверка базы данных metalcard"
echo "==================================="
echo ""

# Проверка контейнера БД
echo "1. Проверка контейнера metalcard_db:"
docker ps -a | grep metalcard_db
echo ""

# Подключение к БД и проверка таблиц
echo "2. Список таблиц в БД:"
docker exec metalcard_db psql -U metalcard -d metalcard -c "\dt" 2>/dev/null
echo ""

# Проверка количества записей в основных таблицах
echo "3. Количество записей в таблицах:"
echo ""

echo "   Дизайны (metalcard_app_design):"
docker exec metalcard_db psql -U metalcard -d metalcard -c "SELECT COUNT(*) FROM metalcard_app_design;" 2>/dev/null | grep -E '^\s*[0-9]+' | xargs
echo ""

echo "   Категории (metalcard_app_category):"
docker exec metalcard_db psql -U metalcard -d metalcard -c "SELECT COUNT(*) FROM metalcard_app_category;" 2>/dev/null | grep -E '^\s*[0-9]+' | xargs
echo ""

echo "   Цены (metalcard_app_priceentry):"
docker exec metalcard_db psql -U metalcard -d metalcard -c "SELECT COUNT(*) FROM metalcard_app_priceentry;" 2>/dev/null | grep -E '^\s*[0-9]+' | xargs
echo ""

echo "   Заказы (metalcard_app_order):"
docker exec metalcard_db psql -U metalcard -d metalcard -c "SELECT COUNT(*) FROM metalcard_app_order;" 2>/dev/null | grep -E '^\s*[0-9]+' | xargs
echo ""

# Проверка примеров данных
echo "4. Примеры категорий (первые 5):"
docker exec metalcard_db psql -U metalcard -d metalcard -c "SELECT id, name, slug FROM metalcard_app_category ORDER BY id LIMIT 5;" 2>/dev/null
echo ""

echo "5. Примеры дизайнов (первые 5):"
docker exec metalcard_db psql -U metalcard -d metalcard -c "SELECT id, name, category_id, svg_path FROM metalcard_app_design ORDER BY id LIMIT 5;" 2>/dev/null
echo ""

echo "6. Примеры цен:"
docker exec metalcard_db psql -U metalcard -d metalcard -c "SELECT material_type, card_type, quantity, price FROM metalcard_app_priceentry ORDER BY material_type, card_type, quantity LIMIT 10;" 2>/dev/null
echo ""

# Проверка последних заказов (если есть)
echo "7. Последние заказы (если есть):"
docker exec metalcard_db psql -U metalcard -d metalcard -c "SELECT id, created_at, status, total FROM metalcard_app_order ORDER BY created_at DESC LIMIT 5;" 2>/dev/null
echo ""

echo "==================================="
echo "Проверка завершена"
echo "==================================="
