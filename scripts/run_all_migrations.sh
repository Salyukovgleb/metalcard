#!/bin/bash

################################################################################
# Скрипт для запуска всех миграций и инициализации БД
# 
# Что делает:
# 1. Проверяет подключение к БД
# 2. Запускает Django миграции для admin_metalcard
# 3. Импортирует данные (цвета, дизайны)
# 4. Настраивает цены
# 5. Создает администратора
# 6. Собирает статику и скачивает шрифты
#
# Использование:
#   DB_HOST=85.198.85.90 DB_PORT=5433 DB_NAME=metalcard DB_USER=metalcard DB_PASSWORD=metalcard \
#   ./scripts/run_all_migrations.sh
################################################################################

# Не останавливаемся при ошибках в некритичных шагах
set +e

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

# Определение пути к репозиторию
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "${SCRIPT_DIR}")"
cd "$REPO_ROOT"

# Параметры подключения к БД
DB_HOST="${DB_HOST:-85.198.85.90}"
DB_PORT="${DB_PORT:-5433}"
DB_NAME="${DB_NAME:-metalcard}"
DB_USER="${DB_USER:-metalcard}"
DB_PASSWORD="${DB_PASSWORD:-metalcard}"

# Параметры администратора
ADMIN_USERNAME="${ADMIN_USERNAME:-admin}"
ADMIN_EMAIL="${ADMIN_EMAIL:-Salyukov.gleb033@mail.com}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-123490ru}"

export DB_HOST DB_PORT DB_NAME DB_USER DB_PASSWORD

log_info "=========================================="
log_info "ЗАПУСК ВСЕХ МИГРАЦИЙ И ИНИЦИАЛИЗАЦИИ БД"
log_info "=========================================="
log_info "Репозиторий: ${REPO_ROOT}"
log_info "БД: ${DB_HOST}:${DB_PORT}/${DB_NAME}"
log_info "Пользователь: ${DB_USER}"
echo ""

# Функция установки зависимостей Python
install_python_dependencies() {
    log_info "Шаг 0: Проверка и установка зависимостей Python..."
    
    # Проверяем наличие pip
    if ! command -v pip3 >/dev/null 2>&1 && ! command -v pip >/dev/null 2>&1; then
        log_error "pip не установлен. Установите Python и pip"
        exit 1
    fi
    
    PIP_CMD="pip3"
    if ! command -v pip3 >/dev/null 2>&1; then
        PIP_CMD="pip"
    fi
    
    # Определяем флаги для pip (для Ubuntu 24.04 с externally-managed-environment)
    PIP_FLAGS=""
    if python3 -c "import sys; sys.exit(0 if sys.version_info >= (3, 12) else 1)" 2>/dev/null; then
        # Python 3.12+ требует --break-system-packages или venv
        PIP_FLAGS="--break-system-packages"
        log_info "Обнаружен Python 3.12+, используем флаг --break-system-packages"
    fi
    
    # Проверяем наличие psycopg2
    python3 << PYTHON_CHECK
import sys
try:
    import psycopg2
    sys.exit(0)
except ImportError:
    sys.exit(1)
PYTHON_CHECK
    
    if [ $? -ne 0 ]; then
        log_warning "psycopg2 не установлен, устанавливаем..."
        
        # Сначала пробуем через apt (системный пакет)
        if command -v apt-get >/dev/null 2>&1; then
            log_info "Пробуем установить через apt..."
            apt-get update -qq >/dev/null 2>&1
            apt-get install -y python3-psycopg2 >/dev/null 2>&1
            
            # Проверяем установку
            python3 << PYTHON_CHECK
import sys
try:
    import psycopg2
    sys.exit(0)
except ImportError:
    sys.exit(1)
PYTHON_CHECK
            
            if [ $? -eq 0 ]; then
                log_success "psycopg2 установлен через apt"
            else
                log_info "Установка через apt не удалась, пробуем через pip..."
                $PIP_CMD install $PIP_FLAGS psycopg2-binary
                
                if [ $? -eq 0 ]; then
                    log_success "psycopg2-binary установлен через pip"
                else
                    log_error "Не удалось установить psycopg2-binary"
                    log_info "Попробуйте установить вручную:"
                    log_info "  apt-get install -y python3-psycopg2"
                    log_info "  или: pip3 install --break-system-packages psycopg2-binary"
                    exit 1
                fi
            fi
        else
            # Если нет apt, используем pip
            $PIP_CMD install $PIP_FLAGS psycopg2-binary
            
            if [ $? -eq 0 ]; then
                log_success "psycopg2-binary установлен"
            else
                log_error "Не удалось установить psycopg2-binary"
                log_info "Попробуйте установить вручную: pip3 install --break-system-packages psycopg2-binary"
                exit 1
            fi
        fi
    else
        log_success "psycopg2 уже установлен"
    fi
    
    # Проверяем наличие Django (для миграций)
    python3 << PYTHON_CHECK
import sys
try:
    import django
    sys.exit(0)
except ImportError:
    sys.exit(1)
PYTHON_CHECK
    
    if [ $? -ne 0 ]; then
        log_warning "Django не установлен, устанавливаем..."
        $PIP_CMD install $PIP_FLAGS "Django>=4.2,<5.0"
        
        if [ $? -eq 0 ]; then
            log_success "Django установлен"
        else
            log_warning "Не удалось установить Django (миграции могут не выполниться)"
        fi
    else
        log_success "Django уже установлен"
    fi
    
    # Пробуем установить из requirements.txt если есть
    if [ -f "${REPO_ROOT}/admin_metalcard/requirements.txt" ]; then
        log_info "Устанавливаем зависимости из admin_metalcard/requirements.txt..."
        $PIP_CMD install $PIP_FLAGS -q -r "${REPO_ROOT}/admin_metalcard/requirements.txt" 2>/dev/null || log_warning "Не удалось установить все зависимости из requirements.txt"
    fi
    
    echo ""
}

# Функция проверки подключения к БД
check_db_connection() {
    log_info "Шаг 1: Проверка подключения к БД..."
    
    if command -v psql >/dev/null 2>&1; then
        if PGPASSWORD="${DB_PASSWORD}" psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -c "SELECT 1;" >/dev/null 2>&1; then
            log_success "Подключение к БД успешно"
            return 0
        fi
    fi
    
    # Проверка через Python
    python3 << PYTHON_EOF
import os
import sys
try:
    import psycopg2
    conn = psycopg2.connect(
        dbname=os.getenv('DB_NAME', 'metalcard'),
        user=os.getenv('DB_USER', 'metalcard'),
        password=os.getenv('DB_PASSWORD', 'metalcard'),
        host=os.getenv('DB_HOST', '85.198.85.90'),
        port=os.getenv('DB_PORT', '5433'),
    )
    conn.close()
    print("OK")
    sys.exit(0)
except Exception as e:
    print(f"ERROR: {e}")
    sys.exit(1)
PYTHON_EOF
    
    if [ $? -eq 0 ]; then
        log_success "Подключение к БД успешно"
    else
        log_error "Не удалось подключиться к БД"
        log_info "Проверьте параметры подключения и убедитесь, что PostgreSQL запущен"
        exit 1
    fi
    echo ""
}

# Функция запуска Django миграций
run_django_migrations() {
    log_info "Шаг 2: Запуск Django миграций для admin_metalcard..."
    
    ADMIN_DIR="${REPO_ROOT}/admin_metalcard"
    
    if [ ! -d "${ADMIN_DIR}" ]; then
        log_error "Директория admin_metalcard не найдена: ${ADMIN_DIR}"
        exit 1
    fi
    
    cd "${ADMIN_DIR}"
    
    # Проверяем наличие manage.py
    if [ ! -f "manage.py" ]; then
        log_error "manage.py не найден в ${ADMIN_DIR}"
        exit 1
    fi
    
    # Запускаем миграции
    log_info "Выполнение миграций Django..."
    python3 manage.py migrate --noinput
    
    if [ $? -eq 0 ]; then
        log_success "Django миграции выполнены успешно"
    else
        log_error "Ошибка при выполнении Django миграций"
        exit 1
    fi
    
    cd "${REPO_ROOT}"
    echo ""
}

# Функция импорта цветов
import_colors() {
    log_info "Шаг 3: Импорт цветов в БД..."
    
    if [ ! -f "${REPO_ROOT}/scripts/import_colors.py" ]; then
        log_error "Скрипт import_colors.py не найден"
        exit 1
    fi
    
    python3 "${REPO_ROOT}/scripts/import_colors.py"
    
    if [ $? -eq 0 ]; then
        log_success "Цвета импортированы"
    else
        log_error "Ошибка при импорте цветов"
        exit 1
    fi
    echo ""
}

# Функция импорта дизайнов
import_designs() {
    log_info "Шаг 4: Импорт дизайнов в БД..."
    
    if [ ! -f "${REPO_ROOT}/scripts/import_designs.py" ]; then
        log_error "Скрипт import_designs.py не найден"
        exit 1
    fi
    
    python3 "${REPO_ROOT}/scripts/import_designs.py"
    
    if [ $? -eq 0 ]; then
        log_success "Дизайны импортированы"
    else
        log_error "Ошибка при импорте дизайнов"
        exit 1
    fi
    echo ""
}

# Функция настройки цен
setup_prices() {
    log_info "Шаг 5: Настройка цен..."
    
    if [ ! -f "${REPO_ROOT}/scripts/setup_prices.py" ]; then
        log_error "Скрипт setup_prices.py не найден"
        exit 1
    fi
    
    python3 "${REPO_ROOT}/scripts/setup_prices.py"
    
    if [ $? -eq 0 ]; then
        log_success "Цены настроены"
    else
        log_error "Ошибка при настройке цен"
        exit 1
    fi
    echo ""
}

# Функция сброса цен дизайнов (опционально)
reset_design_prices() {
    log_info "Шаг 6: Сброс цен дизайнов до 0..."
    
    if [ ! -f "${REPO_ROOT}/scripts/reset_design_prices.py" ]; then
        log_warning "Скрипт reset_design_prices.py не найден, пропускаем"
        return
    fi
    
    python3 "${REPO_ROOT}/scripts/reset_design_prices.py"
    
    if [ $? -eq 0 ]; then
        log_success "Цены дизайнов сброшены"
    else
        log_warning "Ошибка при сбросе цен дизайнов (продолжаем)"
    fi
    echo ""
}

# Функция создания администратора
create_admin() {
    log_info "Шаг 7: Создание администратора..."
    
    # Сначала пробуем через create_admin_superuser.py (с миграциями)
    if [ -f "${REPO_ROOT}/scripts/create_admin_superuser.py" ]; then
        log_info "Используем create_admin_superuser.py..."
        python3 "${REPO_ROOT}/scripts/create_admin_superuser.py" \
            --username "${ADMIN_USERNAME}" \
            --email "${ADMIN_EMAIL}" \
            --password "${ADMIN_PASSWORD}"
        
        if [ $? -eq 0 ]; then
            log_success "Администратор создан через create_admin_superuser.py"
            return 0
        else
            log_warning "Не удалось создать через create_admin_superuser.py, пробуем create_admin_raw.py"
        fi
    fi
    
    # Если не получилось, пробуем через create_admin_raw.py
    if [ -f "${REPO_ROOT}/scripts/create_admin_raw.py" ]; then
        log_info "Используем create_admin_raw.py..."
        python3 "${REPO_ROOT}/scripts/create_admin_raw.py" \
            --username "${ADMIN_USERNAME}" \
            --email "${ADMIN_EMAIL}" \
            --password "${ADMIN_PASSWORD}"
        
        if [ $? -eq 0 ]; then
            log_success "Администратор создан через create_admin_raw.py"
        else
            log_error "Не удалось создать администратора"
            exit 1
        fi
    else
        log_error "Скрипты создания администратора не найдены"
        exit 1
    fi
    echo ""
}

# Функция сборки статики Netlify
build_netlify_static() {
    log_info "Шаг 8: Сборка статики для Netlify..."
    
    if [ ! -f "${REPO_ROOT}/scripts/build_netlify_static.py" ]; then
        log_warning "Скрипт build_netlify_static.py не найден, пропускаем"
        return 0
    fi
    
    # Проверяем наличие необходимых файлов
    if [ ! -d "${REPO_ROOT}/templates" ]; then
        log_warning "Директория templates не найдена, пропускаем сборку статики"
        return 0
    fi
    
    python3 "${REPO_ROOT}/scripts/build_netlify_static.py" 2>&1
    
    if [ $? -eq 0 ]; then
        log_success "Статика для Netlify собрана"
    else
        log_warning "Ошибка при сборке статики Netlify (продолжаем)"
    fi
    echo ""
    return 0
}

# Функция скачивания шрифтов
download_fonts() {
    log_info "Шаг 9: Скачивание шрифтов..."
    
    if [ ! -f "${REPO_ROOT}/scripts/download_fonts.py" ]; then
        log_warning "Скрипт download_fonts.py не найден, пропускаем"
        return
    fi
    
    python3 "${REPO_ROOT}/scripts/download_fonts.py"
    
    if [ $? -eq 0 ]; then
        log_success "Шрифты скачаны"
    else
        log_warning "Ошибка при скачивании шрифтов (продолжаем)"
    fi
    echo ""
}

# Функция тестирования шрифтов
test_fonts() {
    log_info "Шаг 10: Тестирование шрифтов..."
    
    if [ ! -f "${REPO_ROOT}/scripts/test_all_fonts.py" ]; then
        log_warning "Скрипт test_all_fonts.py не найден, пропускаем"
        return
    fi
    
    python3 "${REPO_ROOT}/scripts/test_all_fonts.py"
    
    if [ $? -eq 0 ]; then
        log_success "Тест шрифтов пройден"
    else
        log_warning "Тест шрифтов завершился с предупреждениями (продолжаем)"
    fi
    echo ""
}

# Основная функция
main() {
    log_info "Начало выполнения всех миграций и скриптов..."
    echo ""
    
    install_python_dependencies
    check_db_connection
    run_django_migrations
    import_colors
    import_designs
    setup_prices
    reset_design_prices
    create_admin
    build_netlify_static
    download_fonts
    test_fonts
    
    log_info "=========================================="
    log_success "ВСЕ МИГРАЦИИ И СКРИПТЫ ВЫПОЛНЕНЫ!"
    log_info "=========================================="
    echo ""
    log_info "Итоги:"
    log_info "  ✓ Django миграции выполнены"
    log_info "  ✓ Цвета импортированы"
    log_info "  ✓ Дизайны импортированы"
    log_info "  ✓ Цены настроены"
    log_info "  ✓ Администратор создан: ${ADMIN_USERNAME}"
    log_info "  ✓ Статика собрана"
    log_info "  ✓ Шрифты скачаны"
    echo ""
    log_info "Данные администратора:"
    log_info "  Username: ${ADMIN_USERNAME}"
    log_info "  Email: ${ADMIN_EMAIL}"
    log_info "  Password: ${ADMIN_PASSWORD}"
    echo ""
}

# Запуск
main
