#!/usr/bin/env python3
"""
Create or update an admin-next login row in public.users (Next.js admin, not Django).

Password format matches admin-next/lib/auth.ts (verifyDjangoPasswordHash / pbkdf2_sha256).

Usage (from host with DB reachable, or docker run on network metalcard_app):
  DB_HOST=db DB_PORT=5432 DB_NAME=metalcard DB_USER=metalcard DB_PASSWORD=... \\
  python3 scripts/create_admin_next_user.py \\
    --email admin@example.com --password '...' --full-name 'Admin'

Environment (defaults shown):
  DB_NAME=metalcard
  DB_USER=metalcard
  DB_PASSWORD=metalcard
  DB_HOST=localhost
  DB_PORT=5433
"""
from __future__ import annotations

import argparse
import base64
import hashlib
import os
import random
import string
import sys

try:
    import psycopg2
except Exception as e:
    print("psycopg2 is required. Install with: pip install psycopg2-binary", file=sys.stderr)
    raise

DEFAULT_ITERATIONS = 390_000


def django_pbkdf2_sha256(password: str, iterations: int = DEFAULT_ITERATIONS) -> str:
    """Same layout as scripts/create_admin_raw.py (compatible with admin-next verify)."""
    salt = "".join(random.choices(string.ascii_letters + string.digits, k=12))
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), iterations)
    h = base64.b64encode(dk).decode("ascii").strip()
    return f"pbkdf2_sha256${iterations}${salt}${h}"


def connect_db():
    cfg = dict(
        dbname=os.getenv("DB_NAME", "metalcard"),
        user=os.getenv("DB_USER", "metalcard"),
        password=os.getenv("DB_PASSWORD", "metalcard"),
        host=os.getenv("DB_HOST", "localhost"),
        port=os.getenv("DB_PORT", "5433"),
    )
    conn = psycopg2.connect(**cfg)
    conn.autocommit = False
    return conn


def table_exists(conn, schema: str, table: str) -> bool:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT 1
            FROM information_schema.tables
            WHERE table_schema = %s AND table_name = %s
            """,
            [schema, table],
        )
        return cur.fetchone() is not None


def upsert_user(conn, full_name: str, email: str, raw_password: str) -> int:
    pwd = django_pbkdf2_sha256(raw_password)
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO users (full_name, email, password_hash, telegram_id, created_at, updated_at)
            VALUES (%s, %s, %s, NULL, now(), now())
            ON CONFLICT (email) DO UPDATE SET
              full_name = EXCLUDED.full_name,
              password_hash = EXCLUDED.password_hash,
              updated_at = now()
            RETURNING id
            """,
            [full_name, email, pwd],
        )
        uid = cur.fetchone()[0]
    conn.commit()
    return int(uid)


def main() -> None:
    ap = argparse.ArgumentParser(description="Create/update admin-next user in public.users")
    ap.add_argument("--email", required=True)
    ap.add_argument("--password", required=True)
    ap.add_argument("--full-name", default="", help="Display name (default: part before @ in email)")
    args = ap.parse_args()

    full_name = (args.full_name or "").strip() or args.email.split("@", 1)[0]

    conn = connect_db()
    try:
        if not table_exists(conn, "public", "users"):
            print("[!] Table public.users not found. Apply metalcard_db/init/01_schema.sql first.", file=sys.stderr)
            sys.exit(2)
        uid = upsert_user(conn, full_name, args.email.strip().lower(), args.password)
        print(f"admin-next user ready. id={uid}, email={args.email.strip().lower()}")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
