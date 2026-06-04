-- Migration 015 — Device sessions
-- One row per device per user. Supports multi-device login without cross-invalidation.
-- Risk: none — new table, zero changes to existing schema

CREATE TABLE IF NOT EXISTS sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_name   TEXT,          -- "iPhone Aaron", "iPad Barra"
  platform      TEXT,          -- "iOS", "Android", "macOS"
  ip_address    TEXT,
  user_agent    TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  last_active   TIMESTAMPTZ DEFAULT now(),
  expires_at    TIMESTAMPTZ NOT NULL,
  revoked_at    TIMESTAMPTZ   -- set by admin to force logout
);

CREATE INDEX IF NOT EXISTS idx_sessions_user    ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_active  ON sessions(user_id) WHERE revoked_at IS NULL;
