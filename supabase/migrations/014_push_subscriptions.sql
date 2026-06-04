-- Migration 014 — Web Push subscriptions
-- Stores one row per device per user. A user can have multiple devices.
-- area_ids filters which push events this subscription should receive.
-- Risk: none — new table, no changes to existing tables

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  endpoint    TEXT NOT NULL,
  p256dh      TEXT NOT NULL,
  auth        TEXT NOT NULL,
  area_ids    UUID[] NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_subs_user  ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subs_areas ON push_subscriptions USING GIN(area_ids);
