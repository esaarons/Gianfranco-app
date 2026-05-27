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
