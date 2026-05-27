-- ═══════════════════════════════════════════════════════════════
-- Gianfranco Coffee Roasters — Schema v1
-- ═══════════════════════════════════════════════════════════════

-- Enums
CREATE TYPE user_role    AS ENUM ('admin', 'salon', 'bar', 'kitchen');
CREATE TYPE table_status AS ENUM ('free', 'occupied', 'cleaning');
CREATE TYPE table_zone   AS ENUM ('salon1', 'salon2', 'terrace');
CREATE TYPE order_type   AS ENUM ('table', 'delivery', 'task');
CREATE TYPE order_status AS ENUM ('open', 'in_progress', 'closed', 'cancelled');
CREATE TYPE card_status  AS ENUM ('pending', 'received', 'delivered');

-- ─── Users ────────────────────────────────────────────────────────────────────
CREATE TABLE users (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  email      TEXT UNIQUE NOT NULL,
  role       user_role NOT NULL,
  pin        TEXT,
  active     BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Areas ────────────────────────────────────────────────────────────────────
CREATE TABLE areas (
  id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL
);

-- ─── Tables ───────────────────────────────────────────────────────────────────
CREATE TABLE tables (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code            TEXT UNIQUE NOT NULL,
  zone            table_zone NOT NULL,
  capacity        INT NOT NULL,
  status          table_status DEFAULT 'free',
  parent_table_id UUID REFERENCES tables(id),
  active          BOOLEAN DEFAULT true,
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ─── Categories ───────────────────────────────────────────────────────────────
CREATE TABLE categories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  active     BOOLEAN DEFAULT true
);

-- ─── Products ─────────────────────────────────────────────────────────────────
CREATE TABLE products (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  category_id     UUID REFERENCES categories(id),
  primary_area_id UUID REFERENCES areas(id),
  price           NUMERIC(10,2) NOT NULL DEFAULT 0,
  description     TEXT,
  active          BOOLEAN DEFAULT true,
  is_favorite     BOOLEAN DEFAULT false,
  sort_order      INT DEFAULT 0
);

-- ─── Modifiers ────────────────────────────────────────────────────────────────
CREATE TABLE modifiers (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,
  price          NUMERIC(10,2) DEFAULT 0,
  modifier_group TEXT,
  active         BOOLEAN DEFAULT true
);

-- ─── Orders ───────────────────────────────────────────────────────────────────
CREATE TABLE orders (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type        order_type DEFAULT 'table',
  table_id    UUID REFERENCES tables(id),
  status      order_status DEFAULT 'open',
  total       NUMERIC(10,2) DEFAULT 0,
  created_by  UUID REFERENCES users(id),
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  closed_at   TIMESTAMPTZ
);

-- ─── Order Items ──────────────────────────────────────────────────────────────
CREATE TABLE order_items (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id   UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  quantity   INT NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL,
  area_id    UUID REFERENCES areas(id),
  notes      TEXT
);

-- ─── Order Item Modifiers ─────────────────────────────────────────────────────
CREATE TABLE order_item_modifiers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id UUID REFERENCES order_items(id) ON DELETE CASCADE,
  modifier_id   UUID REFERENCES modifiers(id),
  price         NUMERIC(10,2) DEFAULT 0
);

-- ─── Area Cards ───────────────────────────────────────────────────────────────
CREATE TABLE area_cards (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     UUID REFERENCES orders(id),
  area_id      UUID REFERENCES areas(id),
  status       card_status DEFAULT 'pending',
  assigned_to  UUID REFERENCES users(id),
  title        TEXT,
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT now(),
  received_at  TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ
);

-- ─── Employee Schedules (estructura futura) ───────────────────────────────────
CREATE TABLE employee_schedules (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES users(id),
  date       DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time   TIME NOT NULL,
  role       user_role,
  notes      TEXT,
  status     TEXT DEFAULT 'scheduled'
);

-- ─── Índices ──────────────────────────────────────────────────────────────────
CREATE INDEX idx_orders_table_id    ON orders(table_id);
CREATE INDEX idx_orders_status      ON orders(status);
CREATE INDEX idx_area_cards_area    ON area_cards(area_id);
CREATE INDEX idx_area_cards_status  ON area_cards(status);
CREATE INDEX idx_area_cards_order   ON area_cards(order_id);
CREATE INDEX idx_tables_status      ON tables(status);
CREATE INDEX idx_products_active    ON products(active);
CREATE INDEX idx_products_favorite  ON products(is_favorite);
CREATE INDEX idx_order_items_order  ON order_items(order_id);

-- ─── Updated_at trigger for tables ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tables_updated_at
  BEFORE UPDATE ON tables
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
