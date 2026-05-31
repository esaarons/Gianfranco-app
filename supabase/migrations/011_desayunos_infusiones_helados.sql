-- ═══════════════════════════════════════════════════════════════
-- Migration 011: Desayunos, Infusiones, Helados
-- Ejecutar en el SQL Editor de Supabase
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Settings table (hora límite desayunos, etc.) ──────────
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT INTO settings (key, value) VALUES ('breakfast_cutoff', '11:30')
ON CONFLICT (key) DO NOTHING;

-- ── 2. product_type en products ───────────────────────────────
-- Valores: 'standard' | 'breakfast' | 'ice_cream'
ALTER TABLE products ADD COLUMN IF NOT EXISTS product_type TEXT NOT NULL DEFAULT 'standard';

-- ── 3. Nuevas categorías ──────────────────────────────────────
-- Desayunos sort_order=0 para aparecer primero
INSERT INTO categories (name, sort_order)
SELECT 'Desayunos', 0
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Desayunos');

INSERT INTO categories (name, sort_order)
SELECT 'Infusiones', 13
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Infusiones');

INSERT INTO categories (name, sort_order)
SELECT 'Helados', 14
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Helados');

-- ── 4. Productos: Desayunos (Cocina) ─────────────────────────
INSERT INTO products (name, description, price, category_id, primary_area_id, product_type, active, sort_order)
SELECT v.name, v.description, v.price,
  (SELECT id FROM categories WHERE name = 'Desayunos' LIMIT 1),
  (SELECT id FROM areas WHERE type = 'kitchen' LIMIT 1),
  'breakfast',
  true,
  v.sort_order
FROM (VALUES
  (1, 'Huevos y palta',
   '2 huevos de corral a elegir (revueltos, fritos, pasados o duros) + palta + pan campesino de masa madre tostado + jugo de frutas + café.',
   38.00),
  (2, 'Huevos revueltos con jamón',
   '3 huevos de corral revueltos con jamón artesanal + tostadas de pan campesino de masa madre + jugo de frutas + café.',
   38.00),
  (3, 'Proteico',
   'Sandwich de pollo, palta y pecanas en pan de masa madre + jugo de frutas + café.',
   42.00),
  (4, 'Healthy',
   'Avena + frutas de temporada + mix de nueces + jugo de frutas + café.',
   36.00),
  (5, 'Americano',
   'Mixto + jugo de naranja + café.',
   38.00)
) AS v(sort_order, name, description, price)
WHERE NOT EXISTS (
  SELECT 1 FROM products p
  JOIN categories c ON c.id = p.category_id
  WHERE c.name = 'Desayunos' AND p.name = v.name
);

-- ── 5. Productos: Infusiones (Barra) ─────────────────────────
INSERT INTO products (name, price, category_id, primary_area_id, product_type, active, sort_order)
SELECT v.name, 12.00,
  (SELECT id FROM categories WHERE name = 'Infusiones' LIMIT 1),
  (SELECT id FROM areas WHERE type = 'bar' LIMIT 1),
  'standard',
  true,
  v.sort_order
FROM (VALUES
  (1, 'Té negro'),
  (2, 'Té verde'),
  (3, 'Menta y Muña'),
  (4, 'Hierba Luisa'),
  (5, 'Frutos rojos')
) AS v(sort_order, name)
WHERE NOT EXISTS (
  SELECT 1 FROM products p
  JOIN categories c ON c.id = p.category_id
  WHERE c.name = 'Infusiones' AND p.name = v.name
);

-- ── 6. Productos: Helados (Barra) ─────────────────────────────
INSERT INTO products (name, description, price, category_id, primary_area_id, product_type, active, sort_order)
SELECT v.name, v.description, v.price,
  (SELECT id FROM categories WHERE name = 'Helados' LIMIT 1),
  (SELECT id FROM areas WHERE type = 'bar' LIMIT 1),
  'ice_cream',
  true,
  v.sort_order
FROM (VALUES
  (1, 'Helado 1 bola',
   'Elige tu sabor: vainilla, maracumango, frutos rojos, manjar, lúcuma, pistacho o gianduia.',
   14.00),
  (2, 'Helado 2 bolas',
   'Elige hasta 2 sabores: vainilla, maracumango, frutos rojos, manjar, lúcuma, pistacho o gianduia.',
   18.00)
) AS v(sort_order, name, description, price)
WHERE NOT EXISTS (
  SELECT 1 FROM products p
  JOIN categories c ON c.id = p.category_id
  WHERE c.name = 'Helados' AND p.name = v.name
);

-- ── 7. Modificadores: Desayunos ───────────────────────────────
-- Tipo de huevo (para desayunos con huevo)
INSERT INTO modifiers (name, price, modifier_group, active)
SELECT v.name, 0, 'breakfast_egg', true
FROM (VALUES
  ('Revueltos'), ('Fritos'), ('Pasados'), ('Duros')
) AS v(name)
WHERE NOT EXISTS (SELECT 1 FROM modifiers WHERE modifier_group = 'breakfast_egg' AND name = v.name);

-- Jugos incluidos en desayuno
INSERT INTO modifiers (name, price, modifier_group, active)
SELECT v.name, 0, 'breakfast_juice', true
FROM (VALUES
  ('Naranja'), ('Berries'), ('Tropical'), ('Sunrise'),
  ('Detox'), ('Natura'), ('Maracuyá'), ('Mango')
) AS v(name)
WHERE NOT EXISTS (SELECT 1 FROM modifiers WHERE modifier_group = 'breakfast_juice' AND name = v.name);

-- Café incluido: base (0) y con leche (+2)
INSERT INTO modifiers (name, price, modifier_group, active)
SELECT v.name, v.price, 'breakfast_coffee', true
FROM (VALUES
  ('Espresso',      0.00),
  ('Americano',     0.00),
  ('Cappuccino',    2.00),
  ('Latte',         2.00),
  ('Flat White',    2.00),
  ('Cortado',       2.00),
  ('Stumpy',        2.00),
  ('Mocaccino',     2.00),
  ('Vanilla Latte', 2.00),
  ('Caramel Latte', 2.00)
) AS v(name, price)
WHERE NOT EXISTS (SELECT 1 FROM modifiers WHERE modifier_group = 'breakfast_coffee' AND name = v.name);

-- ── 8. Modificadores: Sabores de helado ───────────────────────
INSERT INTO modifiers (name, price, modifier_group, active)
SELECT v.name, 0, 'ice_cream_flavor', true
FROM (VALUES
  ('Vainilla'), ('Maracumango'), ('Frutos Rojos'),
  ('Manjar'), ('Lúcuma'), ('Pistacho'),
  ('Gianduia')
) AS v(name)
WHERE NOT EXISTS (SELECT 1 FROM modifiers WHERE modifier_group = 'ice_cream_flavor' AND name = v.name);

-- ── Verificación ──────────────────────────────────────────────
SELECT c.name AS categoria, COUNT(p.id) AS productos
FROM categories c
LEFT JOIN products p ON p.category_id = c.id
WHERE c.name IN ('Desayunos','Infusiones','Helados')
GROUP BY c.name ORDER BY c.name;

SELECT modifier_group, COUNT(*) AS total
FROM modifiers
WHERE modifier_group IN ('breakfast_egg','breakfast_juice','breakfast_coffee','ice_cream_flavor')
GROUP BY modifier_group ORDER BY modifier_group;
