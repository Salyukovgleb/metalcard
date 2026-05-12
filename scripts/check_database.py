#!/usr/bin/env python3
"""
Скрипт для проверки базы данных metalcard
Проверяет наличие всех таблиц и данных
"""

import psycopg2
import sys

# Параметры подключения к БД
DB_CONFIG = {
    'host': '85.198.85.90',
    'port': 5433,
    'database': 'metalcard',
    'user': 'metalcard',
    'password': 'metalcard'
}

def connect_db():
    """Подключение к базе данных"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        print("✓ Успешное подключение к БД")
        return conn
    except Exception as e:
        print(f"✗ Ошибка подключения к БД: {e}")
        sys.exit(1)

def check_tables(conn):
    """Проверка наличия таблиц"""
    print("\n" + "="*60)
    print("ПРОВЕРКА ТАБЛИЦ")
    print("="*60)
    
    with conn.cursor() as cur:
        cur.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
            ORDER BY table_name;
        """)
        tables = cur.fetchall()
        
        print(f"\nВсего таблиц: {len(tables)}")
        print("\nСписок таблиц:")
        for table in tables:
            print(f"  - {table[0]}")
        
        return [t[0] for t in tables]

def check_table_counts(conn):
    """Проверка количества записей в основных таблицах"""
    print("\n" + "="*60)
    print("КОЛИЧЕСТВО ЗАПИСЕЙ В ТАБЛИЦАХ")
    print("="*60)
    
    tables_to_check = [
        ('metalcard_app_category', 'Категории'),
        ('metalcard_app_design', 'Дизайны'),
        ('metalcard_app_priceentry', 'Цены'),
        ('metalcard_app_order', 'Заказы'),
        ('metalcard_app_orderitem', 'Позиции заказов'),
        ('django_migrations', 'Миграции Django'),
    ]
    
    with conn.cursor() as cur:
        for table_name, description in tables_to_check:
            try:
                cur.execute(f"SELECT COUNT(*) FROM {table_name};")
                count = cur.fetchone()[0]
                status = "✓" if count > 0 else "⚠"
                print(f"\n{status} {description} ({table_name}):")
                print(f"   Записей: {count}")
            except Exception as e:
                print(f"\n✗ {description} ({table_name}):")
                print(f"   Ошибка: {e}")

def check_categories(conn):
    """Проверка категорий"""
    print("\n" + "="*60)
    print("КАТЕГОРИИ (первые 10)")
    print("="*60)
    
    with conn.cursor() as cur:
        try:
            cur.execute("""
                SELECT id, name, slug, display_order 
                FROM metalcard_app_category 
                ORDER BY display_order, id 
                LIMIT 10;
            """)
            categories = cur.fetchall()
            
            if categories:
                print(f"\n{'ID':<5} {'Название':<30} {'Slug':<20} {'Порядок':<8}")
                print("-" * 65)
                for cat in categories:
                    cat_id, name, slug, order = cat
                    print(f"{cat_id:<5} {name:<30} {slug:<20} {order or 0:<8}")
            else:
                print("\n⚠ Категории не найдены!")
        except Exception as e:
            print(f"\n✗ Ошибка при проверке категорий: {e}")

def check_designs(conn):
    """Проверка дизайнов"""
    print("\n" + "="*60)
    print("ДИЗАЙНЫ (первые 10)")
    print("="*60)
    
    with conn.cursor() as cur:
        try:
            cur.execute("""
                SELECT d.id, d.name, c.name as category, d.svg_path 
                FROM metalcard_app_design d
                LEFT JOIN metalcard_app_category c ON d.category_id = c.id
                ORDER BY d.id 
                LIMIT 10;
            """)
            designs = cur.fetchall()
            
            if designs:
                print(f"\n{'ID':<6} {'Название':<25} {'Категория':<20} {'SVG путь':<30}")
                print("-" * 85)
                for design in designs:
                    design_id, name, category, svg_path = design
                    print(f"{design_id:<6} {name:<25} {category or 'N/A':<20} {svg_path[:30] if svg_path else 'N/A':<30}")
            else:
                print("\n⚠ Дизайны не найдены!")
        except Exception as e:
            print(f"\n✗ Ошибка при проверке дизайнов: {e}")

def check_prices(conn):
    """Проверка цен"""
    print("\n" + "="*60)
    print("ЦЕНЫ (примеры)")
    print("="*60)
    
    with conn.cursor() as cur:
        try:
            cur.execute("""
                SELECT material_type, card_type, quantity, price 
                FROM metalcard_app_priceentry 
                ORDER BY material_type, card_type, quantity 
                LIMIT 15;
            """)
            prices = cur.fetchall()
            
            if prices:
                print(f"\n{'Материал':<15} {'Тип карты':<15} {'Количество':<12} {'Цена':<10}")
                print("-" * 55)
                for price in prices:
                    material, card_type, quantity, price_val = price
                    print(f"{material:<15} {card_type:<15} {quantity:<12} {price_val:>10.2f}")
            else:
                print("\n⚠ Цены не найдены!")
        except Exception as e:
            print(f"\n✗ Ошибка при проверке цен: {e}")

def check_orders(conn):
    """Проверка заказов"""
    print("\n" + "="*60)
    print("ЗАКАЗЫ (последние 10)")
    print("="*60)
    
    with conn.cursor() as cur:
        try:
            cur.execute("""
                SELECT id, created_at, status, total, customer_name, customer_phone 
                FROM metalcard_app_order 
                ORDER BY created_at DESC 
                LIMIT 10;
            """)
            orders = cur.fetchall()
            
            if orders:
                print(f"\n{'ID':<6} {'Дата':<20} {'Статус':<15} {'Сумма':<10} {'Клиент':<20}")
                print("-" * 75)
                for order in orders:
                    order_id, created, status, total, name, phone = order
                    created_str = created.strftime('%Y-%m-%d %H:%M') if created else 'N/A'
                    print(f"{order_id:<6} {created_str:<20} {status:<15} {total:>10.2f} {name[:20] if name else 'N/A':<20}")
            else:
                print("\n⚠ Заказы не найдены (это нормально для новой установки)")
        except Exception as e:
            print(f"\n✗ Ошибка при проверке заказов: {e}")

def main():
    print("="*60)
    print("ПРОВЕРКА БАЗЫ ДАННЫХ METALCARD")
    print("="*60)
    print(f"\nПодключение к: {DB_CONFIG['host']}:{DB_CONFIG['port']}/{DB_CONFIG['database']}")
    
    conn = connect_db()
    
    try:
        check_tables(conn)
        check_table_counts(conn)
        check_categories(conn)
        check_designs(conn)
        check_prices(conn)
        check_orders(conn)
        
        print("\n" + "="*60)
        print("ПРОВЕРКА ЗАВЕРШЕНА")
        print("="*60)
        
    except Exception as e:
        print(f"\n✗ Ошибка при проверке БД: {e}")
        sys.exit(1)
    finally:
        conn.close()
        print("\n✓ Соединение закрыто")

if __name__ == '__main__':
    main()
