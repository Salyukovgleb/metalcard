#!/usr/bin/env python3
"""
Настройка цен для системы Metalcard.

1. Обновляет базовые цены цветов:
   - Черные карты (black-silver-mat, black-gold-mat, black-gold-rib) → 300,000 сум
   - Золотые карты (gold-mirror, gold-mirror-black) → 400,000 сум
   - Красная карта (red) → 400,000 сум
   - Синяя карта (blue) → 400,000 сум

2. Устанавливает base_price=400000 для специальных дизайнов:
   - money: Design 3006, 3005, 3008 (по title содержит "3006", "3005", "3008")
   - crypto: Design 2004, 2003, 2002, 2001 (по title содержит "2004", "2003", "2002", "2001")

Usage:
  python3 scripts/setup_prices.py [--root <repo_root>]

Environment:
  DB_NAME=metalcard
  DB_USER=metalcard
  DB_PASSWORD=metalcard
  DB_HOST=localhost
  DB_PORT=5433
"""
from __future__ import annotations

import argparse
import os
import sys
import json
from pathlib import Path

try:
    import psycopg2
except Exception as e:
    print("psycopg2 is required. Install with: pip install psycopg2-binary", file=sys.stderr)
    raise


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Setup prices for colors and special designs")
    p.add_argument("--root", default=str(Path(__file__).resolve().parents[1]), help="Repo root")
    return p.parse_args()


def connect_db():
    cfg = dict(
        dbname=os.getenv("DB_NAME", "metalcard"),
        user=os.getenv("DB_USER", "metalcard"),
        password=os.getenv("DB_PASSWORD", "metalcard"),
        host=os.getenv("DB_HOST", "85.198.85.90"),
        port=os.getenv("DB_PORT", "5433"),
    )
    conn = psycopg2.connect(**cfg)
    conn.autocommit = False
    return conn


def update_color_prices(conn):
    """Обновить базовые цены цветов."""
    color_prices = {
        # Черные карты → 300,000
        'black-silver-mat': 300000,
        'black-gold-mat': 300000,
        'black-gold-rib': 300000,
        # Золотые карты → 400,000
        'gold-mirror': 400000,
        'gold-mirror-black': 400000,
        # Красная карта → 400,000
        'red': 400000,
        # Синяя карта → 400,000
        'blue': 400000,
        # Зеленая карта (оставляем как есть или устанавливаем)
        'green': 400000,  # или можно установить другую цену
    }
    
    updated = 0
    with conn.cursor() as cur:
        for code, price in color_prices.items():
            cur.execute(
                "UPDATE colors SET markup=%s WHERE code=%s",
                [price, code]
            )
            if cur.rowcount > 0:
                updated += 1
                print(f"  ✓ Обновлена цена цвета '{code}': {price:,} UZS")
    
    return updated


def setup_special_designs(conn):
    """Установить base_price=400000 для специальных дизайнов."""
    # Специальные дизайны по паттернам в title
    special_patterns = [
        # money категория
        ('3_money', ['3006', '3005', '3008']),
        # crypto категория
        ('2_crypto', ['2004', '2003', '2002', '2001']),
    ]
    
    updated = 0
    with conn.cursor() as cur:
        for category, patterns in special_patterns:
            # Ищем дизайны по категории и паттернам в title
            for pattern in patterns:
                # Ищем дизайны, где title содержит паттерн (например "Design 3006")
                cur.execute(
                    """
                    UPDATE designs 
                    SET base_price=400000 
                    WHERE category=%s 
                      AND (title ILIKE %s OR title ILIKE %s)
                      AND active IS TRUE
                    """,
                    [category, f'%{pattern}%', f'%Design {pattern}%']
                )
                if cur.rowcount > 0:
                    updated += cur.rowcount
                    print(f"  ✓ Установлена цена 400,000 для дизайнов с паттерном '{pattern}' в категории '{category}' ({cur.rowcount} шт.)")
    
    return updated


def ensure_price_overrides_column(conn):
    """Убедиться, что поле price_overrides существует."""
    with conn.cursor() as cur:
        cur.execute("""
            SELECT column_name FROM information_schema.columns
            WHERE table_name='designs' AND column_name='price_overrides'
        """)
        if not cur.fetchone():
            print("  → Добавляем поле price_overrides...")
            cur.execute("""
                ALTER TABLE designs 
                ADD COLUMN price_overrides JSONB DEFAULT '{}'::jsonb
            """)
            print("  ✓ Поле price_overrides добавлено")


def ensure_sort_order_column(conn):
    """Убедиться, что поле sort_order существует."""
    with conn.cursor() as cur:
        cur.execute("""
            SELECT column_name FROM information_schema.columns
            WHERE table_name='designs' AND column_name='sort_order'
        """)
        if not cur.fetchone():
            print("  → Добавляем поле sort_order...")
            cur.execute("""
                ALTER TABLE designs 
                ADD COLUMN sort_order INTEGER
            """)
            print("  ✓ Поле sort_order добавлено")


def main():
    args = parse_args()
    try:
        conn = connect_db()
    except Exception as e:
        print(f"[!] DB connection failed: {e}", file=sys.stderr)
        sys.exit(2)
    
    try:
        print("Настройка цен для Metalcard...")
        print()
        
        # Проверяем наличие недостающих полей
        ensure_price_overrides_column(conn)
        ensure_sort_order_column(conn)
        conn.commit()
        
        print("\n1. Обновление базовых цен цветов:")
        colors_updated = update_color_prices(conn)
        conn.commit()
        print(f"   Всего обновлено цветов: {colors_updated}")
        
        print("\n2. Установка фиксированных цен для специальных дизайнов:")
        designs_updated = setup_special_designs(conn)
        conn.commit()
        print(f"   Всего обновлено дизайнов: {designs_updated}")
        
        print("\n✓ Настройка завершена!")
        print("\nИтоги:")
        print(f"  - Цвета: черные → 300k, остальные → 400k")
        print(f"  - Специальные дизайны (money: 3006,3005,3008; crypto: 2004,2003,2002,2001) → 400k для всех цветов")
        
    except Exception as e:
        conn.rollback()
        print(f"[!] Setup failed: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(3)
    finally:
        conn.close()


if __name__ == "__main__":
    main()

