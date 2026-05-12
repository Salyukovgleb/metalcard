#!/usr/bin/env python3
"""
Create or update a Django superuser directly in Postgres (raw SQL),
without importing the Django project.

It targets the default Django auth table: public.auth_user

Usage:
  DB_HOST=85.198.85.90 DB_PORT=5433 DB_NAME=metalcard DB_USER=metalcard DB_PASSWORD=metalcard \
  python3 scripts/create_admin_raw.py --username admin --email salyukov.gleb033@gmail.com --password '123490ru'

Notes:
  - Requires that Django migrations for auth are already applied (table auth_user exists).
  - Password is hashed using Django PBKDF2-SHA256 with 390000 iterations.
  - Safe to re-run: performs UPSERT by username.
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
    import psycopg2.extras
except Exception as e:
    print("psycopg2 is required. Install with: pip install psycopg2-binary", file=sys.stderr)
    raise


DEFAULT_ITERATIONS = 390000  # Django 4.x default


def hash_password(password: str, iterations: int = DEFAULT_ITERATIONS) -> str:
    salt = ''.join(random.choices(string.ascii_letters + string.digits, k=12))
    dk = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), iterations)
    h = base64.b64encode(dk).decode('ascii').strip()
    return f"pbkdf2_sha256${iterations}${salt}${h}"


def connect_db():
    cfg = dict(
        dbname=os.getenv('DB_NAME', 'metalcard'),
        user=os.getenv('DB_USER', 'metalcard'),
        password=os.getenv('DB_PASSWORD', 'metalcard'),
        host=os.getenv('DB_HOST', '85.198.85.90'),
        port=os.getenv('DB_PORT', '5433'),
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
            WHERE table_schema=%s AND table_name=%s
            """,
            [schema, table],
        )
        return cur.fetchone() is not None


def upsert_superuser(conn, username: str, email: str, raw_password: str) -> int:
    pwd = hash_password(raw_password)
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO auth_user (username, password, email, is_staff, is_superuser, is_active, date_joined)
            VALUES (%s, %s, %s, TRUE, TRUE, TRUE, now())
            ON CONFLICT (username) DO UPDATE SET
              password = EXCLUDED.password,
              email = EXCLUDED.email,
              is_staff = TRUE,
              is_superuser = TRUE,
              is_active = TRUE
            RETURNING id
            """,
            [username, pwd, email],
        )
        user_id = cur.fetchone()[0]
    conn.commit()
    return user_id


def main():
    ap = argparse.ArgumentParser(description="Create/update Django superuser in Postgres (raw SQL)")
    ap.add_argument('--username', required=True)
    ap.add_argument('--email', required=True)
    ap.add_argument('--password', required=True)
    args = ap.parse_args()

    conn = connect_db()
    try:
        if not table_exists(conn, 'public', 'auth_user'):
            print("[!] Table public.auth_user not found. Run Django migrations for admin_metalcard first.", file=sys.stderr)
            sys.exit(2)
        uid = upsert_superuser(conn, args.username, args.email, args.password)
        print(f"Superuser ready. id={uid}, username={args.username}")
    finally:
        conn.close()


if __name__ == '__main__':
    main()

