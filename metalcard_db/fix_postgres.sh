#!/bin/bash

################################################################################
# Скрипт для исправления проблем с PostgreSQL
# Исправляет ошибку "could not open directory 'pg_notify': No such file or directory"
################################################################################

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Проверка прав root
if [ "$EUID" -ne 0 ]; then 
    log_error "Пожалуйста, запустите скрипт с правами root (sudo)"
    exit 1
fi

log_info "=========================================="
log_info "ИСПРАВЛЕНИЕ ПРОБЛЕМ С POSTGRESQL"
log_info "=========================================="
echo ""

# Определяем директорию скрипта
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Шаг 1: Остановка контейнера
log_info "Шаг 1: Остановка контейнера PostgreSQL..."
docker compose down
log_success "Контейнер остановлен"
echo ""

# Шаг 2: Проверка директории данных
log_info "Шаг 2: Проверка директории данных..."
if [ -d "./data" ]; then
    log_info "Директория data существует"
    
    # Проверяем наличие критических файлов
    if [ -f "./data/PG_VERSION" ]; then
        PG_VERSION=$(cat ./data/PG_VERSION)
        log_info "Версия PostgreSQL в данных: $PG_VERSION"
    else
        log_warning "Файл PG_VERSION не найден - данные могут быть повреждены"
    fi
    
    # Проверяем права доступа
    log_info "Проверка прав доступа..."
    ls -la ./data | head -5
    
    # Проверяем наличие директории pg_notify
    if [ ! -d "./data/pg_notify" ]; then
        log_warning "Директория pg_notify отсутствует - это причина ошибки"
    else
        log_info "Директория pg_notify существует"
    fi
else
    log_info "Директория data не существует - будет создана при первом запуске"
fi
echo ""

# Шаг 3: Варианты решения
log_info "Шаг 3: Выбор варианта решения..."
echo ""
log_warning "ВНИМАНИЕ: Выберите вариант действий:"
echo ""
log_info "1. Исправить права доступа и пересоздать недостающие директории (сохранит данные)"
log_info "2. Удалить данные и пересоздать базу данных с нуля (ВСЕ ДАННЫЕ БУДУТ УДАЛЕНЫ!)"
echo ""
read -p "Выберите вариант (1 или 2): " choice

case $choice in
    1)
        log_info "Выбран вариант 1: Исправление прав и структуры..."
        
        if [ -d "./data" ]; then
            # Исправляем права доступа
            log_info "Исправление прав доступа..."
            chown -R 999:999 ./data 2>/dev/null || chown -R postgres:postgres ./data 2>/dev/null || log_warning "Не удалось изменить владельца (может потребоваться вручную)"
            chmod -R 700 ./data
            
            # Создаем недостающие директории
            log_info "Создание недостающих директорий..."
            mkdir -p ./data/pg_notify
            mkdir -p ./data/pg_stat_tmp
            mkdir -p ./data/pg_stat
            mkdir -p ./data/pg_snapshots
            mkdir -p ./data/pg_replslot
            mkdir -p ./data/pg_tblspc
            mkdir -p ./data/pg_twophase
            mkdir -p ./data/pg_wal
            mkdir -p ./data/base
            mkdir -p ./data/global
            
            # Устанавливаем правильные права
            chmod 700 ./data/pg_notify
            chmod 700 ./data/pg_stat_tmp
            chmod 700 ./data/pg_stat
            chmod 700 ./data/pg_snapshots
            chmod 700 ./data/pg_replslot
            chmod 700 ./data/pg_tblspc
            chmod 700 ./data/pg_twophase
            chmod 700 ./data/pg_wal
            chmod 700 ./data/base
            chmod 700 ./data/global
            
            log_success "Права и структура исправлены"
        else
            log_info "Директория data не существует, будет создана при запуске"
        fi
        ;;
    2)
        log_warning "Выбран вариант 2: Удаление данных..."
        read -p "Вы уверены? Все данные будут удалены! (yes/no): " confirm
        if [ "$confirm" = "yes" ]; then
            log_info "Удаление директории data..."
            rm -rf ./data
            log_success "Данные удалены"
        else
            log_info "Операция отменена"
            exit 0
        fi
        ;;
    *)
        log_error "Неверный выбор"
        exit 1
        ;;
esac

echo ""

# Шаг 4: Запуск контейнера
log_info "Шаг 4: Запуск контейнера PostgreSQL..."
docker compose up -d

# Ждем запуска
log_info "Ожидание запуска PostgreSQL (10 секунд)..."
sleep 10

# Проверка статуса
log_info "Проверка статуса контейнера..."
if docker ps | grep -q metalcard_db; then
    if docker ps | grep metalcard_db | grep -q "Up"; then
        log_success "Контейнер запущен успешно!"
    else
        log_error "Контейнер не запустился"
        log_info "Проверьте логи: docker logs metalcard_db"
        exit 1
    fi
else
    log_error "Контейнер не найден"
    exit 1
fi

echo ""

# Шаг 5: Проверка логов
log_info "Шаг 5: Проверка последних логов..."
docker logs --tail=20 metalcard_db

echo ""
log_info "=========================================="
log_success "ИСПРАВЛЕНИЕ ЗАВЕРШЕНО!"
log_info "=========================================="
echo ""

# Проверка подключения
log_info "Проверка подключения к базе данных..."
sleep 5
if docker exec metalcard_db pg_isready -U metalcard -d metalcard >/dev/null 2>&1; then
    log_success "База данных доступна!"
else
    log_warning "База данных еще не готова, подождите немного"
    log_info "Проверьте логи: docker logs -f metalcard_db"
fi

echo ""
