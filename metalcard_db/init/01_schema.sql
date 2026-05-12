-- Metalcard DB initial schema
-- This script is executed automatically on first container start
-- by the official Postgres image via /docker-entrypoint-initdb.d

-- 1) Принты
CREATE TABLE designs (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT,
  svg_orig TEXT NOT NULL,
  preview_webp TEXT,
  base_price NUMERIC(12,2) NOT NULL,
  active BOOLEAN DEFAULT TRUE
);

-- 2) Цвета
CREATE TABLE colors (
  id SERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  markup NUMERIC(12,2) NOT NULL DEFAULT 0,
  params JSONB DEFAULT '{}'::jsonb,
  active BOOLEAN DEFAULT TRUE
);

-- 3) Промо (очень просто)
CREATE TABLE promos (
  id SERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  fixed_price NUMERIC(12,2),
  design_id INT REFERENCES designs(id),
  color_id INT REFERENCES colors(id),
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ
);

-- 4) Заказы (шапка)
CREATE TYPE order_state AS ENUM ('created','paid','cash','canceled','production','shipped','done');

CREATE TABLE orders (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  state order_state DEFAULT 'created',
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  receive_method TEXT NOT NULL CHECK (receive_method IN ('delivery','pickup')),
  order_key TEXT UNIQUE NOT NULL,
  manage_key TEXT UNIQUE NOT NULL,
  promo_id INT REFERENCES promos(id),
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  delivery_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency CHAR(3) DEFAULT 'UZS',
  utm JSONB DEFAULT '{}'::jsonb,
  notes TEXT
);

-- 5) Позиции заказа (всё компактно через JSON)
CREATE TABLE order_items (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT REFERENCES orders(id) ON DELETE CASCADE,
  design_id INT REFERENCES designs(id),
  color_id INT REFERENCES colors(id),
  quantity INT NOT NULL DEFAULT 1,
  options JSONB DEFAULT '{}'::jsonb,
  texts JSONB NOT NULL,
  renders JSONB DEFAULT '{}'::jsonb,
  item_total NUMERIC(12,2) NOT NULL DEFAULT 0
);

-- 6) Платежи
CREATE TYPE payment_provider AS ENUM ('payme','click','cash');
CREATE TYPE payment_status AS ENUM ('pending','succeeded','failed','canceled');

CREATE TABLE payments (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT REFERENCES orders(id) ON DELETE CASCADE,
  provider payment_provider NOT NULL,
  status payment_status NOT NULL DEFAULT 'pending',
  amount NUMERIC(12,2) NOT NULL,
  currency CHAR(3) DEFAULT 'UZS',
  provider_invoice_id TEXT,
  return_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7) Пользователи
CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  telegram_id BIGINT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- индексы по активным поискам
CREATE INDEX idx_designs_active ON designs(active);
CREATE INDEX idx_colors_active ON colors(active);
CREATE INDEX idx_orders_state ON orders(state);
CREATE INDEX idx_payments_order ON payments(order_id);
