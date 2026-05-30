-- ─────────────────────────────────────────────────────────────────────────────
-- 004_replace_products.sql
-- Reemplaza catálogo completo: 17 categorías, 114 productos.
-- Precios en 0.00 — actualizar desde Admin.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Limpiar datos existentes (respeta FK en orden inverso)
DELETE FROM order_item_modifiers
  WHERE order_item_id IN (
    SELECT oi.id FROM order_items oi
    JOIN products p ON p.id = oi.product_id
  );
DELETE FROM order_items
  WHERE product_id IN (SELECT id FROM products);
DELETE FROM products;
DELETE FROM categories;

-- 2. Categorías
INSERT INTO categories (name, sort_order) VALUES
  ('Brew Bar',        1),
  ('Espresso Bar',    2),
  ('Cold Drinks',     3),
  ('Cafés Especiales',4),
  ('Matcha Bar',      5),
  ('Specialty Lattes',6),
  ('Jugos',           7),
  ('Refresh',         8),
  ('Tostones',        9),
  ('Sandwiches',     10),
  ('Quiche',         11),
  ('Ensaladas',      12),
  ('Pastas',         13),
  ('Pizzas',         14),
  ('Postres',        15),
  ('Smoothie Bowls', 16),
  ('Vitrina',        17);

-- 3. Productos — Barra (Brew Bar)
INSERT INTO products (name, description, price, category_id, primary_area_id, active)
SELECT v.name, v.description, 0.00,
  (SELECT id FROM categories WHERE name = 'Brew Bar'),
  (SELECT id FROM areas WHERE type = 'bar' LIMIT 1),
  true
FROM (VALUES
  ('Blend de la Casa',  'Café filtrado de la casa preparado en método especial.'),
  ('V60 / Origami',     'Método de filtrado manual de extracción limpia y aromática.'),
  ('Aeropress',         'Café prensado de sabor intenso y cuerpo medio.'),
  ('Prensa Francesa',   'Método clásico de inmersión con mayor cuerpo y textura.'),
  ('Clever',            'Método híbrido entre filtrado e inmersión.'),
  ('Chemex',            'Café filtrado suave y balanceado.'),
  ('Sifón Japonés',     'Método de vacío con perfil aromático complejo.'),
  ('Café Turco',        'Café tradicional de molienda fina y preparación intensa.')
) AS v(name, description);

-- Barra (Espresso Bar)
INSERT INTO products (name, description, price, category_id, primary_area_id, active)
SELECT v.name, v.description, 0.00,
  (SELECT id FROM categories WHERE name = 'Espresso Bar'),
  (SELECT id FROM areas WHERE type = 'bar' LIMIT 1),
  true
FROM (VALUES
  ('Espresso / Ristretto', 'Shot concentrado de café espresso.'),
  ('Americano',            'Espresso diluido en agua caliente.'),
  ('Cortado',              'Espresso con pequeña cantidad de leche texturizada.'),
  ('Macchiato',            'Espresso marcado con espuma de leche.'),
  ('Cappuccino',           'Espresso, leche texturizada y espuma equilibrada.'),
  ('Latte',                'Espresso con abundante leche texturizada.'),
  ('Vanilla Latte',        'Latte saborizado con vainilla.'),
  ('Caramel Latte',        'Latte saborizado con caramelo.'),
  ('Hazelnut Latte',       'Latte saborizado con avellana.'),
  ('Salted Caramel Latte', 'Latte con caramelo salado.'),
  ('Flat White',           'Espresso doble con microespuma sedosa.'),
  ('Stumpy',               'Café cremoso de perfil intenso.'),
  ('Mocaccino',            'Espresso con chocolate y leche texturizada.')
) AS v(name, description);

-- Barra (Cold Drinks)
INSERT INTO products (name, description, price, category_id, primary_area_id, active)
SELECT v.name, v.description, 0.00,
  (SELECT id FROM categories WHERE name = 'Cold Drinks'),
  (SELECT id FROM areas WHERE type = 'bar' LIMIT 1),
  true
FROM (VALUES
  ('Espresso Tonic',          'Espresso servido con agua tónica.'),
  ('Lemon Cold Brew',         'Cold brew con limón.'),
  ('Cold Brew Tonic',         'Cold brew combinado con tónica.'),
  ('Orange Cold Brew',        'Cold brew con naranja.'),
  ('Passion Fruit Cold Brew', 'Cold brew con maracuyá.'),
  ('Hibiscus Cold Brew',      'Cold brew infusionado con hibiscus.'),
  ('Berry Cold Brew',         'Cold brew con frutos rojos.'),
  ('On The Rocks Cold Brew',  'Cold brew servido con hielo.'),
  ('Cappushaker',             'Cappuccino frío batido.'),
  ('Caramel Frappe',          'Bebida frappé sabor caramelo.'),
  ('Coffee Frappe',           'Frappé de café.'),
  ('Choco Frappe',            'Frappé de chocolate.')
) AS v(name, description);

-- Barra (Cafés Especiales)
INSERT INTO products (name, description, price, category_id, primary_area_id, active)
SELECT v.name, v.description, 0.00,
  (SELECT id FROM categories WHERE name = 'Cafés Especiales'),
  (SELECT id FROM areas WHERE type = 'bar' LIMIT 1),
  true
FROM (VALUES
  ('Geisha Lavado - Río Tambo',  'Café peruano de especialidad lavado.'),
  ('Marshell Natural - La Coipa','Café natural peruano de perfil frutal.'),
  ('Geisha Lavado - Inkawasi',   'Café Geisha lavado de alta complejidad.'),
  ('Geisha Natural - Chirinos',  'Café Geisha natural de notas intensas.')
) AS v(name, description);

-- Barra (Matcha Bar)
INSERT INTO products (name, description, price, category_id, primary_area_id, active)
SELECT v.name, v.description, 0.00,
  (SELECT id FROM categories WHERE name = 'Matcha Bar'),
  (SELECT id FROM areas WHERE type = 'bar' LIMIT 1),
  true
FROM (VALUES
  ('Ceremonial Pure Matcha',  'Matcha ceremonial premium.'),
  ('Matcha Latte',            'Matcha con leche texturizada.'),
  ('Iced Matcha Latte',       'Matcha latte servido frío.'),
  ('Iced Vanilla Matcha',     'Matcha frío sabor vainilla.'),
  ('Iced Caramel Matcha',     'Matcha frío sabor caramelo.'),
  ('Iced Hazelnut Matcha',    'Matcha frío sabor avellana.'),
  ('Orange Matcha',           'Matcha combinado con naranja.'),
  ('Maracumatcha',            'Matcha combinado con maracuyá.'),
  ('Iced Mango Matcha',       'Matcha frío con salsa casera de mango.'),
  ('Iced Berry Matcha',       'Matcha frío con berries.'),
  ('Iced Strawberry Matcha',  'Matcha frío con fresas.')
) AS v(name, description);

-- Barra (Specialty Lattes)
INSERT INTO products (name, description, price, category_id, primary_area_id, active)
SELECT v.name, v.description, 0.00,
  (SELECT id FROM categories WHERE name = 'Specialty Lattes'),
  (SELECT id FROM areas WHERE type = 'bar' LIMIT 1),
  true
FROM (VALUES
  ('Golden Milk',              'Cúrcuma, jengibre, canela, miel y leche texturizada.'),
  ('Chai Latte',               'Té negro especiado con leche texturizada.'),
  ('Vanilla Chai Latte',       'Chai latte sabor vainilla.'),
  ('Caramel Chai Latte',       'Chai latte sabor caramelo.'),
  ('Hazelnut Chai Latte',      'Chai latte sabor avellana.'),
  ('Hot Choco',                'Chocolate caliente con cacao 100% y 70%.'),
  ('Iced Pink Latte',          'Beterraga, goji, especias y leche fría.'),
  ('Iced Blue Latte',          'Butterfly pea flower con leche y hielo.'),
  ('Ice Cream Pistacho Latte', 'Latte frío con helado y crema de pistacho.')
) AS v(name, description);

-- Barra (Jugos)
INSERT INTO products (name, description, price, category_id, primary_area_id, active)
SELECT v.name, v.description, 0.00,
  (SELECT id FROM categories WHERE name = 'Jugos'),
  (SELECT id FROM areas WHERE type = 'bar' LIMIT 1),
  true
FROM (VALUES
  ('Naranja',   'Jugo natural de naranja.'),
  ('Berries',   'Fresa, arándanos y leche.'),
  ('Tropical',  'Mango, piña y naranja.'),
  ('Sunrise',   'Naranja, piña y arándanos.'),
  ('Detox',     'Pepino, espinaca, apio, manzana verde y kion.'),
  ('Natura',    'Zanahoria, manzana verde, naranja y kion.')
) AS v(name, description);

-- Barra (Refresh)
INSERT INTO products (name, description, price, category_id, primary_area_id, active)
SELECT v.name, v.description, 0.00,
  (SELECT id FROM categories WHERE name = 'Refresh'),
  (SELECT id FROM areas WHERE type = 'bar' LIMIT 1),
  true
FROM (VALUES
  ('Iced Blue Lemonade', 'Limonada con butterfly pea flower.'),
  ('Limonada Frozen',    'Limonada frozen clásica o sabores.'),
  ('Iced Soda',          'Soda sabor berries, maracuyá o hibiscus.')
) AS v(name, description);

-- Barra (Postres — despacha barra)
INSERT INTO products (name, description, price, category_id, primary_area_id, active)
SELECT v.name, v.description, 0.00,
  (SELECT id FROM categories WHERE name = 'Postres'),
  (SELECT id FROM areas WHERE type = 'bar' LIMIT 1),
  true
FROM (VALUES
  ('Torta de Chocolate',            'Torta servida con helado artesanal.'),
  ('Tostada Francesa',              'Brioche con miel, berries y helado.'),
  ('Affogato',                      'Espresso servido sobre helado artesanal.'),
  ('Apple Crumble con Helado',      'Tarta de manzana horneada con helado.'),
  ('Tarta de Frambuesa y Pistacho', 'Tarta con ganache de pistacho y frambuesas.'),
  ('Cheesecake de Frutos Rojos',    'Cheesecake horneado con frutos rojos.'),
  ('Cheesecake de Pistacho',        'Cheesecake con ganache y pistachos.'),
  ('Alfajor de Pistacho',           'Alfajor relleno de pistacho y chocolate blanco.'),
  ('Pastel de Pistacho',            'Keke de pistacho con crema y ganache.')
) AS v(name, description);

-- Barra (Vitrina — despacha barra)
INSERT INTO products (name, description, price, category_id, primary_area_id, active)
SELECT v.name, v.description, 0.00,
  (SELECT id FROM categories WHERE name = 'Vitrina'),
  (SELECT id FROM areas WHERE type = 'bar' LIMIT 1),
  true
FROM (VALUES
  ('Croissant Relleno',            'Croissant relleno de pistacho, manjar o chocolate.'),
  ('Carrot Cake',                  'Keke de zanahoria con frosting y pecanas.'),
  ('Banana Cake',                  'Keke de plátano con chocolate y nueces.'),
  ('Blueberry Muffin',             'Muffin de vainilla, limón y arándanos.'),
  ('Galleta Chocolate con Pecanas','Galleta artesanal de chocolate y pecanas.'),
  ('Galleta de Avena y Almendras', 'Galleta artesanal de avena y almendras.'),
  ('Galletón Relleno',             'Galletón relleno de chocolate o manjar.'),
  ('Alfajor Clásico',              'Alfajor tradicional artesanal.'),
  ('Alfajor de Chocolate',         'Alfajor artesanal de chocolate.')
) AS v(name, description);

-- ─── Cocina ───────────────────────────────────────────────────────────────────

-- Cocina (Tostones)
INSERT INTO products (name, description, price, category_id, primary_area_id, active)
SELECT v.name, v.description, 0.00,
  (SELECT id FROM categories WHERE name = 'Tostones'),
  (SELECT id FROM areas WHERE type = 'kitchen' LIMIT 1),
  true
FROM (VALUES
  ('Tostón Apaltado',  'Masa madre con huevo, palta y pesto.'),
  ('Grilled Cheese',   'Masa madre con quesos, miel de higos y frutos secos.'),
  ('Tostón Caprese',   'Masa madre con mozzarella, pesto y tomate cherry.'),
  ('Tostón Veggie',    'Masa madre con queso de cashews y hongos grillados.'),
  ('Hummus de la Casa','Hummus de pallar acompañado con pan tostado.'),
  ('Egg and Soldiers', 'Bastones de pan con huevos pasados y mantequilla.')
) AS v(name, description);

-- Cocina (Sandwiches)
INSERT INTO products (name, description, price, category_id, primary_area_id, active)
SELECT v.name, v.description, 0.00,
  (SELECT id FROM categories WHERE name = 'Sandwiches'),
  (SELECT id FROM areas WHERE type = 'kitchen' LIMIT 1),
  true
FROM (VALUES
  ('Gianfranco',    'Focaccia con jamón artesanal y stracciatella.'),
  ('Garlic',        'Focaccia con ajo, jamón y duraznos caramelizados.'),
  ('Mixto',         'Jamón artesanal y dúo de quesos.'),
  ('Djoko',         'Focaccia con prosciutto y miel de higos.'),
  ('Apaltado',      'Palta, pesto de pistacho y tomate cherry.'),
  ('Pollo y Palta', 'Pollo, palta, pecanas y mayonesa de la casa.')
) AS v(name, description);

-- Cocina (Quiche)
INSERT INTO products (name, description, price, category_id, primary_area_id, active)
SELECT v.name, v.description, 0.00,
  (SELECT id FROM categories WHERE name = 'Quiche'),
  (SELECT id FROM areas WHERE type = 'kitchen' LIMIT 1),
  true
FROM (VALUES
  ('Quiche Poro y Tocino', 'Quiche acompañado con arúgula y tomate cherry.')
) AS v(name, description);

-- Cocina (Ensaladas)
INSERT INTO products (name, description, price, category_id, primary_area_id, active)
SELECT v.name, v.description, 0.00,
  (SELECT id FROM categories WHERE name = 'Ensaladas'),
  (SELECT id FROM areas WHERE type = 'kitchen' LIMIT 1),
  true
FROM (VALUES
  ('Ensalada del Bosque',    'Mix de hojas, pecanas, portobello y aliño balsámico.'),
  ('Ensalada Mediterránea',  'Lechugas, aceitunas, tocino y grana padano.'),
  ('Ensalada Quinoa',        'Quinua tricolor, vegetales y huevo cocido.')
) AS v(name, description);

-- Cocina (Pastas)
INSERT INTO products (name, description, price, category_id, primary_area_id, active)
SELECT v.name, v.description, 0.00,
  (SELECT id FROM categories WHERE name = 'Pastas'),
  (SELECT id FROM areas WHERE type = 'kitchen' LIMIT 1),
  true
FROM (VALUES
  ('Ravioles de la Casa',   'Ravioles artesanales con salsa a elección.'),
  ('Tagliatelle al Huevo',  'Pasta fresca servida con salsa a elección.')
) AS v(name, description);

-- Cocina (Pizzas)
INSERT INTO products (name, description, price, category_id, primary_area_id, active)
SELECT v.name, v.description, 0.00,
  (SELECT id FROM categories WHERE name = 'Pizzas'),
  (SELECT id FROM areas WHERE type = 'kitchen' LIMIT 1),
  true
FROM (VALUES
  ('Pizza Garlic',      'Pizza con jamón artesanal y salsa de ajo.'),
  ('Pizza Pesto',       'Pizza con pesto, salsa blanca y arúgula.'),
  ('Pizza Prosciutto',  'Pizza con prosciutto, stracciatella y frutos secos.'),
  ('Pizza Veggie',      'Pizza vegana con cashews y hongos grillados.'),
  ('Pizza Tropical',    'Pizza con duraznos confitados y balsámico.'),
  ('Pizza Dora',        'Pizza con prosciutto, higos y pecanas.'),
  ('Pizza Margarita',   'Pizza clásica con mozzarella y albahaca fresca.'),
  ('Pizzacchio',        'Pizza con pistacho, stracciatella y jamón artesanal.')
) AS v(name, description);

-- Cocina (Smoothie Bowls — prepara cocina)
INSERT INTO products (name, description, price, category_id, primary_area_id, active)
SELECT v.name, v.description, 0.00,
  (SELECT id FROM categories WHERE name = 'Smoothie Bowls'),
  (SELECT id FROM areas WHERE type = 'kitchen' LIMIT 1),
  true
FROM (VALUES
  ('Açaí Bowl',      'Açaí con frutas, granola y mantequilla de maní.'),
  ('Tropical Bowl',  'Mango, plátano y mix de nueces.'),
  ('Chía Pudín',     'Pudín de chía con leche de almendras y cacao.'),
  ('Avena Porridge', 'Avena con frutas, granola y miel.')
) AS v(name, description);

-- Verificación final
SELECT c.name AS categoria, COUNT(p.id) AS productos
FROM categories c
LEFT JOIN products p ON p.category_id = c.id
GROUP BY c.name, c.sort_order
ORDER BY c.sort_order;
