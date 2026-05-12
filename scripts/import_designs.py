#!/usr/bin/env python3
"""
Import SVG designs from the local "origs" folder into the Postgres database.

Usage:
  python3 scripts/import_designs.py [--root <repo_root>] [--default-price 200000]

Environment (overrides defaults):
  DB_NAME=metalcard
  DB_USER=metalcard
  DB_PASSWORD=metalcard
  DB_HOST=localhost
  DB_PORT=5433

Notes:
  - Expects the schema created by metalcard_db/init/01_schema.sql
  - Inserts rows into table "designs": title, category, svg_orig (as web path), base_price, active
  - Skips rows whose svg_orig already exists in the table
  - svg_orig is saved as "/static/<category>/<filename>" so it can be served by the site
"""
from __future__ import annotations

import argparse
import os
import re
import sys
from pathlib import Path

try:
    import psycopg2
    from psycopg2.extras import execute_values
except Exception as e:
    print("psycopg2 is required. Install with: pip install psycopg2-binary", file=sys.stderr)
    raise


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Import SVG designs from origs folder into DB")
    p.add_argument("--root", default=str(Path(__file__).resolve().parents[1]), help="Repo root (default: parent of scripts)")
    p.add_argument("--default-price", type=float, default=200000.0, help="Default base_price to use for designs")
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


def scan_origs(origs_dir: Path) -> list[tuple[str, str, str]]:
    """Return list of (category, filename, webpath) for all .svg files under origs_dir.

    webpath is "/static/<category>/<filename>".
    category is the immediate directory name under origs_dir (supports nested by using relative path's first part).
    """
    items: list[tuple[str, str, str]] = []
    if not origs_dir.exists():
        return items

    for path in origs_dir.rglob("*.svg"):
        try:
            rel = path.relative_to(origs_dir)
        except ValueError:
            # should not happen
            rel = path.name
        parts = list(rel.parts)
        if len(parts) < 2:
            # skip files in origs root without category folder
            continue
        category = parts[0]
        filename = parts[-1]
        webpath = f"/static/{category}/{filename}"
        items.append((category, filename, webpath))
    return items


def ensure_table(conn):
    # Safety check: verify table exists with required columns
    with conn.cursor() as cur:
        cur.execute("""
            SELECT column_name FROM information_schema.columns
            WHERE table_name='designs'
        """)
        cols = {r[0] for r in cur.fetchall()}
        required = {"id", "title", "category", "svg_orig", "base_price", "active"}
        missing = required - cols
        if missing:
            raise RuntimeError(f"designs table missing required columns: {missing}")


def load_existing_svg_orig(conn) -> set[str]:
    with conn.cursor() as cur:
        cur.execute("SELECT svg_orig FROM designs")
        return {r[0] for r in cur.fetchall()}


def derive_title(category: str, filename: str) -> str:
    # Use numeric part as ID if present, else fallback to filename without extension
    stem = Path(filename).stem
    m = re.search(r"\d+", stem)
    if m:
        return f"Design {m.group(0)}"
    return stem.replace("_", " ").strip() or filename


def import_designs(conn, origs_dir: Path, default_price: float) -> tuple[int, int]:
    ensure_table(conn)
    existing = load_existing_svg_orig(conn)

    items = scan_origs(origs_dir)
    to_insert = []
    for category, filename, webpath in items:
        if webpath in existing:
            continue
        title = derive_title(category, filename)
        to_insert.append((title, category, webpath, default_price, True))

    if not to_insert:
        return 0, len(items)

    with conn.cursor() as cur:
        execute_values(
            cur,
            """
            INSERT INTO designs (title, category, svg_orig, base_price, active)
            VALUES %s
            """,
            to_insert,
        )
    conn.commit()
    return len(to_insert), len(items)


def main():
    args = parse_args()
    root = Path(args.root).resolve()
    origs_dir = root / "origs"
    if not origs_dir.exists():
        print(f"[!] Folder not found: {origs_dir}", file=sys.stderr)
        sys.exit(1)
    try:
        conn = connect_db()
    except Exception as e:
        print(f"[!] DB connection failed: {e}", file=sys.stderr)
        sys.exit(2)
    try:
        inserted, scanned = import_designs(conn, origs_dir, args.default_price)
        print(f"Scanned: {scanned} SVGs; Inserted: {inserted}; Skipped (existing): {scanned - inserted}")
    except Exception as e:
        conn.rollback()
        print(f"[!] Import failed: {e}", file=sys.stderr)
        sys.exit(3)
    finally:
        conn.close()


if __name__ == "__main__":
    main()

