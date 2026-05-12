#!/usr/bin/env python3
"""
Create or update a Django superuser for the admin_metalcard project.

Usage examples:
  python scripts/create_admin_superuser.py --username admin --email you@example.com --password secret123

Environment for DB connection is read by admin_metalcard settings:
  DB_NAME, DB_USER, DB_PASSWORD, DB_HOST, DB_PORT

Notes:
  - If the DB has no Django tables yet, this script will run migrations first.
  - Safe to re-run: if user exists, only updates password/email and ensures is_staff/is_superuser.
"""
from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Create or update Django superuser (admin_metalcard)")
    p.add_argument("--username", required=True, help="Username for superuser")
    p.add_argument("--email", required=True, help="Email for superuser")
    p.add_argument("--password", required=True, help="Password for superuser")
    p.add_argument("--skip-migrate", action="store_true", help="Do not run migrations before creating user")
    return p.parse_args()


def setup_django():
    repo_root = Path(__file__).resolve().parents[1]
    admin_project_dir = repo_root / "admin_metalcard"
    sys.path.insert(0, str(admin_project_dir))  # add admin_metalcard directory to path
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "admin_metalcard.settings")
    import django  # type: ignore
    django.setup()


def ensure_migrated(skip: bool):
    if skip:
        return
    from django.core.management import call_command  # type: ignore
    call_command("migrate", interactive=False, verbosity=1)


def create_or_update_superuser(username: str, email: str, password: str):
    from django.contrib.auth import get_user_model  # type: ignore
    User = get_user_model()
    u, created = User.objects.get_or_create(username=username, defaults={
        "email": email,
        "is_staff": True,
        "is_superuser": True,
        "is_active": True,
    })
    # Update fields and set password
    changed = False
    if u.email != email:
        u.email = email
        changed = True
    if not u.is_staff:
        u.is_staff = True
        changed = True
    if not u.is_superuser:
        u.is_superuser = True
        changed = True
    u.set_password(password)
    changed = True
    if changed:
        u.save()
    return created


def main():
    args = parse_args()
    setup_django()
    ensure_migrated(args.skip_migrate)
    created = create_or_update_superuser(args.username, args.email, args.password)
    print(f"Superuser {'created' if created else 'updated'}: {args.username}")


if __name__ == "__main__":
    main()

