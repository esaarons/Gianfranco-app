-- ═══════════════════════════════════════════════════════════════
-- Migration 012: Inteligencia Operacional — atribución y turnos
-- Ejecutar en el SQL Editor de Supabase
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Atribución de acciones en area_cards ───────────────────
ALTER TABLE area_cards ADD COLUMN IF NOT EXISTS received_by  UUID REFERENCES users(id);
ALTER TABLE area_cards ADD COLUMN IF NOT EXISTS delivered_by UUID REFERENCES users(id);

-- ── 2. Atribución de cierre en orders ────────────────────────
ALTER TABLE orders ADD COLUMN IF NOT EXISTS closed_by UUID REFERENCES users(id);

-- ── 3. Tabla de turnos ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shifts (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at    TIMESTAMPTZ,
  started_by  UUID        REFERENCES users(id),
  ended_by    UUID        REFERENCES users(id),
  notes       TEXT,
  summary     JSONB
);

-- Solo puede haber un turno activo a la vez
CREATE UNIQUE INDEX IF NOT EXISTS idx_shifts_one_active
  ON shifts ((started_at IS NOT NULL))
  WHERE ended_at IS NULL;

-- Índice para consultas de turno por fecha
CREATE INDEX IF NOT EXISTS idx_shifts_started_at ON shifts(started_at DESC);

-- ── 4. Índices para analytics ─────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_area_cards_received_at  ON area_cards(received_at)  WHERE received_at  IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_area_cards_delivered_at ON area_cards(delivered_at) WHERE delivered_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_closed_at        ON orders(closed_at)        WHERE closed_at    IS NOT NULL;

-- ── Verificación ──────────────────────────────────────────────
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name IN ('area_cards','orders','shifts')
  AND column_name IN ('received_by','delivered_by','closed_by','started_at','ended_at','summary')
ORDER BY table_name, column_name;
