#!/bin/bash
# Скрипт для исправления конфликта package-lock.json на сервере
# Использование: выполнить на сервере из директории ~/metalcard/site_metalcard

cd ~/metalcard/site_metalcard || exit 1

echo "Поиск всех package-lock.json файлов..."
find . -name "package-lock.json" -type f

echo ""
echo "Удаление локального package-lock.json из legacy_svg..."
rm -f legacy_svg/package-lock.json

echo "Проверка, что файл удален..."
if [ -f "legacy_svg/package-lock.json" ]; then
    echo "ОШИБКА: Файл все еще существует!"
    exit 1
else
    echo "✓ Файл успешно удален"
fi

echo ""
echo "Выполнение git pull..."
git pull

echo ""
echo "✓ Готово!"

