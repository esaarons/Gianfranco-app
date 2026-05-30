-- ═══════════════════════════════════════════════════════════════
-- Migration 009: User Areas, Activity Logs, Reservations
-- Ejecutar en el SQL Editor de Supabase (no en CLI migrator)
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Nuevos valores en user_role enum ───────────────────────
-- ALTER TYPE ADD VALUE no puede correr dentro de una función PL/pgSQL,
-- ejecutar estas líneas por separado si el runner usa transacciones.
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'encargado';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'barista';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'servicio';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'caja';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'delivery';

-- ── 2. Nuevas áreas (salón y delivery) ────────────────────────
INSERT INTO areas (id, name, type) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000003', 'Salón',    'salon'),
  ('aaaaaaaa-0000-0000-0000-000000000004', 'Delivery', 'delivery')
ON CONFLICT (id) DO NOTHING;

-- ── 3. Columna last_login en users ────────────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;

-- ── 4. Tabla user_areas (many-to-many: usuario ↔ área) ────────
CREATE TABLE IF NOT EXISTS user_areas (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  area_id UUID NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, area_id)
);

CREATE INDEX IF NOT EXISTS idx_user_areas_user ON user_areas(user_id);
CREATE INDEX IF NOT EXISTS idx_user_areas_area ON user_areas(area_id);

-- ── 5. Seed: asignar áreas a usuarios existentes según rol ────
-- Admin → todas las áreas
INSERT INTO user_areas (user_id, area_id)
SELECT u.id, a.id FROM users u CROSS JOIN areas a
WHERE u.role = 'admin'
ON CONFLICT DO NOTHING;

-- Bar → Barra/Servicio
INSERT INTO user_areas (user_id, area_id)
SELECT u.id, 'aaaaaaaa-0000-0000-0000-000000000001'::uuid
FROM users u WHERE u.role = 'bar'
ON CONFLICT DO NOTHING;

-- Kitchen → Cocina
INSERT INTO user_areas (user_id, area_id)
SELECT u.id, 'aaaaaaaa-0000-0000-0000-000000000002'::uuid
FROM users u WHERE u.role = 'kitchen'
ON CONFLICT DO NOTHING;

-- Salon → Salón
INSERT INTO user_areas (user_id, area_id)
SELECT u.id, 'aaaaaaaa-0000-0000-0000-000000000003'::uuid
FROM users u WHERE u.role = 'salon'
ON CONFLICT DO NOTHING;

-- ── 6. Tabla activity_logs ────────────────────────────────────
CREATE TABLE IF NOT EXISTS activity_logs (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        REFERENCES users(id)    ON DELETE SET NULL,
  action     TEXT        NOT NULL,
  area_id    UUID        REFERENCES areas(id)    ON DELETE SET NULL,
  table_id   UUID        REFERENCES tables(id)   ON DELETE SET NULL,
  order_id   UUID        REFERENCES orders(id)   ON DELETE SET NULL,
  product_id UUID        REFERENCES products(id) ON DELETE SET NULL,
  old_state  TEXT,
  new_state  TEXT,
  metadata   JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_logs_user_id  ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_logs_action   ON activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_logs_order_id ON activity_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_logs_created  ON activity_logs(created_at DESC);

-- ── 7. Tipo reservation_status ────────────────────────────────
DO $$ BEGIN
  CREATE TYPE reservation_status AS ENUM
    ('pending', 'confirmed', 'in_progress', 'finished', 'cancelled', 'no_show');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 8. Tabla reservations ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS reservations (
  id             UUID               PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name  TEXT               NOT NULL,
  customer_phone TEXT,
  date           DATE               NOT NULL,
  start_time     TIME               NOT NULL,
  end_time       TIME               NOT NULL,
  party_size     INT                NOT NULL,
  zone           table_zone         DEFAULT 'salon2',
  menu_type      TEXT,
  status         reservation_status DEFAULT 'pending',
  notes          TEXT,
  created_by     UUID               REFERENCES users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ        DEFAULT now(),
  CONSTRAINT chk_party_size CHECK (party_size BETWEEN 2 AND 16),
  CONSTRAINT chk_menu_type  CHECK (menu_type IN ('brunch', 'simple')),
  CONSTRAINT chk_time_order CHECK (end_time > start_time)
);

CREATE TABLE IF NOT EXISTS reservation_tables (
  reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  table_id       UUID NOT NULL REFERENCES tables(id)       ON DELETE CASCADE,
  PRIMARY KEY (reservation_id, table_id)
);

CREATE INDEX IF NOT EXISTS idx_reservations_date   ON reservations(date);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_zone   ON reservations(zone);
