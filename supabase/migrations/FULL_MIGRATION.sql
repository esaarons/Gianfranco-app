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
-- ═══════════════════════════════════════════════════════════════
-- Seed: Áreas, Mesas, Usuario Admin inicial
-- ═══════════════════════════════════════════════════════════════

-- Áreas
INSERT INTO areas (id, name, type) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Barra / Servicio', 'bar'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'Cocina', 'kitchen');

-- Mesas — Salón 1
INSERT INTO tables (code, zone, capacity) VALUES
  ('M1', 'salon1', 2),
  ('M2', 'salon1', 2),
  ('M3', 'salon1', 2),
  ('M4', 'salon1', 2),
  ('M5', 'salon1', 2);

-- Mesas — Salón 2
INSERT INTO tables (code, zone, capacity) VALUES
  ('V1', 'salon2', 2),
  ('V2', 'salon2', 2),
  ('G1', 'salon2', 4),
  ('G2', 'salon2', 4);

-- Mesas — Terraza
INSERT INTO tables (code, zone, capacity) VALUES
  ('TG', 'terrace', 4),
  ('T1', 'terrace', 2),
  ('T2', 'terrace', 2),
  ('T3', 'terrace', 2);

-- Usuario admin inicial (password: admin1234)
-- bcrypt hash para 'admin1234': $2b$10$...
INSERT INTO users (name, email, role, pin, active) VALUES
  ('Administrador', 'admin@gianfranco.com', 'admin', '1234', true),
  ('Barra Demo',    'bar@gianfranco.com',   'bar',   '2222', true),
  ('Cocina Demo',   'kitchen@gianfranco.com','kitchen','3333',true),
  ('Salón Demo',    'salon@gianfranco.com',  'salon', '4444', true);
-- ═══════════════════════════════════════════════════════════════
-- Seed: Categorías, Productos y Modificadores
-- Area IDs: bar=aaaaaaaa-0000-0000-0000-000000000001
--           kitchen=aaaaaaaa-0000-0000-0000-000000000002
-- ═══════════════════════════════════════════════════════════════

-- Categorías
INSERT INTO categories (id, name, sort_order) VALUES
  ('cccccccc-0000-0000-0000-000000000001', 'Café',              1),
  ('cccccccc-0000-0000-0000-000000000002', 'Matcha',            2),
  ('cccccccc-0000-0000-0000-000000000003', 'Bebidas Frías',     3),
  ('cccccccc-0000-0000-0000-000000000004', 'Specialty Lattes',  4),
  ('cccccccc-0000-0000-0000-000000000005', 'Jugos / Refresh',   5),
  ('cccccccc-0000-0000-0000-000000000006', 'Tostones',          6),
  ('cccccccc-0000-0000-0000-000000000007', 'Sandwiches',        7),
  ('cccccccc-0000-0000-0000-000000000008', 'Pizzas',            8),
  ('cccccccc-0000-0000-0000-000000000009', 'Postres',           9),
  ('cccccccc-0000-0000-0000-000000000010', 'Pastas / Ensaladas',10),
  ('cccccccc-0000-0000-0000-000000000011', 'Smoothie Bowls',   11),
  ('cccccccc-0000-0000-0000-000000000012', 'Otros',            12);

-- ─── Café (Barra) ─────────────────────────────────────────────
INSERT INTO products (name, category_id, primary_area_id, price, is_favorite, sort_order) VALUES
  ('Cappuccino',        'cccccccc-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001', 4.50, true,  1),
  ('Americano',         'cccccccc-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001', 3.50, true,  2),
  ('Espresso',          'cccccccc-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001', 3.00, false, 3),
  ('Latte',             'cccccccc-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001', 4.50, false, 4),
  ('Flat White',        'cccccccc-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001', 4.50, false, 5),
  ('Cortado',           'cccccccc-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001', 3.75, false, 6),
  ('Macchiato',         'cccccccc-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001', 3.50, false, 7);

-- ─── Matcha (Barra) ──────────────────────────────────────────
INSERT INTO products (name, category_id, primary_area_id, price, is_favorite, sort_order) VALUES
  ('Matcha Latte',      'cccccccc-0000-0000-0000-000000000002','aaaaaaaa-0000-0000-0000-000000000001', 5.50, true,  1),
  ('Matcha Iced',       'cccccccc-0000-0000-0000-000000000002','aaaaaaaa-0000-0000-0000-000000000001', 5.75, false, 2),
  ('Matcha Espresso',   'cccccccc-0000-0000-0000-000000000002','aaaaaaaa-0000-0000-0000-000000000001', 5.75, false, 3);

-- ─── Bebidas Frías (Barra) ────────────────────────────────────
INSERT INTO products (name, category_id, primary_area_id, price, is_favorite, sort_order) VALUES
  ('Cold Brew',         'cccccccc-0000-0000-0000-000000000003','aaaaaaaa-0000-0000-0000-000000000001', 5.00, true,  1),
  ('Cold Brew Leche',   'cccccccc-0000-0000-0000-000000000003','aaaaaaaa-0000-0000-0000-000000000001', 5.50, false, 2),
  ('Iced Latte',        'cccccccc-0000-0000-0000-000000000003','aaaaaaaa-0000-0000-0000-000000000001', 5.00, false, 3),
  ('Iced Cappuccino',   'cccccccc-0000-0000-0000-000000000003','aaaaaaaa-0000-0000-0000-000000000001', 5.00, false, 4);

-- ─── Specialty Lattes (Barra) ────────────────────────────────
INSERT INTO products (name, category_id, primary_area_id, price, is_favorite, sort_order) VALUES
  ('Lavender Latte',    'cccccccc-0000-0000-0000-000000000004','aaaaaaaa-0000-0000-0000-000000000001', 5.75, false, 1),
  ('Brown Sugar Latte', 'cccccccc-0000-0000-0000-000000000004','aaaaaaaa-0000-0000-0000-000000000001', 5.75, false, 2),
  ('Turmeric Latte',    'cccccccc-0000-0000-0000-000000000004','aaaaaaaa-0000-0000-0000-000000000001', 5.75, false, 3),
  ('Chai Latte',        'cccccccc-0000-0000-0000-000000000004','aaaaaaaa-0000-0000-0000-000000000001', 5.50, false, 4);

-- ─── Jugos / Refresh (Barra) ─────────────────────────────────
INSERT INTO products (name, category_id, primary_area_id, price, is_favorite, sort_order) VALUES
  ('Limonada Frozen',   'cccccccc-0000-0000-0000-000000000005','aaaaaaaa-0000-0000-0000-000000000001', 4.50, true,  1),
  ('Jugo Natural',      'cccccccc-0000-0000-0000-000000000005','aaaaaaaa-0000-0000-0000-000000000001', 4.00, false, 2),
  ('Agua de Pipa',      'cccccccc-0000-0000-0000-000000000005','aaaaaaaa-0000-0000-0000-000000000001', 3.50, false, 3),
  ('Refresh Hibiscus',  'cccccccc-0000-0000-0000-000000000005','aaaaaaaa-0000-0000-0000-000000000001', 4.50, false, 4);

-- ─── Tostones (Cocina) ────────────────────────────────────────
INSERT INTO products (name, category_id, primary_area_id, price, is_favorite, sort_order) VALUES
  ('Tostón Apaltado',   'cccccccc-0000-0000-0000-000000000006','aaaaaaaa-0000-0000-0000-000000000002', 7.50, true,  1),
  ('Tostón con Huevo',  'cccccccc-0000-0000-0000-000000000006','aaaaaaaa-0000-0000-0000-000000000002', 7.50, false, 2),
  ('Tostón Clásico',    'cccccccc-0000-0000-0000-000000000006','aaaaaaaa-0000-0000-0000-000000000002', 6.50, false, 3);

-- ─── Sandwiches (Cocina) ──────────────────────────────────────
INSERT INTO products (name, category_id, primary_area_id, price, is_favorite, sort_order) VALUES
  ('Sandwich Gianfranco','cccccccc-0000-0000-0000-000000000007','aaaaaaaa-0000-0000-0000-000000000002',9.50, true,  1),
  ('Sandwich Pollo',    'cccccccc-0000-0000-0000-000000000007','aaaaaaaa-0000-0000-0000-000000000002', 9.00, false, 2),
  ('Sandwich Caprese',  'cccccccc-0000-0000-0000-000000000007','aaaaaaaa-0000-0000-0000-000000000002', 8.50, false, 3),
  ('Club Sandwich',     'cccccccc-0000-0000-0000-000000000007','aaaaaaaa-0000-0000-0000-000000000002', 10.00,false, 4);

-- ─── Pizzas (Cocina) ─────────────────────────────────────────
INSERT INTO products (name, category_id, primary_area_id, price, is_favorite, sort_order) VALUES
  ('Pizza Garlic',      'cccccccc-0000-0000-0000-000000000008','aaaaaaaa-0000-0000-0000-000000000002',11.00, true,  1),
  ('Pizza Margherita',  'cccccccc-0000-0000-0000-000000000008','aaaaaaaa-0000-0000-0000-000000000002',10.50, false, 2),
  ('Pizza Prosciutto',  'cccccccc-0000-0000-0000-000000000008','aaaaaaaa-0000-0000-0000-000000000002',13.00, false, 3),
  ('Pizza Rúcula',      'cccccccc-0000-0000-0000-000000000008','aaaaaaaa-0000-0000-0000-000000000002',12.50, false, 4);

-- ─── Postres (Cocina) ────────────────────────────────────────
INSERT INTO products (name, category_id, primary_area_id, price, is_favorite, sort_order) VALUES
  ('Cheesecake',        'cccccccc-0000-0000-0000-000000000009','aaaaaaaa-0000-0000-0000-000000000002', 5.50, true,  1),
  ('Tiramisu',          'cccccccc-0000-0000-0000-000000000009','aaaaaaaa-0000-0000-0000-000000000002', 6.00, false, 2),
  ('Brownie',           'cccccccc-0000-0000-0000-000000000009','aaaaaaaa-0000-0000-0000-000000000002', 5.00, false, 3),
  ('Croissant',         'cccccccc-0000-0000-0000-000000000009','aaaaaaaa-0000-0000-0000-000000000002', 3.50, false, 4);

-- ─── Pastas / Ensaladas (Cocina) ─────────────────────────────
INSERT INTO products (name, category_id, primary_area_id, price, is_favorite, sort_order) VALUES
  ('Pasta Carbonara',   'cccccccc-0000-0000-0000-000000000010','aaaaaaaa-0000-0000-0000-000000000002',12.00, false, 1),
  ('Pasta Arrabiata',   'cccccccc-0000-0000-0000-000000000010','aaaaaaaa-0000-0000-0000-000000000002',11.50, false, 2),
  ('Ensalada César',    'cccccccc-0000-0000-0000-000000000010','aaaaaaaa-0000-0000-0000-000000000002', 9.00, false, 3),
  ('Ensalada Gianfranco','cccccccc-0000-0000-0000-000000000010','aaaaaaaa-0000-0000-0000-000000000002',10.00,false, 4);

-- ─── Smoothie Bowls (Cocina) ─────────────────────────────────
INSERT INTO products (name, category_id, primary_area_id, price, is_favorite, sort_order) VALUES
  ('Bowl Açaí',         'cccccccc-0000-0000-0000-000000000011','aaaaaaaa-0000-0000-0000-000000000002', 9.50, false, 1),
  ('Bowl Mango',        'cccccccc-0000-0000-0000-000000000011','aaaaaaaa-0000-0000-0000-000000000002', 9.50, false, 2),
  ('Bowl Pitahaya',     'cccccccc-0000-0000-0000-000000000011','aaaaaaaa-0000-0000-0000-000000000002',10.00, false, 3);

-- ─── Modificadores ────────────────────────────────────────────
INSERT INTO modifiers (name, price, modifier_group) VALUES
  ('ICED',              0.00, 'temperature'),
  ('Leche de avena',    0.75, 'milk'),
  ('Leche de almendras',0.75, 'milk'),
  ('Shot extra',        1.00, 'extras'),
  ('Decaf',             0.00, 'extras'),
  ('Sin azúcar',        0.00, 'extras'),
  ('Croissant +2',      2.00, 'food_addon'),
  ('Extras pizza',      1.50, 'food_addon'),
  ('Nota personalizada',0.00, 'note');

-- ═══════════════════════════════════════════════════════════════
-- Supabase Realtime — habilitar para tablas que necesitan tiempo real
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE tables     REPLICA IDENTITY FULL;
ALTER TABLE area_cards REPLICA IDENTITY FULL;
ALTER TABLE orders     REPLICA IDENTITY FULL;

-- Agregar tablas al publication de Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE tables;
ALTER PUBLICATION supabase_realtime ADD TABLE area_cards;
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
