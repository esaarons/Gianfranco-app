-- Migration 013 — Operational fields for area_cards
-- Purpose: enable Demora markers and operator→salon notes
-- Risk: none — purely additive, all columns nullable
-- Compatibility: existing rows get NULL for all new columns (correct default)

ALTER TABLE area_cards ADD COLUMN IF NOT EXISTS operator_note TEXT;
ALTER TABLE area_cards ADD COLUMN IF NOT EXISTS delay_minutes  SMALLINT;
ALTER TABLE area_cards ADD COLUMN IF NOT EXISTS delay_reason   TEXT;
ALTER TABLE area_cards ADD COLUMN IF NOT EXISTS delay_set_at   TIMESTAMPTZ;
