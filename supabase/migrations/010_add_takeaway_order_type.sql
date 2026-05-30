-- Migration 010: Add 'takeaway' to order_type enum
-- Ejecutar en SQL Editor de Supabase (no en CLI migrator — ALTER TYPE ADD VALUE no puede correr en transacción)
ALTER TYPE order_type ADD VALUE IF NOT EXISTS 'takeaway';
