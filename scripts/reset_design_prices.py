#!/usr/bin/env python3
"""
Установить base_price = 0 для всех принтов (дизайнов) в таблице designs.

Usage:
  python3 scripts/reset_design_prices.py

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
    p = argparse.ArgumentParser(description="Reset all design prices to 0")
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


def reset_all_design_prices(conn):
    """Установить base_price = 0 для всех дизайнов."""
    with conn.cursor() as cur:
        cur.execute("""
            UPDATE designs 
            SET base_price = 0
            WHERE base_price != 0
        """)
        updated = cur.rowcount
        
        # Проверяем, сколько всего дизайнов
        cur.execute("SELECT COUNT(*) FROM designs")
        total = cur.fetchone()[0]
        
        cur.execute("SELECT COUNT(*) FROM designs WHERE base_price = 0")
        with_zero_price = cur.fetchone()[0]
        
        return updated, total, with_zero_price


def main():
    args = parse_args()
    try:
        conn = connect_db()
    except Exception as e:
        print(f"[!] DB connection failed: {e}", file=sys.stderr)
        sys.exit(2)
    
    try:
        print("Установка base_price = 0 для всех принтов...")
        print()
        
        updated, total, with_zero_price = reset_all_design_prices(conn)
        conn.commit()
        
        print(f"✓ Обновлено записей: {updated}")
        print(f"✓ Всего дизайнов в таблице: {total}")
        print(f"✓ Дизайнов с ценой 0: {with_zero_price}")
        print()
        print("✓ Цены успешно сброшены до 0!")
        
    except Exception as e:
        conn.rollback()
        print(f"[!] Reset failed: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(3)
    finally:
        conn.close()


if __name__ == "__main__":
    main()

