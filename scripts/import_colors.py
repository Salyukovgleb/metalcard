#!/usr/bin/env python3
"""
Заполнение таблицы colors всеми цветами карт из хардкода.

Usage:
  python3 scripts/import_colors.py [--root <repo_root>]

Environment (overrides defaults):
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
from pathlib import Path

try:
    import psycopg2
except Exception as e:
    print("psycopg2 is required. Install with: pip install psycopg2-binary", file=sys.stderr)
    raise


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Import colors into DB")
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


# Цвета с новыми базовыми ценами
COLORS_DATA = [
    {
        'code': 'black-silver-mat',
        'title': 'Черный/белый',
        'markup': 300000,  # Черная карта
        'params': {
            'label': 'linear-gradient(to bottom right, #2D2E2E 0%, #2D2E2E 50%, #f2f2f2 50%, #f2f2f2 100%)',
            'cls': 'preview-card_black-silver-mat'
        }
    },
    {
        'code': 'black-gold-mat',
        'title': 'Черный/золотой',
        'markup': 300000,  # Черная карта
        'params': {
            'label': 'linear-gradient(to bottom right, #2D2E2E 0%, #2D2E2E 50%, #d5b869 50%, #d5b869 100%)',
            'cls': 'preview-card_black-gold-mat'
        }
    },
    {
        'code': 'black-gold-rib',
        'title': 'Матовый черный/золотой',
        'markup': 300000,  # Черная карта
        'params': {
            'label': 'linear-gradient(to bottom right, #2D2E2E 0%, #2D2E2E 50%, #d5b869 50%, #d5b869 100%)',
            'cls': 'preview-card_black-gold-rib'
        }
    },
    {
        'code': 'gold-mirror',
        'title': 'Золотой/белый',
        'markup': 400000,  # Золотая карта
        'params': {
            'label': 'linear-gradient(to bottom right, #FED760 0%, #A0763C 50%, #f2f2f2 50%, #f2f2f2 100%)',
            'cls': 'preview-card_gold-mirror'
        }
    },
    {
        'code': 'gold-mirror-black',
        'title': 'Золотой/черный',
        'markup': 400000,  # Золотая карта
        'params': {
            'label': 'linear-gradient(to bottom right, #FED760 0%, #A0763C 50%, #202020 50%, #202020 100%)',
            'cls': 'preview-card_gold-mirror-black'
        }
    },
    {
        'code': 'red',
        'title': 'Красный/белый',
        'markup': 400000,  # Красная карта
        'params': {
            'label': 'linear-gradient(130.61deg, #B70404 0%, #E25B5B 50%, #f2f2f2 50%, #f2f2f2 100%)',
            'cls': 'preview-card_red'
        }
    },
    {
        'code': 'blue',
        'title': 'Синий/белый',
        'markup': 400000,  # Синяя карта
        'params': {
            'label': 'linear-gradient(130.61deg, #0441B7 0%, #5BB2E2 50%, #f2f2f2 50%, #f2f2f2 100%)',
            'cls': 'preview-card_blue'
        }
    },
    {
        'code': 'green',
        'title': 'Зеленый/белый',
        'markup': 10000,  # Оставляем как есть
        'params': {
            'label': 'linear-gradient(130.61deg, #0A7A3A 0%, #4CAF50 50%, #f2f2f2 50%, #f2f2f2 100%)',
            'cls': 'preview-card_green'
        }
    },
]


def ensure_table(conn):
    """Проверка наличия таблицы colors."""
    with conn.cursor() as cur:
        cur.execute("""
            SELECT column_name FROM information_schema.columns
            WHERE table_name='colors'
        """)
        cols = {r[0] for r in cur.fetchall()}
        required = {"id", "code", "title", "markup", "params", "active"}
        missing = required - cols
        if missing:
            raise RuntimeError(f"colors table missing required columns: {missing}")


def import_colors(conn) -> tuple[int, int]:
    """Импорт цветов в БД. Возвращает (вставлено, всего)."""
    ensure_table(conn)
    
    imported = 0
    updated = 0
    
    import json
    
    with conn.cursor() as cur:
        print(f"\nОбработка {len(COLORS_DATA)} цветов...")
        
        for idx, color_data in enumerate(COLORS_DATA, 1):
            code = color_data['code']
            title = color_data['title']
            markup = color_data['markup']
            params = color_data.get('params', {})
            
            print(f"\n[{idx}/{len(COLORS_DATA)}] Обработка цвета: {code} ({title})")
            
            # Проверяем существование
            cur.execute("SELECT id FROM colors WHERE code=%s", [code])
            existing = cur.fetchone()
            
            params_json = json.dumps(params, ensure_ascii=False)
            
            if existing:
                # Обновляем существующий
                print(f"  → Цвет уже существует (id={existing[0]}), обновляем...")
                cur.execute(
                    """
                    UPDATE colors 
                    SET title=%s, markup=%s, params=%s::jsonb, active=TRUE
                    WHERE code=%s
                    """,
                    [title, markup, params_json, code]
                )
                rows_affected = cur.rowcount
                if rows_affected > 0:
                    updated += 1
                    print(f"  ✓ Обновлено: {rows_affected} строк")
                else:
                    print(f"  ⚠ Обновление не затронуло строк (возможно, данные идентичны)")
            else:
                # Вставляем новый
                print(f"  → Цвет не найден, вставляем новый...")
                try:
                    cur.execute(
                        """
                        INSERT INTO colors (code, title, markup, params, active)
                        VALUES (%s, %s, %s, %s::jsonb, TRUE)
                        RETURNING id
                        """,
                        [code, title, markup, params_json]
                    )
                    new_id = cur.fetchone()[0]
                    imported += 1
                    print(f"  ✓ Вставлено: id={new_id}")
                except Exception as e:
                    print(f"  ✗ Ошибка при вставке: {e}")
                    raise
    
    print(f"\n→ Коммит транзакции...")
    conn.commit()
    print(f"✓ Транзакция закоммичена")
    
    return imported, updated


def check_colors_in_db(conn):
    """Проверка цветов в БД после импорта."""
    print("\n" + "="*60)
    print("Проверка цветов в БД:")
    print("="*60)
    
    with conn.cursor() as cur:
        cur.execute("""
            SELECT code, title, markup, active 
            FROM colors 
            ORDER BY code
        """)
        rows = cur.fetchall()
        
        if not rows:
            print("  ⚠ В таблице colors нет данных!")
            return
        
        print(f"  Всего цветов в БД: {len(rows)}")
        print("\n  Список цветов:")
        for row in rows:
            code, title, markup, active = row
            status = "✓" if active else "✗"
            print(f"    {status} {code:20s} | {title:25s} | {markup:>10,} UZS | active={active}")
        
        # Проверяем соответствие ожидаемым данным
        print("\n  Проверка соответствия ожидаемым данным:")
        expected_codes = {c['code'] for c in COLORS_DATA}
        db_codes = {r[0] for r in rows}
        
        missing = expected_codes - db_codes
        extra = db_codes - expected_codes
        
        if missing:
            print(f"    ⚠ Отсутствуют в БД: {', '.join(sorted(missing))}")
        if extra:
            print(f"    ℹ Дополнительные в БД: {', '.join(sorted(extra))}")
        if not missing and not extra:
            print(f"    ✓ Все ожидаемые цвета присутствуют в БД")


def main():
    args = parse_args()
    
    print("="*60)
    print("Импорт цветов в БД")
    print("="*60)
    print(f"\nПараметры подключения:")
    print(f"  DB_HOST: {os.getenv('DB_HOST', '85.198.85.90')}")
    print(f"  DB_PORT: {os.getenv('DB_PORT', '5433')}")
    print(f"  DB_NAME: {os.getenv('DB_NAME', 'metalcard')}")
    print(f"  DB_USER: {os.getenv('DB_USER', 'metalcard')}")
    
    try:
        print("\n→ Подключение к БД...")
        conn = connect_db()
        print("✓ Подключение успешно")
    except Exception as e:
        print(f"\n✗ Ошибка подключения к БД: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(2)
    
    try:
        imported, updated = import_colors(conn)
        print("\n" + "="*60)
        print("Результаты импорта:")
        print("="*60)
        print(f"  Вставлено новых: {imported}")
        print(f"  Обновлено существующих: {updated}")
        print(f"  Всего обработано: {imported + updated}")
        
        # Проверяем результат
        check_colors_in_db(conn)
        
    except Exception as e:
        conn.rollback()
        print(f"\n✗ Ошибка импорта: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(3)
    finally:
        conn.close()
        print("\n→ Соединение с БД закрыто")


if __name__ == "__main__":
    main()

