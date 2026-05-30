-- ── 1. Merge Cafés Especiales → Brew Bar ─────────────────────────────────────
UPDATE products
  SET category_id = (SELECT id FROM categories WHERE name = 'Brew Bar')
  WHERE category_id = (SELECT id FROM categories WHERE name = 'Cafés Especiales');
DELETE FROM categories WHERE name = 'Cafés Especiales';

-- ── 2. Disable Cookie cup (not available) ────────────────────────────────────
UPDATE modifiers SET active = false WHERE name = 'Cookie cup';

-- ── 3. Replace milk + temperature modifiers ───────────────────────────────────
DELETE FROM modifiers
  WHERE modifier_group IN ('milk','temperature','milk_cow','milk_plant','presentation');

INSERT INTO modifiers (name, price, modifier_group, active) VALUES
  ('Iced',        2, 'temperature', true),
  ('Sin lactosa', 0, 'milk_cow',    true),
  ('Descremada',  0, 'milk_cow',    true),
  ('Almendra',    3, 'milk_plant',  true),
  ('Avena',       3, 'milk_plant',  true),
  ('Coco',        3, 'milk_plant',  true);

-- ── Verify ────────────────────────────────────────────────────────────────────
SELECT modifier_group, name, price, active
FROM modifiers ORDER BY modifier_group, price;
