-- Metalcard Next.js stack (frontend-next / admin-next) — базовая схема PostgreSQL.
-- Выполняется автоматически только при первом старте пустого volume (docker-entrypoint-initdb.d).
-- Если volume уже создан без таблиц, примените вручную:
--   docker exec -i metalcard_db psql -U metalcard -d metalcard < deploy/postgres/init/01_schema.sql

SET client_min_messages = WARNING;

-- ENUM типы (идемпотентно)
DO $$ BEGIN
  CREATE TYPE order_state AS ENUM (
    'created', 'paid', 'cash', 'canceled', 'production', 'shipped', 'done'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM (
    'pending', 'succeeded', 'canceled', 'failed'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS colors (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  markup NUMERIC(14, 2) NOT NULL DEFAULT 0,
  params JSONB NOT NULL DEFAULT '{}'::jsonb,
  active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS designs (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT,
  svg_orig TEXT NOT NULL,
  preview_webp TEXT,
  base_price NUMERIC(14, 2) NOT NULL DEFAULT 0,
  sort_order INTEGER,
  price_overrides JSONB NOT NULL DEFAULT '{}'::jsonb,
  active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS promos (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  fixed_price NUMERIC(14, 2),
  design_id INTEGER REFERENCES designs (id) ON DELETE SET NULL,
  color_id INTEGER REFERENCES colors (id) ON DELETE SET NULL,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  telegram_id BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  state order_state NOT NULL DEFAULT 'created',
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  receive_method TEXT NOT NULL,
  order_key TEXT NOT NULL,
  manage_key TEXT NOT NULL,
  promo_id INTEGER REFERENCES promos (id) ON DELETE SET NULL,
  subtotal NUMERIC(14, 2) NOT NULL DEFAULT 0,
  delivery_fee NUMERIC(14, 2) NOT NULL DEFAULT 0,
  discount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  total NUMERIC(14, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'UZS',
  utm JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  design_id INTEGER REFERENCES designs (id) ON DELETE SET NULL,
  color_id INTEGER REFERENCES colors (id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  options JSONB NOT NULL DEFAULT '{}'::jsonb,
  texts JSONB NOT NULL DEFAULT '{}'::jsonb,
  renders JSONB NOT NULL DEFAULT '{}'::jsonb,
  item_total NUMERIC(14, 2) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  status payment_status NOT NULL DEFAULT 'pending',
  amount NUMERIC(14, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'UZS',
  return_url TEXT,
  provider_invoice_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_state ON orders (state);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments (order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_designs_active ON designs (active);
CREATE INDEX IF NOT EXISTS idx_designs_category ON designs (category);
